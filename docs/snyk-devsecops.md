# Integrar Snyk en un repositorio de GitHub

Guía práctica de la integración que está implementada en este repo
([`.github/workflows/snyk.yml`](../.github/workflows/snyk.yml)), con el equivalente
en Python en cada paso.

---

## 0. Qué es Snyk y dónde encaja

Snyk es una plataforma de seguridad para desarrolladores. Cuatro productos, y en
una entrevista conviene no confundirlos:

| Producto | Qué analiza | Manifiesto típico |
|----------|-------------|-------------------|
| **Snyk Open Source** (SCA) | Dependencias de terceros con CVEs conocidos | `requirements.txt`, `package-lock.json` |
| **Snyk Code** (SAST) | Tu propio código: inyección SQL, XSS, secretos | archivos fuente |
| **Snyk Container** | Imágenes base y paquetes del SO | `Dockerfile` |
| **Snyk IaC** | Terraform, Kubernetes, CloudFormation | `.tf`, `.yaml` |

Este ejercicio cubre **Open Source (SCA)**, que es el más común y el que suele
preguntarse: *"¿cómo detectas vulnerabilidades en las dependencias?"*

El concepto de fondo: entre el 80% y el 90% del código de una aplicación moderna
no lo escribiste tú, viene de dependencias. Ahí es donde está la superficie de
ataque que no controlas.

---

## 1. Instalar el CLI

```bash
npm install -g snyk        # también: brew install snyk
snyk --version
```

El CLI está escrito en Node, pero **escanea cualquier lenguaje**: Python, Java,
Go, .NET. No necesitas Node en el proyecto para escanear Python.

---

## 2. Autenticar

```bash
snyk auth
```

Abre el navegador, inicias sesión (el plan gratuito alcanza de sobra) y guarda un
token en `~/.config/configstore/snyk.json`.

```bash
snyk whoami            # confirma la sesión (devuelve tu usuario/organización)
```

### Trampa comprobada: el token del navegador NO sirve para CI

`snyk auth` sin argumentos hace login por navegador y guarda un **token OAuth de
corta vida** (1 hora, se renueva solo) en `~/.config/configstore/snyk.json`, bajo
la clave `INTERNAL_OAUTH_TOKEN_STORAGE`. Por eso `snyk config get api` **devuelve
vacío** después de autenticarte así.

El `SNYK_TOKEN` que necesita GitHub Actions es el **API token**, que se saca de
la interfaz web:

`app.snyk.io → Account Settings → Auth Token → click to show`

En una organización lo correcto es un **Service Account token** en vez del
personal: no se va con la persona cuando cambia de equipo, y su alcance se
limita a lo que el pipeline necesita.

⚠️ Cualquiera de los dos es una credencial: nunca en el código ni en un commit.

---

## 3. Primer escaneo local

**Python:**
```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt          # ← paso obligatorio, ver abajo
snyk test --file=requirements.txt --package-manager=pip
```

> **Trampa comprobada en macOS:** si escaneas fuera de un venv, Snyk falla con
> `spawn python ENOENT`. Busca un binario llamado `python` y macOS solo trae
> `python3`. Se resuelve con `--command=python3`, o entrando al venv (que sí
> crea un `python`). El error que muestra Snyk es genérico —
> *"Failed to test pip project"*—; la causa real solo aparece con `-d`.

**Node (lo que aplica a este repo):**
```bash
npm ci
snyk test --all-projects
```

### El detalle que distingue a quien lo hizo de quien lo leyó

En Python **hay que instalar las dependencias antes de escanear**.
`requirements.txt` declara solo las dependencias directas; las transitivas —donde
vive la mayoría de las vulnerabilidades— solo aparecen tras resolver el árbol.
Snyk necesita el entorno instalado para construirlo.

En Node no hace falta: `package-lock.json` ya contiene el árbol completo con
versiones exactas.

Corolario práctico: **`requirements.txt` con `>=` es un problema para seguridad.**
`requests>=2.31.0` no dice qué versión corre en producción. Por eso se usa
`pip freeze > requirements.txt` o herramientas como `pip-tools` / `poetry.lock`.
Si te preguntan cómo mejorarías el pipeline, esta es una respuesta sólida.

---

## 4. Leer el resultado

```
✗ High severity vulnerability found in requests
  Description: Insufficiently Protected Credentials
  Info: https://security.snyk.io/vuln/SNYK-PYTHON-REQUESTS-6928867
  Introduced through: requests@2.19.1
  Fixed in: 2.32.0
```

Lo que importa de cada hallazgo:

- **Severity** — Critical / High / Medium / Low, derivada del CVSS
- **Introduced through** — la cadena de dependencias. Si el paquete vulnerable
  es transitivo, no puedes actualizarlo directamente: hay que subir el padre
- **Fixed in** — si dice "No fix available", tocan mitigaciones: quitar la
  dependencia, aislar la función afectada o aceptar el riesgo con justificación

Códigos de salida (esto es lo que hace que un pipeline falle):

| Código | Significado |
|--------|-------------|
| `0` | Sin vulnerabilidades sobre el umbral |
| `1` | Se encontraron vulnerabilidades |
| `2` | Error de ejecución (fallo de auth, manifiesto ilegible) |
| `3` | No se detectó ningún proyecto soportado |

Distinguir el `1` del `2` importa: uno es "hay hallazgos", el otro es "el escáner
no corrió". Tratarlos igual deja pasar código sin analizar.

---

## 5. `test` vs `monitor`

```bash
snyk test      # foto del momento; devuelve exit code; sirve de gate en CI
snyk monitor   # sube el árbol de dependencias a Snyk y lo vigila en el tiempo
```

`monitor` es la parte que suele olvidarse. Un CVE puede publicarse mañana sobre
una dependencia que no tocaste hace meses: sin `monitor`, nadie se entera hasta
el próximo build. Por eso en el workflow de este repo `monitor` corre solo en
`main`, con un `cron` semanal como red de seguridad.

---

## 6. Integración con GitHub Actions

**Configurar el secreto** (una sola vez):

`Settings → Secrets and variables → Actions → New repository secret`
- Nombre: `SNYK_TOKEN`
- Valor: el **API token** de `app.snyk.io → Account Settings → Auth Token`
  (no el de `snyk config get api`, que queda vacío tras el login por navegador —
  ver la trampa del paso 2)

O por CLI, pegando el token cuando lo pida:
```bash
gh secret set SNYK_TOKEN --repo calatam/cyberclass
```

El workflow ya está en [`.github/workflows/snyk.yml`](../.github/workflows/snyk.yml).
Sus tres decisiones de diseño, que son lo que vale explicar:

**a) El gate está en los pull requests, no en `main`.**
Bloquear en `main` es tarde: el código ya se mezcló. En el PR el costo de
arreglarlo es mínimo.

**b) `--severity-threshold=high`.**
Sin umbral, el pipeline falla con vulnerabilidades bajas y el equipo aprende a
ignorarlo — el peor resultado posible. Las medias y bajas quedan reportadas en la
pestaña Security, pero no bloquean. La seguridad que interrumpe todo el tiempo
termina desactivada.

**c) El SARIF se publica antes de fallar el build.**
`snyk test` sale con código 1 al encontrar algo, lo que cortaría el job y dejaría
los hallazgos sin publicar. Por eso el primer paso lleva `continue-on-error: true`
y genera el SARIF, y un paso posterior es el que corta. Así los resultados quedan
visibles en `Security → Code scanning` aunque el build falle.

---

## 7. Remediar

```bash
snyk fix                       # sube versiones automáticamente donde puede
snyk test --print-deps         # muestra el árbol para entender una transitiva
snyk ignore --id=<ID> --expiry=2026-11-15 --reason="..."
```

Sobre `snyk ignore`: siempre con motivo y con caducidad. Una excepción sin fecha
es deuda de seguridad que nadie vuelve a mirar. La política de este repo está en
[`.snyk`](../.snyk) con el formato y la regla de los 90 días.

---

## 8. Laboratorio para practicar

Este repo está limpio (`npm audit` da 0), así que para ver hallazgos reales hay
un laboratorio con versiones antiguas y CVEs conocidos:

```
scratchpad/snyk-lab/
  requirements.txt            # requests 2.19.1, PyYAML 5.1, Jinja2 2.10…
  requirements-arreglado.txt  # las mismas ya parchadas
```

```bash
cd <ruta-del-lab>
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
snyk test --file=requirements.txt --package-manager=pip
```

### Resultados reales de esta ejecución (2026-08-15)

| Escaneo | Dependencias | Hallazgos | Exit code |
|---------|-------------|-----------|-----------|
| Lab, versiones antiguas | 11 | **41** (1 Critical, 14 High) | `1` → CI falla |
| Lab, versiones parchadas | 13 | **0** | `0` → CI pasa |
| cyberclass (`api/` + `web/`) | 120 | **0** | `0` → CI pasa |

El umbral cambia cuántos ves, no si el build pasa:

```
--severity-threshold=low       → 41 hallazgos, exit 1
--severity-threshold=high      → 15 hallazgos, exit 1
--severity-threshold=critical  →  1 hallazgo,  exit 1
```

Basta **una** vulnerabilidad sobre el umbral para que el pipeline falle.

### El hallazgo que mejor explica el problema

```
✗ Information Exposure [Critical Severity] in requests@2.19.1
✗ Open Redirect [Medium Severity] in urllib3@1.23
    introduced by requests@2.19.1 > urllib3@1.23
```

`urllib3` **nunca fue declarado** en `requirements.txt`: entró como dependencia
de `requests`. No puedes arreglarlo tocando tu manifiesto —hay que subir
`requests`, que es quien lo arrastra—. Esa cadena `A > B` es la razón por la que
leer el archivo de dependencias a ojo no sustituye a un escáner.

---

## 9. Preguntas típicas de entrevista

**¿Cómo evitas que el equipo ignore las alertas?**
Umbral por severidad, gate solo en PRs, y excepciones con caducidad. El objetivo
no es cero alertas, es que las que aparezcan se atiendan.

**¿Snyk reemplaza a `npm audit` o `pip-audit`?**
No en lo básico: los tres consultan bases de vulnerabilidades. Snyk agrega base
propia (a veces antes que la NVD), monitoreo continuo, PRs de arreglo automático,
priorización por explotabilidad y política centralizada. En un proyecto personal
`pip-audit` alcanza; en una organización, la diferencia es la gobernanza.

**¿Y si la vulnerabilidad no tiene arreglo?**
Se evalúa si el código afectado es alcanzable desde tu aplicación. Si no lo es,
se documenta como excepción con caducidad. Si lo es, toca mitigar: aislar,
reemplazar la dependencia o parchear.

**¿Dónde ubicas esto en el SDLC?**
En tres puntos: local (pre-commit o a mano), CI (gate en el PR) y producción
(monitoreo continuo). Uno solo deja hueco: sin CI se salta, sin monitoreo no te
enteras de CVEs nuevos.

**¿Qué diferencia hay entre escanear Python y Node?**
Python exige instalar las dependencias antes porque `requirements.txt` no tiene
el árbol de transitivas; Node lo trae en el lockfile. De ahí que fijar versiones
sea un requisito de seguridad, no una manía.
