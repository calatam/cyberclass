# Caso: integración de Snyk en el pipeline de CI

**Repositorio:** `calatam/cyberclass` · **Fecha:** 15 de agosto de 2026
**Alcance:** Snyk Open Source (SCA) sobre GitHub Actions

---

## 1. Resumen ejecutivo

Integré el CLI de Snyk en un repositorio de GitHub para detectar vulnerabilidades
en dependencias de terceros, con tres puntos de control: escaneo local,
verificación bloqueante en pull requests y monitoreo continuo en producción.

El resultado son 120 dependencias bajo análisis automático, un pipeline que
bloquea el merge ante vulnerabilidades altas o críticas, y los hallazgos
publicados en la pestaña Security de GitHub.

Durante la implementación aparecieron cuatro fallos que no están en la
documentación básica y que solo se descubren ejecutando. Están documentados en la
sección 5, porque son la parte más útil del ejercicio.

---

## 2. El problema

Entre el 80% y el 90% del código de una aplicación moderna no lo escribe el
equipo: viene de dependencias. Es superficie de ataque que no controlas y que
cambia sin que toques una línea — una librería que hoy está limpia puede tener un
CVE publicado mañana.

Revisar eso a mano no escala por dos razones:

1. **Las transitivas son invisibles.** Un `requirements.txt` con 4 líneas puede
   instalar 11 paquetes. Los otros 7 no los declaraste y no los estás mirando.
2. **El riesgo cambia sin que cambies el código.** Un repositorio congelado hace
   seis meses puede tener hoy vulnerabilidades que no tenía al momento del último
   commit.

**Objetivo:** automatizar la detección en el ciclo de desarrollo, de modo que un
desarrollador se entere antes de mezclar el código, no después de desplegarlo.

---

## 3. Qué se construyó

### Arquitectura de tres capas

```
┌──────────────┐   ┌───────────────────┐   ┌────────────────────┐
│  LOCAL       │   │  CI (pull request)│   │  PRODUCCIÓN (main) │
│  snyk test   │→  │  snyk test        │→  │  snyk monitor      │
│  a demanda   │   │  gate: bloquea    │   │  vigilancia continua│
└──────────────┘   └───────────────────┘   └────────────────────┘
   feedback            impide que entre        avisa de CVEs
   inmediato           código vulnerable       publicados después
```

Cada capa cubre un hueco de la anterior: lo local se puede saltar, el CI solo
mira el momento del commit, y el monitoreo cubre el tiempo que pasa después.

### Entregables

| Archivo | Función |
|---------|---------|
| [`.github/workflows/snyk.yml`](../.github/workflows/snyk.yml) | Pipeline: gate en PRs, monitoreo en main, cron semanal, disparo manual |
| [`.snyk`](../.snyk) | Política de excepciones con caducidad obligatoria |
| [`docs/snyk-devsecops.md`](snyk-devsecops.md) | Guía operativa con las trampas encontradas |
| `scratchpad/snyk-lab/` | Laboratorio con CVEs reales para reproducir el ejercicio |

---

## 4. Resultados

### Escaneo del repositorio real

| Proyecto | Dependencias | Vulnerabilidades | Exit code |
|----------|-------------|------------------|-----------|
| `cyberclass-api` | 67 | 0 | `0` |
| `web` | 53 | 0 | `0` |
| **Total** | **120** | **0** | pipeline en verde |

Un resultado limpio no significa que la herramienta sobre: significa que el
estado base es bueno y que a partir de ahora cualquier regresión se detecta el
día que entra.

### Laboratorio de validación

Como el repositorio estaba limpio, monté un laboratorio con versiones antiguas
para verificar que el escáner realmente detecta:

```
Tested 11 dependencies for known issues, found 41 issues, 59 vulnerable paths.
```

| Severidad | Hallazgos |
|-----------|-----------|
| Critical | 1 |
| High | 14 |
| Medium | 24 |
| Low | 2 |
| **Total** | **41** |

Cuatro paquetes declarados → **11 dependencias instaladas** → 41 vulnerabilidades.
Esa desproporción es exactamente el argumento del análisis automático.

### El hallazgo que mejor ilustra el problema

```
✗ Open Redirect [Medium Severity] in urllib3@1.23
    introduced by requests@2.19.1 > urllib3@1.23
```

**`urllib3` nunca fue declarado.** Entró como dependencia de `requests`. Tres de
sus vulnerabilidades no se arreglan tocando el manifiesto: hay que subir
`requests`, que es quien lo arrastra. Esa cadena `A > B` no se ve leyendo el
archivo de dependencias.

### Comportamiento del umbral de severidad

Sobre el mismo conjunto vulnerable:

```
--severity-threshold=low       → 41 hallazgos, exit 1
--severity-threshold=high      → 15 hallazgos, exit 1
--severity-threshold=critical  →  1 hallazgo,  exit 1
```

El umbral controla **cuánto ruido ves**, no si el build pasa: basta una
vulnerabilidad por encima del umbral para cortar el pipeline.

---

## 5. Problemas encontrados durante la implementación

Esta es la sección con más valor: son fallos reales, con su diagnóstico.

### 5.1 `spawn python ENOENT` — el escáner no arrancaba

**Síntoma:** el primer escaneo de un proyecto Python falló con un mensaje
inútil: `Failed to test pip project`.

**Diagnóstico:** el detalle solo apareció con `snyk test -d`:

```
Error running test { stderr: 'spawn python ENOENT' }
```

Snyk invoca un binario llamado `python`. macOS moderno solo trae `python3`.

**Solución:** `--command=python3`, o trabajar dentro de un virtualenv (que sí
crea un `python`).

**Lección:** cuando un escáner falla con un mensaje genérico, la diferencia entre
"no hay vulnerabilidades" y "no se ejecutó el análisis" está en el modo debug.
Un pipeline que trata ambos casos igual deja pasar código sin analizar.

### 5.2 El token del navegador no sirve para CI

**Síntoma:** tras `snyk auth`, el comando `snyk config get api` devolvía vacío,
así que el secreto de GitHub habría quedado en blanco.

**Diagnóstico:** `snyk auth` sin argumentos hace login por navegador y guarda un
**token OAuth de una hora** bajo la clave `INTERNAL_OAUTH_TOKEN_STORAGE`. No es
el API token, que es el que consume GitHub Actions.

**Solución:** el `SNYK_TOKEN` se obtiene de `Account Settings → Auth Token` en la
interfaz web. Para el CLI local, `snyk auth <token>` con el valor como argumento
lo guarda como API token.

**Lección:** hay dos credenciales distintas para dos contextos distintos —
interactivo y no interactivo— y se parecen lo suficiente como para confundirlas.

### 5.3 `--project-name` incompatible con `--all-projects`

**Síntoma:** el pipeline falló en el paso de monitoreo:

```
FATAL  Invalid flag option (SNYK-CLI-0004)
       The following option combination is not currently supported:
       project-name + all-projects
```

**Diagnóstico:** con varios manifiestos, Snyk nombra cada proyecto por su cuenta
(`cyberclass-api`, `web`). Un nombre único no tiene dónde aplicarse.

**Solución:** `--remote-repo-url=https://github.com/calatam/cyberclass` para
agruparlos bajo el repositorio, sin forzar un nombre.

**Lección:** el YAML era sintácticamente válido y ningún linter lo habría
detectado. Este tipo de error solo aparece ejecutando el pipeline.

### 5.4 Service Accounts no disponibles

**Síntoma:** `Organization Settings → Service Accounts` devolvía `Forbidden`.

**Diagnóstico:** la explicación intuitiva sería falta de permisos, pero en una
organización personal el usuario ya es administrador. La documentación de Snyk
lo aclara: **los Service Accounts son exclusivos del plan Enterprise.**

**Solución adoptada:** token personal, documentando la limitación.

**Lección:** en un entorno corporativo lo correcto es un Service Account con
permiso mínimo, para que el pipeline no dependa de una cuenta personal que puede
desactivarse cuando alguien cambia de equipo. Distinguir "no tengo permisos" de
"no está en mi plan" cambia por completo la conversación con el equipo de
plataforma.

---

## 6. Decisiones de diseño

### El gate va en el pull request, no en `main`

Bloquear en `main` es tarde: el código ya se mezcló y revertirlo cuesta más que
haberlo detenido antes. En el PR el autor tiene el contexto fresco y el costo de
corregir es mínimo.

### Umbral en `high`, no en `low`

Sin umbral, el pipeline falla ante vulnerabilidades bajas y el equipo aprende a
ignorar el rojo — el peor resultado posible, porque después nadie distingue una
alerta real. Las medias y bajas quedan reportadas en la pestaña Security, donde
se pueden priorizar, pero no interrumpen el trabajo.

> La seguridad que interrumpe todo el tiempo termina desactivada.

### Publicar el SARIF antes de fallar el build

`snyk test` sale con código 1 al encontrar algo, lo que cortaría el job y dejaría
los hallazgos sin publicar. Por eso el paso de escaneo lleva
`continue-on-error: true` y genera el SARIF, y **un paso posterior es el que
corta**. Así los resultados quedan visibles en `Security → Code scanning` aunque
el build falle, que es justo cuando más se necesitan.

### `test` y `monitor` cumplen funciones distintas

`test` es una foto del presente y sirve de gate. `monitor` sube el árbol de
dependencias a Snyk y avisa cuando se publica un CVE sobre algo que ya tenías.
Sin el segundo, un repositorio sin actividad puede acumular vulnerabilidades
durante meses sin que nadie se entere.

### Excepciones con fecha de caducidad

El archivo [`.snyk`](../.snyk) exige que cada hallazgo silenciado lleve
justificación y `expires` a un máximo de 90 días. Una excepción sin caducidad es
deuda de seguridad invisible: nadie vuelve a revisarla.

### Disparo manual (`workflow_dispatch`)

Permite reejecutar el escaneo tras rotar el token sin inventar un commit vacío.
Forzar commits para probar CI ensucia el historial.

---

## 7. Trazabilidad

| Commit | Cambio |
|--------|--------|
| `9fd5e94` | Integración inicial: workflow, política y documentación |
| `da5bda5` | Corrección de `--project-name` + `--all-projects` |
| `1ae7d5c` | Disparo manual para verificar rotación de credenciales |

| Ejecución | Resultado |
|-----------|-----------|
| `31904405848` | ❌ Falla en `snyk monitor` (SNYK-CLI-0004) |
| `31904478644` | ✅ Tras la corrección |
| `31906220480` | ✅ |
| `31906590484` | ✅ Disparo manual |

Un fallo y tres éxitos. El fallo está documentado a propósito: un historial sin
errores en una integración nueva suele significar que no se probó lo suficiente.

---

## 8. Limitaciones conocidas

1. **Token personal en vez de Service Account** — limitación del plan Free.
   En producción corporativa debería migrarse.
2. **Solo cubre SCA** — quedan fuera Snyk Code (SAST), Container e IaC. Para este
   repositorio, Container aplicaría si se contenedoriza el backend.
3. **El umbral `high` deja pasar medias** — decisión consciente para no generar
   fatiga de alertas; se revisan en la pestaña Security pero no bloquean.
4. **Sin arreglo automático** — no se habilitaron los PRs automáticos de Snyk.
   Con un equipo pequeño, un PR automático por CVE puede ser más ruido que ayuda.

---

## 9. Cómo explicarlo

### Versión de 2 minutos

> Integré Snyk en el pipeline de CI de un repositorio para detectar
> vulnerabilidades en dependencias. Lo monté en tres capas: escaneo local durante
> el desarrollo, un gate en los pull requests que bloquea el merge si entra algo
> alto o crítico, y monitoreo continuo en main que avisa cuando se publica un CVE
> nuevo sobre una dependencia que ya tenías.
>
> Lo interesante fue lo que apareció al ejecutarlo. En un laboratorio de prueba,
> cuatro paquetes declarados instalaron once dependencias y dieron 41
> vulnerabilidades. Una de las peores estaba en `urllib3`, que nunca fue
> declarado: entró como transitiva de `requests`, así que no se arregla tocando
> el manifiesto, hay que subir el paquete padre. Eso es exactamente lo que una
> revisión a ojo no ve.
>
> También tuve un fallo en el propio pipeline: `--project-name` no es compatible
> con `--all-projects` en Snyk. El YAML era válido, ningún linter lo detecta,
> solo aparece ejecutando.

### Versión de 5 minutos: qué agregar

- **El problema del umbral.** Sin umbral por severidad, el pipeline falla con
  vulnerabilidades bajas y el equipo se acostumbra a ignorar el rojo. Puse el
  gate en `high`; las medias se reportan pero no bloquean.
- **El orden de los pasos importa.** `snyk test` sale con código 1 al encontrar
  algo, lo que cortaría el job antes de publicar el reporte. Separé el paso que
  genera el SARIF del que falla el build, para que los hallazgos queden visibles
  en la pestaña Security aunque el pipeline se caiga.
- **Distinguir exit 1 de exit 2.** Uno significa "hay vulnerabilidades", el otro
  "el escáner no corrió". Un pipeline que los trata igual deja pasar código sin
  analizar.
- **Python versus Node.** En Python hay que instalar las dependencias antes de
  escanear, porque `requirements.txt` solo declara las de primer nivel. En Node
  el lockfile ya trae el árbol completo. De ahí que fijar versiones sea un
  requisito de seguridad y no una manía.

---

## 10. Preguntas frecuentes

**¿Snyk reemplaza a `npm audit` o `pip-audit`?**
En lo básico hacen lo mismo: consultar bases de vulnerabilidades conocidas. Snyk
agrega base de datos propia (a veces antes que la NVD), monitoreo continuo,
priorización por explotabilidad y política centralizada. En un proyecto personal
`pip-audit` alcanza; en una organización la diferencia es la gobernanza: poder
responder "qué política aplica a todos los repos" y no repo por repo.

**¿Qué haces si la vulnerabilidad no tiene arreglo disponible?**
Primero evalúo si el código afectado es alcanzable desde la aplicación. Muchas
vulnerabilidades están en funciones que nunca se invocan. Si no es alcanzable, lo
documento como excepción con justificación y caducidad. Si lo es, toca mitigar:
aislar la llamada, reemplazar la dependencia o parchear.

**¿Cómo evitas la fatiga de alertas?**
Umbral por severidad, gate solo en PRs y excepciones con caducidad obligatoria.
El objetivo no es cero alertas, es que las que aparezcan se atiendan.

**¿Dónde ubicas esto en el ciclo de desarrollo?**
En tres puntos: local, CI y producción. Uno solo deja hueco — sin CI el escaneo
local se salta, y sin monitoreo continuo no te enteras de los CVEs publicados
después del último commit.

**¿Por qué no habilitaste los PRs automáticos de arreglo?**
Con un equipo pequeño, un PR por cada CVE genera más ruido que valor. La decisión
se revisaría con un equipo mayor o con un volumen de dependencias más alto. Es
una decisión de proceso, no técnica.
