import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, getToken, clearToken } from '../api';
import type { Usuario } from '../types';

export default function Navbar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setUsuario(null);
      return;
    }
    api<Usuario>('/api/me').then(setUsuario).catch(() => setUsuario(null));
  }, [loc]);

  const salir = () => {
    clearToken();
    setUsuario(null);
    navigate('/');
  };

  const link = (to: string, label: string) => {
    const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-gray-100'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0d1117]/80 border-b border-[#30363d]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-gray-100">
          <span className="text-2xl">🛡️</span>
          Cyber<span className="text-emerald-400">Class</span>
        </Link>
        <div className="flex items-center gap-1">
          {link('/rutas', 'Rutas')}
          {usuario ? (
            <>
              {link('/perfil', 'Mi Perfil')}
              <div className="ml-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
                ⚡ {usuario.xp} XP
              </div>
              <span className="hidden sm:block ml-2 text-sm text-gray-400">{usuario.nombre}</span>
              <button
                onClick={salir}
                className="ml-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 border border-[#30363d] hover:border-gray-500 transition-colors"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="ml-2 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] text-sm font-semibold transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
