# CyberClass 🛡️

Plataforma full-stack **bilingüe (ES/EN)** de cursos interactivos de ciberseguridad de **CA LATAM**. Rutas de aprendizaje con cuestionarios validados en el servidor, cuentas de usuario, XP e insignias.

> Bilingual (Spanish/English) full-stack cybersecurity training platform: learning paths with server-validated quizzes, user accounts, XP and badges.

🌐 **Producción:** [cyberclass.calatam.com](https://cyberclass.calatam.com)

## Arquitectura

```
Navegador ── SPA React (nginx, /var/www/cyberclass)
                │  /api/*
                ▼
             Fastify API (systemd, 127.0.0.1:3001)
                │
                ▼
             SQLite (/var/lib/cyberclass/app.db)
```

- **Frontend** (`web/`): React 19 + Vite + TypeScript + Tailwind CSS 4 + React Router
- **Backend** (`api/`): Node 24 + Fastify 5 + JWT (`@fastify/jwt` v10) + `node:sqlite` (sin dependencias nativas)
- **Seguridad**: las respuestas correctas **solo viven en el backend** — el catálogo público se sirve sin `correcta` ni `explicacion`; la calificación y el XP los decide el servidor. Passwords con `scrypt` + salt. JWT expira a 30 días.

## Contenido

Cada idioma tiene su propio catálogo completo e independiente:

- **5 dominios**: Fundamentos, Defensa (Blue Team), Ofensiva (Red Team), Ingeniería Segura, Especialización
- **12 rutas activas** (13 en catálogo, 1 próximamente) · **23 módulos** · **68 preguntas** con explicación — **en español y en inglés**
- XP al aprobar (≥70%, otorgado una sola vez por módulo), 6 insignias, progreso por ruta

## Idiomas / Languages

La interfaz y el contenido están en **español e inglés**. El selector (ES/EN) vive en la barra superior; la preferencia se guarda en el navegador y arranca detectando el idioma del sistema.

- **Interfaz**: diccionario en [`web/src/i18n.tsx`](web/src/i18n.tsx)
- **Contenido**: cada idioma es un conjunto independiente de rutas/módulos/preguntas en la base de datos (columna `idioma`); los IDs en inglés llevan sufijo `-en`
- **API**: `GET /api/catalogo?idioma=es|en` (y lo mismo para `/api/admin/catalogo`)
- **Panel**: el admin elige qué idioma del curso está editando, independientemente del idioma de la interfaz
- El progreso del alumno es por módulo, así que cursar la versión ES y la EN cuenta por separado

## API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Crear cuenta → token JWT |
| POST | `/api/auth/login` | — | Iniciar sesión → token JWT |
| GET | `/api/me` | ✓ | Usuario actual + XP |
| GET | `/api/catalogo?idioma=es\|en` | — | Catálogo completo (sin respuestas) |
| POST | `/api/answer` | ✓ | Valida una respuesta → feedback + explicación |
| POST | `/api/attempts` | ✓ | Califica el intento completo → score, XP |
| GET | `/api/progreso` | ✓ | Progreso del usuario |
| GET | `/api/health` | — | Healthcheck |

## Desarrollo

```sh
# Backend (terminal 1)
cd api && npm install && npm run build
JWT_SECRET=dev-secret node dist/index.js      # 127.0.0.1:3001

# Frontend (terminal 2) — proxy /api → 3001 ya configurado en vite.config.ts
cd web && npm install && npm run dev           # http://localhost:5173
```

## Estructura

```
api/src/
  index.ts        Servidor Fastify: auth, catálogo, evaluación, progreso
  db.ts           SQLite (node:sqlite): users, progreso, attempts
  contenido.ts    Catálogo desde SQLite (público sin respuestas / admin con ellas)
  catalogo.ts     Semilla del contenido en español (CON respuestas)
  catalogo-en.ts  Semilla del contenido en inglés (CON respuestas)
web/src/
  i18n.tsx        Diccionario ES/EN + selector de idioma
  api.ts          Cliente HTTP + manejo de token
  catalogo-context.tsx  Catálogo cargado desde /api/catalogo
  store.ts        Progreso desde API + helpers puros (insignias, % ruta)
  pages/          Landing, Rutas, RutaDetalle, Modulo, Perfil, Login, Registro
```

## Contenido: dónde vive y cómo se edita

En ejecución el contenido (dominios → rutas → módulos → preguntas) vive en **SQLite** y se edita desde el navegador en `/admin` → pestaña **Contenido**. Los cambios son instantáneos: no hay que redesplegar.

Las semillas versionadas viven en Git y se cargan automáticamente la primera vez que la app arranca contra una base vacía; quedan además como ejemplo de la estructura de datos:

- [`api/src/catalogo.ts`](api/src/catalogo.ts) — contenido en español
- [`api/src/catalogo-en.ts`](api/src/catalogo-en.ts) — contenido en inglés

**Traer a Git lo editado en producción** (para que GitHub siga siendo la copia versionada del curso):

```bash
# español
ADMIN_EMAIL=admin@calatam.com ADMIN_PASSWORD='tu-clave' node scripts/export-catalogo.mjs
# inglés
IDIOMA=en ADMIN_EMAIL=admin@calatam.com ADMIN_PASSWORD='tu-clave' node scripts/export-catalogo.mjs

git add api/src/catalogo*.ts && git commit -m "content: actualiza catálogo desde el panel"
```

El script regenera el archivo de semilla del idioma indicado desde el contenido vivo. Apunta a producción por defecto; usa `CYBERCLASS_URL=http://localhost:3001` para exportar desde local.

**Roles**: `alumno` cursa y acumula XP; `admin` gestiona contenido y cuentas, no acumula progreso y al abrir un módulo entra en modo previsualización.

## Deploy

```sh
./deploy/deploy.sh
```

Hace todo: build de ambos, sube por túnel IAP (funciona aunque fail2ban banee tu IP), instala Node si falta, configura systemd + nginx + SSL, y verifica. El `JWT_SECRET` se genera una sola vez en el servidor (`/etc/cyberclass-api.env`, nunca en git).

---

© CA LATAM SPA
