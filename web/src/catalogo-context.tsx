import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { useI18n } from './i18n';
import type { Dominio, Ruta, Modulo } from './types';

export interface Catalogo {
  dominios: Dominio[];
  rutas: Ruta[];
}

const CatalogoCtx = createContext<Catalogo | null>(null);

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const { idioma, t } = useI18n();
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [error, setError] = useState(false);

  // El contenido se recarga al cambiar de idioma
  useEffect(() => {
    let vigente = true;
    setCatalogo(null);
    setError(false);
    api<Catalogo>(`/api/catalogo?idioma=${idioma}`)
      .then((c) => { if (vigente) setCatalogo(c); })
      .catch(() => { if (vigente) setError(true); });
    return () => { vigente = false; };
  }, [idioma]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-300 font-medium">{t('comun.error')}</p>
        </div>
      </div>
    );
  }

  if (!catalogo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">{t('comun.cargando')}</div>
      </div>
    );
  }

  return <CatalogoCtx.Provider value={catalogo}>{children}</CatalogoCtx.Provider>;
}

export function useCatalogo(): Catalogo {
  const ctx = useContext(CatalogoCtx);
  if (!ctx) throw new Error('useCatalogo debe usarse dentro de CatalogoProvider');
  return ctx;
}

export function buscarRuta(rutas: Ruta[], id: string): Ruta | null {
  return rutas.find((r) => r.id === id) ?? null;
}

export function buscarModulo(rutas: Ruta[], id: string): { ruta: Ruta; modulo: Modulo } | null {
  for (const ruta of rutas) {
    const m = ruta.modulos.find((mod) => mod.id === id);
    if (m) return { ruta, modulo: m };
  }
  return null;
}
