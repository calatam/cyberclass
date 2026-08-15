import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api, setToken } from '../api';
import type { Usuario } from '../types';

export default function Registro() {
  const navigate = useNavigate();
  const loc = useLocation();
  const next = (loc.state as { next?: string } | null)?.next ?? '/rutas';
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setCargando(true);
    try {
      const r = await api<{ token: string; usuario: Usuario }>('/api/auth/register', {
        method: 'POST',
        body: { nombre, email, password },
      });
      setToken(r.token);
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-gray-100 mb-2 text-center">Crear cuenta</h1>
      <p className="text-gray-400 text-center mb-8">Gratis. Guarda tu progreso, gana XP e insignias.</p>

      <form onSubmit={enviar} className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 space-y-4">
        <div>
          <label htmlFor="nombre" className="block text-sm text-gray-300 mb-1.5">Nombre</label>
          <input
            id="nombre" type="text" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none"
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm text-gray-300 mb-1.5">Email</label>
          <input
            id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none"
            placeholder="tu@email.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-gray-300 mb-1.5">Contraseña (mín. 8 caracteres)</label>
          <input
            id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit" disabled={cargando}
          className="w-full px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1117] font-semibold transition-colors"
        >
          {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" state={{ next }} className="text-emerald-400 hover:underline">Inicia sesión</Link>
      </p>
    </div>
  );
}
