import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api, setToken } from '../api';
import type { Usuario } from '../types';

export default function Login() {
  const navigate = useNavigate();
  const loc = useLocation();
  const next = (loc.state as { next?: string } | null)?.next ?? '/rutas';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const r = await api<{ token: string; usuario: Usuario }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setToken(r.token);
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-gray-100 mb-2 text-center">Iniciar sesión</h1>
      <p className="text-gray-400 text-center mb-8">Tu progreso y XP se guardan en tu cuenta.</p>

      <form onSubmit={enviar} className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-gray-300 mb-1.5">Email</label>
          <input
            id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none"
            placeholder="tu@email.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-gray-300 mb-1.5">Contraseña</label>
          <input
            id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit" disabled={cargando}
          className="w-full px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1117] font-semibold transition-colors"
        >
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" state={{ next }} className="text-emerald-400 hover:underline">Regístrate gratis</Link>
      </p>
    </div>
  );
}
