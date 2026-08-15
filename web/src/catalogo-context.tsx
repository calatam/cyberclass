import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import type { Dominio, Ruta, Modulo } from './types';

export interface Catalogo {
  dominios: Dominio[];
  rutas: Ruta[];
}

const CatalogoCtx = createContext<Catalogo | null>(null);

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<Catalogo>('/api/catalogo')
      .then(setCatalogo)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-300 font-medium">No se pudo cargar el catálogo.</p>
          <p className="text-gray-500 text-sm mt-1">Verifica tu conexión e intenta de nuevo.</p>
        </div>
      </div>
    );
  }

  if (!catalogo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Cargando catálogo…</div>
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
