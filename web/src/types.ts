export interface Pregunta {
  texto: string;
  opciones: string[];
  correcta: number; // index into opciones
  explicacion: string;
}

export interface Modulo {
  id: string;
  titulo: string;
  descripcion: string;
  xp: number;
  preguntas: Pregunta[];
}

export interface Ruta {
  id: string;
  dominioId: string;
  nombre: string;
  descripcion: string;
  nivel: 'Básico' | 'Intermedio' | 'Avanzado';
  proximamente?: boolean;
  modulos: Modulo[];
}

export interface Dominio {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
}

export interface ModuloCompletado {
  score: number;
  total: number;
  xp: number;
  fecha: string;
}

export interface Progreso {
  completados: Record<string, ModuloCompletado>;
  xp: number;
}
