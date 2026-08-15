import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCatalogo, buscarRuta } from '../catalogo-context';
import { fetchProgreso, moduloAprobado, progresoRuta, PROGRESO_VACIO } from '../store';
import type { Progreso } from '../types';

export default function RutaDetalle() {
  const { id } = useParams();
  const { rutas } = useCatalogo();
  const ruta = id ? buscarRuta(rutas, id) : null;
  const [progreso, setProgreso] = useState<Progreso>(PROGRESO_VACIO);
  useEffect(() => { fetchProgreso().then(setProgreso); }, []);

  if (!ruta) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Ruta no encontrada.</p>
        <Link to="/rutas" className="text-emerald-400 hover:underline">← Volver a rutas</Link>
      </div>
    );
  }

  const pr = progresoRuta(progreso, ruta);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link to="/rutas" className="text-sm text-gray-400 hover:text-gray-200">← Rutas</Link>
      <h1 className="font-display text-4xl font-bold text-gray-100 mt-3 mb-2">{ruta.nombre}</h1>
      <p className="text-gray-400 mb-6">{ruta.descripcion}</p>

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-300 font-medium">Progreso de la ruta</span>
          <span className="text-emerald-400 font-semibold">{pr.pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-[#0d1117] overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pr.pct}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {ruta.modulos.map((m, i) => {
          const aprobado = moduloAprobado(progreso, m.id);
          const registro = progreso.completados[m.id];
          return (
            <Link
              key={m.id}
              to={`/modulo/${m.id}`}
              className="flex items-center gap-4 bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-emerald-500/40 transition-colors"
            >
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                aprobado ? 'bg-emerald-500 text-[#0d1117]' : 'bg-[#0d1117] border border-[#30363d] text-gray-400'
              }`}>
                {aprobado ? '✓' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-100">{m.titulo}</h3>
                <p className="text-sm text-gray-400 truncate">{m.descripcion}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-emerald-400 text-sm font-semibold">⚡ {m.xp}</div>
                {registro && (
                  <div className="text-xs text-gray-500">{registro.score}/{registro.total}</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
