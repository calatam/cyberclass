import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, getToken, clearToken } from '../api';
import { useI18n, IDIOMAS } from '../i18n';
import type { Usuario } from '../types';

export default function Navbar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { t, idioma, setIdioma } = useI18n();
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
          {/* El admin gestiona contenido; no navega el catálogo como alumno */}
          {usuario?.rol !== 'admin' && link('/rutas', t('nav.rutas'))}
          {usuario ? (
            <>
              {usuario.rol === 'admin' ? (
                <>
                  {/* Sin XP ni gamificación: administrar no es aprender */}
                  {link('/admin', t('nav.panel'))}
                  {link('/perfil', t('nav.cuenta'))}
                  <span className="hidden sm:block shrink-0 px-2 py-0.5 rounded-md text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30">
                    {t('nav.admin')}
                  </span>
                </>
              ) : (
                <>
                  {link('/perfil', t('nav.perfil'))}
                  <div className="shrink-0 px-2 sm:px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold whitespace-nowrap">
                    ⚡ {usuario.xp}
                  </div>
                </>
              )}
              <span className="hidden lg:block ml-2 text-sm text-gray-400 truncate max-w-32">{usuario.nombre}</span>
              <SelectorIdioma idioma={idioma} setIdioma={setIdioma} />
              <button
                onClick={salir}
                className="shrink-0 px-2 sm:px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-gray-100 border border-[#30363d] hover:border-gray-500 whitespace-nowrap transition-colors"
              >
                {t('nav.salir')}
              </button>
            </>
          ) : (
            <>
              <SelectorIdioma idioma={idioma} setIdioma={setIdioma} />
              <Link
                to="/login"
                className="shrink-0 px-3 sm:px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] text-sm font-semibold whitespace-nowrap transition-colors"
              >
                {t('nav.entrar')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function SelectorIdioma({ idioma, setIdioma }: { idioma: string; setIdioma: (i: 'es' | 'en') => void }) {
  return (
    <div className="shrink-0 mx-1 sm:mx-2 flex rounded-lg border border-[#30363d] overflow-hidden" role="group" aria-label="Idioma / Language">
      {IDIOMAS.map((i) => (
        <button
          key={i}
          onClick={() => setIdioma(i)}
          aria-pressed={idioma === i}
          className={`px-2 py-1 text-xs font-semibold uppercase transition-colors ${
            idioma === i ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-200'
          }`}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
