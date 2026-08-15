import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { api, getToken } from '../api';
import type { Usuario, AdminStats, AdminUser } from '../types';

type Estado = 'cargando' | 'denegado' | 'ok' | 'error';

export default function Admin() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [me, setMe] = useState<Usuario | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const [s, u] = await Promise.all([
      api<AdminStats>('/api/admin/stats'),
      api<{ usuarios: AdminUser[] }>('/api/admin/users'),
    ]);
    setStats(s);
    setUsuarios(u.usuarios);
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

  const cambiarRol = async (u: AdminUser) => {
    const nuevoRol = u.rol === 'admin' ? 'alumno' : 'admin';
    if (!window.confirm(`¿Cambiar el rol de ${u.email} a ${nuevoRol}?`)) return;
    setOcupado(true);
    setAviso(null);
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { rol: nuevoRol } });
      setAviso({ ok: true, texto: `${u.email} ahora es ${nuevoRol}` });
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setOcupado(false);
    }
  };

  const resetearClave = async (u: AdminUser) => {
    if (!window.confirm(`¿Generar una contraseña temporal para ${u.email}? La actual dejará de funcionar.`)) return;
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

  const eliminar = async (u: AdminUser) => {
    if (!window.confirm(`¿Eliminar a ${u.email}? Se borra su cuenta, progreso e intentos. Esta acción no se puede deshacer.`)) return;
    setOcupado(true);
    setAviso(null);
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      setAviso({ ok: true, texto: `${u.email} eliminado` });
      await cargar();
    } catch (err) {
      setAviso({ ok: false, texto: err instanceof Error ? err.message : 'Error' });
    } finally {
      setOcupado(false);
    }
  };

  if (estado === 'cargando') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Cargando panel…</div>
      </div>
    );
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

  if (estado === 'error' || !stats) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-gray-300">No se pudo cargar el panel. Intenta de nuevo.</p>
      </div>
    );
  }

  const fmtFecha = (f: string | null) => (f ? f.slice(0, 16).replace('T', ' ') : '—');
  const btnCls = 'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:opacity-40';

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-gray-100 mb-2">Panel de Administración</h1>
      <p className="text-gray-400 mb-8">Gestión de la plataforma y sus usuarios.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        {[
          { n: stats.usuarios, l: 'Usuarios' },
          { n: stats.intentos, l: 'Intentos totales' },
          { n: stats.modulosAprobados, l: 'Módulos aprobados' },
          { n: `⚡ ${stats.xpTotal}`, l: 'XP repartido' },
          { n: stats.intentosUltimos7Dias, l: 'Intentos (7 días)' },
        ].map((s) => (
          <div key={s.l} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 text-center">
            <div className="font-display text-2xl font-bold text-emerald-400">{s.n}</div>
            <div className="text-sm text-gray-400 mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Aviso de acciones */}
      {aviso && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm ${
          aviso.ok ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
        }`}>
          {aviso.texto}
        </div>
      )}

      {/* Tabla de usuarios */}
      <h2 className="font-display text-2xl font-bold text-gray-100 mb-4">Usuarios</h2>
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
                    }`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{u.xp}</td>
                  <td className="px-4 py-3 text-right">{u.modulos_aprobados}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtFecha(u.ultimo_intento)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => cambiarRol(u)}
                        disabled={esYo || ocupado}
                        title={esYo ? 'No puedes cambiar tu propio rol' : ''}
                        className={`${btnCls} border-[#30363d] text-gray-300 hover:border-amber-500/60 hover:text-amber-300`}
                      >
                        {u.rol === 'admin' ? '→ alumno' : '→ admin'}
                      </button>
                      <button
                        onClick={() => resetearClave(u)}
                        disabled={ocupado}
                        className={`${btnCls} border-[#30363d] text-gray-300 hover:border-emerald-500/60 hover:text-emerald-300`}
                      >
                        Reset clave
                      </button>
                      <button
                        onClick={() => eliminar(u)}
                        disabled={esYo || ocupado}
                        title={esYo ? 'No puedes eliminar tu propia cuenta' : ''}
                        className={`${btnCls} border-[#30363d] text-gray-300 hover:border-rose-500/60 hover:text-rose-300`}
                      >
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
    </div>
  );
}
