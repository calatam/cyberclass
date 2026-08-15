import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCatalogo } from '../catalogo-context';
import { useI18n } from '../i18n';
import { api, getToken } from '../api';
import { fetchProgreso, calcularInsignias, progresoRuta, moduloAprobado, PROGRESO_VACIO } from '../store';
import type { Progreso, Usuario } from '../types';

export default function Perfil() {
  const { rutas } = useCatalogo();
  const { t } = useI18n();
  const [progreso, setProgreso] = useState<Progreso>(PROGRESO_VACIO);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Configuración: cambiar nombre
  const [nombre, setNombre] = useState('');
  const [msgNombre, setMsgNombre] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  // Configuración: cambiar contraseña
  const [passActual, setPassActual] = useState('');
  const [passNueva, setPassNueva] = useState('');
  const [msgPass, setMsgPass] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardandoPass, setGuardandoPass] = useState(false);

  useEffect(() => {
    fetchProgreso().then(setProgreso);
    if (getToken()) {
      api<Usuario>('/api/me').then((u) => {
        setUsuario(u);
        setNombre(u.nombre);
      }).catch(() => setUsuario(null)).finally(() => setCargando(false));
    } else {
      setCargando(false);
    }
  }, []);

  if (!getToken()) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h1 className="font-display text-2xl font-bold text-gray-100 mb-2">{t('perfil.loginRequerido')}</h1>
        <p className="text-gray-400 mb-6">{t('perfil.loginSub')}</p>
        <Link
          to="/login"
          className="inline-block px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0d1117] font-semibold transition-colors"
        >
          {t('login.entrar')}
        </Link>
      </div>
    );
  }

  const guardarNombre = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgNombre(null);
    setGuardandoNombre(true);
    try {
      const u = await api<Usuario>('/api/me', { method: 'PATCH', body: { nombre } });
      setUsuario(u);
      setMsgNombre({ ok: true, texto: t('perfil.nombreOk') });
    } catch (err) {
      setMsgNombre({ ok: false, texto: err instanceof Error ? err.message : t('comun.error') });
    } finally {
      setGuardandoNombre(false);
    }
  };

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgPass(null);
    if (passNueva.length < 8) {
      setMsgPass({ ok: false, texto: t('registro.passCorta') });
      return;
    }
    setGuardandoPass(true);
    try {
      await api<{ ok: boolean }>('/api/auth/password', { method: 'POST', body: { actual: passActual, nueva: passNueva } });
      setMsgPass({ ok: true, texto: t('perfil.passOk') });
      setPassActual('');
      setPassNueva('');
    } catch (err) {
      setMsgPass({ ok: false, texto: err instanceof Error ? err.message : t('comun.error') });
    } finally {
      setGuardandoPass(false);
    }
  };

  const insignias = calcularInsignias(progreso, rutas);
  const ganadas = insignias.filter((i) => i.ganada).length;
  const modulosAprobados = Object.keys(progreso.completados).filter((id) => moduloAprobado(progreso, id)).length;
  const rutasEnProgreso = rutas
    .filter((r) => !r.proximamente)
    .map((r) => ({ ruta: r, pr: progresoRuta(progreso, r) }))
    .filter((x) => x.pr.hechos > 0);

  const inputCls = 'w-full px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-gray-100 focus:border-emerald-500 focus:outline-none';

  const seccionConfiguracion = (
    <section>
      <h2 className="font-display text-2xl font-bold text-gray-100 mb-4">{t('perfil.config')}</h2>
      <div className="grid md:grid-cols-2 gap-5">
        {/* Cambiar nombre */}
        <form onSubmit={guardarNombre} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="font-semibold text-gray-100 mb-3">{t('perfil.cambiarNombre')}</h3>
          <label htmlFor="cfg-nombre" className="block text-sm text-gray-300 mb-1.5">{t('registro.nombre')}</label>
          <input
            id="cfg-nombre" type="text" required minLength={2} value={nombre}
            onChange={(e) => setNombre(e.target.value)} className={inputCls}
          />
          {msgNombre && (
            <p className={`text-sm mt-2 ${msgNombre.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msgNombre.texto}</p>
          )}
          <button
            type="submit" disabled={guardandoNombre}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1117] text-sm font-semibold transition-colors"
          >
            {guardandoNombre ? t('comun.guardando') : t('comun.guardar')}
          </button>
        </form>

        {/* Cambiar contraseña */}
        <form onSubmit={cambiarPassword} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="font-semibold text-gray-100 mb-3">{t('perfil.cambiarPass')}</h3>
          <label htmlFor="cfg-pass-actual" className="block text-sm text-gray-300 mb-1.5">{t('perfil.passActual')}</label>
          <input
            id="cfg-pass-actual" type="password" required value={passActual}
            onChange={(e) => setPassActual(e.target.value)} className={inputCls}
          />
          <label htmlFor="cfg-pass-nueva" className="block text-sm text-gray-300 mb-1.5 mt-3">{t('perfil.passNueva')}</label>
          <input
            id="cfg-pass-nueva" type="password" required minLength={8} value={passNueva}
            onChange={(e) => setPassNueva(e.target.value)} className={inputCls}
          />
          {msgPass && (
            <p className={`text-sm mt-2 ${msgPass.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msgPass.texto}</p>
          )}
          <button
            type="submit" disabled={guardandoPass}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1117] text-sm font-semibold transition-colors"
          >
            {guardandoPass ? t('perfil.cambiando') : t('perfil.cambiar')}
          </button>
        </form>
      </div>
    </section>
  );

  if (cargando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">{t('comun.cargando')}</div>
      </div>
    );
  }

  // Vista de administrador: cuenta y configuración, sin gamificación de alumno
  if (usuario?.rol === 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-gray-100 mb-1">{t('perfil.cuenta')}</h1>
        <p className="text-gray-400 mb-8 flex items-center gap-2">
          {usuario.nombre} · {usuario.email}
          <span className="text-xs px-2 py-0.5 rounded-md font-medium text-amber-400 bg-amber-500/10 border border-amber-500/30">admin</span>
        </p>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 mb-10 text-sm text-gray-400">
          {t('perfil.adminAviso1')} <span className="text-amber-400 font-medium">{t('perfil.adminAviso2')}</span>{t('perfil.adminAviso3')}{' '}
          <Link to="/admin" className="text-emerald-400 hover:underline">{t('perfil.adminAviso4')}</Link>{t('perfil.adminAviso5')}
        </div>
        {seccionConfiguracion}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-gray-100 mb-1">{t('perfil.titulo')}</h1>
      {usuario && <p className="text-gray-400 mb-8">{usuario.nombre} · {usuario.email}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { n: `⚡ ${progreso.xp}`, l: t('perfil.xpTotal') },
          { n: modulosAprobados, l: t('perfil.modulosAprobados') },
          { n: `${ganadas}/${insignias.length}`, l: t('perfil.insignias') },
          { n: rutasEnProgreso.length, l: t('perfil.rutasIniciadas') },
        ].map((s) => (
          <div key={s.l} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 text-center">
            <div className="font-display text-2xl font-bold text-emerald-400">{s.n}</div>
            <div className="text-sm text-gray-400 mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Insignias */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold text-gray-100 mb-4">{t('perfil.insignias')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {insignias.map((ins) => (
            <div
              key={ins.codigo}
              className={`rounded-xl p-4 border text-center transition-all ${
                ins.ganada
                  ? 'bg-[#161b22] border-emerald-500/40'
                  : 'bg-[#0d1117] border-[#30363d] opacity-50'
              }`}
            >
              <div className={`text-4xl mb-2 ${ins.ganada ? '' : 'grayscale'}`}>{ins.icono}</div>
              <div className="font-semibold text-gray-100 text-sm">{t(`insignia.${ins.codigo}.n`)}</div>
              <div className="text-xs text-gray-400 mt-1">{t(`insignia.${ins.codigo}.d`)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Rutas en progreso */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold text-gray-100 mb-4">{t('perfil.rutasEnProgreso')}</h2>
        {rutasEnProgreso.length === 0 ? (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-3">{t('perfil.sinRutas')}</p>
            <Link to="/rutas" className="text-emerald-400 hover:underline font-medium">{t('perfil.explorar')}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rutasEnProgreso.map(({ ruta, pr }) => (
              <Link
                key={ruta.id}
                to={`/ruta/${ruta.id}`}
                className="block bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-100">{ruta.nombre}</h3>
                  <span className="text-emerald-400 text-sm font-semibold">{pr.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#0d1117] overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pr.pct}%` }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {seccionConfiguracion}
    </div>
  );
}
