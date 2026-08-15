import type { Progreso, ModuloCompletado, Ruta } from './types';

const KEY = 'cyberclass_progreso_v1';

export function getProgreso(): Progreso {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Progreso;
  } catch { /* corrupted state falls through to fresh */ }
  return { completados: {}, xp: 0 };
}

export function completarModulo(moduloId: string, score: number, total: number, xpModulo: number): Progreso {
  const p = getProgreso();
  const aprobado = score / total >= 0.7;
  const previo = p.completados[moduloId];
  const registro: ModuloCompletado = {
    score,
    total,
    xp: aprobado ? xpModulo : 0,
    fecha: new Date().toISOString(),
  };
  // XP awarded only once, on first pass
  if (aprobado && (!previo || previo.xp === 0)) {
    p.xp += xpModulo;
  } else if (previo) {
    registro.xp = previo.xp;
    if (previo.score > score) {
      registro.score = previo.score;
      registro.total = previo.total;
    }
  }
  p.completados[moduloId] = registro;
  localStorage.setItem(KEY, JSON.stringify(p));
  return p;
}

export function moduloAprobado(p: Progreso, moduloId: string): boolean {
  const c = p.completados[moduloId];
  return !!c && c.score / c.total >= 0.7;
}

export function progresoRuta(p: Progreso, ruta: Ruta): { hechos: number; total: number; pct: number } {
  const total = ruta.modulos.length;
  const hechos = ruta.modulos.filter((m) => moduloAprobado(p, m.id)).length;
  return { hechos, total, pct: total === 0 ? 0 : Math.round((hechos / total) * 100) };
}

export interface Insignia {
  codigo: string;
  nombre: string;
  icono: string;
  descripcion: string;
  ganada: boolean;
}

export function calcularInsignias(p: Progreso, rutas: Ruta[]): Insignia[] {
  const nAprobados = Object.keys(p.completados).filter((id) => moduloAprobado(p, id)).length;
  const rutasCompletas = rutas.filter((r) => !r.proximamente && r.modulos.length > 0 && progresoRuta(p, r).pct === 100).length;
  const perfectos = Object.values(p.completados).filter((c) => c.score === c.total).length;
  return [
    { codigo: 'primer-paso', nombre: 'Primer Paso', icono: '🚀', descripcion: 'Aprueba tu primer módulo', ganada: nAprobados >= 1 },
    { codigo: 'en-marcha', nombre: 'En Marcha', icono: '🔥', descripcion: 'Aprueba 5 módulos', ganada: nAprobados >= 5 },
    { codigo: 'imparable', nombre: 'Imparable', icono: '⚡', descripcion: 'Aprueba 10 módulos', ganada: nAprobados >= 10 },
    { codigo: 'perfeccionista', nombre: 'Perfeccionista', icono: '💯', descripcion: 'Obtén un puntaje perfecto', ganada: perfectos >= 1 },
    { codigo: 'ruta-completa', nombre: 'Ruta Completa', icono: '🏆', descripcion: 'Completa una ruta de aprendizaje', ganada: rutasCompletas >= 1 },
    { codigo: 'especialista', nombre: 'Especialista', icono: '🎖️', descripcion: 'Completa 3 rutas de aprendizaje', ganada: rutasCompletas >= 3 },
  ];
}
