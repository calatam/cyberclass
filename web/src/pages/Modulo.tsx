import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { buscarModulo } from '../catalogo';
import { completarModulo } from '../store';

export default function Modulo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const encontrado = id ? buscarModulo(id) : null;

  const [idx, setIdx] = useState(0);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [respuestas, setRespuestas] = useState<number[]>([]);
  const [terminado, setTerminado] = useState(false);

  if (!encontrado) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400">Módulo no encontrado.</p>
        <Link to="/rutas" className="text-emerald-400 hover:underline">← Volver a rutas</Link>
      </div>
    );
  }

  const { ruta, modulo } = encontrado;
  const pregunta = modulo.preguntas[idx];
  const esUltima = idx === modulo.preguntas.length - 1;

  const confirmar = () => {
    if (seleccion === null) return;
    setConfirmado(true);
    setRespuestas((r) => [...r, seleccion]);
  };

  const siguiente = () => {
    if (esUltima) {
      const finales = [...respuestas];
      const score = finales.reduce((s, resp, i) => s + (resp === modulo.preguntas[i].correcta ? 1 : 0), 0);
      completarModulo(modulo.id, score, modulo.preguntas.length, modulo.xp);
      setTerminado(true);
    } else {
      setIdx((i) => i + 1);
      setSeleccion(null);
      setConfirmado(false);
    }
  };

  if (terminado) {
    const score = respuestas.reduce((s, resp, i) => s + (resp === modulo.preguntas[i].correcta ? 1 : 0), 0);
    const total = modulo.preguntas.length;
    const pct = Math.round((score / total) * 100);
    const aprobado = pct >= 70;
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">{aprobado ? '🎉' : '📚'}</div>
        <h1 className="font-display text-3xl font-bold text-gray-100 mb-2">
          {aprobado ? '¡Módulo aprobado!' : 'Sigue practicando'}
        </h1>
        <p className="text-gray-400 mb-6">
          Obtuviste <span className="text-gray-100 font-semibold">{score} de {total}</span> ({pct}%).
          {aprobado ? ` Ganaste ⚡ ${modulo.xp} XP.` : ' Necesitas 70% para aprobar.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          {!aprobado && (
            <button
              onClick={() => { setIdx(0); setSeleccion(null); setConfirmado(false); setRespuestas([]); setTerminado(false); }}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors"
            >
              Reintentar
            </button>
          )}
          <button
            onClick={() => navigate(`/ruta/${ruta.id}`)}
            className="px-5 py-2.5 rounded-xl border border-[#30363d] hover:border-gray-500 text-gray-200 font-semibold transition-colors"
          >
            Volver a la ruta
          </button>
        </div>
      </div>
    );
  }

  const esCorrecta = (i: number) => i === pregunta.correcta;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <Link to={`/ruta/${ruta.id}`} className="text-sm text-gray-400 hover:text-gray-200">← {ruta.nombre}</Link>
        <span className="text-sm text-gray-400">Pregunta {idx + 1} de {modulo.preguntas.length}</span>
      </div>

      <div className="h-1.5 rounded-full bg-[#161b22] overflow-hidden mb-8">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${((idx + (confirmado ? 1 : 0)) / modulo.preguntas.length) * 100}%` }} />
      </div>

      <h1 className="font-display text-xl font-bold text-gray-100 mb-6">{pregunta.texto}</h1>

      <div className="space-y-3 mb-6">
        {pregunta.opciones.map((op, i) => {
          let cls = 'border-[#30363d] hover:border-gray-500 text-gray-200';
          if (confirmado) {
            if (esCorrecta(i)) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-300';
            else if (i === seleccion) cls = 'border-rose-500 bg-rose-500/10 text-rose-300';
            else cls = 'border-[#30363d] text-gray-500';
          } else if (i === seleccion) {
            cls = 'border-emerald-500 bg-emerald-500/5 text-gray-100';
          }
          return (
            <button
              key={i}
              disabled={confirmado}
              onClick={() => setSeleccion(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${cls}`}
            >
              <span className="inline-block w-6 font-semibold">{String.fromCharCode(65 + i)}.</span>
              {op}
              {confirmado && esCorrecta(i) && <span className="float-right">✓</span>}
              {confirmado && i === seleccion && !esCorrecta(i) && <span className="float-right">✗</span>}
            </button>
          );
        })}
      </div>

      {confirmado && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-6">
          <div className="text-sm font-semibold text-gray-200 mb-1">
            {seleccion === pregunta.correcta ? '✅ Correcto' : '❌ Incorrecto'}
          </div>
          <p className="text-sm text-gray-400">{pregunta.explicacion}</p>
        </div>
      )}

      {!confirmado ? (
        <button
          onClick={confirmar}
          disabled={seleccion === null}
          className="w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#0d1117] font-semibold transition-colors"
        >
          Confirmar respuesta
        </button>
      ) : (
        <button
          onClick={siguiente}
          className="w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors"
        >
          {esUltima ? 'Ver resultado' : 'Siguiente pregunta →'}
        </button>
      )}
    </div>
  );
}
