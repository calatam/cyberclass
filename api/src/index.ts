import Fastify from 'fastify';
import fjwt from '@fastify/jwt';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';
import {
  seedCatalogo, catalogoPublico, catalogoAdmin, buscarModulo,
  guardarPreguntas, invalidarCache, slugify, normalizarIdioma, IDIOMAS,
  type PreguntaEntrada,
} from './contenido.js';

// El contenido vive en la BD para poder editarlo desde el panel; la primera
// vez se siembra desde catalogo.ts.
seedCatalogo();

const scryptAsync = promisify(scrypt) as (pwd: string, salt: string, len: number) => Promise<Buffer>;

const PORT = Number(process.env.PORT ?? 3001);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no definido');
  process.exit(1);
}

// trustProxy: nginx reenvía X-Forwarded-For; sin esto req.ip sería siempre 127.0.0.1
const app = Fastify({ logger: true, trustProxy: true });
await app.register(fjwt, { secret: JWT_SECRET });

// ---------- rate limiting (en memoria, por IP + ruta) ----------

const rateBuckets = new Map<string, { count: number; reset: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of rateBuckets) if (now > b.reset) rateBuckets.delete(k);
}, 10 * 60 * 1000).unref();

function rateLimit(max: number, windowMs: number) {
  return async (req: any, reply: any) => {
    const key = `${req.routeOptions.url}:${req.ip}`;
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.reset) {
      bucket = { count: 0, reset: now + windowMs };
      rateBuckets.set(key, bucket);
    }
    bucket.count++;
    if (bucket.count > max) {
      reply.header('Retry-After', String(Math.ceil((bucket.reset - now) / 1000)));
      return reply.code(429).send({ error: 'Demasiados intentos. Espera un momento.' });
    }
  };
}

// ---------- helpers ----------

async function hashPassword(pwd: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(pwd, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(pwd: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const derived = await scryptAsync(pwd, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

interface UserRow { id: number; email: string; nombre: string; xp: number; rol: string; password_hash: string }

function firmarToken(user: { id: number; email: string; nombre: string }): string {
  return app.jwt.sign({ sub: user.id, email: user.email, nombre: user.nombre }, { expiresIn: '30d' });
}

// Auth decorator: attaches userId to request
app.decorate('auth', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'No autenticado' });
  }
});

// Admin guard: el rol se consulta en la BD en cada request (revocable al instante)
app.decorate('adminOnly', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'No autenticado' });
  }
  const u = db.prepare('SELECT rol FROM users WHERE id = ?').get(request.user.sub) as { rol: string } | undefined;
  if (!u) return reply.code(401).send({ error: 'Usuario no existe' });
  if (u.rol !== 'admin') return reply.code(403).send({ error: 'Requiere rol de administrador' });
});

// ---------- auth ----------

app.post('/api/auth/register', {
  preHandler: [rateLimit(10, 60_000)],
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password', 'nombre'],
      properties: {
        email: { type: 'string', format: 'email', maxLength: 200 },
        password: { type: 'string', minLength: 8, maxLength: 200 },
        nombre: { type: 'string', minLength: 2, maxLength: 100 },
      },
    },
  },
}, async (req, reply) => {
  const { email, password, nombre } = req.body as { email: string; password: string; nombre: string };
  const existe = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existe) return reply.code(409).send({ error: 'Ese email ya está registrado' });
  const hash = await hashPassword(password);
  const info = db.prepare('INSERT INTO users (email, password_hash, nombre) VALUES (?, ?, ?)')
    .run(email.toLowerCase(), hash, nombre.trim());
  const user = { id: Number(info.lastInsertRowid), email: email.toLowerCase(), nombre: nombre.trim() };
  return { token: firmarToken(user), usuario: { ...user, xp: 0 } };
});

app.post('/api/auth/login', {
  preHandler: [rateLimit(10, 60_000)],
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: { email: { type: 'string' }, password: { type: 'string' } },
    },
  },
}, async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return reply.code(401).send({ error: 'Email o contraseña incorrectos' });
  }
  return { token: firmarToken(user), usuario: { id: user.id, email: user.email, nombre: user.nombre, xp: user.xp, rol: user.rol } };
});

app.get('/api/me', { preHandler: [(app as any).auth] }, async (req: any, reply) => {
  const user = db.prepare('SELECT id, email, nombre, xp, rol FROM users WHERE id = ?').get(req.user.sub) as UserRow | undefined;
  // Token válido pero usuario eliminado: 401 para que el cliente limpie la sesión
  if (!user) return reply.code(401).send({ error: 'Usuario no existe' });
  return user;
});

// ---------- administración (solo rol admin) ----------

app.get('/api/admin/stats', { preHandler: [(app as any).adminOnly] }, async () => {
  const usuarios = (db.prepare("SELECT COUNT(*) c FROM users WHERE rol = 'alumno'").get() as { c: number }).c;
  const intentos = (db.prepare('SELECT COUNT(*) c FROM attempts').get() as { c: number }).c;
  const modulosAprobados = (db.prepare('SELECT COUNT(*) c FROM progreso WHERE score * 1.0 / total >= 0.7').get() as { c: number }).c;
  const xpTotal = (db.prepare('SELECT COALESCE(SUM(xp), 0) s FROM users').get() as { s: number }).s;
  const ultimos7dias = (db.prepare("SELECT COUNT(*) c FROM attempts WHERE fecha >= datetime('now', '-7 days')").get() as { c: number }).c;
  return { usuarios, intentos, modulosAprobados, xpTotal, intentosUltimos7Dias: ultimos7dias };
});

app.get('/api/admin/users', { preHandler: [(app as any).adminOnly] }, async () => {
  const usuarios = db.prepare(`
    SELECT u.id, u.email, u.nombre, u.rol, u.xp, u.created_at,
      (SELECT COUNT(*) FROM progreso p WHERE p.user_id = u.id AND p.score * 1.0 / p.total >= 0.7) AS modulos_aprobados,
      (SELECT MAX(a.fecha) FROM attempts a WHERE a.user_id = u.id) AS ultimo_intento
    FROM users u
    ORDER BY u.xp DESC, u.created_at ASC
  `).all();
  return { usuarios };
});

app.patch('/api/admin/users/:id', {
  preHandler: [(app as any).adminOnly],
  schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
    body: {
      type: 'object',
      required: ['rol'],
      properties: { rol: { type: 'string', enum: ['alumno', 'admin'] } },
    },
  },
}, async (req: any, reply) => {
  const id = Number(req.params.id);
  const { rol } = req.body as { rol: string };
  if (id === Number(req.user.sub)) {
    return reply.code(400).send({ error: 'No puedes cambiar tu propio rol' });
  }
  const info = db.prepare('UPDATE users SET rol = ? WHERE id = ?').run(rol, id);
  if (info.changes === 0) return reply.code(404).send({ error: 'Usuario no encontrado' });
  return { ok: true, rol };
});

app.post('/api/admin/users/:id/reset-password', {
  preHandler: [(app as any).adminOnly],
  schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
  },
}, async (req: any, reply) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(id) as { id: number; email: string } | undefined;
  if (!user) return reply.code(404).send({ error: 'Usuario no encontrado' });
  // Contraseña temporal de un solo uso visible: el usuario debería cambiarla al entrar
  const temporal = randomBytes(9).toString('base64url');
  const hash = await hashPassword(temporal);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  return { ok: true, email: user.email, passwordTemporal: temporal };
});

app.delete('/api/admin/users/:id', {
  preHandler: [(app as any).adminOnly],
  schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'integer' } } },
  },
}, async (req: any, reply) => {
  const id = Number(req.params.id);
  if (id === Number(req.user.sub)) {
    return reply.code(400).send({ error: 'No puedes eliminar tu propia cuenta desde el panel' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return reply.code(404).send({ error: 'Usuario no encontrado' });
  db.prepare('DELETE FROM attempts WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM progreso WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { ok: true };
});

// ---------- gestión de contenido (solo rol admin) ----------

app.get('/api/admin/catalogo', { preHandler: [(app as any).adminOnly] },
  async (req: any) => catalogoAdmin(normalizarIdioma(req.query?.idioma)));

const RUTA_BODY = {
  type: 'object',
  properties: {
    nombre: { type: 'string', minLength: 2, maxLength: 120 },
    descripcion: { type: 'string', maxLength: 500 },
    dominioId: { type: 'string', minLength: 1, maxLength: 60 },
    nivel: { type: 'string', enum: ['Básico', 'Intermedio', 'Avanzado'] },
    proximamente: { type: 'boolean' },
    idioma: { type: 'string', enum: [...IDIOMAS] },
  },
} as const;

app.post('/api/admin/rutas', {
  preHandler: [(app as any).adminOnly],
  schema: { body: { ...RUTA_BODY, required: ['nombre', 'dominioId'] } },
}, async (req: any, reply) => {
  const { nombre, descripcion = '', dominioId, nivel = 'Básico', proximamente = false } = req.body;
  const idioma = normalizarIdioma(req.body.idioma);
  // El dominio debe existir Y pertenecer al mismo idioma que la ruta
  const dominio = db.prepare('SELECT id FROM dominios WHERE id = ? AND idioma = ?').get(dominioId, idioma);
  if (!dominio) return reply.code(400).send({ error: 'El dominio no existe en ese idioma' });
  const id = slugify(nombre);
  const maxOrden = (db.prepare('SELECT COALESCE(MAX(orden), -1) o FROM rutas WHERE idioma = ?').get(idioma) as { o: number }).o;
  db.prepare('INSERT INTO rutas (id, dominio_id, nombre, descripcion, nivel, proximamente, orden, idioma) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, dominioId, nombre.trim(), descripcion.trim(), nivel, proximamente ? 1 : 0, maxOrden + 1, idioma);
  invalidarCache();
  return { ok: true, id };
});

app.put('/api/admin/rutas/:id', {
  preHandler: [(app as any).adminOnly],
  schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    body: { ...RUTA_BODY, required: ['nombre', 'dominioId', 'nivel'] },
  },
}, async (req: any, reply) => {
  const { nombre, descripcion = '', dominioId, nivel, proximamente = false } = req.body;
  const info = db.prepare('UPDATE rutas SET nombre = ?, descripcion = ?, dominio_id = ?, nivel = ?, proximamente = ? WHERE id = ?')
    .run(nombre.trim(), descripcion.trim(), dominioId, nivel, proximamente ? 1 : 0, req.params.id);
  if (info.changes === 0) return reply.code(404).send({ error: 'Ruta no encontrada' });
  invalidarCache();
  return { ok: true };
});

app.delete('/api/admin/rutas/:id', {
  preHandler: [(app as any).adminOnly],
  schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
}, async (req: any, reply) => {
  const rutaId = req.params.id as string;
  const ruta = db.prepare('SELECT id FROM rutas WHERE id = ?').get(rutaId);
  if (!ruta) return reply.code(404).send({ error: 'Ruta no encontrada' });
  const modulos = db.prepare('SELECT id FROM modulos WHERE ruta_id = ?').all(rutaId) as unknown as { id: string }[];
  revocarXpDeModulos(modulos.map((m) => m.id));
  for (const m of modulos) {
    db.prepare('DELETE FROM preguntas WHERE modulo_id = ?').run(m.id);
    db.prepare('DELETE FROM progreso WHERE modulo_id = ?').run(m.id);
    db.prepare('DELETE FROM attempts WHERE modulo_id = ?').run(m.id);
  }
  db.prepare('DELETE FROM modulos WHERE ruta_id = ?').run(rutaId);
  db.prepare('DELETE FROM rutas WHERE id = ?').run(rutaId);
  invalidarCache();
  return { ok: true, modulosEliminados: modulos.length };
});

/**
 * Devuelve el XP otorgado por esos módulos antes de borrarlos. Sin esto el
 * alumno queda con XP de contenido que ya no existe y el panel muestra
 * "XP repartido" sin módulos aprobados que lo respalden.
 */
function revocarXpDeModulos(moduloIds: string[]) {
  for (const mid of moduloIds) {
    const filas = db.prepare('SELECT user_id, xp FROM progreso WHERE modulo_id = ? AND xp > 0')
      .all(mid) as unknown as { user_id: number; xp: number }[];
    for (const f of filas) {
      db.prepare('UPDATE users SET xp = MAX(0, xp - ?) WHERE id = ?').run(f.xp, f.user_id);
    }
  }
}

const PREGUNTAS_SCHEMA = {
  type: 'array',
  maxItems: 50,
  items: {
    type: 'object',
    required: ['texto', 'opciones', 'correcta'],
    properties: {
      texto: { type: 'string', minLength: 3, maxLength: 1000 },
      opciones: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'string', minLength: 1, maxLength: 500 } },
      correcta: { type: 'integer', minimum: 0 },
      explicacion: { type: 'string', maxLength: 1000 },
    },
  },
} as const;

app.post('/api/admin/rutas/:id/modulos', {
  preHandler: [(app as any).adminOnly],
  schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    body: {
      type: 'object',
      required: ['titulo'],
      properties: {
        titulo: { type: 'string', minLength: 2, maxLength: 160 },
        descripcion: { type: 'string', maxLength: 500 },
        xp: { type: 'integer', minimum: 0, maximum: 1000 },
      },
    },
  },
}, async (req: any, reply) => {
  const rutaId = req.params.id as string;
  const ruta = db.prepare('SELECT id FROM rutas WHERE id = ?').get(rutaId);
  if (!ruta) return reply.code(404).send({ error: 'Ruta no encontrada' });
  const { titulo, descripcion = '', xp = 100 } = req.body;
  const id = slugify(titulo, rutaId.slice(0, 12));
  const maxOrden = (db.prepare('SELECT COALESCE(MAX(orden), -1) o FROM modulos WHERE ruta_id = ?').get(rutaId) as { o: number }).o;
  db.prepare('INSERT INTO modulos (id, ruta_id, titulo, descripcion, xp, orden) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, rutaId, titulo.trim(), descripcion.trim(), xp, maxOrden + 1);
  invalidarCache();
  return { ok: true, id };
});

app.put('/api/admin/modulos/:id', {
  preHandler: [(app as any).adminOnly],
  schema: {
    params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
    body: {
      type: 'object',
      required: ['titulo', 'preguntas'],
      properties: {
        titulo: { type: 'string', minLength: 2, maxLength: 160 },
        descripcion: { type: 'string', maxLength: 500 },
        xp: { type: 'integer', minimum: 0, maximum: 1000 },
        preguntas: PREGUNTAS_SCHEMA,
      },
    },
  },
}, async (req: any, reply) => {
  const moduloId = req.params.id as string;
  const modulo = db.prepare('SELECT id FROM modulos WHERE id = ?').get(moduloId);
  if (!modulo) return reply.code(404).send({ error: 'Módulo no encontrado' });
  const { titulo, descripcion = '', xp = 100, preguntas } = req.body as {
    titulo: string; descripcion: string; xp: number; preguntas: PreguntaEntrada[];
  };
  // La respuesta correcta debe apuntar a una opción existente
  for (const [i, p] of preguntas.entries()) {
    if (p.correcta >= p.opciones.length) {
      return reply.code(400).send({ error: `Pregunta ${i + 1}: la respuesta correcta no corresponde a una opción` });
    }
  }
  db.prepare('UPDATE modulos SET titulo = ?, descripcion = ?, xp = ? WHERE id = ?')
    .run(titulo.trim(), descripcion.trim(), xp, moduloId);
  guardarPreguntas(moduloId, preguntas.map((p) => ({ ...p, explicacion: p.explicacion ?? '' })));
  return { ok: true, preguntas: preguntas.length };
});

app.delete('/api/admin/modulos/:id', {
  preHandler: [(app as any).adminOnly],
  schema: { params: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } },
}, async (req: any, reply) => {
  const moduloId = req.params.id as string;
  const modulo = db.prepare('SELECT id FROM modulos WHERE id = ?').get(moduloId);
  if (!modulo) return reply.code(404).send({ error: 'Módulo no encontrado' });
  revocarXpDeModulos([moduloId]);
  db.prepare('DELETE FROM preguntas WHERE modulo_id = ?').run(moduloId);
  db.prepare('DELETE FROM progreso WHERE modulo_id = ?').run(moduloId);
  db.prepare('DELETE FROM attempts WHERE modulo_id = ?').run(moduloId);
  db.prepare('DELETE FROM modulos WHERE id = ?').run(moduloId);
  invalidarCache();
  return { ok: true };
});

// ---------- configuración de cuenta ----------

app.patch('/api/me', {
  preHandler: [(app as any).auth],
  schema: {
    body: {
      type: 'object',
      required: ['nombre'],
      properties: { nombre: { type: 'string', minLength: 2, maxLength: 100 } },
    },
  },
}, async (req: any, reply) => {
  const { nombre } = req.body as { nombre: string };
  const info = db.prepare('UPDATE users SET nombre = ? WHERE id = ?').run(nombre.trim(), req.user.sub);
  if (info.changes === 0) return reply.code(401).send({ error: 'Usuario no existe' });
  const user = db.prepare('SELECT id, email, nombre, xp FROM users WHERE id = ?').get(req.user.sub) as UserRow | undefined;
  return user ?? {};
});

app.post('/api/auth/password', {
  preHandler: [rateLimit(10, 60_000), (app as any).auth],
  schema: {
    body: {
      type: 'object',
      required: ['actual', 'nueva'],
      properties: {
        actual: { type: 'string', minLength: 1, maxLength: 200 },
        nueva: { type: 'string', minLength: 8, maxLength: 200 },
      },
    },
  },
}, async (req: any, reply) => {
  const { actual, nueva } = req.body as { actual: string; nueva: string };
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub) as UserRow | undefined;
  if (!user) return reply.code(401).send({ error: 'Usuario no existe' });
  if (!(await verifyPassword(actual, user.password_hash))) {
    return reply.code(401).send({ error: 'La contraseña actual es incorrecta' });
  }
  const hash = await hashPassword(nueva);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  return { ok: true };
});

// ---------- catálogo (público, SIN respuestas correctas ni explicaciones) ----------

app.get('/api/catalogo', async (req: any) => catalogoPublico(normalizarIdioma(req.query?.idioma)));

// ---------- evaluación (el servidor valida; las respuestas nunca viajan al cliente) ----------

app.post('/api/answer', {
  preHandler: [rateLimit(60, 60_000), (app as any).auth],
  schema: {
    body: {
      type: 'object',
      required: ['moduloId', 'pregunta', 'seleccion'],
      properties: {
        moduloId: { type: 'string' },
        pregunta: { type: 'integer', minimum: 0 },
        seleccion: { type: 'integer', minimum: 0 },
      },
    },
  },
}, async (req, reply) => {
  const { moduloId, pregunta, seleccion } = req.body as { moduloId: string; pregunta: number; seleccion: number };
  const encontrado = buscarModulo(moduloId);
  if (!encontrado) return reply.code(404).send({ error: 'Módulo no encontrado' });
  const q = encontrado.modulo.preguntas[pregunta];
  if (!q) return reply.code(404).send({ error: 'Pregunta no encontrada' });
  return {
    esCorrecta: seleccion === q.correcta,
    correctaIdx: q.correcta,
    explicacion: q.explicacion,
  };
});

app.post('/api/attempts', {
  preHandler: [rateLimit(20, 60_000), (app as any).auth],
  schema: {
    body: {
      type: 'object',
      required: ['moduloId', 'respuestas'],
      properties: {
        moduloId: { type: 'string' },
        respuestas: { type: 'array', items: { type: 'integer' }, maxItems: 50 },
      },
    },
  },
}, async (req: any, reply) => {
  const { moduloId, respuestas } = req.body as { moduloId: string; respuestas: number[] };
  const userId = req.user.sub as number;
  const encontrado = buscarModulo(moduloId);
  if (!encontrado) return reply.code(404).send({ error: 'Módulo no encontrado' });
  const { modulo } = encontrado;
  if (respuestas.length !== modulo.preguntas.length) {
    return reply.code(400).send({ error: 'Cantidad de respuestas no coincide con las preguntas' });
  }

  // El servidor califica — la nota nunca la decide el cliente
  const score = respuestas.reduce((s, r, i) => s + (r === modulo.preguntas[i].correcta ? 1 : 0), 0);
  const total = modulo.preguntas.length;
  const aprobado = score / total >= 0.7;

  // Los admins previsualizan contenido: se califica pero NO se registra
  // progreso ni se otorga XP (no participan como alumnos)
  const actor = db.prepare('SELECT rol, xp FROM users WHERE id = ?').get(userId) as { rol: string; xp: number } | undefined;
  if (!actor) return reply.code(401).send({ error: 'Usuario no existe' });
  if (actor.rol === 'admin') {
    return { score, total, pct: Math.round((score / total) * 100), aprobado, xpGanado: 0, xpTotal: actor.xp, preview: true };
  }

  db.prepare('INSERT INTO attempts (user_id, modulo_id, score, total) VALUES (?, ?, ?, ?)')
    .run(userId, moduloId, score, total);

  const previo = db.prepare('SELECT score, total, xp FROM progreso WHERE user_id = ? AND modulo_id = ?')
    .get(userId, moduloId) as { score: number; total: number; xp: number } | undefined;

  // XP se otorga una sola vez, en la primera aprobación
  let xpGanado = 0;
  if (aprobado && (!previo || previo.xp === 0)) {
    xpGanado = modulo.xp;
    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(xpGanado, userId);
  }

  const mejorScore = previo ? Math.max(previo.score, score) : score;
  const xpRegistro = previo && previo.xp > 0 ? previo.xp : xpGanado;
  db.prepare(`
    INSERT INTO progreso (user_id, modulo_id, score, total, xp, fecha)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, modulo_id) DO UPDATE SET
      score = excluded.score, total = excluded.total, xp = excluded.xp, fecha = excluded.fecha
  `).run(userId, moduloId, mejorScore, total, xpRegistro);

  const { xp: xpTotal } = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId) as { xp: number };
  return { score, total, pct: Math.round((score / total) * 100), aprobado, xpGanado, xpTotal };
});

app.get('/api/progreso', { preHandler: [(app as any).auth] }, async (req: any) => {
  const rows = db.prepare('SELECT modulo_id, score, total, xp, fecha FROM progreso WHERE user_id = ?')
    .all(req.user.sub) as { modulo_id: string; score: number; total: number; xp: number; fecha: string }[];
  const completados: Record<string, { score: number; total: number; xp: number; fecha: string }> = {};
  for (const r of rows) completados[r.modulo_id] = { score: r.score, total: r.total, xp: r.xp, fecha: r.fecha };
  return { completados };
});

app.get('/api/health', async () => ({ ok: true }));

// ---------- start ----------

try {
  await app.listen({ port: PORT, host: '127.0.0.1' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
