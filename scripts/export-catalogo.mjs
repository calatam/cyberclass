#!/usr/bin/env node
/**
 * Exporta el contenido vivo (el que se edita desde /admin) de vuelta a
 * `api/src/catalogo.ts`, para poder commitearlo y mantener GitHub como la
 * copia versionada del curso.
 *
 * Uso:
 *   ADMIN_EMAIL=admin@calatam.com ADMIN_PASSWORD='...' node scripts/export-catalogo.mjs
 *   IDIOMA=en ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/export-catalogo.mjs
 *
 * Variables:
 *   CYBERCLASS_URL   base de la API (default: https://cyberclass.calatam.com)
 *   ADMIN_EMAIL      email de una cuenta con rol admin
 *   ADMIN_PASSWORD   su contraseña
 *   IDIOMA           es (default) | en — cada idioma tiene su propio archivo
 *
 * Después: git add api/src/catalogo.ts && git commit -m "content: ..."
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.CYBERCLASS_URL ?? 'https://cyberclass.calatam.com';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD.\n');
  console.error("  ADMIN_EMAIL=admin@calatam.com ADMIN_PASSWORD='...' node scripts/export-catalogo.mjs");
  process.exit(1);
}

const IDIOMA = process.env.IDIOMA === 'en' ? 'en' : 'es';
const ARCHIVO = IDIOMA === 'en' ? 'catalogo-en.ts' : 'catalogo.ts';
const salida = join(dirname(fileURLToPath(import.meta.url)), '..', 'api', 'src', ARCHIVO);

/** Literal TS seguro para cualquier texto (comillas, acentos, saltos de línea). */
const lit = (s) => JSON.stringify(s ?? '');

async function main() {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.ok) {
    console.error(`Login falló (HTTP ${login.status}). Revisa las credenciales.`);
    process.exit(1);
  }
  const { token, usuario } = await login.json();
  if (usuario?.rol !== 'admin') {
    console.error(`La cuenta ${EMAIL} no tiene rol admin.`);
    process.exit(1);
  }

  const res = await fetch(`${BASE}/api/admin/catalogo?idioma=${IDIOMA}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`No se pudo leer el catálogo (HTTP ${res.status}).`);
    process.exit(1);
  }
  const { dominios, rutas } = await res.json();

  const nModulos = rutas.reduce((s, r) => s + r.modulos.length, 0);
  const nPreguntas = rutas.reduce((s, r) => s + r.modulos.reduce((t, m) => t + m.preguntas.length, 0), 0);

  const EXP_DOM = IDIOMA === 'en' ? 'DOMINIOS_EN' : 'DOMINIOS';
  const EXP_RUT = IDIOMA === 'en' ? 'RUTAS_EN' : 'RUTAS';

  const out = [];
  if (IDIOMA === 'en') {
    out.push('// Course content — English version (versioned copy of the catalog).');
    out.push('//');
    out.push('// At runtime content lives in SQLite and is edited from /admin; this file is');
    out.push('// the SEED (loaded into an empty database) and doubles as an example of the');
    out.push('// data structure.');
    out.push('//');
    out.push('// IDs carry an `-en` suffix so both languages can coexist in the same tables.');
    out.push('//');
    out.push('// To pull production edits back here and commit them:');
    out.push('//   IDIOMA=en ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/export-catalogo.mjs');
  } else {
    out.push('// Contenido del curso — copia versionada del catálogo.');
    out.push('//');
    out.push('// En ejecución el contenido vive en SQLite y se edita desde /admin;');
    out.push('// este archivo es la SEMILLA (se carga en una base vacía) y sirve como');
    out.push('// ejemplo de la estructura de datos.');
    out.push('//');
    out.push('// Para traer aquí lo editado en producción y commitearlo:');
    out.push('//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/export-catalogo.mjs');
  }
  out.push('//');
  out.push(`// Generado desde ${BASE} (idioma: ${IDIOMA}) · ${dominios.length} dominios · ${rutas.length} rutas · ${nModulos} módulos · ${nPreguntas} preguntas`);
  out.push('');
  out.push("import type { Dominio, Ruta } from './types.js';");
  out.push('');
  out.push(`export const ${EXP_DOM}: Dominio[] = [`);
  for (const d of dominios) {
    out.push(`  { id: ${lit(d.id)}, nombre: ${lit(d.nombre)}, icono: ${lit(d.icono)}, descripcion: ${lit(d.descripcion)} },`);
  }
  out.push('];');
  out.push('');
  out.push(`export const ${EXP_RUT}: Ruta[] = [`);
  for (const r of rutas) {
    out.push('  {');
    out.push(`    id: ${lit(r.id)},`);
    out.push(`    dominioId: ${lit(r.dominioId)},`);
    out.push(`    nombre: ${lit(r.nombre)},`);
    out.push(`    descripcion: ${lit(r.descripcion)},`);
    out.push(`    nivel: ${lit(r.nivel)},`);
    if (r.proximamente) out.push('    proximamente: true,');
    out.push('    modulos: [');
    for (const m of r.modulos) {
      out.push('      {');
      out.push(`        id: ${lit(m.id)},`);
      out.push(`        titulo: ${lit(m.titulo)},`);
      out.push(`        descripcion: ${lit(m.descripcion)},`);
      out.push(`        xp: ${m.xp},`);
      out.push('        preguntas: [');
      for (const p of m.preguntas) {
        out.push('          {');
        out.push(`            texto: ${lit(p.texto)},`);
        out.push(`            opciones: [${p.opciones.map(lit).join(', ')}],`);
        out.push(`            correcta: ${p.correcta},`);
        out.push(`            explicacion: ${lit(p.explicacion)},`);
        out.push('          },');
      }
      out.push('        ],');
      out.push('      },');
    }
    out.push('    ],');
    out.push('  },');
  }
  out.push('];');
  out.push('');

  writeFileSync(salida, out.join('\n'), 'utf8');
  console.log(`✅ Catálogo (${IDIOMA}) exportado a api/src/${ARCHIVO}`);
  console.log(`   ${dominios.length} dominios · ${rutas.length} rutas · ${nModulos} módulos · ${nPreguntas} preguntas`);
  console.log('\n   Revísalo y commitéalo:');
  console.log(`   git add api/src/${ARCHIVO} && git commit -m "content: actualiza catálogo (${IDIOMA}) desde el panel"`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
