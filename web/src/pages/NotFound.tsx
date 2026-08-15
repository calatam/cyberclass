import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="font-display text-4xl font-bold text-gray-100 mb-2">404</h1>
      <p className="text-gray-400 mb-8">Esta página no existe o fue movida.</p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors"
        >
          Ir al inicio
        </Link>
        <Link
          to="/rutas"
          className="px-5 py-2.5 rounded-xl border border-[#30363d] hover:border-gray-500 text-gray-200 font-semibold transition-colors"
        >
          Ver rutas
        </Link>
      </div>
    </div>
  );
}
