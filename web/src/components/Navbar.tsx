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
        className={`px-2 sm:px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
          active ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-gray-100'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0d1117]/80 border-b border-[#30363d]">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
        <Link to="/" className="shrink-0 flex items-center gap-1.5 sm:gap-2 font-display font-bold text-base sm:text-lg text-gray-100">
          <span className="text-xl sm:text-2xl">🛡️</span>
          Cyber<span className="text-emerald-400">Class</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
          {link('/rutas', 'Rutas')}
          {usuario ? (
            <>
              {link('/perfil', 'Perfil')}
              <div className="shrink-0 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold whitespace-nowrap">
                ⚡ {usuario.xp}
              </div>
              <span className="hidden lg:block ml-2 text-sm text-gray-400 truncate max-w-32">{usuario.nombre}</span>
              <button
                onClick={salir}
                className="shrink-0 ml-1 sm:ml-2 px-2 sm:px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 border border-[#30363d] hover:border-gray-500 whitespace-nowrap transition-colors"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="shrink-0 ml-1 sm:ml-2 px-3 sm:px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] text-sm font-semibold whitespace-nowrap transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
