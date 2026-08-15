import { Link, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useCatalogo, buscarModulo } from '../catalogo-context';
import { api, getToken } from '../api';
import type { RespuestaFeedback, ResultadoIntento } from '../types';

export default function Modulo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const loc = useLocation();
  const { rutas } = useCatalogo();
  const encontrado = id ? buscarModulo(rutas, id) : null;

  const [idx, setIdx] = useState(0);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<RespuestaFeedback | null>(null);
  const [respuestas, setRespuestas] = useState<number[]>([]);
  const [resultado, setResultado] = useState<ResultadoIntento | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Los cuestionarios requieren sesión: la validación ocurre en el servidor
  if (!getToken()) {
    return <Navigate to="/login" state={{ next: loc.pathname }} replace />;
  }

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

  const confirmar = async () => {
    if (seleccion === null || cargando) return;
    setCargando(true);
    setError('');
    try {
      const fb = await api<RespuestaFeedback>('/api/answer', {
        method: 'POST',
        body: { moduloId: modulo.id, pregunta: idx, seleccion },
      });
      setFeedback(fb);
      setRespuestas((r) => [...r, seleccion]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al validar la respuesta');
    } finally {
      setCargando(false);
    }
  };

  const siguiente = async () => {
    if (cargando) return;
    if (esUltima) {
      setCargando(true);
      setError('');
      try {
        const res = await api<ResultadoIntento>('/api/attempts', {
          method: 'POST',
          body: { moduloId: modulo.id, respuestas },
        });
        setResultado(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al enviar el intento');
      } finally {
        setCargando(false);
      }
    } else {
      setIdx((i) => i + 1);
      setSeleccion(null);
      setFeedback(null);
    }
  };

  const reintentar = () => {
    setIdx(0);
    setSeleccion(null);
    setFeedback(null);
    setRespuestas([]);
    setResultado(null);
    setError('');
  };

  if (resultado) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">{resultado.aprobado ? '🎉' : '📚'}</div>
        <h1 className="font-display text-3xl font-bold text-gray-100 mb-2">
          {resultado.aprobado ? '¡Módulo aprobado!' : 'Sigue practicando'}
        </h1>
        <p className="text-gray-400 mb-2">
          Obtuviste <span className="text-gray-100 font-semibold">{resultado.score} de {resultado.total}</span> ({resultado.pct}%).
          {resultado.aprobado
            ? resultado.xpGanado > 0
              ? ` Ganaste ⚡ ${resultado.xpGanado} XP.`
              : ' (Ya habías ganado el XP de este módulo.)'
            : ' Necesitas 70% para aprobar.'}
        </p>
        <p className="text-sm text-emerald-400 mb-6">XP total: ⚡ {resultado.xpTotal}</p>
        <div className="flex items-center justify-center gap-3">
          {!resultado.aprobado && (
            <button
              onClick={reintentar}
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <Link to={`/ruta/${ruta.id}`} className="text-sm text-gray-400 hover:text-gray-200">← {ruta.nombre}</Link>
        <span className="text-sm text-gray-400">Pregunta {idx + 1} de {modulo.preguntas.length}</span>
      </div>

      <div className="h-1.5 rounded-full bg-[#161b22] overflow-hidden mb-8">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${((idx + (feedback ? 1 : 0)) / modulo.preguntas.length) * 100}%` }}
        />
      </div>

      <h1 className="font-display text-xl font-bold text-gray-100 mb-6">{pregunta.texto}</h1>

      <div className="space-y-3 mb-6">
        {pregunta.opciones.map((op, i) => {
          let cls = 'border-[#30363d] hover:border-gray-500 text-gray-200';
          if (feedback) {
            if (i === feedback.correctaIdx) cls = 'border-emerald-500 bg-emerald-500/10 text-emerald-300';
            else if (i === seleccion) cls = 'border-rose-500 bg-rose-500/10 text-rose-300';
            else cls = 'border-[#30363d] text-gray-500';
          } else if (i === seleccion) {
            cls = 'border-emerald-500 bg-emerald-500/5 text-gray-100';
          }
          return (
            <button
              key={i}
              disabled={!!feedback || cargando}
              onClick={() => setSeleccion(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${cls}`}
            >
              <span className="inline-block w-6 font-semibold">{String.fromCharCode(65 + i)}.</span>
              {op}
              {feedback && i === feedback.correctaIdx && <span className="float-right">✓</span>}
              {feedback && i === seleccion && !feedback.esCorrecta && i !== feedback.correctaIdx && <span className="float-right">✗</span>}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-6">
          <div className="text-sm font-semibold text-gray-200 mb-1">
            {feedback.esCorrecta ? '✅ Correcto' : '❌ Incorrecto'}
          </div>
          <p className="text-sm text-gray-400">{feedback.explicacion}</p>
        </div>
      )}

      {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

      {!feedback ? (
        <button
          onClick={confirmar}
          disabled={seleccion === null || cargando}
          className="w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#0d1117] font-semibold transition-colors"
        >
          {cargando ? 'Validando…' : 'Confirmar respuesta'}
        </button>
      ) : (
        <button
          onClick={siguiente}
          disabled={cargando}
          className="w-full px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#0d1117] font-semibold transition-colors"
        >
          {cargando ? 'Enviando…' : esUltima ? 'Ver resultado' : 'Siguiente pregunta →'}
        </button>
      )}
    </div>
  );
}
