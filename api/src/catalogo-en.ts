// Course content — English version (versioned copy of the catalog).
//
// At runtime content lives in SQLite and is edited from /admin; this file is
// the SEED (loaded into an empty database) and doubles as an example of the
// data structure.
//
// IDs carry an `-en` suffix so both languages can coexist in the same tables.

import type { Dominio, Ruta } from './types.js';

export const DOMINIOS_EN: Dominio[] = [
  { id: 'fundamentos-en', nombre: 'Fundamentals', icono: '🎓', descripcion: 'Starting point. Core cybersecurity concepts.' },
  { id: 'defensa-en', nombre: 'Defense (Blue Team)', icono: '🛡️', descripcion: 'Threat detection, analysis and response.' },
  { id: 'ofensiva-en', nombre: 'Offense (Red Team)', icono: '⚔️', descripcion: 'Penetration testing and offensive security.' },
  { id: 'ingenieria-en', nombre: 'Secure Engineering', icono: '🏗️', descripcion: 'Development, cloud and IoT with security by design.' },
  { id: 'avanzado-en', nombre: 'Specialization', icono: '🔬', descripcion: 'Advanced analysis and security management.' },
];

export const RUTAS_EN: Ruta[] = [
  // ============ FUNDAMENTALS ============
  {
    id: 'foundations-en',
    dominioId: 'fundamentos-en',
    nombre: 'Cybersecurity Foundations',
    descripcion: 'The essential concepts every security professional must master.',
    nivel: 'Básico',
    modulos: [
      {
        id: 'found-cia-en',
        titulo: 'The CIA Triad',
        descripcion: 'Confidentiality, Integrity and Availability.',
        xp: 100,
        preguntas: [
          {
            texto: 'What does the "C" stand for in the CIA triad of information security?',
            opciones: ['Control', 'Confidentiality', 'Compliance', 'Certification'],
            correcta: 1,
            explicacion: 'The C is Confidentiality: ensuring information is only accessible to those authorized to see it.',
          },
          {
            texto: 'An attacker modifies the amounts in a bank database. Which principle of the CIA triad was compromised?',
            opciones: ['Confidentiality', 'Integrity', 'Availability', 'Authentication'],
            correcta: 1,
            explicacion: 'Integrity means data is not altered without authorization. Modifying amounts breaks integrity.',
          },
          {
            texto: 'A DDoS attack that makes a website unreachable primarily affects:',
            opciones: ['Confidentiality', 'Integrity', 'Availability', 'Non-repudiation'],
            correcta: 2,
            explicacion: 'Availability guarantees systems are reachable when needed. A DDoS attacks exactly that.',
          },
          {
            texto: 'Which of these is an example of a control that protects confidentiality?',
            opciones: ['Automated backups', 'Data encryption', 'Load balancers', 'Checksums'],
            correcta: 1,
            explicacion: 'Encryption makes data unreadable to anyone without the key, protecting confidentiality.',
          },
        ],
      },
      {
        id: 'found-authn-authz-en',
        titulo: 'Authentication vs Authorization',
        descripcion: 'The difference between proving who you are and what you may do.',
        xp: 100,
        preguntas: [
          {
            texto: 'What question does authentication answer?',
            opciones: ['What permissions do I have?', 'Who are you?', 'When did you log in?', 'Where are you connecting from?'],
            correcta: 1,
            explicacion: 'Authentication verifies identity: it proves who you are (password, biometrics, token).',
          },
          {
            texto: 'You logged in successfully but cannot open the HR folder. This is a control of:',
            opciones: ['Authentication', 'Authorization', 'Encryption', 'Auditing'],
            correcta: 1,
            explicacion: 'Authorization defines which resources you may use once authenticated. You lack permission on that folder.',
          },
          {
            texto: 'Which of these is an authentication factor of the type "something you are"?',
            opciones: ['A password', 'A hardware token', 'Your fingerprint', 'A PIN'],
            correcta: 2,
            explicacion: 'Biometrics (fingerprint, face, iris) is "something you are". A password or PIN is "something you know"; a token is "something you have".',
          },
          {
            texto: 'Multi-factor authentication (MFA) is more secure because:',
            opciones: ['It uses longer passwords', 'It combines factors from different categories', 'It rotates the key daily', 'It encrypts the hard drive'],
            correcta: 1,
            explicacion: 'MFA combines two or more factors from different categories (know + have + are), so stealing just one is not enough.',
          },
        ],
      },
      {
        id: 'found-malware-en',
        titulo: 'Types of Malware',
        descripcion: 'Viruses, worms, trojans, ransomware and more.',
        xp: 120,
        preguntas: [
          {
            texto: 'What distinguishes a worm from a virus?',
            opciones: ['It needs the user to run a file', 'It spreads by itself across the network with no human action', 'It only affects Windows', 'It always encrypts files'],
            correcta: 1,
            explicacion: 'A worm self-replicates and spreads across the network without user action; a virus requires someone to run the infected file.',
          },
          {
            texto: 'A program that appears legitimate but hides malicious code is a:',
            opciones: ['Worm', 'Trojan', 'Rootkit', 'Adware'],
            correcta: 1,
            explicacion: 'A trojan (Trojan horse) disguises itself as useful software to trick the user into running it.',
          },
          {
            texto: 'Ransomware typically:',
            opciones: ['Steals browser passwords', 'Encrypts files and demands a ransom', 'Displays unwanted ads', 'Mines cryptocurrency in the background'],
            correcta: 1,
            explicacion: 'Ransomware encrypts the victim\'s data and demands payment in exchange for the decryption key.',
          },
          {
            texto: 'What is a rootkit?',
            opciones: ['Malware that hides deep in the system to keep persistent access', 'A free antivirus', 'A type of firewall', 'A backup technique'],
            correcta: 0,
            explicacion: 'A rootkit hides at a low level of the system to conceal its presence and retain privileged access.',
          },
          {
            texto: 'Software that mines cryptocurrency using your machine without permission is called:',
            opciones: ['Cryptojacking', 'Phishing', 'Spoofing', 'Sniffing'],
            correcta: 0,
            explicacion: 'Cryptojacking hijacks the victim\'s computing resources to mine cryptocurrency.',
          },
        ],
      },
      {
        id: 'found-redes-en',
        titulo: 'Networking Fundamentals',
        descripcion: 'Ports, protocols and the client-server model.',
        xp: 120,
        preguntas: [
          {
            texto: 'Which port does HTTPS use by default?',
            opciones: ['21', '80', '443', '3389'],
            correcta: 2,
            explicacion: 'HTTPS uses port 443. Port 80 is unencrypted HTTP, 21 is FTP and 3389 is RDP.',
          },
          {
            texto: 'What is the main function of a firewall?',
            opciones: ['Encrypt network traffic', 'Filter traffic according to security rules', 'Speed up the internet connection', 'Store passwords'],
            correcta: 1,
            explicacion: 'A firewall controls and filters inbound and outbound traffic based on defined rules.',
          },
          {
            texto: 'The DNS protocol is responsible for:',
            opciones: ['Encrypting email', 'Translating domain names into IP addresses', 'Assigning dynamic IP addresses', 'Transferring files'],
            correcta: 1,
            explicacion: 'DNS translates human-readable names (example.com) into the IP addresses machines use to connect.',
          },
          {
            texto: 'What does it mean for a port to be "open"?',
            opciones: ['It is physically damaged', 'A service is listening and accepting connections', 'The network has no firewall', 'The machine is powered off'],
            correcta: 1,
            explicacion: 'An open port means a service is actively listening on it — a common reconnaissance target.',
          },
        ],
      },
    ],
  },
  {
    id: 'awareness-en',
    dominioId: 'fundamentos-en',
    nombre: 'Security Awareness',
    descripcion: 'Awareness: the human factor and social engineering.',
    nivel: 'Básico',
    modulos: [
      {
        id: 'aware-phishing-en',
        titulo: 'Spotting Phishing',
        descripcion: 'How to detect fraudulent emails and messages.',
        xp: 100,
        preguntas: [
          {
            texto: 'Which is a typical sign of a phishing email?',
            opciones: ['It comes from a saved contact', 'A sense of urgency and threats', 'It is well written', 'It has no links'],
            correcta: 1,
            explicacion: 'Phishing usually pressures you with urgency ("your account will be closed") so you act without thinking.',
          },
          {
            texto: 'You receive a link from your "bank". What is the safest action?',
            opciones: ['Click it to verify', 'Type the bank URL yourself in the browser', 'Forward it to your contacts', 'Reply with your details'],
            correcta: 1,
            explicacion: 'Never trust the link in the email; type the official address yourself or use the bank app.',
          },
          {
            texto: 'Spear phishing differs from ordinary phishing because:',
            opciones: ['It is mass-mailed and generic', 'It is targeted and personalized to a specific victim', 'It only happens over SMS', 'It does not use email'],
            correcta: 1,
            explicacion: 'Spear phishing is personalized with the victim\'s details (name, role, company) to be more believable.',
          },
          {
            texto: 'A phishing attack delivered over SMS is known as:',
            opciones: ['Vishing', 'Smishing', 'Pharming', 'Whaling'],
            correcta: 1,
            explicacion: 'Smishing = phishing over SMS. Vishing is by voice call, and whaling targets senior executives.',
          },
        ],
      },
      {
        id: 'aware-passwords-en',
        titulo: 'Password Hygiene',
        descripcion: 'Good practices for secure credentials.',
        xp: 100,
        preguntas: [
          {
            texto: 'What is the best practice for managing multiple passwords?',
            opciones: ['Use the same one everywhere', 'Write them on a sticky note', 'Use a password manager', 'Use only your date of birth'],
            correcta: 2,
            explicacion: 'A password manager generates and stores unique, strong credentials for every service.',
          },
          {
            texto: 'What makes a password stronger?',
            opciones: ['Being short and easy to remember', 'Its length and randomness', 'Using only numbers', 'Including your name'],
            correcta: 1,
            explicacion: 'Length combined with randomness (uppercase, symbols, no patterns) is what makes cracking hardest.',
          },
          {
            texto: 'If a service is breached and you reused that password elsewhere, the risk is called:',
            opciones: ['Credential stuffing', 'Tailgating', 'Dumpster diving', 'Shoulder surfing'],
            correcta: 0,
            explicacion: 'Credential stuffing reuses leaked credentials to access other accounts where you repeated the password.',
          },
        ],
      },
      {
        id: 'aware-social-en',
        titulo: 'Social Engineering',
        descripcion: 'Manipulating people to gain access or information.',
        xp: 110,
        preguntas: [
          {
            texto: 'Following an authorized employee into a restricted area without a badge is:',
            opciones: ['Tailgating', 'Phishing', 'Spoofing', 'Sniffing'],
            correcta: 0,
            explicacion: 'Tailgating (or piggybacking) means slipping in behind someone authorized into a secure physical area.',
          },
          {
            texto: 'An attacker calls pretending to be tech support to ask for your password. This is a case of:',
            opciones: ['Pretexting', 'Ransomware', 'SQL injection', 'Brute force'],
            correcta: 0,
            explicacion: 'Pretexting invents a believable scenario (being IT support) to manipulate the victim.',
          },
          {
            texto: 'The most effective defense against social engineering is:',
            opciones: ['An up-to-date antivirus', 'Staff training and awareness', 'A more expensive firewall', 'Switching email providers'],
            correcta: 1,
            explicacion: 'Social engineering attacks people, not technology; training is the best defense.',
          },
        ],
      },
    ],
  },
  // ============ DEFENSE ============
  {
    id: 'soc-1-en',
    dominioId: 'defensa-en',
    nombre: 'SOC Analyst 1',
    descripcion: 'First tier of a Security Operations Center analyst.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'soc1-roles-en',
        titulo: 'The SOC and Its Tiers',
        descripcion: 'Structure and duties of a Security Operations Center.',
        xp: 130,
        preguntas: [
          {
            texto: 'What is the main purpose of a SOC?',
            opciones: ['Develop software', 'Monitor, detect and respond to security incidents', 'Sell security products', 'Manage human resources'],
            correcta: 1,
            explicacion: 'The SOC is the team that continuously watches the infrastructure to detect and respond to threats.',
          },
          {
            texto: 'A Tier 1 SOC analyst typically:',
            opciones: ['Reverse-engineers malware', 'Performs the initial triage of alerts', 'Designs the network architecture', 'Approves budgets'],
            correcta: 1,
            explicacion: 'Tier 1 does triage: reviews alerts, discards false positives and escalates what matters to Tier 2.',
          },
          {
            texto: 'What is a "false positive" in a SOC context?',
            opciones: ['A real attack that went undetected', 'An alert that turned out not to be a real threat', 'A malicious employee', 'A failed patch'],
            correcta: 1,
            explicacion: 'A false positive is an alert that looked malicious but was legitimate activity. An undetected attack is a false negative.',
          },
        ],
      },
      {
        id: 'soc1-siem-en',
        titulo: 'Introduction to SIEM',
        descripcion: 'Security information and event management.',
        xp: 140,
        preguntas: [
          {
            texto: 'What does SIEM stand for?',
            opciones: ['Security Internet Email Management', 'Security Information and Event Management', 'System Integrity and Encryption Module', 'Secure Identity and Email Monitoring'],
            correcta: 1,
            explicacion: 'SIEM = Security Information and Event Management: it centralizes and correlates logs to detect threats.',
          },
          {
            texto: 'The key function of a SIEM is:',
            opciones: ['Encrypting disks', 'Correlating logs from multiple sources to detect patterns', 'Blocking USB ports', 'Installing patches'],
            correcta: 1,
            explicacion: 'A SIEM aggregates logs from many sources and correlates them to reveal attack patterns invisible in isolation.',
          },
          {
            texto: 'What is a "use case" in a SIEM?',
            opciones: ['A user manual', 'A detection rule for a specific suspicious behavior', 'A type of hardware', 'A software license'],
            correcta: 1,
            explicacion: 'A use case is correlation logic that raises an alert when a defined suspicious behavior occurs.',
          },
        ],
      },
      {
        id: 'soc1-ioc-en',
        titulo: 'Indicators of Compromise (IoC)',
        descripcion: 'Signals that reveal a possible intrusion.',
        xp: 140,
        preguntas: [
          {
            texto: 'Which of these is an Indicator of Compromise (IoC)?',
            opciones: ['An employee on vacation', 'An outbound connection to a known malicious IP', 'A Windows update', 'An internal email'],
            correcta: 1,
            explicacion: 'An IoC is forensic evidence of an intrusion: malware hashes, malicious IPs or domains, anomalous patterns.',
          },
          {
            texto: 'A SHA-256 hash of a malicious file is an example of:',
            opciones: ['A vulnerability', 'An Indicator of Compromise', 'A patch', 'A policy'],
            correcta: 1,
            explicacion: 'The hash uniquely identifies a malicious file, serving as an IoC to detect it on other systems.',
          },
          {
            texto: 'The difference between an IoC and an IoA (Indicator of Attack) is:',
            opciones: ['They are exact synonyms', 'An IoC evidences a compromise that already happened; an IoA detects intent or action in progress', 'IoAs only apply to networks', 'IoCs only apply to email'],
            correcta: 1,
            explicacion: 'An IoC is evidence of something that already happened; an IoA focuses on detecting attacker behavior as it unfolds.',
          },
        ],
      },
    ],
  },
  {
    id: 'threat-hunter-en',
    dominioId: 'defensa-en',
    nombre: 'Threat Hunter',
    descripcion: 'Proactively searching for hidden threats in the network.',
    nivel: 'Avanzado',
    modulos: [
      {
        id: 'th-mitre-en',
        titulo: 'MITRE ATT&CK',
        descripcion: 'The framework of adversary tactics and techniques.',
        xp: 160,
        preguntas: [
          {
            texto: 'What is MITRE ATT&CK?',
            opciones: ['An antivirus', 'A knowledge base of adversary tactics and techniques', 'A programming language', 'A firewall'],
            correcta: 1,
            explicacion: 'ATT&CK is a knowledge matrix cataloguing how attackers operate (tactics, techniques and procedures).',
          },
          {
            texto: 'In ATT&CK, a "tactic" represents:',
            opciones: ['The attacker\'s goal in a phase (the "why")', 'A commercial product', 'A malicious IP', 'A type of encryption'],
            correcta: 0,
            explicacion: 'A tactic is the adversary\'s objective (e.g. Persistence, Exfiltration); a technique is "how" they achieve it.',
          },
          {
            texto: '"Persistence" in ATT&CK aims to:',
            opciones: ['Steal data quickly', 'Maintain access to the system across reboots', 'Scan ports', 'Encrypt the disk'],
            correcta: 1,
            explicacion: 'Persistence groups techniques for retaining access to a compromised system over time.',
          },
        ],
      },
      {
        id: 'th-hipotesis-en',
        titulo: 'Hypothesis-Driven Hunting',
        descripcion: 'The methodology of proactive threat hunting.',
        xp: 160,
        preguntas: [
          {
            texto: 'Threat hunting differs from traditional monitoring because:',
            opciones: ['It waits for an alert to fire', 'It proactively looks for threats that evaded defenses', 'It only checks the antivirus', 'It is fully automated'],
            correcta: 1,
            explicacion: 'Hunting is proactive: it assumes the attacker is already inside and actively looks for them, without waiting for alerts.',
          },
          {
            texto: 'A good hunting hypothesis is based on:',
            opciones: ['An unfounded hunch', 'Threat intelligence and adversary behavior', 'The horoscope', 'The available budget'],
            correcta: 1,
            explicacion: 'Hypotheses start from threat intel, known TTPs (ATT&CK) and knowledge of the environment to guide the search.',
          },
        ],
      },
    ],
  },
  {
    id: 'splunk-en',
    dominioId: 'defensa-en',
    nombre: 'Splunk',
    descripcion: 'Log analysis and searching with the Splunk platform.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'splunk-spl-en',
        titulo: 'Basic SPL Searches',
        descripcion: 'Splunk\'s search processing language.',
        xp: 140,
        preguntas: [
          {
            texto: 'Which SPL command counts events grouped by a field?',
            opciones: ['table', 'stats count by', 'sort', 'rename'],
            correcta: 1,
            explicacion: '`stats count by field` groups events by that field and counts how many fall in each group.',
          },
          {
            texto: 'In Splunk, the "|" (pipe) character is used to:',
            opciones: ['Comment out code', 'Pass the results of one command into the next', 'End the search', 'Define a variable'],
            correcta: 1,
            explicacion: 'The pipe chains commands: the output of one becomes the input of the next, just like in Unix.',
          },
        ],
      },
    ],
  },
  // ============ OFFENSE ============
  {
    id: 'pentester-en',
    dominioId: 'ofensiva-en',
    nombre: 'Junior Penetration Tester',
    descripcion: 'Fundamentals of penetration testing.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'pen-fases-en',
        titulo: 'Phases of a Pentest',
        descripcion: 'The methodology of a penetration test.',
        xp: 150,
        preguntas: [
          {
            texto: 'What is the first phase of a penetration test?',
            opciones: ['Exploitation', 'Reconnaissance', 'Reporting', 'Cleanup'],
            correcta: 1,
            explicacion: 'Reconnaissance gathers information about the target before attempting any exploitation.',
          },
          {
            texto: '"Passive" reconnaissance means:',
            opciones: ['Actively scanning ports', 'Collecting information without interacting directly with the target', 'Exploiting a vulnerability', 'Installing malware'],
            correcta: 1,
            explicacion: 'Passive recon uses public sources (OSINT) without touching the target systems, avoiding detection.',
          },
          {
            texto: 'Why is the "reporting" phase crucial?',
            opciones: ['It is not important', 'It communicates findings and remediation recommendations', 'It only serves for invoicing', 'It reboots the servers'],
            correcta: 1,
            explicacion: 'The value of a pentest is in the report: it documents vulnerabilities, risk and how to fix them.',
          },
          {
            texto: 'The document defining the scope and legal authorization of a pentest is:',
            opciones: ['The Rules of Engagement (RoE)', 'The antivirus', 'The firewall', 'The SIEM'],
            correcta: 0,
            explicacion: 'Rules of Engagement define what may be tested, when and how — without them the pentest would be illegal.',
          },
        ],
      },
      {
        id: 'pen-scanning-en',
        titulo: 'Scanning and Enumeration',
        descripcion: 'Discovering services and entry points.',
        xp: 150,
        preguntas: [
          {
            texto: 'Which tool is a widely used port scanner?',
            opciones: ['Photoshop', 'Nmap', 'Excel', 'Slack'],
            correcta: 1,
            explicacion: 'Nmap is the standard for discovering hosts, open ports and services on a network.',
          },
          {
            texto: '"Enumeration" in pentesting aims to:',
            opciones: ['Delete logs', 'Extract detailed information from services (users, versions, shares)', 'Encrypt data', 'Shut down the target'],
            correcta: 1,
            explicacion: 'Enumeration digs into the discovered services to find users, versions and exploitable resources.',
          },
        ],
      },
    ],
  },
  {
    id: 'webapp-en',
    dominioId: 'ofensiva-en',
    nombre: 'Web Application Security',
    descripcion: 'Web application security and the OWASP Top 10.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'web-sqli-en',
        titulo: 'SQL Injection',
        descripcion: 'One of the most critical web vulnerabilities.',
        xp: 150,
        preguntas: [
          {
            texto: 'What does a successful SQL injection allow?',
            opciones: ['Speeding up the site', 'Manipulating database queries and accessing unauthorized data', 'Improving SEO', 'Compressing images'],
            correcta: 1,
            explicacion: 'SQLi injects malicious SQL to read, modify or delete data that should not be accessible.',
          },
          {
            texto: 'What is the primary defense against SQL injection?',
            opciones: ['Using parameterized queries (prepared statements)', 'Using long passwords', 'Disabling JavaScript', 'Switching browsers'],
            correcta: 0,
            explicacion: 'Parameterized queries separate code from data, preventing user input from altering the query.',
          },
          {
            texto: 'The input `\' OR \'1\'=\'1` in a login form is a classic attempt at:',
            opciones: ['XSS', 'SQL injection', 'CSRF', 'Clickjacking'],
            correcta: 1,
            explicacion: "`' OR '1'='1` tries to make the WHERE clause always true, bypassing authentication.",
          },
        ],
      },
      {
        id: 'web-xss-en',
        titulo: 'Cross-Site Scripting (XSS)',
        descripcion: 'Injecting scripts into the victim\'s browser.',
        xp: 150,
        preguntas: [
          {
            texto: 'What is an XSS attack?',
            opciones: ['Stealing hardware', 'Injecting malicious scripts that run in other users\' browsers', 'Shutting down the server', 'Encrypting the database'],
            correcta: 1,
            explicacion: 'XSS injects malicious JavaScript into a site so it executes in other victims\' browsers (session theft, etc.).',
          },
          {
            texto: 'The key defense against XSS is:',
            opciones: ['Escaping/sanitizing output and validating input', 'Using HTTP instead of HTTPS', 'Disabling cookies', 'Adding more RAM'],
            correcta: 0,
            explicacion: 'Sanitizing and escaping output prevents user input from being interpreted as executable code in the browser.',
          },
          {
            texto: 'Stored XSS is more dangerous than reflected XSS because:',
            opciones: ['It is faster', 'It persists on the server and affects everyone who visits the page', 'It only affects the attacker', 'It does not use JavaScript'],
            correcta: 1,
            explicacion: 'Stored XSS persists in the site database and is served to every visitor, widening the blast radius.',
          },
        ],
      },
    ],
  },
  // ============ SECURE ENGINEERING ============
  {
    id: 'secure-coding-en',
    dominioId: 'ingenieria-en',
    nombre: 'Secure Coding',
    descripcion: 'Writing code that resists vulnerabilities.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'sc-input-en',
        titulo: 'Input Validation',
        descripcion: 'Never trust user data.',
        xp: 140,
        preguntas: [
          {
            texto: 'What is the core principle of secure code regarding user input?',
            opciones: ['Always trust it', 'Never trust it and always validate', 'Ignore it', 'Always encrypt it'],
            correcta: 1,
            explicacion: '"Never trust user input": every input must be validated and sanitized, as it is the vector for most attacks.',
          },
          {
            texto: 'The most robust input validation uses:',
            opciones: ['A blacklist of forbidden values', 'An allowlist of permitted values', 'No validation', 'Only a maximum length'],
            correcta: 1,
            explicacion: 'An allowlist defines exactly what is permitted and rejects everything else; safer than enumerating what is bad.',
          },
        ],
      },
      {
        id: 'sc-secrets-en',
        titulo: 'Handling Secrets',
        descripcion: 'Passwords, keys and tokens in code.',
        xp: 140,
        preguntas: [
          {
            texto: 'Where should you NOT store API keys?',
            opciones: ['In environment variables', 'In a secrets manager', 'Hardcoded in the repository source code', 'In an encrypted vault'],
            correcta: 2,
            explicacion: 'Hardcoding secrets in code (and pushing them to Git) exposes them to anyone with repo access. Use environment variables or a vault.',
          },
          {
            texto: 'User passwords must be stored:',
            opciones: ['In plain text', 'With slow hashing and a salt (e.g. bcrypt/argon2)', 'Encoded with Base64', 'In a text file'],
            correcta: 1,
            explicacion: 'Store them with slow, salted hashing functions (bcrypt, argon2) — never in plain text or reversible encoding.',
          },
        ],
      },
    ],
  },
  {
    id: 'cloud-en',
    dominioId: 'ingenieria-en',
    nombre: 'Cloud Security',
    descripcion: 'Security in cloud environments.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'cloud-shared-en',
        titulo: 'Shared Responsibility Model',
        descripcion: 'Who protects what in the cloud.',
        xp: 150,
        preguntas: [
          {
            texto: 'Under the shared responsibility model, the cloud provider is responsible for:',
            opciones: ['The security of your data and configurations', 'The security OF the cloud (physical infrastructure)', 'Your passwords', 'Your code'],
            correcta: 1,
            explicacion: 'The provider secures the infrastructure ("security of the cloud"); the customer secures their data and configuration ("security in the cloud").',
          },
          {
            texto: 'A storage bucket misconfigured as public can cause:',
            opciones: ['Better performance', 'A massive data leak', 'Lower cost', 'More security'],
            correcta: 1,
            explicacion: 'Accidentally public buckets are an extremely common cause of cloud data breaches.',
          },
        ],
      },
    ],
  },
  {
    id: 'iot-en',
    dominioId: 'ingenieria-en',
    nombre: 'IoT Security Practices',
    descripcion: 'Security in the Internet of Things.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'iot-basics-en',
        titulo: 'Risks in IoT Devices',
        descripcion: 'Why connected devices are a target.',
        xp: 140,
        preguntas: [
          {
            texto: 'What is a common risk in IoT devices?',
            opciones: ['Too much security', 'Default credentials left unchanged', 'Too many updates', 'Very long battery life'],
            correcta: 1,
            explicacion: 'Many IoT devices ship with default passwords (admin/admin) that users never change, making attacks easy.',
          },
          {
            texto: 'The Mirai botnet became famous for:',
            opciones: ['Encrypting hospitals', 'Infecting IoT devices with weak credentials to launch massive DDoS attacks', 'Stealing credit cards', 'Mining Bitcoin'],
            correcta: 1,
            explicacion: 'Mirai recruited thousands of IoT devices with default credentials to run large-scale DDoS attacks.',
          },
        ],
      },
    ],
  },
  // ============ SPECIALIZATION ============
  {
    id: 'malware-en',
    dominioId: 'avanzado-en',
    nombre: 'Malware Analysis',
    descripcion: 'Analysis of malicious software.',
    nivel: 'Avanzado',
    modulos: [
      {
        id: 'mal-tipos-en',
        titulo: 'Static vs Dynamic Analysis',
        descripcion: 'Two approaches to studying malware.',
        xp: 170,
        preguntas: [
          {
            texto: 'Static malware analysis consists of:',
            opciones: ['Running the malware and observing its behavior', 'Examining the code/binary without executing it', 'Rebooting the machine', 'Installing an antivirus'],
            correcta: 1,
            explicacion: 'Static analysis inspects the file (strings, headers, code) without running it, avoiding infection risk.',
          },
          {
            texto: 'Dynamic analysis requires:',
            opciones: ['An isolated environment (sandbox) to run the sample', 'The production machine', 'Disabling the antivirus on your main PC', 'Not using virtual machines'],
            correcta: 0,
            explicacion: 'Dynamic analysis runs the malware in an isolated sandbox to observe its behavior without harming real systems.',
          },
        ],
      },
    ],
  },
  {
    id: 'reversing-en',
    dominioId: 'avanzado-en',
    nombre: 'Reverse Engineering',
    descripcion: 'Reverse engineering of binaries.',
    nivel: 'Avanzado',
    proximamente: true,
    modulos: [],
  },
  {
    id: 'security-mgmt-en',
    dominioId: 'avanzado-en',
    nombre: 'Security Management',
    descripcion: 'Management, governance and compliance.',
    nivel: 'Intermedio',
    modulos: [
      {
        id: 'mgmt-riesgo-en',
        titulo: 'Risk Management',
        descripcion: 'Identifying, assessing and treating risk.',
        xp: 150,
        preguntas: [
          {
            texto: 'Risk is usually expressed as:',
            opciones: ['Threat + Patch', 'Likelihood × Impact', 'Cost − Benefit', 'Users ÷ Servers'],
            correcta: 1,
            explicacion: 'Risk combines the likelihood of a threat materializing with the impact it would have.',
          },
          {
            texto: 'Buying cyber insurance is a strategy of:',
            opciones: ['Avoiding the risk', 'Transferring the risk', 'Accepting the risk', 'Ignoring the risk'],
            correcta: 1,
            explicacion: 'Transferring risk shifts part of the financial impact to a third party (the insurer). Other strategies: mitigate, avoid, accept.',
          },
          {
            texto: 'What is "residual risk"?',
            opciones: ['The risk before applying controls', 'The risk that remains after applying controls', 'A non-existent risk', 'The vendor\'s risk'],
            correcta: 1,
            explicacion: 'Residual risk is what remains after mitigation controls are in place; the organization decides whether to accept it.',
          },
        ],
      },
    ],
  },
];
