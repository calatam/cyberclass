import { db } from './db.js';
import { DOMINIOS as SEED_DOMINIOS, RUTAS as SEED_RUTAS } from './catalogo.js';
import { DOMINIOS_EN as SEED_DOMINIOS_EN, RUTAS_EN as SEED_RUTAS_EN } from './catalogo-en.js';
import type { Dominio, Ruta, Modulo, Pregunta } from './types.js';

export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_DEFAULT: Idioma = 'es';

export function normalizarIdioma(valor: unknown): Idioma {
  return IDIOMAS.includes(valor as Idioma) ? (valor as Idioma) : IDIOMA_DEFAULT;
}

// El catálogo se lee en cada carga del frontend, así que lo cacheamos por
// idioma y lo invalidamos completo en cada escritura del panel.
const cachePublico = new Map<Idioma, { dominios: Dominio[]; rutas: Ruta[] }>();
const cacheAdmin = new Map<Idioma, { dominios: Dominio[]; rutas: Ruta[] }>();

export function invalidarCache() {
  cachePublico.clear();
  cacheAdmin.clear();
}

interface FilaRuta { id: string; dominio_id: string; nombre: string; descripcion: string; nivel: string; proximamente: number; orden: number; idioma: string }
interface FilaModulo { id: string; ruta_id: string; titulo: string; descripcion: string; xp: number; orden: number }
interface FilaPregunta { id: number; modulo_id: string; texto: string; opciones: string; correcta: number; explicacion: string; orden: number }

function sembrarIdioma(idioma: Idioma, dominios: Dominio[], rutas: Ruta[]) {
  const insDominio = db.prepare('INSERT INTO dominios (id, nombre, icono, descripcion, orden, idioma) VALUES (?, ?, ?, ?, ?, ?)');
  const insRuta = db.prepare('INSERT INTO rutas (id, dominio_id, nombre, descripcion, nivel, proximamente, orden, idioma) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insModulo = db.prepare('INSERT INTO modulos (id, ruta_id, titulo, descripcion, xp, orden) VALUES (?, ?, ?, ?, ?, ?)');
  const insPregunta = db.prepare('INSERT INTO preguntas (modulo_id, texto, opciones, correcta, explicacion, orden) VALUES (?, ?, ?, ?, ?, ?)');

  dominios.forEach((d, i) => insDominio.run(d.id, d.nombre, d.icono, d.descripcion, i, idioma));
  rutas.forEach((r, ri) => {
    insRuta.run(r.id, r.dominioId, r.nombre, r.descripcion, r.nivel, r.proximamente ? 1 : 0, ri, idioma);
    r.modulos.forEach((m, mi) => {
      insModulo.run(m.id, r.id, m.titulo, m.descripcion, m.xp, mi);
      m.preguntas.forEach((p, pi) => {
        insPregunta.run(m.id, p.texto, JSON.stringify(p.opciones), p.correcta, p.explicacion, pi);
      });
    });
  });
}

/** Siembra el contenido de cada idioma la primera vez (idempotente por idioma). */
export function seedCatalogo() {
  const cuenta = (idioma: Idioma) =>
    (db.prepare('SELECT COUNT(*) c FROM dominios WHERE idioma = ?').get(idioma) as { c: number }).c;

  if (cuenta('es') === 0) {
    sembrarIdioma('es', SEED_DOMINIOS, SEED_RUTAS);
    console.log(`[seed] catálogo ES sembrado: ${SEED_DOMINIOS.length} dominios, ${SEED_RUTAS.length} rutas`);
  }
  if (cuenta('en') === 0) {
    sembrarIdioma('en', SEED_DOMINIOS_EN, SEED_RUTAS_EN);
    console.log(`[seed] catálogo EN sembrado: ${SEED_DOMINIOS_EN.length} dominios, ${SEED_RUTAS_EN.length} rutas`);
  }
  invalidarCache();
}

function construir(idioma: Idioma, conRespuestas: boolean): { dominios: Dominio[]; rutas: Ruta[] } {
  const dominios = db.prepare('SELECT id, nombre, icono, descripcion FROM dominios WHERE idioma = ? ORDER BY orden, nombre')
    .all(idioma) as unknown as Dominio[];
  const filasRutas = db.prepare('SELECT * FROM rutas WHERE idioma = ? ORDER BY orden, nombre')
    .all(idioma) as unknown as FilaRuta[];

  const idsRutas = new Set(filasRutas.map((r) => r.id));
  const filasModulos = (db.prepare('SELECT * FROM modulos ORDER BY orden, titulo').all() as unknown as FilaModulo[])
    .filter((m) => idsRutas.has(m.ruta_id));
  const idsModulos = new Set(filasModulos.map((m) => m.id));
  const filasPreguntas = (db.prepare('SELECT * FROM preguntas ORDER BY orden, id').all() as unknown as FilaPregunta[])
    .filter((p) => idsModulos.has(p.modulo_id));

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
export function catalogoPublico(idioma: Idioma = IDIOMA_DEFAULT) {
  let c = cachePublico.get(idioma);
  if (!c) {
    c = construir(idioma, false);
    cachePublico.set(idioma, c);
  }
  return c;
}

/** Catálogo para el panel: incluye respuestas correctas y explicaciones. */
export function catalogoAdmin(idioma: Idioma = IDIOMA_DEFAULT) {
  let c = cacheAdmin.get(idioma);
  if (!c) {
    c = construir(idioma, true);
    cacheAdmin.set(idioma, c);
  }
  return c;
}

/** Busca un módulo con sus preguntas completas (para calificar), en cualquier idioma. */
export function buscarModulo(moduloId: string): { ruta: Ruta; modulo: Modulo } | null {
  for (const idioma of IDIOMAS) {
    const { rutas } = catalogoAdmin(idioma);
    for (const ruta of rutas) {
      const modulo = ruta.modulos.find((m) => m.id === moduloId);
      if (modulo) return { ruta, modulo };
    }
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
