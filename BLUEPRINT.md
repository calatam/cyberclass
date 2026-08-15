# CyberClass — Project Blueprint

> Plataforma de cursos interactivos de ciberseguridad (catálogo RangeForce)
> Dominio: `cyberclass.calatam.com` · Infra: GCP VM (southamerica-west1) + nginx + Let's Encrypt
> Autor: CA LATAM SPA · Fecha: 2026-08-14

---

## 1. Arquitectura Técnica

### 1.1 Stack recomendado

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | **React 19 + Vite + TypeScript + Tailwind CSS 4** | Mismo stack de geo.calatam.com — patrones, componentes y pipeline de deploy ya probados. SPA con React Router. |
| UI complementaria | Recharts (dashboards de progreso), Framer Motion (gamificación), xterm.js (terminal embebida fase 2) | Ya usadas en proyectos previos. |
| Backend | **Node.js 22 + Fastify + TypeScript** | API REST liviana, ~30MB RAM en reposo — cabe en el e2-small junto a nginx. Fastify > Express en throughput y validación de esquemas nativa (JSON Schema). |
| Auth | JWT (access + refresh) con `@fastify/jwt`, bcrypt para passwords | Simple, sin dependencia de terceros. Fase 2: OAuth Google/Microsoft. |
| Base de datos | **SQLite (better-sqlite3) en MVP → PostgreSQL (Cloud SQL) al escalar** | Ver justificación en §1.4. |
| Cache / leaderboards | En memoria (MVP) → Redis (Memorystore) fase 2 | El leaderboard semanal es la única carga "caliente". |
| Tiempo real | **Server-Sent Events (SSE)** para feedback de validación y notificaciones de XP/badges | Más simple que WebSocket, atraviesa nginx sin config especial, suficiente para un flujo unidireccional servidor→cliente. |
| Labs virtuales | Arquitectura en 3 niveles (ver §1.3) | El e2-small NO puede ejecutar VMs de laboratorio — el diseño lo reconoce y escala por fases. |

### 1.2 Diagrama de infraestructura

```
                    GoDaddy DNS
        cyberclass.calatam.com → A → 34.176.202.215
                         │
              ┌──────────▼──────────┐
              │  VM e2-small (GCP)  │  southamerica-west1-a
              │  ┌───────────────┐  │
              │  │ nginx :443    │  │  TLS Let's Encrypt (certbot)
              │  │  ├ /          │──┼──► /var/www/cyberclass (SPA estática)
              │  │  ├ /api/*     │──┼──► proxy_pass → 127.0.0.1:3001
              │  │  └ /api/sse/* │  │     (Fastify, systemd service)
              │  └───────────────┘  │
              │  SQLite: /var/lib/cyberclass/app.db
              └─────────────────────┘
                         │ (Fase 3)
              ┌──────────▼──────────┐
              │  Lab Pool (aparte)  │  Instancias e2-medium efímeras
              │  Docker + gVisor    │  con autoscaling 0→N, cola de jobs
              └─────────────────────┘
```

- El backend corre como servicio `systemd` (auto-restart, logs en journald).
- Deploy igual que GeoCompliance: build local → `scp` del `dist/` + binario del backend → `nginx reload`.
- Backups: cron diario que copia `app.db` a Cloud Storage (`gsutil cp`).

### 1.3 Laboratorios virtuales — 3 niveles evolutivos

| Nivel | Qué es | Cuándo | Costo |
|-------|--------|--------|-------|
| **N1 — Contenido embebido** | Los módulos RangeForce se abren vía enlace/embed con la licencia del usuario. CyberClass gestiona catálogo, progreso, gamificación y evaluación de quizzes/flags propios. | MVP | $0 extra |
| **N2 — Sandbox en navegador** | Retos interactivos client-side: terminal simulada (xterm.js + motor de comandos en JS), análisis de logs, desafíos de código con validación en backend. Sin infra adicional. | Fase 2 | $0 extra |
| **N3 — Labs reales** | Contenedores efímeros (Docker + gVisor por aislamiento) en un pool de instancias separado, orquestados por una cola (job: crear lab → asignar → TTL 2h → destruir). Nunca en la VM principal. | Fase 3 | ~$0.03/lab-hora, escala a 0 |

### 1.4 Evaluación en tiempo real

Cada módulo lleva un `validation_spec` (JSON declarativo) que el motor de evaluación interpreta:

```json
{
  "tipo": "flag",              // quiz | flag | comando | output_match
  "flag_hash": "sha256:…",     // flags dinámicos por usuario (anti-copy)
  "intentos_max": 5,
  "xp": 100,
  "penalizacion_pista": 20
}
```

Flujo: `POST /api/attempts` → motor valida → registra intento → emite resultado + XP por SSE → el frontend anima el feedback (<200ms percibido). Rate-limit por usuario (10 intentos/min) como anti-fuerza-bruta.

---

## 2. Estructura del Contenido (Syllabus)

### 2.1 Jerarquía de navegación

```
Dominio (5) → Ruta de Aprendizaje (14) → Módulo (~1.500) → Unidad/Reto
```

### 2.2 Organización de las rutas RangeForce en 5 dominios

**🎓 D1 — Fundamentos** *(punto de entrada obligado)*
1. Getting Started with RangeForce *(onboarding, 1-2 hrs)*
2. Cybersecurity Foundations
3. Security Awareness Videos *(transversal, también para no-técnicos)*

**🛡️ D2 — Defensa (Blue Team)**
4. SOC Analyst 1 → 5. SOC Analyst 2 *(prerequisito encadenado)*
6. Threat Hunter
7. Microsoft Security
8. Elastic · 9. Splunk *(herramientas SIEM, paralelas)*
- Retos asociados: **Blue Team Challenges**, **MITRE ATT&CK**

**⚔️ D3 — Ofensiva (Red Team)**
10. Junior Penetration Tester
11. Web Application Security
- Retos asociados: **Red Team Challenges**, **OWASP Top 10 Challenges**

**🏗️ D4 — Ingeniería Segura**
12. Secure Coding
13. Cloud Security
14. IoT Security Practices

**🔬 D5 — Especialización Avanzada** *(requiere D2 o D3 completado)*
15. Reverse Engineering
16. Malware Analysis
17. Security Management *(track gerencial, sin prerequisito técnico)*

**⚡ Transversales (feed dinámico, no son rutas):**
- **Weekly Challenges** — reto nuevo cada lunes, ventana de 7 días, puntúa al ranking
- **Emerging Threats** — módulos sobre amenazas recientes, etiquetados por CVE/campaña

### 2.3 Grafo de prerequisitos (desbloqueo)

```
Cybersecurity Foundations ──┬─► SOC Analyst 1 ─► SOC Analyst 2 ─► Threat Hunter
                            ├─► Junior Pentester ─► Web App Security
                            ├─► Secure Coding / Cloud / IoT
                            └─► Security Management
SOC 2 ó Web App Security ─────► Reverse Engineering ─► Malware Analysis
```

Los retos (Blue/Red/OWASP/MITRE) se desbloquean al completar el 30% de la ruta asociada — incentiva avanzar en teoría para acceder a la práctica.

---

## 3. Interactividad y UX

### 3.1 Seguimiento de progreso
- **Dashboard personal**: anillo de progreso por ruta activa, % global, racha diaria (streak), tiempo invertido, próximo módulo sugerido.
- **Vista de ruta**: mapa vertical de módulos estilo "camino" (Duolingo-like) con estados: 🔒 bloqueado / ⭕ disponible / 🔵 en curso / ✅ completado.
- **Barra de progreso intra-módulo**: unidades completadas dentro del módulo.

### 3.2 Gamificación (basada en Blue/Red)
| Mecánica | Diseño |
|----------|--------|
| **XP** | Cada módulo otorga XP según dificultad (50-300). Fuente de verdad: tabla `xp_events` (auditable). |
| **Facciones Blue vs Red** | Al terminar Fundamentos, el usuario elige facción. Los retos Blue/Red suman puntos a su equipo. Marcador global semanal Blue vs Red en el header. Se puede cambiar de facción 1 vez/mes. |
| **Badges** | Por hitos: primera sangre (primer reto), rutas completas, racha 7/30 días, top-10 semanal, "Purple" (completar retos de ambas facciones). Criterios declarativos en JSON. |
| **Leaderboard** | Ranking semanal (se resetea lunes) + histórico. Ligas de 30 usuarios para que novatos compitan entre pares. |
| **Weekly Challenge** | XP doble, badge exclusivo mensual para quien complete las 4 semanas. |

### 3.3 El "Module Player" (pantalla clave)
Layout de 2 paneles:
- **Izquierda (40%)**: contenido teórico (markdown renderizado), objetivos, pistas desbloqueables (costo en XP).
- **Derecha (60%)**: zona interactiva según `tipo` de módulo — quiz, input de flag, terminal xterm.js, o embed del lab RangeForce.
- **Footer**: intentos restantes, cronómetro, botón validar → feedback SSE animado (confeti + XP flotante al acertar).

### 3.4 Validación en backend
1. Frontend envía intento → `POST /api/attempts {module_id, payload}`
2. Fastify valida esquema, chequea rate-limit e intentos restantes
3. Motor evalúa contra `validation_spec` (comparación de hash para flags — nunca viaja la respuesta al cliente)
4. Persiste `attempt` + actualiza `module_progress` + inserta `xp_events` + evalúa badges
5. Responde y empuja evento SSE → animación en vivo

---

## 4. Mapa del Sitio y User Journey

### 4.1 Sitemap

```
/                      Landing pública (propuesta de valor, rutas, pricing)
/registro · /login     Auth
/onboarding            Test de nivel (10 preg.) + elección de meta profesional
/dashboard             Home del alumno: progreso, streak, sugerencias, marcador Blue/Red
/rutas                 Catálogo: 5 dominios → 14 rutas (filtros: nivel, duración)
/rutas/:slug           Detalle de ruta: mapa de módulos, % progreso, prerequisitos
/modulo/:id            Module Player
/retos                 Hub de retos: Weekly · MITRE · OWASP · Blue · Red · Emerging
/leaderboard           Ranking semanal, ligas, marcador de facciones
/perfil/:usuario       XP, badges, rutas completadas, certificados
/admin                 CRUD de contenido, import CSV/JSON del catálogo, métricas
```

### 4.2 User Journey (alumno nuevo)

```
Landing → Registro → Onboarding (test + meta: "quiero ser SOC Analyst")
   → Ruta recomendada (Foundations) → Primer módulo (quiz guiado)
   → ✅ +50 XP + badge "Primer Paso" → Dashboard con progreso visible
   → Al 100% de Foundations: elige facción Blue/Red → se desbloquean rutas D2-D4
   → Ciclo de retención: streak diario + Weekly Challenge + liga semanal
```

---

## 5. Modelo de Base de Datos (~1.500 módulos)

### 5.1 Esquema (SQL)

```sql
-- Catálogo (contenido, ~1.500 filas en modules)
domains         (id, slug, nombre, orden, icono)
learning_paths  (id, domain_id FK, slug, nombre, descripcion, nivel,
                 orden, horas_estimadas, prereq_path_id FK NULL)
modules         (id, path_id FK, slug, titulo, tipo,          -- leccion|lab|quiz|challenge|video
                 dificultad, duracion_min, xp, orden,
                 prereq_module_id FK NULL,
                 contenido_ref,                                -- URL RangeForce o markdown propio
                 validation_spec JSON,
                 team TEXT NULL,                               -- blue|red (solo challenges)
                 ventana_inicio, ventana_fin)                  -- solo weekly

-- Usuarios y progreso (las tablas que crecen)
users           (id, email UNIQUE, password_hash, nombre, rol,  -- alumno|admin
                 faccion, xp_total, streak_dias, ultimo_activo, created_at)
enrollments     (user_id FK, path_id FK, started_at, completed_at,
                 progreso_pct,                                  -- cache denormalizado
                 PRIMARY KEY (user_id, path_id))
module_progress (user_id FK, module_id FK,
                 status,                                        -- available|in_progress|completed
                 score, intentos, mejor_tiempo_seg, completed_at,
                 PRIMARY KEY (user_id, module_id))              -- ← la tabla grande
attempts        (id, user_id FK, module_id FK, payload JSON,
                 correcto BOOL, duracion_seg, created_at)       -- particionable por mes

-- Gamificación
xp_events       (id, user_id FK, delta, motivo, ref_id, created_at)  -- fuente de verdad XP
badges          (id, codigo UNIQUE, nombre, descripcion, icono, criterio JSON)
user_badges     (user_id FK, badge_id FK, earned_at, PRIMARY KEY (user_id, badge_id))
team_scores     (semana, faccion, puntos, PRIMARY KEY (semana, faccion))
```

### 5.2 Decisiones de diseño y volumetría

| Decisión | Razón |
|----------|-------|
| `module_progress` con PK compuesta `(user_id, module_id)` | Lookup O(log n) del estado de cualquier módulo. Solo se crea la fila al primer acceso (lazy), no 1.500 filas por usuario al registrarse. |
| Volumetría | 1.500 módulos × 1.000 usuarios activos = máx. 1,5M filas — trivial para SQLite con índices; punto de migración a Postgres: ~5.000 usuarios o necesidad de réplicas. |
| `xp_events` como ledger | El XP nunca se edita, se suma. `users.xp_total` es cache recalculable. Leaderboard semanal = `SUM(delta) WHERE created_at >= lunes` con índice `(created_at, user_id)`. |
| `validation_spec` como JSON en `modules` | Agregar tipos de validación nuevos no requiere migración de esquema. |
| Import del catálogo | Script `seed_catalog.py/ts` que carga los ~1.500 módulos desde CSV/JSON extraído de RangeForce → idempotente (upsert por `slug`). |
| Progreso % denormalizado en `enrollments` | Evita `COUNT(*)` sobre module_progress en cada render del dashboard; se actualiza al completar módulo. |

---

## 6. Roadmap de implementación

| Fase | Alcance | Duración |
|------|---------|----------|
| **F1 — MVP** | SPA + API Fastify + SQLite, auth JWT, catálogo completo (seed 1.500 módulos), progreso, quizzes/flags, XP y badges básicos, deploy en cyberclass.calatam.com | 2-3 semanas |
| **F2 — Gamificación completa** | Facciones Blue/Red, leaderboard + ligas, Weekly Challenges, sandbox xterm.js, SSE en vivo | 3-4 semanas |
| **F3 — Labs reales** | Pool de contenedores efímeros, orquestador, autoscaling | 6-8 semanas |

---

## 7. Próximos pasos inmediatos

1. Scaffold del monorepo (`web/` + `api/` + `data/`) con el stack de §1.1
2. Repo GitHub privado `calatam/cyberclass`
3. Seed del catálogo con las 14 rutas + 8 categorías de retos (módulos placeholder hasta tener el export real de RangeForce)
4. Registro DNS en GoDaddy: `A cyberclass → 34.176.202.215`
5. Server block nginx + certbot en la VM existente
6. Deploy F1
