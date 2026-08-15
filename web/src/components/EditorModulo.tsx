import { useState } from 'react';
import { api } from '../api';
import type { ModuloAdmin, PreguntaAdmin } from '../types';

const input = 'w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none';
const btn = 'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40';

interface Props {
  modulo: ModuloAdmin;
  rutaNombre: string;
  onGuardado: () => void;
  onCerrar: () => void;
}

export default function EditorModulo({ modulo, rutaNombre, onGuardado, onCerrar }: Props) {
  const [titulo, setTitulo] = useState(modulo.titulo);
  const [descripcion, setDescripcion] = useState(modulo.descripcion);
  const [xp, setXp] = useState(modulo.xp);
  const [preguntas, setPreguntas] = useState<PreguntaAdmin[]>(
    modulo.preguntas.map((p) => ({ ...p, opciones: [...p.opciones] })),
  );
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const actualizarPregunta = (i: number, cambios: Partial<PreguntaAdmin>) => {
    setPreguntas((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambios } : p)));
  };

  const actualizarOpcion = (i: number, j: number, valor: string) => {
    setPreguntas((ps) => ps.map((p, pi) =>
      pi === i ? { ...p, opciones: p.opciones.map((o, oi) => (oi === j ? valor : o)) } : p,
    ));
  };

  const agregarOpcion = (i: number) => {
    setPreguntas((ps) => ps.map((p, pi) =>
      pi === i && p.opciones.length < 6 ? { ...p, opciones: [...p.opciones, ''] } : p,
    ));
  };

  const quitarOpcion = (i: number, j: number) => {
    setPreguntas((ps) => ps.map((p, pi) => {
      if (pi !== i || p.opciones.length <= 2) return p;
      const opciones = p.opciones.filter((_, oi) => oi !== j);
      // Si borramos la correcta o una anterior, reajustamos el índice
      let correcta = p.correcta;
      if (j === p.correcta) correcta = 0;
      else if (j < p.correcta) correcta = p.correcta - 1;
      return { ...p, opciones, correcta };
    }));
  };

  const agregarPregunta = () => {
    setPreguntas((ps) => [...ps, { texto: '', opciones: ['', ''], correcta: 0, explicacion: '' }]);
  };

  const quitarPregunta = (i: number) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    setPreguntas((ps) => ps.filter((_, j) => j !== i));
  };

  const moverPregunta = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= preguntas.length) return;
    setPreguntas((ps) => {
      const copia = [...ps];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  };

  const guardar = async () => {
    setMsg(null);
    // Validación local antes de enviar
    if (preguntas.length === 0) {
      setMsg({ ok: false, texto: 'El módulo necesita al menos una pregunta' });
      return;
    }
    for (const [i, p] of preguntas.entries()) {
      if (p.texto.trim().length < 3) {
        setMsg({ ok: false, texto: `Pregunta ${i + 1}: el enunciado está vacío` });
        return;
      }
      if (p.opciones.some((o) => !o.trim())) {
        setMsg({ ok: false, texto: `Pregunta ${i + 1}: hay opciones vacías` });
        return;
      }
    }
    setGuardando(true);
    try {
      await api(`/api/admin/modulos/${modulo.id}`, {
        method: 'PUT',
        body: { titulo, descripcion, xp, preguntas },
      });
      setMsg({ ok: true, texto: 'Cambios guardados ✓ (ya están en vivo para los alumnos)' });
      onGuardado();
    } catch (err) {
      setMsg({ ok: false, texto: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="min-w-0">
          <button onClick={onCerrar} className="text-sm text-gray-400 hover:text-gray-200">← Volver al contenido</button>
          <h2 className="font-display text-2xl font-bold text-gray-100 mt-1 truncate">Editar módulo</h2>
          <p className="text-sm text-gray-500">{rutaNombre} · <code className="text-gray-600">{modulo.id}</code></p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/modulo/${modulo.id}`}
            target="_blank"
            rel="noreferrer"
            className={`${btn} border-[#30363d] text-gray-300 hover:border-gray-500`}
          >
            Previsualizar
          </a>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1117] font-semibold text-sm transition-colors"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-5 px-4 py-3 rounded-xl border text-sm ${
          msg.ok ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
        }`}>
          {msg.texto}
        </div>
      )}

      {/* Datos del módulo */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 mb-6 grid md:grid-cols-[2fr_1fr] gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={input} />
          <label className="block text-sm text-gray-300 mb-1.5 mt-3">Descripción</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">XP al aprobar</label>
          <input
            type="number" min={0} max={1000} value={xp}
            onChange={(e) => setXp(Number(e.target.value))} className={input}
          />
          <p className="text-xs text-gray-500 mt-2">
            Se otorga una sola vez, al superar el 70% de respuestas correctas.
          </p>
        </div>
      </div>

      {/* Preguntas */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-xl font-bold text-gray-100">
          Preguntas <span className="text-gray-500 text-base font-normal">({preguntas.length})</span>
        </h3>
        <button onClick={agregarPregunta} className={`${btn} border-emerald-500/40 text-emerald-400 hover:border-emerald-500`}>
          + Agregar pregunta
        </button>
      </div>

      <div className="space-y-4">
        {preguntas.map((p, i) => (
          <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-sm font-bold text-gray-400">
                {i + 1}
              </span>
              <textarea
                value={p.texto}
                onChange={(e) => actualizarPregunta(i, { texto: e.target.value })}
                placeholder="Enunciado de la pregunta"
                rows={2}
                className={`${input} resize-y`}
              />
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => moverPregunta(i, -1)} disabled={i === 0} title="Subir"
                  className="px-2 py-0.5 rounded text-xs text-gray-400 hover:text-gray-100 disabled:opacity-30">↑</button>
                <button onClick={() => moverPregunta(i, 1)} disabled={i === preguntas.length - 1} title="Bajar"
                  className="px-2 py-0.5 rounded text-xs text-gray-400 hover:text-gray-100 disabled:opacity-30">↓</button>
                <button onClick={() => quitarPregunta(i)} title="Eliminar"
                  className="px-2 py-0.5 rounded text-xs text-gray-500 hover:text-rose-400">✕</button>
              </div>
            </div>

            <p className="text-xs text-gray-500 mb-2 ml-10">
              Marca el círculo de la <span className="text-emerald-400">respuesta correcta</span>
            </p>
            <div className="space-y-2 ml-10">
              {p.opciones.map((op, j) => (
                <div key={j} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correcta-${i}`}
                    checked={p.correcta === j}
                    onChange={() => actualizarPregunta(i, { correcta: j })}
                    className="w-4 h-4 accent-emerald-500 shrink-0"
                    title="Marcar como respuesta correcta"
                  />
                  <span className="text-sm text-gray-500 w-5 shrink-0">{String.fromCharCode(65 + j)}.</span>
                  <input
                    value={op}
                    onChange={(e) => actualizarOpcion(i, j, e.target.value)}
                    placeholder={`Opción ${String.fromCharCode(65 + j)}`}
                    className={`${input} ${p.correcta === j ? 'border-emerald-500/60' : ''}`}
                  />
                  <button
                    onClick={() => quitarOpcion(i, j)}
                    disabled={p.opciones.length <= 2}
                    title={p.opciones.length <= 2 ? 'Mínimo 2 opciones' : 'Quitar opción'}
                    className="px-2 text-gray-500 hover:text-rose-400 disabled:opacity-30 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {p.opciones.length < 6 && (
                <button onClick={() => agregarOpcion(i)} className="text-xs text-emerald-400 hover:underline ml-6">
                  + Agregar opción
                </button>
              )}
            </div>

            <div className="ml-10 mt-3">
              <label className="block text-xs text-gray-400 mb-1">Explicación (se muestra tras responder)</label>
              <textarea
                value={p.explicacion}
                onChange={(e) => actualizarPregunta(i, { explicacion: e.target.value })}
                rows={2}
                className={`${input} resize-y text-sm`}
              />
            </div>
          </div>
        ))}
      </div>

      {preguntas.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1117] font-semibold transition-colors"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
