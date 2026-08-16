# Caso: integración de Snyk en el pipeline de CI

**Repositorios:** `calatam/cyberclass` (Node) · `calatam/geocompliance-pilot` (Python)
**Fecha:** 15 de agosto de 2026 · **Alcance:** Snyk Open Source (SCA) sobre GitHub Actions

---

## 1. Resumen ejecutivo

Integré el CLI de Snyk en un repositorio de GitHub para detectar vulnerabilidades
en dependencias de terceros, con tres puntos de control: escaneo local,
verificación bloqueante en pull requests y monitoreo continuo en producción.

El resultado son 120 dependencias bajo análisis automático, un pipeline que
bloquea el merge ante vulnerabilidades altas o críticas, y los hallazgos
publicados en la pestaña Security de GitHub.

Al extender el análisis a un segundo repositorio, con dos ecosistemas (Python y
Node), aparecieron **20 vulnerabilidades reales**: 8 en `requirements.txt` y 12
en `web/package-lock.json`. En el lado Python, **5 de 8 llegan por dependencias
transitivas** que nunca fueron declaradas.

El hallazgo de mayor valor no fue una vulnerabilidad sino una discrepancia entre
el dashboard y el escaneo local. Acotarla manifiesto por manifiesto produjo un
experimento controlado: el proyecto **Node coincide exactamente** entre ambas
mediciones porque `package-lock.json` fija versiones, y el proyecto **Python
difiere en 7 vulnerabilidades** porque `requirements.txt` usa rangos abiertos.
Mismo repositorio, mismo escáner, mismo día. Está documentado en la sección 5.5,
incluyendo el error de análisis inicial y cómo se corrigió.

Durante la implementación aparecieron además cuatro fallos que no están en la
documentación básica y que solo se descubren ejecutando (sección 5).

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

### Escaneo de un repositorio Python en producción

El mismo pipeline se aplicó a `calatam/geocompliance-pilot`, que resultó tener
**dos ecosistemas**: un backend Python con `requirements.txt` y un frontend Node
con `package-lock.json`. A diferencia del anterior, aquí sí hubo hallazgos:

| Manifiesto | Dependencias | C | H | M | L | Únicas |
|------------|-------------|---|---|---|---|--------|
| `requirements.txt` (Python) | 30 | 0 | 5 | 3 | 0 | **8** |
| `web/package-lock.json` (Node) | 55 | 1 | 6 | 4 | 1 | **12** |
| **Total** | **85** | **1** | **11** | **7** | **1** | **20** |

Detectar los dos requiere `--all-projects`; con `--file=requirements.txt` solo se
analiza uno, que fue el error descrito en la sección 5.5.

El detalle del lado Python:

```
Tested 30 dependencies for known issues, found 8 issues, 11 vulnerable paths.
```

| Severidad | Paquete | Tipo | Arreglo | Vulnerabilidad |
|-----------|---------|------|---------|----------------|
| High | `pymupdf` | **directa** | → 1.28.0 | Integer Overflow or Wraparound |
| High | `urllib3` | transitiva | → 2.7.0 | Insertion of Sensitive Information Into Sent Data |
| High | `urllib3` | transitiva | → 2.7.0 | Decompression Bomb |
| High | `soupsieve` | transitiva | → 2.8.4 | ReDoS |
| High | `soupsieve` | transitiva | → 2.8.4 | Allocation of Resources Without Limits |
| Medium | `idna` | transitiva | → 3.15 | ReDoS |
| Medium | `requests` | **directa** | → 2.33.0 | Insecure Temporary File |
| Medium | `python-dotenv` | **directa** | → 1.2.2 | Symlink Attack |

**Cinco de ocho llegan por dependencias transitivas.** La peor ilustra el punto:

```
requests@2.32.5 > urllib3@2.6.3    ← filtra información sensible
```

`urllib3` no aparece en `requirements.txt`. Entra arrastrado por `requests`, así
que no se corrige tocando el manifiesto: hay que subir el paquete padre.

### Priorización por paquete padre, no por hallazgo

Las ocho vulnerabilidades se resuelven subiendo **cuatro** paquetes de primer
nivel:

```
PyMuPDF>=1.28.0          # 1 High directo
requests>=2.33.0         # su Medium + urllib3 (2 High) + idna (1 Medium)
beautifulsoup4>=4.14.3   # arrastra soupsieve>=2.8.4 (2 High)
python-dotenv>=1.2.2     # 1 Medium directo
```

Subir `requests` resuelve **cuatro** vulnerabilidades de una sola vez: la propia y
las tres que arrastra. Priorizar por paquete padre en lugar de por hallazgo
individual reduce el trabajo a la cuarta parte.

### Laboratorio de validación

Antes de tener acceso al repositorio Python, y con el proyecto Node limpio, monté
un laboratorio con versiones antiguas para verificar que el escáner detecta:

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

### 5.5 El mismo repositorio, dos recuentos distintos

Este no es un fallo de configuración sino un hallazgo sobre el código, y es el
más valioso del ejercicio. Incluye un error de análisis propio y su corrección,
porque el proceso de acotarlo es la parte instructiva.

**Síntoma inicial:** el dashboard reportaba **27 vulnerabilidades** para
`geocompliance-pilot`. El escaneo local del mismo repositorio, el mismo día,
devolvió **8**.

**Primer diagnóstico, equivocado:** atribuí la diferencia completa al uso de
rangos abiertos en el manifiesto. La conclusión era parcialmente correcta, pero
la comparación estaba mal hecha.

**La corrección:** al abrir el detalle, el dashboard listaba **dos** proyectos
bajo el mismo repositorio:

```
geocompliance-pilot:web/package.json    → 12 vulnerabilidades
geocompliance-pilot:requirements.txt    → 15 vulnerabilidades
                                          ──
                                          27
```

Es un repositorio con dos ecosistemas. Mi escaneo local había usado
`--file=requirements.txt`, es decir, **un solo manifiesto contra la suma de dos**.
El propio CLI lo había advertido y lo pasé por alto:

```
Tip: Detected multiple supported manifests (2), use --all-projects
```

**La medición correcta**, con `snyk test --all-projects`:

| Manifiesto | Escaneo local | Dashboard | ¿Coinciden? |
|------------|---------------|-----------|-------------|
| `web/package-lock.json` (Node) | C1 H6 M4 L1 = **12** | C1 H6 M4 L1 = **12** | **idénticos** |
| `requirements.txt` (Python) | C0 H5 M3 L0 = **8** | C0 H6 M6 L3 = **15** | difieren en 7 |

**Y así el hallazgo resulta mucho más fuerte que la versión original**, porque el
error de comparación convirtió el caso en un experimento controlado:

- El proyecto **Node coincide exactamente**, hasta el desglose por severidad.
  Tiene `package-lock.json`, que fija versiones exactas: los dos análisis miran
  literalmente el mismo software.
- El proyecto **Python difiere en 7 vulnerabilidades**. Tiene `requirements.txt`
  con rangos abiertos:

```
PyMuPDF>=1.24.0      ← el entorno local tenía 1.27.1
requests>=2.31.0     ← el entorno local tenía 2.32.5
```

Mismo repositorio, mismo escáner, mismo día, dos ecosistemas. El que fija
versiones da resultados reproducibles; el que no, no. La variable está aislada.

**El problema de fondo:** un `requirements.txt` con rangos abiertos **no describe
una aplicación, describe una familia de aplicaciones posibles**. El servidor que
instaló hace seis meses, la laptop del desarrollador y el runner de CI tienen tres
conjuntos de versiones distintos, y ninguno coincide necesariamente con lo que
audita el escáner. Un informe de seguridad sobre un manifiesto sin fijar es un
informe sobre una aplicación hipotética.

**Solución:** fijar versiones. `pip freeze > requirements.txt` para el caso
simple, o `pip-tools` / `poetry.lock` cuando se quiere separar lo que se declara
(rangos legibles) de lo que se instala (versiones exactas), que es la práctica
recomendada. Es exactamente lo que `package-lock.json` hace por defecto en Node,
y por eso ese lado del experimento salió reproducible.

**Dos lecciones:**

1. Dos herramientas que dan números distintos sobre lo mismo no significan que
   una esté rota: significan que están midiendo cosas distintas. Entender por qué
   suele revelar un problema más profundo que cualquiera de los dos resultados.
2. Antes de explicar una diferencia, hay que verificar que los dos lados sean
   comparables. Mi primera conclusión era plausible y apuntaba en la dirección
   correcta, pero se apoyaba en una comparación inválida. Acotarla —un manifiesto
   contra un manifiesto— es lo que la convirtió en evidencia.

El hallazgo real no fueron 27, 20 ni 8 vulnerabilidades. Fue que la mitad del
repositorio no tenía forma de saber qué versiones corría en producción, y la otra
mitad sí.

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
5. **Las 8 vulnerabilidades de `geocompliance-pilot` siguen abiertas** — el
   escaneo las identificó y la remediación está propuesta (sección 4), pero
   aplicarla requiere fijar versiones y revalidar que el proyecto siga
   funcionando. Detectar no es remediar.
3. **El umbral `high` deja pasar medias** — decisión consciente para no generar
   fatiga de alertas; se revisan en la pestaña Security pero no bloquean.
4. **Sin arreglo automático** — no se habilitaron los PRs automáticos de Snyk.
   Con un equipo pequeño, un PR automático por CVE puede ser más ruido que ayuda.

---

## 9. Cómo explicarlo

### Versión de 2 minutos

> Integré Snyk en el pipeline de CI de dos repositorios, uno en Node y otro en
> Python. Lo monté en tres capas: escaneo local durante el desarrollo, un gate en
> los pull requests que bloquea el merge si entra algo alto o crítico, y
> monitoreo continuo en main que avisa cuando se publica un CVE nuevo sobre una
> dependencia que ya tenías.
>
> En el repositorio Python encontré 8 vulnerabilidades, cinco de ellas por
> dependencias transitivas que nunca fueron declaradas. La peor estaba en
> `urllib3`, que entra arrastrado por `requests`: no se arregla tocando el
> manifiesto, hay que subir el paquete padre. De hecho subir `requests` resolvía
> cuatro de las ocho de una sola vez, así que prioricé por paquete padre en lugar
> de por hallazgo.
>
> Pero el hallazgo que más me sirvió no fue una vulnerabilidad. El dashboard y
> el escaneo local no coincidían. Mi primera explicación fue que el
> `requirements.txt` usaba rangos abiertos, y era parcialmente correcta, pero la
> comparación estaba mal hecha: el repositorio tenía dos manifiestos y yo estaba
> comparando uno contra la suma de ambos.
>
> Al acotarlo manifiesto por manifiesto quedó un experimento controlado: el
> proyecto Node coincide exactamente, hasta el desglose por severidad, porque
> `package-lock.json` fija versiones. El Python difiere en 7 vulnerabilidades
> porque usa `>=`. Mismo repositorio, mismo escáner, mismo día: el que fija
> versiones es reproducible y el que no, no lo es. La corrección fue fijar
> versiones con pip-compile.
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
