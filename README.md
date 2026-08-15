# CyberClass 🛡️

Plataforma full-stack de cursos interactivos de ciberseguridad de **CA LATAM**. Rutas de aprendizaje con cuestionarios validados en el servidor, cuentas de usuario, XP e insignias.

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

- **5 dominios**: Fundamentos, Defensa (Blue Team), Ofensiva (Red Team), Ingeniería Segura, Especialización
- **12 rutas activas** (13 en catálogo, 1 próximamente) · **23 módulos** · **68 preguntas** con explicación
- XP al aprobar (≥70%, otorgado una sola vez por módulo), 6 insignias, progreso por ruta

## API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Crear cuenta → token JWT |
| POST | `/api/auth/login` | — | Iniciar sesión → token JWT |
| GET | `/api/me` | ✓ | Usuario actual + XP |
| GET | `/api/catalogo` | — | Catálogo completo (sin respuestas) |
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
  catalogo.ts     Fuente de verdad del contenido (CON respuestas)
web/src/
  api.ts          Cliente HTTP + manejo de token
  catalogo-context.tsx  Catálogo cargado desde /api/catalogo
  store.ts        Progreso desde API + helpers puros (insignias, % ruta)
  pages/          Landing, Rutas, RutaDetalle, Modulo, Perfil, Login, Registro
```

## Contenido: dónde vive y cómo se edita

En ejecución el contenido (dominios → rutas → módulos → preguntas) vive en **SQLite** y se edita desde el navegador en `/admin` → pestaña **Contenido**. Los cambios son instantáneos: no hay que redesplegar.

[`api/src/catalogo.ts`](api/src/catalogo.ts) es la **semilla versionada**: se carga automáticamente la primera vez que arranca contra una base vacía, y queda en Git como copia de respaldo y ejemplo de la estructura de datos.

**Traer a Git lo editado en producción** (para que GitHub siga siendo la copia versionada del curso):

```bash
ADMIN_EMAIL=admin@calatam.com ADMIN_PASSWORD='tu-clave' node scripts/export-catalogo.mjs
git add api/src/catalogo.ts && git commit -m "content: actualiza catálogo desde el panel"
```

El script regenera `catalogo.ts` desde el contenido vivo. Apunta a producción por defecto; usa `CYBERCLASS_URL=http://localhost:3001` para exportar desde local.

**Roles**: `alumno` cursa y acumula XP; `admin` gestiona contenido y cuentas, no acumula progreso y al abrir un módulo entra en modo previsualización.

## Deploy

```sh
./deploy/deploy.sh
```

Hace todo: build de ambos, sube por túnel IAP (funciona aunque fail2ban banee tu IP), instala Node si falta, configura systemd + nginx + SSL, y verifica. El `JWT_SECRET` se genera una sola vez en el servidor (`/etc/cyberclass-api.env`, nunca en git).

---

© CA LATAM SPA
