import { api, getToken } from './api';
import type { Progreso, Ruta, Usuario, ModuloCompletado } from './types';

export const PROGRESO_VACIO: Progreso = { completados: {}, xp: 0 };

/** Fetch user progress + XP from the API. Empty progress when logged out. */
export async function fetchProgreso(): Promise<Progreso> {
  if (!getToken()) return PROGRESO_VACIO;
  try {
    const [me, prog] = await Promise.all([
      api<Usuario>('/api/me'),
      api<{ completados: Record<string, ModuloCompletado> }>('/api/progreso'),
    ]);
    return { completados: prog.completados, xp: me.xp };
  } catch {
    return PROGRESO_VACIO;
  }
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

/** El nombre y la descripción se traducen en la UI con `insignia.<codigo>.n|d`. */
export interface Insignia {
  codigo: string;
  icono: string;
  ganada: boolean;
}

export function calcularInsignias(p: Progreso, rutas: Ruta[]): Insignia[] {
  const nAprobados = Object.keys(p.completados).filter((id) => moduloAprobado(p, id)).length;
  const rutasCompletas = rutas.filter((r) => !r.proximamente && r.modulos.length > 0 && progresoRuta(p, r).pct === 100).length;
  const perfectos = Object.values(p.completados).filter((c) => c.score === c.total).length;
  return [
    { codigo: 'primer-paso', icono: '🚀', ganada: nAprobados >= 1 },
    { codigo: 'en-marcha', icono: '🔥', ganada: nAprobados >= 5 },
    { codigo: 'imparable', icono: '⚡', ganada: nAprobados >= 10 },
    { codigo: 'perfeccionista', icono: '💯', ganada: perfectos >= 1 },
    { codigo: 'ruta-completa', icono: '🏆', ganada: rutasCompletas >= 1 },
    { codigo: 'especialista', icono: '🎖️', ganada: rutasCompletas >= 3 },
  ];
}
