# CyberClass 🛡️

Plataforma de cursos interactivos de ciberseguridad de **CA LATAM**. Rutas de aprendizaje con cuestionarios, sistema de XP e insignias. Todo el progreso se guarda localmente en el navegador (sin backend).

🌐 **Producción:** [cyberclass.calatam.com](https://cyberclass.calatam.com)

## Contenido

- **5 dominios**: Fundamentos, Defensa (Blue Team), Ofensiva (Red Team), Ingeniería Segura, Especialización
- **12 rutas de aprendizaje** activas (14 en total, 2 próximamente)
- **23 módulos** con **68 preguntas** de opción múltiple, cada una con explicación
- Sistema de XP (se gana al aprobar con ≥70%), 6 insignias y seguimiento de progreso por ruta

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4
- React Router
- Persistencia en `localStorage` (sin servidor)

## Desarrollo

```sh
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # genera web/dist/
```

## Estructura

```
web/src/
  catalogo.ts     Todo el contenido: dominios, rutas, módulos y preguntas
  store.ts        Progreso, XP e insignias (localStorage)
  types.ts        Tipos TypeScript
  components/     Navbar
  pages/          Landing, Rutas, RutaDetalle, Modulo (quiz), Perfil
```

## Agregar contenido

Todo el contenido vive en [`web/src/catalogo.ts`](web/src/catalogo.ts). Para agregar un módulo, añade un objeto `Modulo` con sus `preguntas` a la ruta correspondiente. Para una ruta nueva, agrega un objeto `Ruta` al array `RUTAS` con su `dominioId`.

## Deploy

Build estático servido con nginx en la VM de GCP (mismo patrón que geo.calatam.com):

```sh
cd web && npm run build
# scp del dist/ al servidor + nginx reload
```

---

© CA LATAM SPA
