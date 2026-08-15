import { Link } from 'react-router-dom';
import { useCatalogo } from '../catalogo-context';

export default function Landing() {
  const { dominios, rutas } = useCatalogo();
  const modulos = rutas.flatMap((r) => r.modulos);
  const totalPreguntas = modulos.reduce((s, m) => s + m.preguntas.length, 0);
  const rutasActivas = rutas.filter((r) => !r.proximamente).length;

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Hero */}
      <section className="pt-20 pb-16 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6">
          🛡️ Formación en Ciberseguridad · CA LATAM
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-extrabold text-gray-100 leading-tight mb-6">
          Aprende ciberseguridad<br />
          <span className="text-emerald-400">a tu ritmo</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
          Rutas de aprendizaje con cuestionarios interactivos: desde fundamentos hasta
          análisis de malware. Crea tu cuenta, gana XP e insignias, y avanza por los 5 dominios de la seguridad.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/rutas"
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors"
          >
            Empezar a aprender →
          </Link>
          <Link
            to="/registro"
            className="px-6 py-3 rounded-xl border border-[#30363d] hover:border-gray-500 text-gray-200 font-semibold transition-colors"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
        {[
          { n: rutasActivas, l: 'Rutas de aprendizaje' },
          { n: modulos.length, l: 'Módulos' },
          { n: totalPreguntas, l: 'Preguntas' },
          { n: dominios.length, l: 'Dominios' },
        ].map((s) => (
          <div key={s.l} className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 text-center">
            <div className="font-display text-3xl font-bold text-emerald-400">{s.n}</div>
            <div className="text-sm text-gray-400 mt-1">{s.l}</div>
          </div>
        ))}
      </section>

      {/* Dominios */}
      <section className="pb-24">
        <h2 className="font-display text-3xl font-bold text-gray-100 text-center mb-3">
          Los 5 dominios de la ciberseguridad
        </h2>
        <p className="text-gray-400 text-center mb-10">Una progresión lógica desde lo básico hasta la especialización.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dominios.map((d) => {
            const rutasDom = rutas.filter((r) => r.dominioId === d.id);
            return (
              <div key={d.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 hover:border-emerald-500/40 transition-colors">
                <div className="text-4xl mb-3">{d.icono}</div>
                <h3 className="font-display text-xl font-bold text-gray-100 mb-2">{d.nombre}</h3>
                <p className="text-sm text-gray-400 mb-4">{d.descripcion}</p>
                <div className="flex flex-wrap gap-2">
                  {rutasDom.map((r) => (
                    <span key={r.id} className="text-xs px-2 py-1 rounded-md bg-[#0d1117] border border-[#30363d] text-gray-300">
                      {r.nombre}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
