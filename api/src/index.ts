import Fastify from 'fastify';
import fjwt from '@fastify/jwt';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';
import { DOMINIOS, RUTAS, buscarModulo } from './catalogo.js';

const scryptAsync = promisify(scrypt) as (pwd: string, salt: string, len: number) => Promise<Buffer>;

const PORT = Number(process.env.PORT ?? 3001);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no definido');
  process.exit(1);
}

const app = Fastify({ logger: true });
await app.register(fjwt, { secret: JWT_SECRET });

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

interface UserRow { id: number; email: string; nombre: string; xp: number; password_hash: string }

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

// ---------- auth ----------

app.post('/api/auth/register', {
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
  return { token: firmarToken(user), usuario: { id: user.id, email: user.email, nombre: user.nombre, xp: user.xp } };
});

app.get('/api/me', { preHandler: [(app as any).auth] }, async (req: any, reply) => {
  const user = db.prepare('SELECT id, email, nombre, xp FROM users WHERE id = ?').get(req.user.sub) as UserRow | undefined;
  // Token válido pero usuario eliminado: 401 para que el cliente limpie la sesión
  if (!user) return reply.code(401).send({ error: 'Usuario no existe' });
  return user;
});

// ---------- catálogo (público, SIN respuestas correctas ni explicaciones) ----------

const CATALOGO_PUBLICO = {
  dominios: DOMINIOS,
  rutas: RUTAS.map((r) => ({
    ...r,
    modulos: r.modulos.map((m) => ({
      ...m,
      preguntas: m.preguntas.map((p) => ({ texto: p.texto, opciones: p.opciones })),
    })),
  })),
};

app.get('/api/catalogo', async () => CATALOGO_PUBLICO);

// ---------- evaluación (el servidor valida; las respuestas nunca viajan al cliente) ----------

app.post('/api/answer', {
  preHandler: [(app as any).auth],
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
  preHandler: [(app as any).auth],
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
