export interface Pregunta {
  texto: string;
  opciones: string[];
  // correcta y explicacion viven SOLO en el backend — nunca llegan al navegador
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

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  xp: number;
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

export interface RespuestaFeedback {
  esCorrecta: boolean;
  correctaIdx: number;
  explicacion: string;
}

export interface ResultadoIntento {
  score: number;
  total: number;
  pct: number;
  aprobado: boolean;
  xpGanado: number;
  xpTotal: number;
}
