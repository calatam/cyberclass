import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '../api';
import { useI18n, IDIOMAS } from '../i18n';
import type { Idioma } from '../i18n';
import EditorModulo from '../components/EditorModulo';
import type { Usuario, AdminStats, AdminUser, CatalogoAdmin, ModuloAdmin, RutaAdmin, Dominio } from '../types';

type Estado = 'cargando' | 'denegado' | 'ok' | 'error';
type Tab = 'contenido' | 'usuarios';

const btn = 'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-40';
const input = 'w-full px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none';

export default function Admin() {
  const { t, idioma } = useI18n();
  const [estado, setEstado] = useState<Estado>('cargando');
  const [tab, setTab] = useState<Tab>('contenido');
  // Idioma del CONTENIDO que se está editando (independiente del de la interfaz)
  const [idiomaContenido, setIdiomaContenido] = useState<Idioma>(idioma);
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
      api<CatalogoAdmin>(`/api/admin/catalogo?idioma=${idiomaContenido}`),
    ]);
    setStats(s);
    setUsuarios(u.usuarios);
    setCatalogo(c);
  }, [idiomaContenido]);

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
      setAviso({ ok: false, texto: err instanceof Error ? err.message : t('comun.error') });
    } finally {
      setOcupado(false);
    }
  };

  // ----- usuarios -----
  const cambiarRol = (u: AdminUser) => {
    const nuevoRol = u.rol === 'admin' ? 'alumno' : 'admin';
    if (!window.confirm(t('admin.confirm.rol', { email: u.email, rol: nuevoRol }))) return;
    accion(
      async () => { await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { rol: nuevoRol } }); },
      t('admin.ok.rol', { email: u.email, rol: nuevoRol }),
    );
  };

  const resetearClave = async (u: AdminUser) => {
    if (!window.confirm(t('admin.confirm.reset', { email: u.email }))) return;
    setOcupado(true);
    setAviso(null);
    try {
      const r = await api<{ passwordTemporal: string }>(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' });
      setAviso({ ok: true, texto: t('admin.ok.reset', { email: u.email, pass: r.passwordTemporal }) });
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : t('comun.error') });
    } finally {
      setOcupado(false);
    }
  };

  const eliminarUsuario = (u: AdminUser) => {
    if (!window.confirm(t('admin.confirm.borrarUsuario', { email: u.email }))) return;
    accion(async () => { await api(`/api/admin/users/${u.id}`, { method: 'DELETE' }); }, t('admin.ok.borrado', { email: u.email }));
  };

  // ----- contenido -----
  const crearModulo = (ruta: RutaAdmin) => {
    const titulo = window.prompt(t('admin.prompt.modulo', { ruta: ruta.nombre }));
    if (!titulo || titulo.trim().length < 2) return;
    accion(
      async () => { await api(`/api/admin/rutas/${ruta.id}/modulos`, { method: 'POST', body: { titulo, descripcion: '', xp: 100 } }); },
      t('admin.ok.moduloCreado', { titulo }),
    );
  };

  const eliminarModulo = (m: ModuloAdmin) => {
    if (!window.confirm(t('admin.confirm.borrarModulo', { titulo: m.titulo }))) return;
    accion(async () => { await api(`/api/admin/modulos/${m.id}`, { method: 'DELETE' }); }, t('admin.ok.moduloBorrado', { titulo: m.titulo }));
  };

  const eliminarRuta = (r: RutaAdmin) => {
    if (!window.confirm(t('admin.confirm.borrarRuta', { nombre: r.nombre, n: r.modulos.length }))) return;
    accion(async () => { await api(`/api/admin/rutas/${r.id}`, { method: 'DELETE' }); }, t('admin.ok.rutaBorrada', { nombre: r.nombre }));
  };

  if (estado === 'cargando') {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="text-gray-500 animate-pulse">{t('comun.cargando')}</div></div>;
  }

  if (estado === 'denegado') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">⛔</div>
        <h1 className="font-display text-2xl font-bold text-gray-100 mb-2">{t('admin.denegado')}</h1>
        <p className="text-gray-400 mb-6">{t('admin.denegadoSub')}</p>
        <Link to="/login" className="inline-block px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors">
          {t('login.entrar')}
        </Link>
      </div>
    );
  }

  if (estado === 'error' || !stats || !catalogo) {
    return <div className="max-w-md mx-auto px-4 py-24 text-center"><div className="text-5xl mb-4">⚠️</div><p className="text-gray-300">{t('admin.errorCarga')}</p></div>;
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
  const totalPreguntas = catalogo.rutas.reduce((s, r) => s + r.modulos.reduce((x, m) => x + m.preguntas.length, 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-gray-100 mb-2">{t('admin.titulo')}</h1>
      <p className="text-gray-400 mb-6">{t('admin.sub')}</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[#30363d]">
        {([['contenido', `${t('admin.tab.contenido')} (${totalModulos})`], ['usuarios', `${t('admin.tab.usuarios')} (${usuarios.length})`]] as const).map(([id, label]) => (
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
          {/* Selector de idioma del contenido */}
          <div className="flex items-center gap-3 mb-6 bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-3">
            <span className="text-sm text-gray-300 font-medium">{t('admin.idioma')}:</span>
            <div className="flex rounded-lg border border-[#30363d] overflow-hidden">
              {IDIOMAS.map((i) => (
                <button
                  key={i}
                  onClick={() => { setIdiomaContenido(i); setAviso(null); setNuevaRuta(false); setRutaEnEdicion(null); }}
                  disabled={ocupado}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                    idiomaContenido === i ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-200'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">
              {idiomaContenido === 'es' ? 'Editando el curso en español' : 'Editing the English course'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { n: catalogo.rutas.length, l: t('admin.stat.rutas') },
              { n: totalModulos, l: t('admin.stat.modulos') },
              { n: totalPreguntas, l: t('admin.stat.preguntas') },
              { n: catalogo.dominios.length, l: t('admin.stat.dominios') },
            ].map((s) => (
              <div key={s.l} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 text-center">
                <div className="font-display text-2xl font-bold text-emerald-400">{s.n}</div>
                <div className="text-sm text-gray-400 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold text-gray-100">{t('admin.rutasModulos')}</h2>
            <button onClick={() => { setNuevaRuta(true); setRutaEnEdicion(null); }} className={`${btn} border-emerald-500/40 text-emerald-400 hover:border-emerald-500`}>
              {t('admin.nuevaRuta')}
            </button>
          </div>

          {(nuevaRuta || rutaEnEdicion) && (
            <FormRuta
              dominios={catalogo.dominios}
              ruta={rutaEnEdicion}
              idioma={idiomaContenido}
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
                              {r.proximamente && <span className="ml-2 text-xs text-gray-500">({t('rutas.proximamente')})</span>}
                            </div>
                            <div className="text-xs text-gray-500">{t(`nivel.${r.nivel}`)} · {r.modulos.length} {t('comun.modulos')}</div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => { setRutaEnEdicion(r); setNuevaRuta(false); }} disabled={ocupado}
                              className={`${btn} border-[#30363d] text-gray-300 hover:border-gray-500`}>{t('admin.editarRuta')}</button>
                            <button onClick={() => crearModulo(r)} disabled={ocupado}
                              className={`${btn} border-[#30363d] text-gray-300 hover:border-emerald-500/60 hover:text-emerald-300`}>{t('admin.nuevoModulo')}</button>
                            <button onClick={() => eliminarRuta(r)} disabled={ocupado}
                              className={`${btn} border-[#30363d] text-gray-300 hover:border-rose-500/60 hover:text-rose-300`}>{t('comun.eliminar')}</button>
                          </div>
                        </div>
                        {r.modulos.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-500">{t('admin.sinModulos')}</p>
                        ) : (
                          <ul>
                            {r.modulos.map((m) => (
                              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#30363d]/40 last:border-0">
                                <div className="min-w-0">
                                  <div className="text-sm text-gray-200 truncate">{m.titulo}</div>
                                  <div className="text-xs text-gray-500">
                                    {m.preguntas.length} {m.preguntas.length === 1 ? t('comun.pregunta') : t('comun.preguntas')} · ⚡ {m.xp} XP
                                    {m.preguntas.length === 0 && <span className="text-amber-500/80">{t('admin.sinPreguntas')}</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={() => setEditando({ modulo: m, rutaNombre: r.nombre })} disabled={ocupado}
                                    className={`${btn} border-emerald-500/40 text-emerald-400 hover:border-emerald-500`}>
                                    {t('admin.editarPreguntas')}
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
              { n: stats.usuarios, l: t('admin.stat.alumnos') },
              { n: stats.intentos, l: t('admin.stat.intentos') },
              { n: stats.modulosAprobados, l: t('admin.stat.aprobados') },
              { n: `⚡ ${stats.xpTotal}`, l: t('admin.stat.xp') },
              { n: stats.intentosUltimos7Dias, l: t('admin.stat.intentos7') },
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
                  <th className="px-4 py-3 font-medium">{t('admin.tabla.nombre')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.tabla.email')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.tabla.rol')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('admin.tabla.xp')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('admin.tabla.modulos')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.tabla.ultimo')}</th>
                  <th className="px-4 py-3 font-medium">{t('admin.tabla.acciones')}</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esYo = me?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-[#30363d]/50 last:border-0 text-gray-200">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {u.nombre} {esYo && <span className="text-xs text-gray-500">{t('admin.tabla.tu')}</span>}
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
                            title={esYo ? t('admin.noPropioRol') : ''}
                            className={`${btn} border-[#30363d] text-gray-300 hover:border-amber-500/60 hover:text-amber-300`}>
                            {u.rol === 'admin' ? '→ alumno' : '→ admin'}
                          </button>
                          <button onClick={() => resetearClave(u)} disabled={ocupado}
                            className={`${btn} border-[#30363d] text-gray-300 hover:border-emerald-500/60 hover:text-emerald-300`}>
                            {t('admin.resetClave')}
                          </button>
                          <button onClick={() => eliminarUsuario(u)} disabled={esYo || ocupado}
                            title={esYo ? t('admin.noPropiaCuenta') : ''}
                            className={`${btn} border-[#30363d] text-gray-300 hover:border-rose-500/60 hover:text-rose-300`}>
                            {t('comun.eliminar')}
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

function FormRuta({ dominios, ruta, idioma, onCancelar, onGuardado }: {
  dominios: Dominio[];
  ruta: RutaAdmin | null;
  idioma: Idioma;
  onCancelar: () => void;
  onGuardado: (texto: string) => void;
}) {
  const { t } = useI18n();
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
      const body = { nombre, descripcion, dominioId, nivel, proximamente, idioma };
      if (ruta) {
        await api(`/api/admin/rutas/${ruta.id}`, { method: 'PUT', body });
        onGuardado(t('admin.ok.rutaActualizada', { nombre }));
      } else {
        await api('/api/admin/rutas', { method: 'POST', body });
        onGuardado(t('admin.ok.rutaCreada', { nombre }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('comun.error'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="bg-[#161b22] border border-emerald-500/30 rounded-xl p-5 mb-5">
      <h3 className="font-semibold text-gray-100 mb-4">
        {ruta ? t('admin.formRuta.editar', { nombre: ruta.nombre }) : t('admin.formRuta.nueva')}
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">{t('admin.formRuta.nombre')}</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} className={input} />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">{t('admin.formRuta.dominio')}</label>
          <select value={dominioId} onChange={(e) => setDominioId(e.target.value)} className={input}>
            {dominios.map((d) => <option key={d.id} value={d.id}>{d.icono} {d.nombre}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-300 mb-1.5">{t('admin.formRuta.descripcion')}</label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">{t('admin.formRuta.nivel')}</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value as RutaAdmin['nivel'])} className={input}>
            <option value="Básico">{t('nivel.Básico')}</option>
            <option value="Intermedio">{t('nivel.Intermedio')}</option>
            <option value="Avanzado">{t('nivel.Avanzado')}</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300 mt-6">
          <input type="checkbox" checked={proximamente} onChange={(e) => setProximamente(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
          {t('admin.formRuta.proximamente')}
        </label>
      </div>
      {error && <p className="text-sm text-rose-400 mt-3">{error}</p>}
      <div className="flex gap-2 mt-4">
        <button type="submit" disabled={guardando}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1117] text-sm font-semibold transition-colors">
          {guardando ? t('comun.guardando') : ruta ? t('editor.guardarCambios') : t('admin.formRuta.crear')}
        </button>
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 rounded-lg border border-[#30363d] text-gray-300 hover:border-gray-500 text-sm transition-colors">
          {t('comun.cancelar')}
        </button>
      </div>
    </form>
  );
}
