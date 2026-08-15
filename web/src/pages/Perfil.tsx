import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCatalogo } from '../catalogo-context';
import { getToken } from '../api';
import { fetchProgreso, calcularInsignias, progresoRuta, moduloAprobado, PROGRESO_VACIO } from '../store';
import type { Progreso } from '../types';

export default function Perfil() {
  const { rutas } = useCatalogo();
  const [progreso, setProgreso] = useState<Progreso>(PROGRESO_VACIO);
  useEffect(() => { fetchProgreso().then(setProgreso); }, []);

  if (!getToken()) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="font-display text-2xl font-bold text-gray-100 mb-2">Inicia sesión para ver tu perfil</h1>
        <p className="text-gray-400 mb-6">Tu progreso, XP e insignias se guardan en tu cuenta.</p>
        <Link
          to="/login"
          className="inline-block px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors"
        >
          Entrar
        </Link>
      </div>
    );
  }

  const insignias = calcularInsignias(progreso, rutas);
  const ganadas = insignias.filter((i) => i.ganada).length;
  const modulosAprobados = Object.keys(progreso.completados).filter((id) => moduloAprobado(progreso, id)).length;
  const rutasEnProgreso = rutas
    .filter((r) => !r.proximamente)
    .map((r) => ({ ruta: r, pr: progresoRuta(progreso, r) }))
    .filter((x) => x.pr.hechos > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-gray-100 mb-8">Mi Perfil</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { n: `⚡ ${progreso.xp}`, l: 'XP total' },
          { n: modulosAprobados, l: 'Módulos aprobados' },
          { n: `${ganadas}/${insignias.length}`, l: 'Insignias' },
          { n: rutasEnProgreso.length, l: 'Rutas iniciadas' },
        ].map((s) => (
          <div key={s.l} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 text-center">
            <div className="font-display text-2xl font-bold text-emerald-400">{s.n}</div>
            <div className="text-sm text-gray-400 mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Insignias */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold text-gray-100 mb-4">Insignias</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {insignias.map((ins) => (
            <div
              key={ins.codigo}
              className={`rounded-xl p-4 border text-center transition-all ${
                ins.ganada
                  ? 'bg-[#161b22] border-emerald-500/40'
                  : 'bg-[#0d1117] border-[#30363d] opacity-50'
              }`}
            >
              <div className={`text-4xl mb-2 ${ins.ganada ? '' : 'grayscale'}`}>{ins.icono}</div>
              <div className="font-semibold text-gray-100 text-sm">{ins.nombre}</div>
              <div className="text-xs text-gray-400 mt-1">{ins.descripcion}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Rutas en progreso */}
      <section>
        <h2 className="font-display text-2xl font-bold text-gray-100 mb-4">Rutas en progreso</h2>
        {rutasEnProgreso.length === 0 ? (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-3">Aún no has empezado ninguna ruta.</p>
            <Link to="/rutas" className="text-emerald-400 hover:underline font-medium">Explorar rutas →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rutasEnProgreso.map(({ ruta, pr }) => (
              <Link
                key={ruta.id}
                to={`/ruta/${ruta.id}`}
                className="block bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-100">{ruta.nombre}</h3>
                  <span className="text-emerald-400 text-sm font-semibold">{pr.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#0d1117] overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pr.pct}%` }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
