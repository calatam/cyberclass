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

**Confirmación directa.** Abrir el detalle del proyecto en el dashboard cierra el
caso: no es una inferencia, es una observación. Snyk evalúa **la versión mínima
que el rango permite**.

```
requirements.txt:   requests>=2.31.0
Dashboard:          requests@2.31.0     ← exactamente el mínimo declarado
Entorno local:      requests@2.32.5
```

Y el efecto se propaga en cascada por el árbol, porque cada padre viejo arrastra
hijos viejos:

| Paquete | Dashboard | Local | Tipo |
|---------|-----------|-------|------|
| `requests` | 2.31.0 | 2.32.5 | **directa** — el mínimo exacto del manifiesto |
| `urllib3` | 2.0.7 | 2.6.3 | transitiva vía `requests` |
| `idna` | 3.10 | 3.11 | transitiva vía `requests` |
| `soupsieve` | 2.4.1 | 2.8.3 | transitiva vía `beautifulsoup4` |
| `numpy` | 1.21.3 | 2.4.2 | transitiva vía `pandas` |

El caso de `numpy` es el más ilustrativo: **no aparece en `requirements.txt`**.
Entra arrastrado por `pandas`, y como el manifiesto permite `pandas>=2.2.0`, el
dashboard lo resuelve a 2.2.0, que a su vez arrastra `numpy@1.21.3` — una versión
de 2021 con 3 vulnerabilidades. El entorno local tiene `pandas@3.0.1` y por tanto
`numpy@2.4.2`, sin hallazgos.

Es decir: **el rango abierto de un paquete declarado determina la versión de otro
que nunca declaraste**, y con ella su exposición. Dos saltos de distancia entre la
decisión (`pandas>=2.2.0`) y la consecuencia (3 CVEs en numpy).

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

---

## 11. De un repositorio a una organización

Todo lo anterior describe dos repositorios. La pregunta siguiente —y la más
difícil— es qué cambia cuando son cincuenta. Deja de ser un problema de
herramienta y pasa a ser uno de adopción.

### 11.1 Rollout: el orden importa más que la herramienta

El error clásico es activar el bloqueo en todos los repositorios el primer día.
Cada equipo se encuentra con deuda que no creó, el pipeline se pone rojo en todas
partes, y en una semana alguien pide una excepción global. La herramienta queda
instalada y desactivada, que es el peor de los dos mundos: el costo sin el
beneficio.

Un despliegue que sobrevive tiene tres fases:

**Fase 1 — Medir sin bloquear.** `snyk monitor` en todos los repositorios, sin
gate. Nadie se entera salvo por un dashboard que se llena. Al terminar tienes el
mapa real: qué se usa, cuánta deuda hay, qué equipos están peor. Sin ese mapa
cualquier política es una adivinanza.

**Fase 2 — Gate solo para lo nuevo.** El bloqueo aplica a vulnerabilidades que
entran a partir de ahora; la deuda existente queda como backlog priorizado, no
como muro. Así el equipo puede seguir trabajando mientras se limpia, y nadie paga
por decisiones que tomó otro hace dos años.

**Fase 3 — Cerrar la deuda por prioridad.** Con la deuda ya medida y visible, se
ataca por explotabilidad y no por severidad nominal. Aquí ayuda lo aprendido en
la sección 4: priorizar por paquete padre reduce el trabajo a una fracción.

### 11.2 No copiar el YAML cincuenta veces

Un workflow reutilizable (`workflow_call`) en un repositorio central, invocado
por cada proyecto en cinco líneas:

```yaml
jobs:
  seguridad:
    uses: calatam/.github/.github/workflows/snyk-base.yml@main
    secrets: inherit
```

Cambiar el umbral de severidad, agregar un paso o corregir un fallo como el de
`--project-name` pasa a ser **un commit** en vez de cincuenta pull requests. Sin
esto, la política se fragmenta: a los seis meses cada repositorio corre una
versión distinta y nadie sabe cuál es la vigente.

### 11.3 Qué método de importación usar

Los dos métodos que aparecieron en este ejercicio no compiten, cubren casos
distintos:

| | Integración de SCM | CLI en CI |
|---|---|---|
| Descubrimiento | Automático, importa repos solos | Manual, repo por repo |
| Qué analiza | El manifiesto del repositorio | Lo que realmente se construye |
| Re-test | Solo, a diario | Cuando corre el pipeline |
| PRs de arreglo | Sí | No |

La integración de SCM es la que escala: da cobertura amplia sin tocar cada
pipeline. El CLI se reserva para donde importa analizar el artefacto real —
monorepos con resolución compleja, o cualquier caso donde el manifiesto no
determine las versiones instaladas.

Ese "donde el manifiesto no determina las versiones" no es hipotético: es
exactamente la discrepancia de la sección 5.5. En un repositorio con rangos
abiertos, la integración de SCM y el CLI **no pueden coincidir**, y elegir mal
significa auditar una aplicación que no existe.

### 11.4 Métricas: qué mirar y qué no

Sin métricas esto es una herramienta instalada, no un programa de seguridad.
Cuatro que sirven:

| Métrica | Qué responde |
|---------|--------------|
| **Cobertura** (% de repos con escaneo activo) | ¿Sabemos siquiera dónde estamos parados? Es la única que importa en la fase 1 |
| **MTTR de críticas y altas** | ¿Cuánto tarda una vulnerabilidad desde que se detecta hasta que se corrige? |
| **Edad media de las abiertas** | ¿Hay un backlog envejeciendo sin que nadie lo mire? |
| **Escapes a producción** | ¿Cuántas pasaron el gate? Cada una es un hueco del proceso, no un error del equipo |

**Y una que hay que rechazar explícitamente: el número total de
vulnerabilidades.** Baja cuando escaneas menos. Si se convierte en meta, el
incentivo es apagar el escáner o subir el umbral hasta que no reporte nada. Es el
caso de manual de una métrica que se corrompe al medirla, y conviene decirlo en
voz alta antes de que alguien la proponga como KPI del trimestre.

### 11.5 El factor que decide

La parte técnica de esto es un archivo YAML. Lo que determina si el programa
funciona es si los desarrolladores lo perciben como ayuda o como obstáculo, y eso
se juega en decisiones que parecen menores: dónde va el gate, qué umbral, si las
excepciones caducan, si el reporte se publica aunque el build falle.

Un pipeline de seguridad que interrumpe sin explicar termina desactivado, con la
diferencia de que ahora todos creen que el problema está resuelto.

---

## 12. El método: por qué el valor está en el bucle

### 12.1 Cómo se construyó esto

Este trabajo se hizo con asistencia de IA, y conviene decirlo antes de que se
pregunte. La declaración importa menos que lo que sigue: **dónde estuvo el valor
y dónde estuvo el riesgo.**

Se usaron dos asistentes con roles distintos. Uno en la terminal, para construir
el pipeline, ejecutar los escaneos y redactar. Otro en el navegador, para
recorrer la interfaz de Snyk, con una instrucción explícita de no leer ni
transcribir credenciales — su tarea era describir dónde estaban las cosas, no
operarlas.

### 12.2 Lo que la IA aceleró y lo que no resolvió

Lo que aceleró es evidente: escribir el workflow, parsear la salida JSON de los
escaneos, redactar la documentación. Trabajo que habría tomado días quedó en
horas.

Lo que **no** resolvió es más interesante, porque es donde estuvo el aprendizaje:

- El fallo `spawn python ENOENT` no apareció leyendo documentación. Apareció
  ejecutando y volviendo a ejecutar con `-d`.
- La incompatibilidad `--project-name` + `--all-projects` tampoco. El YAML era
  válido, ningún linter la habría detectado. Solo se cayó el pipeline.
- La discrepancia entre el dashboard y la terminal la detecté yo, contrastando
  dos pantallas. Ningún asistente la iba a levantar solo, porque requería mirar
  dos fuentes que nadie le pidió comparar.

El patrón: la IA es rápida produciendo lo **plausible**. Convertir lo plausible
en **verdadero** sigue siendo trabajo humano, y en seguridad esa distinción no es
académica.

### 12.3 Tres errores del proceso, y qué enseñó cada uno

**Una credencial expuesta.** Pegué un API token en el chat para preguntar si era
el correcto. Nunca debió salir de la pantalla donde se generó. Lección operativa:
una credencial va del lugar donde nace al lugar donde se usa, sin escalas — ni
por un chat, ni por un ticket, ni por un mensaje "solo para verificar". La
corrección fue rotarlo.

**Una explicación plausible pero mal fundada.** El primer análisis de la
discrepancia comparaba la suma de dos manifiestos contra el escaneo de uno solo,
y aun así llegaba a una conclusión que sonaba correcta. Lo era a medias. Solo al
acotar la comparación —un manifiesto contra un manifiesto— apareció el
experimento controlado que la convirtió en evidencia. **Una explicación que
encaja no es lo mismo que una explicación verificada.**

**Una advertencia ignorada.** El CLI había impreso `Detected multiple supported
manifests (2)` y pasó de largo. Esa línea contenía la respuesta al problema que
me llevó tres iteraciones resolver. Las herramientas suelen avisar antes de que
uno se dé cuenta de que hay algo que entender.

### 12.4 Es el mismo bucle que la seguridad

El paralelo no es decorativo. Un escáner produce hallazgos plausibles; el trabajo
humano es determinar cuáles son reales y alcanzables. Un asistente produce
respuestas plausibles; el trabajo humano es determinar cuáles se sostienen.

En ambos casos el fallo tiene la misma forma: **aceptar la salida sin verificar
la entrada.** Un equipo que trata los hallazgos del escáner como verdad
automática genera ruido y fatiga; uno que trata la salida de la IA como verdad
automática genera código y documentación que suenan bien y no resisten la primera
pregunta.

Por eso el hallazgo más valioso de este ejercicio —la discrepancia de la sección
5.5— no salió de una herramienta. Salió de contrastar dos fuentes que decían
cosas distintas y negarse a elegir una.

### 12.5 Qué significa esto para un equipo

Tres cosas que aplicaría trabajando con otros:

1. **Exigir la evidencia, no la conclusión.** "El dashboard muestra
   `requests@2.31.0` y el manifiesto dice `>=2.31.0`" es verificable. "Snyk usa
   las versiones mínimas" es una afirmación. La primera se puede refutar; la
   segunda solo se puede creer.
2. **Ejecutar antes de documentar.** Los cuatro fallos de la sección 5 aparecieron
   corriendo, no leyendo. Una guía escrita sin ejecutar transmite la
   documentación oficial, no la experiencia.
3. **Dejar los errores en el registro.** Este documento incluye un análisis
   equivocado y su corrección porque el proceso de acotarlo enseña más que el
   resultado. Un informe sin errores en un trabajo nuevo suele significar que no
   se probó lo suficiente, o que se editaron las partes incómodas.

La IA hizo esto más rápido. No lo hizo más cierto: eso vino de ejecutar, mirar
dos fuentes, encontrar que no cuadraban, y no soltar hasta entender por qué.

---

## 13. El servidor MCP de Snyk: el mismo bucle, del otro lado

Snyk publicó soporte para **Model Context Protocol (MCP)**, el protocolo que
permite a un asistente de IA invocar herramientas externas. La tesis del anuncio
es la contraparte exacta de la sección 12: si la IA acelera la escritura de
código, la seguridad tiene que entrar en ese mismo bucle, no después.

En vez de citarlo, lo probé.

### 13.1 Lo que dice el anuncio y lo que encontré

| | Anuncio | Verificado (CLI 1.1306.4) |
|---|---|---|
| Comando | `snyk mcp -t [stdio\|sse] --experimental` | `--experimental` ya no existe: ahora es `-p <lite\|full\|experimental>` |
| Alcance | "código de primera parte y dependencias" | **14 herramientas**, cubriendo los cuatro productos |
| Transporte | stdio y SSE | Confirmado; SSE es el predeterminado |

El flag cambió entre la publicación y hoy. Es un detalle menor, pero es el tercer
caso en este trabajo donde la documentación y la herramienta no coinciden — y de
nuevo solo aparece ejecutando.

Levantar el servidor y enumerar sus capacidades vía JSON-RPC devuelve:

```
Snyk MCP Server v1.1306.4 · protocolo 2024-11-05 · 14 herramientas
```

| Herramienta | Qué hace |
|-------------|----------|
| `snyk_sca_scan` · `snyk_code_scan` | SCA y SAST |
| `snyk_container_scan` · `snyk_iac_scan` | Contenedores e infraestructura |
| `snyk_secret_scan` | Secretos embebidos en el código |
| `snyk_breakability_check` | **Evalúa si un upgrade rompe el proyecto** |
| `snyk_aibom` | AI Bill of Materials: modelos, datasets y herramientas de IA |
| `snyk_package_health_check` · `snyk_sbom_scan` | Salud de paquetes, análisis de SBOM |
| `snyk_auth` · `snyk_trust` · `snyk_logout` · `snyk_version` · `snyk_send_feedback` | Operación |

Dos merecen atención. **`snyk_aibom`** es una categoría nueva: inventario de los
componentes de IA de un proyecto, el equivalente a un SBOM para la cadena de
suministro de modelos. Y **`snyk_secret_scan`** habría detectado el problema que
yo mismo cometí en la sección 12.3.

### 13.2 Aplicado al problema real de este trabajo

La sección 4 propone remediar subiendo cuatro paquetes. La pregunta que frena esa
remediación en cualquier equipo no es *"¿arregla las vulnerabilidades?"* sino
**"¿rompe algo?"**. Eso es justo lo que responde `snyk_breakability_check`:

| Upgrade | Riesgo | Hallazgo |
|---------|--------|----------|
| `requests` 2.31.0 → 2.33.0 | **medium** | Deja de soportar Python 3.7; deprecación en subclases de `HTTPAdapter` |
| `pandas` 2.2.0 → 3.0.1 | **high** | Copy-on-Write pasa a ser el comportamiento por defecto |

El detalle de `pandas` cambia el plan de remediación:

> *"La asignación encadenada deja de funcionar. `df['col'][mask] = value` ya no
> modifica el DataFrame original; hay que refactorizar a `df.loc[mask, 'col'] =
> value`."* Además el tipo `str` deja de inferirse como `object`, y el mínimo de
> Python sube a 3.11.

Es decir: **la remediación de seguridad exige refactorizar código de aplicación**.
Eso convierte una tarea de "subir una línea del manifiesto" en un cambio que
necesita pruebas y revisión. Sin esa información, el arreglo se aplica, algo se
rompe en producción, y el equipo concluye que actualizar dependencias es
peligroso — que es exactamente cómo nace la deuda de seguridad.

### 13.3 ¿MCP simplifica algo? No: cambia el momento

Conviene desactivar una expectativa. **El servidor MCP no agrega ninguna
capacidad.** Las 14 herramientas que expone existen todas como comandos del CLI,
incluidos `snyk breakability` y `snyk aibom`. Es el mismo escáner, invocado por
otra vía.

Lo que cambia es **quién decide ejecutarlo y cuándo**. Sin MCP, el desarrollador
decide correr el escaneo. Con MCP, el asistente puede hacerlo mientras trabaja,
sin que nadie se lo pida. Suena menor, y en este trabajo resultó no serlo.

**Lo que ocurrió realmente en este caso:**

1. `snyk test` → 8 vulnerabilidades
2. Exportar a JSON y agrupar por paquete padre
3. Decidir la remediación: subir cuatro paquetes
4. **Documentarla en este reporte y publicarla**
5. Horas después, probar `breakability_check` → `pandas` es **riesgo alto**

El paso 5 debió ser el paso 3. La remediación quedó escrita, revisada y publicada
antes de saber que uno de los cuatro upgrades exige refactorizar código de
aplicación.

**Lo que habría ocurrido con el servidor MCP conectado**, en un solo turno:

```
Petición:  "Arregla las vulnerabilidades de este requirements.txt"

El asistente, sin que se lo pidan:
  → snyk_sca_scan(path)                                8 vulnerabilidades
  → snyk_breakability_check(requests, 2.31.0, 2.33.0)  medium
  → snyk_breakability_check(pandas,   2.2.0,  3.0.1)   HIGH
  → snyk_breakability_check(beautifulsoup4, ...)       low

Respuesta:
  "Tres de los cuatro upgrades son seguros. El de pandas exige refactorizar:
   Copy-on-Write pasa a ser el comportamiento por defecto y la asignación
   encadenada deja de funcionar. ¿Lo separo en un cambio aparte?"
```

La diferencia no es velocidad: es **orden**. El riesgo del upgrade llega antes de
decidir, no después de documentar.

Configuración, para dejarlo reproducible:

```bash
claude mcp add snyk -- snyk mcp -t stdio -p experimental
```

```json
{
  "mcpServers": {
    "snyk": { "command": "snyk", "args": ["mcp", "-t", "stdio", "-p", "experimental"] }
  }
}
```

### 13.4 Dónde MCP no habría ayudado

Y aquí está el límite, que importa tanto como la capacidad.

**MCP no habría encontrado la discrepancia de la sección 5.5.** Un agente
invocando `snyk_sca_scan` obtiene la vista local y nada más. Nada le indica que
debe contrastarla con el dashboard: nadie se lo pidió, y no existe una
herramienta que diga *"compara estas dos fuentes"*. Ese hallazgo salió de mirar
dos pantallas y negarse a elegir una.

El resumen, entonces:

> MCP acorta el bucle entre escribir y verificar. No reemplaza a quien decide
> **qué** verificar.

Es la misma conclusión de la sección 12 vista desde el lado del producto. Snyk
mueve el control al punto donde corregir es barato —del despliegue al pull
request, y del pull request al momento en que se escribe la línea—. Es el patrón
correcto, y sigue dejando intacta la parte que no se automatiza: darse cuenta de
que hay algo que verificar.
