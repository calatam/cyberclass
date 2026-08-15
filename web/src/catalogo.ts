import type { Dominio, Ruta } from './types';

export const DOMINIOS: Dominio[] = [
  { id: 'fundamentos', nombre: 'Fundamentos', icono: '🎓', descripcion: 'Punto de entrada. Conceptos base de ciberseguridad.' },
  { id: 'defensa', nombre: 'Defensa (Blue Team)', icono: '🛡️', descripcion: 'Detección, análisis y respuesta ante amenazas.' },
  { id: 'ofensiva', nombre: 'Ofensiva (Red Team)', icono: '⚔️', descripcion: 'Pruebas de penetración y seguridad ofensiva.' },
  { id: 'ingenieria', nombre: 'Ingeniería Segura', icono: '🏗️', descripcion: 'Desarrollo, nube e IoT con seguridad por diseño.' },
  { id: 'avanzado', nombre: 'Especialización', icono: '🔬', descripcion: 'Análisis avanzado y gestión de la seguridad.' },
];

export const RUTAS: Ruta[] = [
  // ============ FUNDAMENTOS ============
  {
    id: 'foundations',
    dominioId: 'fundamentos',
    nombre: 'Cybersecurity Foundations',
    descripcion: 'Los conceptos esenciales que todo profesional de seguridad debe dominar.',
    nivel: 'Básico',
    modulos: [
      {
        id: 'found-cia',
        titulo: 'La Tríada CIA',
        descripcion: 'Confidencialidad, Integridad y Disponibilidad.',
        xp: 100,
        preguntas: [
          {
            texto: '¿Qué representa la "C" en la tríada CIA de seguridad de la información?',
            opciones: ['Control', 'Confidencialidad', 'Cumplimiento', 'Certificación'],
            correcta: 1,
            explicacion: 'La C es Confidencialidad: garantizar que la información solo sea accesible para quienes están autorizados.',
          },
          {
            texto: 'Un atacante modifica los montos en una base de datos bancaria. ¿Qué principio de la tríada CIA se vio comprometido?',
            opciones: ['Confidencialidad', 'Integridad', 'Disponibilidad', 'Autenticación'],
            correcta: 1,
            explicacion: 'La Integridad se refiere a que los datos no sean alterados sin autorización. Modificar montos rompe la integridad.',
          },
          {
            texto: 'Un ataque DDoS que deja un sitio web inaccesible afecta principalmente a:',
            opciones: ['Confidencialidad', 'Integridad', 'Disponibilidad', 'No repudio'],
            correcta: 2,
            explicacion: 'La Disponibilidad garantiza que los sistemas estén accesibles cuando se necesitan. Un DDoS ataca justamente eso.',
          },
          {
            texto: '¿Cuál es un ejemplo de control que protege la confidencialidad?',
            opciones: ['Backups automáticos', 'Cifrado de datos', 'Balanceadores de carga', 'Sumas de verificación (checksums)'],
            correcta: 1,
            explicacion: 'El cifrado hace que los datos sean ilegibles para quien no tenga la clave, protegiendo la confidencialidad.',
          },
        ],
      },
      {
        id: 'found-authn-authz',
        titulo: 'Autenticación vs Autorización',
        descripcion: 'La diferencia entre probar quién eres y qué puedes hacer.',
        xp: 100,
        preguntas: [
          {
            texto: '¿Qué responde la autenticación?',
            opciones: ['¿Qué permisos tengo?', '¿Quién eres?', '¿Cuándo accediste?', '¿Desde dónde te conectas?'],
            correcta: 1,
            explicacion: 'La autenticación verifica la identidad: prueba quién eres (usuario/contraseña, biometría, token).',
          },
          {
            texto: 'Iniciaste sesión correctamente pero no puedes abrir la carpeta de RRHH. Esto es un control de:',
            opciones: ['Autenticación', 'Autorización', 'Cifrado', 'Auditoría'],
            correcta: 1,
            explicacion: 'La autorización define qué recursos puedes usar una vez autenticado. No tienes permiso sobre esa carpeta.',
          },
          {
            texto: '¿Cuál de estos es un factor de autenticación de tipo "algo que eres"?',
            opciones: ['Una contraseña', 'Un token físico', 'Tu huella dactilar', 'Un PIN'],
            correcta: 2,
            explicacion: 'La biometría (huella, rostro, iris) es "algo que eres". La contraseña/PIN es "algo que sabes"; el token es "algo que tienes".',
          },
          {
            texto: 'La autenticación multifactor (MFA) es más segura porque:',
            opciones: ['Usa contraseñas más largas', 'Combina factores de distintas categorías', 'Cambia la clave cada día', 'Cifra el disco duro'],
            correcta: 1,
            explicacion: 'MFA combina dos o más factores de categorías diferentes (saber + tener + ser), por lo que robar solo uno no basta.',
          },
        ],
      },
      {
        id: 'found-malware',
        titulo: 'Tipos de Malware',
        descripcion: 'Virus, gusanos, troyanos, ransomware y más.',
        xp: 120,
        preguntas: [
          {
            texto: '¿Qué caracteriza a un gusano (worm) frente a un virus?',
            opciones: ['Necesita que el usuario ejecute un archivo', 'Se propaga solo por la red sin intervención humana', 'Solo afecta a Windows', 'Siempre cifra archivos'],
            correcta: 1,
            explicacion: 'El gusano se autorreplica y propaga por la red sin acción del usuario; el virus requiere que alguien ejecute el archivo infectado.',
          },
          {
            texto: 'Un programa que aparenta ser legítimo pero oculta código malicioso es un:',
            opciones: ['Gusano', 'Troyano', 'Rootkit', 'Adware'],
            correcta: 1,
            explicacion: 'El troyano (caballo de Troya) se disfraza de software útil para engañar al usuario y ejecutarse.',
          },
          {
            texto: 'El ransomware típicamente:',
            opciones: ['Roba contraseñas del navegador', 'Cifra los archivos y exige un rescate', 'Muestra publicidad no deseada', 'Mina criptomonedas en segundo plano'],
            correcta: 1,
            explicacion: 'El ransomware cifra los datos de la víctima y pide un pago (rescate) para entregar la clave de descifrado.',
          },
          {
            texto: '¿Qué es un rootkit?',
            opciones: ['Un malware que se oculta profundamente para mantener acceso persistente', 'Un antivirus gratuito', 'Un tipo de firewall', 'Una técnica de respaldo'],
            correcta: 0,
            explicacion: 'El rootkit se esconde a bajo nivel del sistema para ocultar su presencia y mantener acceso privilegiado.',
          },
          {
            texto: 'Un software que mina criptomonedas usando tu equipo sin permiso se llama:',
            opciones: ['Cryptojacking', 'Phishing', 'Spoofing', 'Sniffing'],
            correcta: 0,
            explicacion: 'El cryptojacking secuestra los recursos de cómputo de la víctima para minar criptomonedas.',
          },
        ],
      },
      {
        id: 'found-redes',
        titulo: 'Fundamentos de Redes',
        descripcion: 'Puertos, protocolos y el modelo cliente-servidor.',
        xp: 120,
        preguntas: [
          {
            texto: '¿Qué puerto usa HTTPS por defecto?',
            opciones: ['21', '80', '443', '3389'],
            correcta: 2,
            explicacion: 'HTTPS usa el puerto 443. El 80 es HTTP sin cifrar, el 21 es FTP y el 3389 es RDP.',
          },
          {
            texto: '¿Cuál es la función principal de un firewall?',
            opciones: ['Cifrar el tráfico de red', 'Filtrar tráfico según reglas de seguridad', 'Acelerar la conexión a Internet', 'Almacenar contraseñas'],
            correcta: 1,
            explicacion: 'El firewall controla y filtra el tráfico entrante y saliente según reglas definidas.',
          },
          {
            texto: 'El protocolo DNS se encarga de:',
            opciones: ['Cifrar correos', 'Traducir nombres de dominio a direcciones IP', 'Asignar direcciones IP dinámicas', 'Enviar archivos'],
            correcta: 1,
            explicacion: 'DNS traduce nombres legibles (ejemplo.com) a direcciones IP que las máquinas usan para conectarse.',
          },
          {
            texto: '¿Qué significa que un puerto esté "abierto"?',
            opciones: ['Está físicamente dañado', 'Hay un servicio escuchando y aceptando conexiones', 'La red no tiene firewall', 'El equipo está apagado'],
            correcta: 1,
            explicacion: 'Un puerto abierto indica que hay un servicio activo escuchando conexiones en él — objetivo común de reconocimiento.',
          },
        ],
      },
    ],
  },
  {
    id: 'awareness',
    dominioId: 'fundamentos',
    nombre: 'Security Awareness',
    descripcion: 'Concientización: el factor humano y la ingeniería social.',
    nivel: 'Básico',
    modulos: [
      {
        id: 'aware-phishing',
        titulo: 'Reconociendo Phishing',
        descripcion: 'Cómo detectar correos y mensajes fraudulentos.',
        xp: 100,
        preguntas: [
          {
            texto: '¿Cuál es una señal típica de un correo de phishing?',
            opciones: ['Viene de un contacto guardado', 'Sentido de urgencia y amenazas', 'Está bien redactado', 'No tiene enlaces'],
            correcta: 1,
            explicacion: 'El phishing suele presionar con urgencia ("tu cuenta será cerrada") para que actúes sin pensar.',
          },
          {
            texto: 'Recibes un enlace de tu "banco". ¿Qué es lo más seguro?',
            opciones: ['Hacer clic para verificar', 'Escribir la URL del banco manualmente en el navegador', 'Reenviarlo a tus contactos', 'Responder con tus datos'],
            correcta: 1,
            explicacion: 'Nunca confíes en el enlace del correo; escribe tú mismo la dirección oficial o usa la app del banco.',
          },
          {
            texto: 'El "spear phishing" se diferencia del phishing común porque:',
            opciones: ['Es masivo y genérico', 'Está dirigido y personalizado a una víctima específica', 'Solo ocurre por SMS', 'No usa correo'],
            correcta: 1,
            explicacion: 'El spear phishing se personaliza con datos de la víctima (nombre, cargo, empresa) para ser más creíble.',
          },
          {
            texto: 'Un ataque de phishing por SMS se conoce como:',
            opciones: ['Vishing', 'Smishing', 'Pharming', 'Whaling'],
            correcta: 1,
            explicacion: 'Smishing = phishing por SMS. Vishing es por voz/llamada y whaling apunta a altos ejecutivos.',
          },
        ],
      },
      {
        id: 'aware-passwords',
        titulo: 'Higiene de Contraseñas',
        descripcion: 'Buenas prácticas para credenciales seguras.',
        xp: 100,
        preguntas: [
          {
            texto: '¿Cuál es la mejor práctica para gestionar múltiples contraseñas?',
            opciones: ['Usar la misma en todos lados', 'Anotarlas en un post-it', 'Usar un gestor de contraseñas', 'Usar solo tu fecha de nacimiento'],
            correcta: 2,
            explicacion: 'Un gestor de contraseñas genera y almacena claves únicas y fuertes para cada servicio.',
          },
          {
            texto: '¿Qué hace más fuerte a una contraseña?',
            opciones: ['Ser corta y fácil de recordar', 'Su longitud y aleatoriedad', 'Usar solo números', 'Incluir tu nombre'],
            correcta: 1,
            explicacion: 'La longitud combinada con la aleatoriedad (mayúsculas, símbolos, sin patrones) es lo que más dificulta el crackeo.',
          },
          {
            texto: 'Si un servicio sufre una brecha y usabas esa clave en otros sitios, el riesgo se llama:',
            opciones: ['Credential stuffing', 'Tailgating', 'Dumpster diving', 'Shoulder surfing'],
            correcta: 0,
            explicacion: 'El credential stuffing reutiliza credenciales filtradas para acceder a otras cuentas donde repetiste la clave.',
          },
        ],
      },
      {
        id: 'aware-social',
        titulo: 'Ingeniería Social',
        descripcion: 'Manipulación humana para obtener acceso o información.',
        xp: 110,
        preguntas: [
          {
            texto: 'Seguir a un empleado autorizado para entrar a una zona restringida sin credencial es:',
            opciones: ['Tailgating', 'Phishing', 'Spoofing', 'Sniffing'],
            correcta: 0,
            explicacion: 'El tailgating (o piggybacking) consiste en colarse detrás de alguien autorizado a un área física segura.',
          },
          {
            texto: 'Un atacante llama haciéndose pasar por soporte técnico para pedir tu contraseña. Es un caso de:',
            opciones: ['Pretexting', 'Ransomware', 'SQL injection', 'Fuerza bruta'],
            correcta: 0,
            explicacion: 'El pretexting inventa un escenario/pretexto creíble (ser soporte IT) para manipular a la víctima.',
          },
          {
            texto: 'La defensa más efectiva contra la ingeniería social es:',
            opciones: ['Un antivirus actualizado', 'Capacitación y concientización del personal', 'Un firewall más caro', 'Cambiar de proveedor de correo'],
            correcta: 1,
            explicacion: 'La ingeniería social ataca a las personas, no a la tecnología; la capacitación es la mejor defensa.',
          },
        ],
      },
    ],
  },
  // ============ DEFENSA ============
  {
    id: 'soc-1',
    dominioId: 'defensa',
    nombre: 'SOC Analyst 1',
    descripcion: 'Primer nivel de un analista de Centro de Operaciones de Seguridad.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'soc1-roles',
        titulo: 'El SOC y sus Niveles',
        descripcion: 'Estructura y funciones de un Security Operations Center.',
        xp: 130,
        preguntas: [
          {
            texto: '¿Cuál es la función principal de un SOC?',
            opciones: ['Desarrollar software', 'Monitorear, detectar y responder a incidentes de seguridad', 'Vender productos de seguridad', 'Gestionar recursos humanos'],
            correcta: 1,
            explicacion: 'El SOC es el equipo que vigila continuamente la infraestructura para detectar y responder a amenazas.',
          },
          {
            texto: 'Un analista SOC Tier 1 normalmente:',
            opciones: ['Hace ingeniería inversa de malware', 'Realiza el triage inicial de alertas', 'Diseña la arquitectura de red', 'Aprueba presupuestos'],
            correcta: 1,
            explicacion: 'El Tier 1 hace el triage: revisa alertas, descarta falsos positivos y escala lo relevante al Tier 2.',
          },
          {
            texto: '¿Qué es un "falso positivo" en el contexto de un SOC?',
            opciones: ['Un ataque real no detectado', 'Una alerta que resultó no ser una amenaza real', 'Un empleado malicioso', 'Un parche fallido'],
            correcta: 1,
            explicacion: 'Un falso positivo es una alerta que parecía maliciosa pero era actividad legítima. Un ataque no detectado es un falso negativo.',
          },
        ],
      },
      {
        id: 'soc1-siem',
        titulo: 'Introducción a SIEM',
        descripcion: 'Gestión de eventos e información de seguridad.',
        xp: 140,
        preguntas: [
          {
            texto: '¿Qué significa SIEM?',
            opciones: ['Security Internet Email Management', 'Security Information and Event Management', 'System Integrity and Encryption Module', 'Secure Identity and Email Monitoring'],
            correcta: 1,
            explicacion: 'SIEM = Security Information and Event Management: centraliza y correlaciona logs para detectar amenazas.',
          },
          {
            texto: 'La función clave de un SIEM es:',
            opciones: ['Cifrar discos', 'Correlacionar logs de múltiples fuentes para detectar patrones', 'Bloquear puertos USB', 'Instalar parches'],
            correcta: 1,
            explicacion: 'El SIEM agrega logs de muchas fuentes y los correlaciona para revelar patrones de ataque que aislados no se verían.',
          },
          {
            texto: '¿Qué es un "caso de uso" (use case) en un SIEM?',
            opciones: ['Un manual de usuario', 'Una regla de detección para un comportamiento sospechoso específico', 'Un tipo de hardware', 'Una licencia de software'],
            correcta: 1,
            explicacion: 'Un use case es una regla/lógica de correlación que dispara una alerta ante un comportamiento sospechoso definido.',
          },
        ],
      },
      {
        id: 'soc1-ioc',
        titulo: 'Indicadores de Compromiso (IoC)',
        descripcion: 'Señales que revelan una posible intrusión.',
        xp: 140,
        preguntas: [
          {
            texto: '¿Cuál de estos es un Indicador de Compromiso (IoC)?',
            opciones: ['Un empleado de vacaciones', 'Una conexión saliente a una IP maliciosa conocida', 'Una actualización de Windows', 'Un correo interno'],
            correcta: 1,
            explicacion: 'Un IoC es evidencia forense de una intrusión: hashes de malware, IPs/dominios maliciosos, patrones anómalos.',
          },
          {
            texto: 'Un hash SHA-256 de un archivo malicioso es un ejemplo de:',
            opciones: ['Vulnerabilidad', 'Indicador de Compromiso', 'Parche', 'Política'],
            correcta: 1,
            explicacion: 'El hash identifica de forma única un archivo malicioso, sirviendo como IoC para detectarlo en otros sistemas.',
          },
          {
            texto: 'La diferencia entre un IoC y un IoA (Indicador de Ataque) es:',
            opciones: ['Son sinónimos exactos', 'El IoC evidencia un compromiso ya ocurrido; el IoA detecta la intención/acción en curso', 'El IoA solo aplica a redes', 'El IoC solo aplica a correos'],
            correcta: 1,
            explicacion: 'El IoC es evidencia de algo que ya pasó; el IoA se enfoca en detectar el comportamiento del ataque mientras ocurre.',
          },
        ],
      },
    ],
  },
  {
    id: 'threat-hunter',
    dominioId: 'defensa',
    nombre: 'Threat Hunter',
    descripcion: 'Búsqueda proactiva de amenazas ocultas en la red.',
    nivel: 'Avanzado',
    modulos: [
      {
        id: 'th-mitre',
        titulo: 'MITRE ATT&CK',
        descripcion: 'El marco de tácticas y técnicas de adversarios.',
        xp: 160,
        preguntas: [
          {
            texto: '¿Qué es MITRE ATT&CK?',
            opciones: ['Un antivirus', 'Una base de conocimiento de tácticas y técnicas de adversarios', 'Un lenguaje de programación', 'Un firewall'],
            correcta: 1,
            explicacion: 'ATT&CK es una matriz de conocimiento que cataloga cómo operan los atacantes (tácticas, técnicas y procedimientos).',
          },
          {
            texto: 'En ATT&CK, una "táctica" representa:',
            opciones: ['El objetivo del atacante en una fase (el "por qué")', 'Un producto comercial', 'Una IP maliciosa', 'Un tipo de cifrado'],
            correcta: 0,
            explicacion: 'La táctica es el objetivo del adversario (ej. Persistencia, Exfiltración); la técnica es el "cómo" lo logra.',
          },
          {
            texto: '"Persistence" (Persistencia) en ATT&CK busca:',
            opciones: ['Robar datos rápidamente', 'Mantener el acceso al sistema tras reinicios', 'Escanear puertos', 'Cifrar el disco'],
            correcta: 1,
            explicacion: 'La persistencia agrupa técnicas para conservar el acceso al sistema comprometido a lo largo del tiempo.',
          },
        ],
      },
      {
        id: 'th-hipotesis',
        titulo: 'Caza Basada en Hipótesis',
        descripcion: 'Metodología del threat hunting proactivo.',
        xp: 160,
        preguntas: [
          {
            texto: 'El threat hunting se diferencia del monitoreo tradicional porque:',
            opciones: ['Espera a que salte una alerta', 'Busca proactivamente amenazas que evadieron las defensas', 'Solo revisa antivirus', 'Es totalmente automático'],
            correcta: 1,
            explicacion: 'El hunting es proactivo: asume que el atacante ya está dentro y lo busca activamente, sin esperar alertas.',
          },
          {
            texto: 'Una buena hipótesis de caza se basa en:',
            opciones: ['Una corazonada sin fundamento', 'Inteligencia de amenazas y el comportamiento del adversario', 'El horóscopo', 'El presupuesto disponible'],
            correcta: 1,
            explicacion: 'Las hipótesis parten de threat intel, TTPs conocidas (ATT&CK) y conocimiento del entorno para guiar la búsqueda.',
          },
        ],
      },
    ],
  },
  {
    id: 'splunk',
    dominioId: 'defensa',
    nombre: 'Splunk',
    descripcion: 'Análisis de logs y búsquedas con la plataforma Splunk.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'splunk-spl',
        titulo: 'Búsquedas SPL Básicas',
        descripcion: 'El lenguaje de procesamiento de búsqueda de Splunk.',
        xp: 140,
        preguntas: [
          {
            texto: '¿Qué comando SPL se usa para contar eventos agrupados por un campo?',
            opciones: ['table', 'stats count by', 'sort', 'rename'],
            correcta: 1,
            explicacion: '`stats count by campo` agrupa los eventos por ese campo y cuenta cuántos hay en cada grupo.',
          },
          {
            texto: 'En Splunk, el carácter "|" (pipe) sirve para:',
            opciones: ['Comentar código', 'Pasar los resultados de un comando al siguiente', 'Cerrar la búsqueda', 'Definir una variable'],
            correcta: 1,
            explicacion: 'El pipe encadena comandos: la salida de uno se convierte en la entrada del siguiente, igual que en Unix.',
          },
        ],
      },
    ],
  },
  // ============ OFENSIVA ============
  {
    id: 'pentester',
    dominioId: 'ofensiva',
    nombre: 'Junior Penetration Tester',
    descripcion: 'Fundamentos de las pruebas de penetración.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'pen-fases',
        titulo: 'Fases de un Pentest',
        descripcion: 'Metodología de una prueba de penetración.',
        xp: 150,
        preguntas: [
          {
            texto: '¿Cuál es la primera fase de una prueba de penetración?',
            opciones: ['Explotación', 'Reconocimiento', 'Reporte', 'Limpieza'],
            correcta: 1,
            explicacion: 'El reconocimiento (recon) recolecta información del objetivo antes de intentar cualquier explotación.',
          },
          {
            texto: 'El reconocimiento "pasivo" implica:',
            opciones: ['Escanear puertos activamente', 'Recolectar información sin interactuar directamente con el objetivo', 'Explotar una vulnerabilidad', 'Instalar malware'],
            correcta: 1,
            explicacion: 'El recon pasivo usa fuentes públicas (OSINT) sin tocar los sistemas del objetivo, evitando ser detectado.',
          },
          {
            texto: '¿Por qué es crucial la fase de "reporte"?',
            opciones: ['No es importante', 'Comunica hallazgos y recomendaciones para remediar', 'Solo sirve para facturar', 'Reinicia los servidores'],
            correcta: 1,
            explicacion: 'El valor del pentest está en el reporte: documenta vulnerabilidades, riesgo y cómo corregirlas.',
          },
          {
            texto: 'Un documento que define el alcance y autorización legal de un pentest es:',
            opciones: ['El Rules of Engagement (RoE)', 'El antivirus', 'El firewall', 'El SIEM'],
            correcta: 0,
            explicacion: 'Las Rules of Engagement definen qué se puede probar, cuándo y cómo — sin ellas, el pentest sería ilegal.',
          },
        ],
      },
      {
        id: 'pen-scanning',
        titulo: 'Escaneo y Enumeración',
        descripcion: 'Descubrir servicios y puntos de entrada.',
        xp: 150,
        preguntas: [
          {
            texto: '¿Qué herramienta es un escáner de puertos ampliamente usado?',
            opciones: ['Photoshop', 'Nmap', 'Excel', 'Slack'],
            correcta: 1,
            explicacion: 'Nmap es el estándar para descubrir hosts, puertos abiertos y servicios en una red.',
          },
          {
            texto: 'La "enumeración" en pentesting busca:',
            opciones: ['Borrar logs', 'Extraer información detallada de servicios (usuarios, versiones, shares)', 'Cifrar datos', 'Apagar el objetivo'],
            correcta: 1,
            explicacion: 'La enumeración profundiza en los servicios detectados para encontrar usuarios, versiones y recursos explotables.',
          },
        ],
      },
    ],
  },
  {
    id: 'webapp',
    dominioId: 'ofensiva',
    nombre: 'Web Application Security',
    descripcion: 'Seguridad de aplicaciones web y OWASP Top 10.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'web-sqli',
        titulo: 'Inyección SQL',
        descripcion: 'Una de las vulnerabilidades web más críticas.',
        xp: 150,
        preguntas: [
          {
            texto: '¿Qué permite una inyección SQL exitosa?',
            opciones: ['Acelerar la web', 'Manipular consultas a la base de datos y acceder a datos no autorizados', 'Mejorar el SEO', 'Comprimir imágenes'],
            correcta: 1,
            explicacion: 'La SQLi inyecta código SQL malicioso para leer, modificar o borrar datos que no deberían ser accesibles.',
          },
          {
            texto: '¿Cuál es la defensa principal contra la inyección SQL?',
            opciones: ['Usar consultas parametrizadas (prepared statements)', 'Usar contraseñas largas', 'Deshabilitar JavaScript', 'Cambiar de navegador'],
            correcta: 0,
            explicacion: 'Las consultas parametrizadas separan el código de los datos, impidiendo que la entrada del usuario altere la consulta.',
          },
          {
            texto: 'La entrada `\' OR \'1\'=\'1` en un formulario de login es un intento clásico de:',
            opciones: ['XSS', 'Inyección SQL', 'CSRF', 'Clickjacking'],
            correcta: 1,
            explicacion: "`' OR '1'='1` intenta hacer que la condición WHERE siempre sea verdadera, saltándose la autenticación.",
          },
        ],
      },
      {
        id: 'web-xss',
        titulo: 'Cross-Site Scripting (XSS)',
        descripcion: 'Inyección de scripts en el navegador de la víctima.',
        xp: 150,
        preguntas: [
          {
            texto: '¿Qué es un ataque XSS?',
            opciones: ['Robar hardware', 'Inyectar scripts maliciosos que se ejecutan en el navegador de otros usuarios', 'Apagar el servidor', 'Cifrar la base de datos'],
            correcta: 1,
            explicacion: 'El XSS inyecta JavaScript malicioso en una web para que se ejecute en el navegador de otras víctimas (robo de sesión, etc.).',
          },
          {
            texto: 'La defensa clave contra XSS es:',
            opciones: ['Escapar/sanitizar la salida y validar la entrada', 'Usar HTTP en vez de HTTPS', 'Deshabilitar cookies', 'Usar más RAM'],
            correcta: 0,
            explicacion: 'Sanitizar y escapar la salida evita que la entrada del usuario se interprete como código ejecutable en el navegador.',
          },
          {
            texto: 'Un XSS "almacenado" (stored) es más peligroso que uno reflejado porque:',
            opciones: ['Es más rápido', 'Queda guardado en el servidor y afecta a todos los que visitan la página', 'Solo afecta al atacante', 'No usa JavaScript'],
            correcta: 1,
            explicacion: 'El stored XSS persiste en la base de datos del sitio y se sirve a cada visitante, ampliando el alcance del ataque.',
          },
        ],
      },
    ],
  },
  // ============ INGENIERIA SEGURA ============
  {
    id: 'secure-coding',
    dominioId: 'ingenieria',
    nombre: 'Secure Coding',
    descripcion: 'Escribir código resistente a vulnerabilidades.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'sc-input',
        titulo: 'Validación de Entradas',
        descripcion: 'Nunca confíes en los datos del usuario.',
        xp: 140,
        preguntas: [
          {
            texto: 'El principio fundamental del código seguro respecto a la entrada del usuario es:',
            opciones: ['Confiar siempre en ella', 'Nunca confiar y validarla siempre', 'Ignorarla', 'Cifrarla siempre'],
            correcta: 1,
            explicacion: '"Never trust user input": toda entrada debe validarse y sanearse, pues es el vector de la mayoría de ataques.',
          },
          {
            texto: 'La validación de entrada más robusta usa:',
            opciones: ['Lista negra (blacklist) de valores prohibidos', 'Lista blanca (allowlist) de valores permitidos', 'Ninguna validación', 'Solo longitud máxima'],
            correcta: 1,
            explicacion: 'El allowlist define exactamente lo permitido y rechaza todo lo demás; es más seguro que intentar enumerar lo malo.',
          },
        ],
      },
      {
        id: 'sc-secrets',
        titulo: 'Manejo de Secretos',
        descripcion: 'Contraseñas, claves y tokens en el código.',
        xp: 140,
        preguntas: [
          {
            texto: '¿Dónde NO deberías guardar claves de API?',
            opciones: ['En variables de entorno', 'En un gestor de secretos', 'Hardcodeadas en el código fuente del repositorio', 'En un vault cifrado'],
            correcta: 2,
            explicacion: 'Hardcodear secretos en el código (y subirlos a Git) los expone a cualquiera con acceso al repo. Usa variables de entorno o un vault.',
          },
          {
            texto: 'Las contraseñas de usuarios deben almacenarse:',
            opciones: ['En texto plano', 'Con hashing lento y salt (ej. bcrypt/argon2)', 'Cifradas con Base64', 'En un archivo de texto'],
            correcta: 1,
            explicacion: 'Se almacenan con funciones de hashing lentas y con salt (bcrypt, argon2), nunca en texto plano ni con codificación reversible.',
          },
        ],
      },
    ],
  },
  {
    id: 'cloud',
    dominioId: 'ingenieria',
    nombre: 'Cloud Security',
    descripcion: 'Seguridad en entornos de nube.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'cloud-shared',
        titulo: 'Modelo de Responsabilidad Compartida',
        descripcion: 'Quién protege qué en la nube.',
        xp: 150,
        preguntas: [
          {
            texto: 'En el modelo de responsabilidad compartida, el proveedor de nube es responsable de:',
            opciones: ['La seguridad de tus datos y configuraciones', 'La seguridad DE la nube (infraestructura física)', 'Tus contraseñas', 'Tu código'],
            correcta: 1,
            explicacion: 'El proveedor protege la infraestructura ("seguridad de la nube"); el cliente protege sus datos y configuraciones ("seguridad en la nube").',
          },
          {
            texto: 'Un bucket de almacenamiento mal configurado como público puede causar:',
            opciones: ['Mejor rendimiento', 'Fuga masiva de datos', 'Menor costo', 'Más seguridad'],
            correcta: 1,
            explicacion: 'Los buckets públicos por error son una causa frecuentísima de brechas de datos en la nube.',
          },
        ],
      },
    ],
  },
  {
    id: 'iot',
    dominioId: 'ingenieria',
    nombre: 'IoT Security Practices',
    descripcion: 'Seguridad en el Internet de las Cosas.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'iot-basics',
        titulo: 'Riesgos en Dispositivos IoT',
        descripcion: 'Por qué los dispositivos conectados son un blanco.',
        xp: 140,
        preguntas: [
          {
            texto: '¿Cuál es un riesgo común en dispositivos IoT?',
            opciones: ['Demasiada seguridad', 'Credenciales por defecto no cambiadas', 'Exceso de actualizaciones', 'Baterías muy duraderas'],
            correcta: 1,
            explicacion: 'Muchos dispositivos IoT vienen con contraseñas por defecto (admin/admin) que los usuarios nunca cambian, facilitando ataques.',
          },
          {
            texto: 'La botnet Mirai se hizo famosa por:',
            opciones: ['Cifrar hospitales', 'Infectar dispositivos IoT con credenciales débiles para lanzar DDoS masivos', 'Robar tarjetas de crédito', 'Minar Bitcoin'],
            correcta: 1,
            explicacion: 'Mirai reclutó miles de dispositivos IoT con claves por defecto para ejecutar ataques DDoS de gran escala.',
          },
        ],
      },
    ],
  },
  // ============ AVANZADO ============
  {
    id: 'malware',
    dominioId: 'avanzado',
    nombre: 'Malware Analysis',
    descripcion: 'Análisis de software malicioso.',
    nivel: 'Avanzado',
    modulos: [
      {
        id: 'mal-tipos',
        titulo: 'Análisis Estático vs Dinámico',
        descripcion: 'Dos enfoques para estudiar malware.',
        xp: 170,
        preguntas: [
          {
            texto: 'El análisis estático de malware consiste en:',
            opciones: ['Ejecutar el malware y observar su comportamiento', 'Examinar el código/binario sin ejecutarlo', 'Reiniciar el equipo', 'Instalar un antivirus'],
            correcta: 1,
            explicacion: 'El análisis estático inspecciona el archivo (strings, cabeceras, código) sin ejecutarlo, evitando el riesgo de infección.',
          },
          {
            texto: 'El análisis dinámico requiere:',
            opciones: ['Un entorno aislado (sandbox) para ejecutar la muestra', 'El equipo de producción', 'Desconectar el antivirus en tu PC principal', 'No usar máquinas virtuales'],
            correcta: 0,
            explicacion: 'El análisis dinámico ejecuta el malware en un sandbox aislado para observar su comportamiento sin dañar sistemas reales.',
          },
        ],
      },
    ],
  },
  {
    id: 'reversing',
    dominioId: 'avanzado',
    nombre: 'Reverse Engineering',
    descripcion: 'Ingeniería inversa de binarios.',
    nivel: 'Avanzado',
    proximamente: true,
    modulos: [],
  },
  {
    id: 'security-mgmt',
    dominioId: 'avanzado',
    nombre: 'Security Management',
    descripcion: 'Gestión, gobernanza y cumplimiento.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'mgmt-riesgo',
        titulo: 'Gestión de Riesgos',
        descripcion: 'Identificar, evaluar y tratar riesgos.',
        xp: 150,
        preguntas: [
          {
            texto: 'El riesgo se suele expresar como:',
            opciones: ['Amenaza + Parche', 'Probabilidad × Impacto', 'Costo − Beneficio', 'Usuarios ÷ Servidores'],
            correcta: 1,
            explicacion: 'El riesgo combina la probabilidad de que una amenaza se materialice con el impacto que tendría.',
          },
          {
            texto: 'Contratar un seguro cibernético es una estrategia de:',
            opciones: ['Evitar el riesgo', 'Transferir el riesgo', 'Aceptar el riesgo', 'Ignorar el riesgo'],
            correcta: 1,
            explicacion: 'Transferir el riesgo traslada parte del impacto financiero a un tercero (aseguradora). Otras estrategias: mitigar, evitar, aceptar.',
          },
          {
            texto: '¿Qué es el "riesgo residual"?',
            opciones: ['El riesgo antes de aplicar controles', 'El riesgo que permanece después de aplicar controles', 'Un riesgo inexistente', 'El riesgo del proveedor'],
            correcta: 1,
            explicacion: 'El riesgo residual es lo que queda tras implementar los controles de mitigación; la organización decide si lo acepta.',
          },
        ],
      },
    ],
  },
];

export function todosLosModulos() {
  return RUTAS.flatMap((r) => r.modulos);
}

export function buscarModulo(id: string) {
  for (const ruta of RUTAS) {
    const m = ruta.modulos.find((mod) => mod.id === id);
    if (m) return { ruta, modulo: m };
  }
  return null;
}

export function buscarRuta(id: string) {
  return RUTAS.find((r) => r.id === id) ?? null;
}
