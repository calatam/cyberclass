import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, getToken } from '../api';
import type { Usuario, AdminStats, AdminUser } from '../types';

type Estado = 'cargando' | 'denegado' | 'ok' | 'error';

export default function Admin() {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);

  useEffect(() => {
    if (!getToken()) {
      setEstado('denegado');
      return;
    }
    (async () => {
      try {
        const me = await api<Usuario>('/api/me');
        if (me.rol !== 'admin') {
          setEstado('denegado');
          return;
        }
        const [s, u] = await Promise.all([
          api<AdminStats>('/api/admin/stats'),
          api<{ usuarios: AdminUser[] }>('/api/admin/users'),
        ]);
        setStats(s);
        setUsuarios(u.usuarios);
        setEstado('ok');
      } catch {
        setEstado('error');
      }
    })();
  }, []);

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-gray-100 mb-2">Panel de Administración</h1>
      <p className="text-gray-400 mb-8">Vista general de la plataforma y sus usuarios.</p>

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
              <th className="px-4 py-3 font-medium">Registro</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-[#30363d]/50 last:border-0 text-gray-200">
                <td className="px-4 py-3 font-medium">{u.nombre}</td>
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
                <td className="px-4 py-3 text-gray-400">{fmtFecha(u.ultimo_intento)}</td>
                <td className="px-4 py-3 text-gray-400">{fmtFecha(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
