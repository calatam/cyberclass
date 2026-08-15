import { Link } from 'react-router-dom';
import { useCatalogo } from '../catalogo-context';
import { useI18n } from '../i18n';

export default function Landing() {
  const { dominios, rutas } = useCatalogo();
  const { t } = useI18n();
  const modulos = rutas.flatMap((r) => r.modulos);
  const totalPreguntas = modulos.reduce((s, m) => s + m.preguntas.length, 0);
  const rutasActivas = rutas.filter((r) => !r.proximamente).length;

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Hero */}
      <section className="pt-20 pb-16 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6">
          {t('landing.badge')}
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-extrabold text-gray-100 leading-tight mb-6">
          {t('landing.titulo1')}<br />
          <span className="text-emerald-400">{t('landing.titulo2')}</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">{t('landing.sub')}</p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/rutas"
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors"
          >
            {t('landing.cta1')}
          </Link>
          <Link
            to="/registro"
            className="px-6 py-3 rounded-xl border border-[#30363d] hover:border-gray-500 text-gray-200 font-semibold transition-colors"
          >
            {t('landing.cta2')}
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
        {[
          { n: rutasActivas, l: t('landing.stat.rutas') },
          { n: modulos.length, l: t('landing.stat.modulos') },
          { n: totalPreguntas, l: t('landing.stat.preguntas') },
          { n: dominios.length, l: t('landing.stat.dominios') },
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
          {t('landing.dominios.titulo')}
        </h2>
        <p className="text-gray-400 text-center mb-10">{t('landing.dominios.sub')}</p>
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
