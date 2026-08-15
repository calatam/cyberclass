import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH ?? './data/app.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nombre TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS progreso (
  user_id INTEGER NOT NULL REFERENCES users(id),
  modulo_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  fecha TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, modulo_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  modulo_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  fecha TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, fecha);
`);

// Migración: columna rol (alumno | admin). SQLite no soporta IF NOT EXISTS en columnas.
try {
  db.exec("ALTER TABLE users ADD COLUMN rol TEXT NOT NULL DEFAULT 'alumno'");
} catch { /* la columna ya existe */ }

// ---------- contenido editable (antes vivía hardcodeado en catalogo.ts) ----------

db.exec(`
CREATE TABLE IF NOT EXISTS dominios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  icono TEXT NOT NULL DEFAULT '📘',
  descripcion TEXT NOT NULL DEFAULT '',
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rutas (
  id TEXT PRIMARY KEY,
  dominio_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  nivel TEXT NOT NULL DEFAULT 'Básico',
  proximamente INTEGER NOT NULL DEFAULT 0,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modulos (
  id TEXT PRIMARY KEY,
  ruta_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  xp INTEGER NOT NULL DEFAULT 100,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS preguntas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modulo_id TEXT NOT NULL,
  texto TEXT NOT NULL,
  opciones TEXT NOT NULL,
  correcta INTEGER NOT NULL,
  explicacion TEXT NOT NULL DEFAULT '',
  orden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_preguntas_modulo ON preguntas(modulo_id, orden);
CREATE INDEX IF NOT EXISTS idx_modulos_ruta ON modulos(ruta_id, orden);
`);
