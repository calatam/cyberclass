import { db } from './db.js';
import { DOMINIOS as SEED_DOMINIOS, RUTAS as SEED_RUTAS } from './catalogo.js';
import type { Dominio, Ruta, Modulo, Pregunta } from './types.js';

// El catálogo se lee en cada request del frontend, así que lo cacheamos en
// memoria y lo invalidamos en cada escritura del panel de administración.
let cachePublico: { dominios: Dominio[]; rutas: Ruta[] } | null = null;
let cacheAdmin: { dominios: Dominio[]; rutas: Ruta[] } | null = null;

export function invalidarCache() {
  cachePublico = null;
  cacheAdmin = null;
}

interface FilaRuta { id: string; dominio_id: string; nombre: string; descripcion: string; nivel: string; proximamente: number; orden: number }
interface FilaModulo { id: string; ruta_id: string; titulo: string; descripcion: string; xp: number; orden: number }
interface FilaPregunta { id: number; modulo_id: string; texto: string; opciones: string; correcta: number; explicacion: string; orden: number }

/** Siembra el contenido inicial desde catalogo.ts la primera vez (idempotente). */
export function seedCatalogo() {
  const total = (db.prepare('SELECT COUNT(*) c FROM dominios').get() as { c: number }).c;
  if (total > 0) return;

  const insDominio = db.prepare('INSERT INTO dominios (id, nombre, icono, descripcion, orden) VALUES (?, ?, ?, ?, ?)');
  const insRuta = db.prepare('INSERT INTO rutas (id, dominio_id, nombre, descripcion, nivel, proximamente, orden) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insModulo = db.prepare('INSERT INTO modulos (id, ruta_id, titulo, descripcion, xp, orden) VALUES (?, ?, ?, ?, ?, ?)');
  const insPregunta = db.prepare('INSERT INTO preguntas (modulo_id, texto, opciones, correcta, explicacion, orden) VALUES (?, ?, ?, ?, ?, ?)');

  SEED_DOMINIOS.forEach((d, i) => insDominio.run(d.id, d.nombre, d.icono, d.descripcion, i));
  SEED_RUTAS.forEach((r, ri) => {
    insRuta.run(r.id, r.dominioId, r.nombre, r.descripcion, r.nivel, r.proximamente ? 1 : 0, ri);
    r.modulos.forEach((m, mi) => {
      insModulo.run(m.id, r.id, m.titulo, m.descripcion, m.xp, mi);
      m.preguntas.forEach((p, pi) => {
        insPregunta.run(m.id, p.texto, JSON.stringify(p.opciones), p.correcta, p.explicacion, pi);
      });
    });
  });
  console.log(`[seed] catálogo sembrado: ${SEED_DOMINIOS.length} dominios, ${SEED_RUTAS.length} rutas`);
}

function construir(conRespuestas: boolean): { dominios: Dominio[]; rutas: Ruta[] } {
  const dominios = db.prepare('SELECT id, nombre, icono, descripcion FROM dominios ORDER BY orden, nombre').all() as unknown as Dominio[];
  const filasRutas = db.prepare('SELECT * FROM rutas ORDER BY orden, nombre').all() as unknown as FilaRuta[];
  const filasModulos = db.prepare('SELECT * FROM modulos ORDER BY orden, titulo').all() as unknown as FilaModulo[];
  const filasPreguntas = db.prepare('SELECT * FROM preguntas ORDER BY orden, id').all() as unknown as FilaPregunta[];

  const preguntasPorModulo = new Map<string, Pregunta[]>();
  for (const p of filasPreguntas) {
    let opciones: string[] = [];
    try { opciones = JSON.parse(p.opciones); } catch { opciones = []; }
    const pregunta = conRespuestas
      ? { id: p.id, texto: p.texto, opciones, correcta: p.correcta, explicacion: p.explicacion }
      : { texto: p.texto, opciones };
    const lista = preguntasPorModulo.get(p.modulo_id) ?? [];
    lista.push(pregunta as Pregunta);
    preguntasPorModulo.set(p.modulo_id, lista);
  }

  const modulosPorRuta = new Map<string, Modulo[]>();
  for (const m of filasModulos) {
    const modulo: Modulo = {
      id: m.id,
      titulo: m.titulo,
      descripcion: m.descripcion,
      xp: m.xp,
      preguntas: preguntasPorModulo.get(m.id) ?? [],
    };
    const lista = modulosPorRuta.get(m.ruta_id) ?? [];
    lista.push(modulo);
    modulosPorRuta.set(m.ruta_id, lista);
  }

  const rutas: Ruta[] = filasRutas.map((r) => ({
    id: r.id,
    dominioId: r.dominio_id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    nivel: r.nivel as Ruta['nivel'],
    proximamente: r.proximamente === 1,
    modulos: modulosPorRuta.get(r.id) ?? [],
  }));

  return { dominios, rutas };
}

/** Catálogo para alumnos: sin respuestas correctas ni explicaciones. */
export function catalogoPublico() {
  if (!cachePublico) cachePublico = construir(false);
  return cachePublico;
}

/** Catálogo para el panel: incluye respuestas correctas y explicaciones. */
export function catalogoAdmin() {
  if (!cacheAdmin) cacheAdmin = construir(true);
  return cacheAdmin;
}

/** Busca un módulo con sus preguntas completas (para calificar). */
export function buscarModulo(moduloId: string): { ruta: Ruta; modulo: Modulo } | null {
  const { rutas } = catalogoAdmin();
  for (const ruta of rutas) {
    const modulo = ruta.modulos.find((m) => m.id === moduloId);
    if (modulo) return { ruta, modulo };
  }
  return null;
}

// ---------- escrituras (panel de administración) ----------

/** Convierte un título en un slug único usable como id. */
export function slugify(texto: string, prefijo = ''): string {
  const base = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';
  let slug = prefijo ? `${prefijo}-${base}` : base;
  let n = 2;
  const existe = (s: string) =>
    !!db.prepare('SELECT 1 FROM rutas WHERE id = ? UNION SELECT 1 FROM modulos WHERE id = ?').get(s, s);
  while (existe(slug)) slug = `${prefijo ? `${prefijo}-` : ''}${base}-${n++}`;
  return slug;
}

export interface PreguntaEntrada {
  texto: string;
  opciones: string[];
  correcta: number;
  explicacion: string;
}

/** Reemplaza las preguntas de un módulo (borra y reinserta con el orden dado). */
export function guardarPreguntas(moduloId: string, preguntas: PreguntaEntrada[]) {
  db.prepare('DELETE FROM preguntas WHERE modulo_id = ?').run(moduloId);
  const ins = db.prepare('INSERT INTO preguntas (modulo_id, texto, opciones, correcta, explicacion, orden) VALUES (?, ?, ?, ?, ?, ?)');
  preguntas.forEach((p, i) => {
    ins.run(moduloId, p.texto.trim(), JSON.stringify(p.opciones.map((o) => o.trim())), p.correcta, p.explicacion.trim(), i);
  });
  invalidarCache();
}
