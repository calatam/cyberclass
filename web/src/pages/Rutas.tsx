import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCatalogo } from '../catalogo-context';
import { fetchProgreso, progresoRuta, PROGRESO_VACIO } from '../store';
import type { Progreso } from '../types';

const NIVEL_COLOR: Record<string, string> = {
  'Básico': 'text-emerald-400 bg-emerald-500/10',
  'Intermedio': 'text-amber-400 bg-amber-500/10',
  'Avanzado': 'text-rose-400 bg-rose-500/10',
};

export default function Rutas() {
  const { dominios, rutas } = useCatalogo();
  const [progreso, setProgreso] = useState<Progreso>(PROGRESO_VACIO);
  useEffect(() => { fetchProgreso().then(setProgreso); }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-gray-100 mb-2">Rutas de Aprendizaje</h1>
      <p className="text-gray-400 mb-10">Elige una ruta y avanza módulo a módulo. Necesitas 70% para aprobar cada cuestionario.</p>

      {dominios.map((d) => {
        const rutasDom = rutas.filter((r) => r.dominioId === d.id);
        if (rutasDom.length === 0) return null;
        return (
          <section key={d.id} className="mb-12">
            <h2 className="font-display text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
              <span className="text-2xl">{d.icono}</span> {d.nombre}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rutasDom.map((r) => {
                const pr = progresoRuta(progreso, r);
                const contenido = (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-display text-lg font-bold text-gray-100">{r.nombre}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${NIVEL_COLOR[r.nivel]}`}>
                        {r.nivel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">{r.descripcion}</p>
                    {r.proximamente ? (
                      <span className="text-xs text-gray-500 italic">Próximamente</span>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                          <span>{r.modulos.length} módulos</span>
                          <span>{pr.hechos}/{pr.total} completados</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#0d1117] overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pr.pct}%` }} />
                        </div>
                      </>
                    )}
                  </>
                );
                const cls = `block bg-[#161b22] border rounded-xl p-5 transition-colors ${
                  r.proximamente ? 'border-[#30363d] opacity-60' : 'border-[#30363d] hover:border-emerald-500/40'
                }`;
                return r.proximamente ? (
                  <div key={r.id} className={cls}>{contenido}</div>
                ) : (
                  <Link key={r.id} to={`/ruta/${r.id}`} className={cls}>{contenido}</Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
