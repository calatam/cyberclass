import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getProgreso } from '../store';

export default function Navbar() {
  const loc = useLocation();
  const [xp, setXp] = useState(0);

  useEffect(() => {
    setXp(getProgreso().xp);
  }, [loc]);

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
          {link('/perfil', 'Mi Perfil')}
          <div className="ml-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
            ⚡ {xp} XP
          </div>
        </div>
      </div>
    </nav>
  );
}
