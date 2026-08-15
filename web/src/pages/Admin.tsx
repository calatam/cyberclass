import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '../api';
import EditorModulo from '../components/EditorModulo';
import type { Usuario, AdminStats, AdminUser, CatalogoAdmin, ModuloAdmin, RutaAdmin } from '../types';

type Estado = 'cargando' | 'denegado' | 'ok' | 'error';
type Tab = 'contenido' | 'usuarios';

const btn = 'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-40';
const input = 'w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none';

export default function Admin() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [tab, setTab] = useState<Tab>('contenido');
  const [me, setMe] = useState<Usuario | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoAdmin | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState<{ modulo: ModuloAdmin; rutaNombre: string } | null>(null);
  const [nuevaRuta, setNuevaRuta] = useState(false);
  const [rutaEnEdicion, setRutaEnEdicion] = useState<RutaAdmin | null>(null);

  const cargar = useCallback(async () => {
    const [s, u, c] = await Promise.all([
      api<AdminStats>('/api/admin/stats'),
      api<{ usuarios: AdminUser[] }>('/api/admin/users'),
      api<CatalogoAdmin>('/api/admin/catalogo'),
    ]);
    setStats(s);
    setUsuarios(u.usuarios);
    setCatalogo(c);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setEstado('denegado');
      return;
    }
    (async () => {
      try {
        const yo = await api<Usuario>('/api/me');
        if (yo.rol !== 'admin') {
          setEstado('denegado');
          return;
        }
        setMe(yo);
        await cargar();
        setEstado('ok');
      } catch {
        setEstado('error');
      }
    })();
  }, [cargar]);

  const accion = async (fn: () => Promise<void>, exito: string) => {
    setOcupado(true);
    setAviso(null);
    try {
      await fn();
      setAviso({ ok: true, texto: exito });
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setOcupado(false);
    }
  };

  // ----- usuarios -----
  const cambiarRol = (u: AdminUser) => {
    const nuevoRol = u.rol === 'admin' ? 'alumno' : 'admin';
    if (!window.confirm(`¿Cambiar el rol de ${u.email} a ${nuevoRol}?`)) return;
    accion(
      async () => { await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { rol: nuevoRol } }); },
      `${u.email} ahora es ${nuevoRol}`,
    );
  };

  const resetearClave = async (u: AdminUser) => {
    if (!window.confirm(`¿Generar una contraseña temporal para ${u.email}?`)) return;
    setOcupado(true);
    setAviso(null);
    try {
      const r = await api<{ passwordTemporal: string }>(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' });
      setAviso({ ok: true, texto: `Contraseña temporal de ${u.email}: ${r.passwordTemporal} — cópiala ahora, no se volverá a mostrar.` });
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setOcupado(false);
    }
  };

  const eliminarUsuario = (u: AdminUser) => {
    if (!window.confirm(`¿Eliminar a ${u.email}? Se borra su cuenta, progreso e intentos.`)) return;
    accion(async () => { await api(`/api/admin/users/${u.id}`, { method: 'DELETE' }); }, `${u.email} eliminado`);
  };

  // ----- contenido -----
  const crearModulo = (ruta: RutaAdmin) => {
    const titulo = window.prompt(`Título del nuevo módulo en "${ruta.nombre}":`);
    if (!titulo || titulo.trim().length < 2) return;
    accion(
      async () => { await api(`/api/admin/rutas/${ruta.id}/modulos`, { method: 'POST', body: { titulo, descripcion: '', xp: 100 } }); },
      `Módulo "${titulo}" creado — ábrelo para agregarle preguntas`,
    );
  };

  const eliminarModulo = (m: ModuloAdmin) => {
    if (!window.confirm(`¿Eliminar el módulo "${m.titulo}"? Se borran sus preguntas y el progreso de los alumnos en él.`)) return;
    accion(async () => { await api(`/api/admin/modulos/${m.id}`, { method: 'DELETE' }); }, `Módulo "${m.titulo}" eliminado`);
  };

  const eliminarRuta = (r: RutaAdmin) => {
    if (!window.confirm(`¿Eliminar la ruta "${r.nombre}" con sus ${r.modulos.length} módulos? No se puede deshacer.`)) return;
    accion(async () => { await api(`/api/admin/rutas/${r.id}`, { method: 'DELETE' }); }, `Ruta "${r.nombre}" eliminada`);
  };

  if (estado === 'cargando') {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-gray-500 animate-pulse">Cargando panel…</div></div>;
  }

  if (estado === 'denegado') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">⛔</div>
        <h1 className="font-display text-2xl font-bold text-gray-100 mb-2">Acceso restringido</h1>
        <p className="text-gray-400 mb-6">Este panel requiere una cuenta con rol de administrador.</p>
        <Link to="/login" className="inline-block px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (estado === 'error' || !stats || !catalogo) {
    return <div className="max-w-md mx-auto px-4 py-24 text-center"><div className="text-5xl mb-4">⚠️</div><p className="text-gray-300">No se pudo cargar el panel.</p></div>;
  }

  // Vista de edición de un módulo (ocupa toda la página)
  if (editando) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EditorModulo
          modulo={editando.modulo}
          rutaNombre={editando.rutaNombre}
          onGuardado={cargar}
          onCerrar={() => setEditando(null)}
        />
      </div>
    );
  }

  const fmtFecha = (f: string | null) => (f ? f.slice(0, 16).replace('T', ' ') : '—');
  const totalModulos = catalogo.rutas.reduce((s, r) => s + r.modulos.length, 0);
  const totalPreguntas = catalogo.rutas.reduce((s, r) => s + r.modulos.reduce((t, m) => t + m.preguntas.length, 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-gray-100 mb-2">Panel de Administración</h1>
      <p className="text-gray-400 mb-6">Gestiona el contenido de los cursos y las cuentas de la plataforma.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[#30363d]">
        {([['contenido', `Contenido (${totalModulos} módulos)`], ['usuarios', `Usuarios (${usuarios.length})`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setAviso(null); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {aviso && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm ${
          aviso.ok ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
        }`}>
          {aviso.texto}
        </div>
      )}

      {tab === 'contenido' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { n: catalogo.rutas.length, l: 'Rutas' },
              { n: totalModulos, l: 'Módulos' },
              { n: totalPreguntas, l: 'Preguntas' },
              { n: catalogo.dominios.length, l: 'Dominios' },
            ].map((s) => (
              <div key={s.l} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 text-center">
                <div className="font-display text-2xl font-bold text-emerald-400">{s.n}</div>
                <div className="text-sm text-gray-400 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold text-gray-100">Rutas y módulos</h2>
            <button onClick={() => { setNuevaRuta(true); setRutaEnEdicion(null); }} className={`${btn} border-emerald-500/40 text-emerald-400 hover:border-emerald-500`}>
              + Nueva ruta
            </button>
          </div>

          {(nuevaRuta || rutaEnEdicion) && (
            <FormRuta
              dominios={catalogo.dominios}
              ruta={rutaEnEdicion}
              onCancelar={() => { setNuevaRuta(false); setRutaEnEdicion(null); }}
              onGuardado={async (texto) => {
                setNuevaRuta(false);
                setRutaEnEdicion(null);
                setAviso({ ok: true, texto });
                await cargar();
              }}
            />
          )}

          <div className="space-y-4">
            {catalogo.dominios.map((d) => {
              const rutasDom = catalogo.rutas.filter((r) => r.dominioId === d.id);
              if (rutasDom.length === 0) return null;
              return (
                <div key={d.id}>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                    <span className="text-lg">{d.icono}</span> {d.nombre}
                  </h3>
                  <div className="space-y-3">
                    {rutasDom.map((r) => (
                      <div key={r.id} className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#30363d]">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-100 truncate">
                              {r.nombre}
                              {r.proximamente && <span className="ml-2 text-xs text-gray-500">(próximamente)</span>}
                            </div>
                            <div className="text-xs text-gray-500">{r.nivel} · {r.modulos.length} módulos</div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => { setRutaEnEdicion(r); setNuevaRuta(false); }} disabled={ocupado}
                              className={`${btn} border-[#30363d] text-gray-300 hover:border-gray-500`}>Editar ruta</button>
                            <button onClick={() => crearModulo(r)} disabled={ocupado}
                              className={`${btn} border-[#30363d] text-gray-300 hover:border-emerald-500/60 hover:text-emerald-300`}>+ Módulo</button>
                            <button onClick={() => eliminarRuta(r)} disabled={ocupado}
                              className={`${btn} border-[#30363d] text-gray-300 hover:border-rose-500/60 hover:text-rose-300`}>Eliminar</button>
                          </div>
                        </div>
                        {r.modulos.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-500">Sin módulos. Usa “+ Módulo” para crear el primero.</p>
                        ) : (
                          <ul>
                            {r.modulos.map((m) => (
                              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#30363d]/40 last:border-0">
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-200 truncate">{m.titulo}</div>
                                  <div className="text-xs text-gray-500">
                                    {m.preguntas.length} pregunta{m.preguntas.length === 1 ? '' : 's'} · ⚡ {m.xp} XP
                                    {m.preguntas.length === 0 && <span className="text-amber-500/80"> · sin preguntas</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={() => setEditando({ modulo: m, rutaNombre: r.nombre })} disabled={ocupado}
                                    className={`${btn} border-emerald-500/40 text-emerald-400 hover:border-emerald-500`}>
                                    Editar preguntas
                                  </button>
                                  <button onClick={() => eliminarModulo(m)} disabled={ocupado}
                                    className={`${btn} border-[#30363d] text-gray-400 hover:border-rose-500/60 hover:text-rose-300`}>✕</button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { n: stats.usuarios, l: 'Alumnos' },
              { n: stats.intentos, l: 'Intentos totales' },
              { n: stats.modulosAprobados, l: 'Módulos aprobados' },
              { n: `⚡ ${stats.xpTotal}`, l: 'XP repartido' },
              { n: stats.intentosUltimos7Dias, l: 'Intentos (7 días)' },
            ].map((s) => (
              <div key={s.l} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 text-center">
                <div className="font-display text-xl font-bold text-emerald-400">{s.n}</div>
                <div className="text-xs text-gray-400 mt-1">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#30363d] text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium text-right">XP</th>
                  <th className="px-4 py-3 font-medium text-right">Módulos</th>
                  <th className="px-4 py-3 font-medium">Último intento</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esYo = me?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-[#30363d]/50 last:border-0 text-gray-200">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {u.nombre} {esYo && <span className="text-xs text-gray-500">(tú)</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                          u.rol === 'admin' ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400 bg-[#0d1117]'
                        }`}>{u.rol}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{u.xp}</td>
                      <td className="px-4 py-3 text-right">{u.modulos_aprobados}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtFecha(u.ultimo_intento)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <button onClick={() => cambiarRol(u)} disabled={esYo || ocupado}
                            title={esYo ? 'No puedes cambiar tu propio rol' : ''}
                            className={`${btn} border-[#30363d] text-gray-300 hover:border-amber-500/60 hover:text-amber-300`}>
                            {u.rol === 'admin' ? '→ alumno' : '→ admin'}
                          </button>
                          <button onClick={() => resetearClave(u)} disabled={ocupado}
                            className={`${btn} border-[#30363d] text-gray-300 hover:border-emerald-500/60 hover:text-emerald-300`}>
                            Reset clave
                          </button>
                          <button onClick={() => eliminarUsuario(u)} disabled={esYo || ocupado}
                            title={esYo ? 'No puedes eliminar tu propia cuenta' : ''}
                            className={`${btn} border-[#30363d] text-gray-300 hover:border-rose-500/60 hover:text-rose-300`}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- formulario de ruta (crear / editar) ----------

function FormRuta({ dominios, ruta, onCancelar, onGuardado }: {
  dominios: { id: string; nombre: string; icono: string }[];
  ruta: RutaAdmin | null;
  onCancelar: () => void;
  onGuardado: (texto: string) => void;
}) {
  const [nombre, setNombre] = useState(ruta?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(ruta?.descripcion ?? '');
  const [dominioId, setDominioId] = useState(ruta?.dominioId ?? dominios[0]?.id ?? '');
  const [nivel, setNivel] = useState<RutaAdmin['nivel']>(ruta?.nivel ?? 'Básico');
  const [proximamente, setProximamente] = useState(!!ruta?.proximamente);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const body = { nombre, descripcion, dominioId, nivel, proximamente };
      if (ruta) {
        await api(`/api/admin/rutas/${ruta.id}`, { method: 'PUT', body });
        onGuardado(`Ruta "${nombre}" actualizada`);
      } else {
        await api('/api/admin/rutas', { method: 'POST', body });
        onGuardado(`Ruta "${nombre}" creada`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="bg-[#161b22] border border-emerald-500/30 rounded-xl p-5 mb-5">
      <h3 className="font-semibold text-gray-100 mb-4">{ruta ? `Editar ruta: ${ruta.nombre}` : 'Nueva ruta'}</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} className={input} />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Dominio</label>
          <select value={dominioId} onChange={(e) => setDominioId(e.target.value)} className={input}>
            {dominios.map((d) => <option key={d.id} value={d.id}>{d.icono} {d.nombre}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-300 mb-1.5">Descripción</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Nivel</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value as RutaAdmin['nivel'])} className={input}>
            <option>Básico</option><option>Intermedio</option><option>Avanzado</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300 mt-6">
          <input type="checkbox" checked={proximamente} onChange={(e) => setProximamente(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
          Marcar como “próximamente” (no accesible para alumnos)
        </label>
      </div>
      {error && <p className="text-sm text-rose-400 mt-3">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={guardando}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1117] text-sm font-semibold transition-colors">
          {guardando ? 'Guardando…' : ruta ? 'Guardar cambios' : 'Crear ruta'}
        </button>
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 rounded-lg border border-[#30363d] text-gray-300 hover:border-gray-500 text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}
