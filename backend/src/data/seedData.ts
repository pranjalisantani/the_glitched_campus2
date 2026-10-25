import { StageConfig, QuizQuestion, DecodeChallenge, DatasetMetadata, ProblemStatement } from '../types';

export const INITIAL_STAGES: StageConfig[] = [
  {
    id: 'stage1',
    name: 'Stage 1: Quiz',
    order: 1,
    status: 'LOCKED', // All stages start locked
    description: 'Technical multiple-choice security assessment. Answer live questions under browser event supervision.',
    maxScore: 10,
    isScoringProvisional: true,
    scoringRuleNotes: 'Provisional rule: (correctAnswers / totalActiveQuestions) * 10 marks. Negative marking: None.'
  },
  {
    id: 'stage2',
    name: 'Stage 2: Decode & Encode',
    order: 2,
    status: 'LOCKED',
    description: 'Cryptographic payload analysis and encoding challenges. Maximum 3 attempts per challenge.',
    maxScore: 10,
    isScoringProvisional: true,
    scoringRuleNotes: 'Provisional rule: 10 max stage marks. Each hint used deducts 2 marks (never below 0). Maximum 3 attempts per challenge.'
  },
  {
    id: 'stage3',
    name: 'Stage 3: Dataset EDA',
    order: 3,
    status: 'LOCKED',
    description: 'Campus network incident exploratory data analysis. Select one dataset per team and download offline.',
    isScoringProvisional: true,
    scoringRuleNotes: 'Scoring rules pending official organizer confirmation. Teams analyze locally.'
  },
  {
    id: 'stage4',
    name: 'Stage 4: Static Prototype',
    order: 4,
    status: 'LOCKED',
    description: 'Architectural defensive UI prototype. Select one problem statement once.',
    isScoringProvisional: true,
    scoringRuleNotes: 'Scoring rules pending official organizer confirmation. Teams design locally.'
  },
  {
    id: 'stage5',
    name: 'Stage 5: Dynamic Website',
    order: 5,
    status: 'LOCKED',
    description: 'Full-stack dynamic implementation based strictly on the problem statement chosen in Stage 4.',
    isScoringProvisional: true,
    scoringRuleNotes: 'Scoring rules pending official organizer confirmation. Continuity with Stage 4 strictly enforced.'
  }
];

export const INITIAL_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: '[DEMO] Which TCP flag sequence indicates the normal initiation of a three-way handshake between client and server?',
    options: [
      { id: 'A', text: 'SYN -> SYN-ACK -> ACK' },
      { id: 'B', text: 'ACK -> SYN -> FIN' },
      { id: 'C', text: 'SYN -> PSH -> ACK' },
      { id: 'D', text: 'RST -> SYN -> ACK' }
    ],
    correctOptionId: 'A',
    isActiveForLiveQuiz: true,
    explanation: 'A standard TCP connection begins with a SYN from the initiator, followed by a SYN-ACK from the recipient, and ends with an ACK.',
    isDemonstration: true
  },
  {
    id: 'q2',
    prompt: '[DEMO] In digital forensics, what does the Volatility framework primarily analyze?',
    options: [
      { id: 'A', text: 'Hard drive sector partition tables' },
      { id: 'B', text: 'Volatile RAM memory dumps' },
      { id: 'C', text: 'Optical disc file systems' },
      { id: 'D', text: 'Physical BIOS chip pinouts' }
    ],
    correctOptionId: 'B',
    isActiveForLiveQuiz: true,
    explanation: 'Volatility is an open-source memory forensics framework for extracting artifacts from volatile RAM.',
    isDemonstration: true
  },
  {
    id: 'q3',
    prompt: '[DEMO] What is the primary operational characteristic of an asymmetric cryptographic algorithm like RSA?',
    options: [
      { id: 'A', text: 'It uses the exact same key for both encryption and decryption.' },
      { id: 'B', text: 'It operates exclusively on streaming audio channels.' },
      { id: 'C', text: 'It utilizes a mathematically linked public and private key pair.' },
      { id: 'D', text: 'It requires zero computational overhead to decrypt.' }
    ],
    correctOptionId: 'C',
    isActiveForLiveQuiz: true,
    explanation: 'Asymmetric encryption employs a key pair where the public key encrypts data and the private key decrypts it.',
    isDemonstration: true
  },
  {
    id: 'q4',
    prompt: '[DEMO] In network security telemetry, what does an abnormally high volume of SYN packets without subsequent ACKs typically suggest?',
    options: [
      { id: 'A', text: 'A SYN flood denial-of-service attempt' },
      { id: 'B', text: 'An optimized DNS query stream' },
      { id: 'C', text: 'A successful TLS certificate handshake' },
      { id: 'D', text: 'Normal high-speed streaming media' }
    ],
    correctOptionId: 'A',
    isActiveForLiveQuiz: true,
    explanation: 'Half-open connections exhausting system transmission control blocks are symptomatic of SYN flood attacks.',
    isDemonstration: true
  }
];

export const INITIAL_DECODE_CHALLENGES: DecodeChallenge[] = [
  {
    id: 'c1',
    title: '[DEMO] Anomaly Payload Alpha: Base64 Core Signature',
    description: 'During the initial firewall breach, the beacon emitted this ASCII-armored string. Decode it to recover the core cluster authentication token.',
    encodedPayload: 'TkVYVVMtQ09SRS0yMDI2',
    expectedAnswer: 'NEXUS-CORE-2026',
    hint: 'This is standard Base64 encoding. Check the trailing capital letters and padding.',
    isActive: true,
    isDemonstration: true
  },
  {
    id: 'c2',
    title: '[DEMO] Anomaly Payload Beta: ROT13 Perimeter Transmission',
    description: 'A compromised edge switch relayed an obfuscated command string using a classic 13-character alphabetical rotational displacement.',
    encodedPayload: 'SYN-ACK-FLOOD -> ROT13: FLA-NPX-SYBBQ',
    expectedAnswer: 'SYN-ACK-FLOOD',
    hint: 'Reverse the ROT-13 permutation on "FLA-NPX-SYBBQ". Letters rotate by 13 positions.',
    isActive: true,
    isDemonstration: true
  },
  {
    id: 'c3',
    title: '[DEMO] Anomaly Payload Gamma: Hexadecimal Kernel Directive',
    description: 'Malicious firmware injected byte instructions into the campus router cache. Decode this ASCII hex sequence into human-readable text.',
    encodedPayload: '43 41 4D 50 55 53 5F 53 45 43 55 52 45',
    expectedAnswer: 'CAMPUS_SECURE',
    hint: 'Convert each two-digit hexadecimal byte (0x43=C, 0x41=A...) to standard ASCII characters.',
    isActive: true,
    isDemonstration: true
  }
];

export const INITIAL_DATASETS: DatasetMetadata[] = [
  {
    id: 'ds1',
    name: '[DEMO] Campus Gateway Network Telemetry Flow',
    description: 'Synthetic collegiate perimeter traffic log detailing packet sizes, flags, protocol distribution, and flagged suspicious outbound beaconing.',
    filename: 'demo_network_traffic_log.csv',
    format: 'CSV',
    filesize: '1.2 KB',
    recordCount: 11,
    schemaSummary: 'timestamp, source_ip, destination_ip, protocol, src_port, dst_port, packet_size_bytes, tcp_flags, threat_flag, incident_notes',
    isDemonstration: true
  },
  {
    id: 'ds2',
    name: '[DEMO] Collegiate Identity & RADIUS Authentication Audit',
    description: 'Synthetic authentication event log from campus VPN and library gateways capturing failed logins, anomaly scores, and account lock triggers.',
    filename: 'demo_campus_auth_audit.json',
    format: 'JSON',
    filesize: '1.8 KB',
    recordCount: 5,
    schemaSummary: 'event_id, timestamp, service, account, auth_status, ip_address, user_agent, anomaly_score, risk_level, notes',
    isDemonstration: true
  }
];

export const INITIAL_PROBLEM_STATEMENTS: ProblemStatement[] = [
  {
    id: 'ps1',
    title: '[DEMO] Tactical Security Operations Center (SOC) Incident Telemetry Board',
    category: 'Incident Response & Telemetry',
    summary: 'Design and build an operational command interface for campus security engineers to monitor active alerts, triage anomalies, and track affected IP subnets.',
    fullDescription: 'The Nexus Collegiate network has experienced anomalous telemetry surges. Teams choosing this statement must devise a rapid response dashboard capable of parsing live security alerts, categorizing risk tiers (Low, Medium, Critical), and facilitating defensive decision making.',
    stage4Instructions: 'Produce a high-fidelity static UI prototype (HTML/CSS or frontend design mockup) representing the main SOC triage room. Emphasize visual hierarchy, clear alert indicators, filtering widgets, and responsive incident layout.',
    stage4Deliverables: [
      'Static component layout with cyber-forensic theme',
      'Alert severity filtering mockups (Low, Medium, Critical)',
      'Incident detail expansion view',
      'Telemetry summary counters (active threats, resolved anomalies)'
    ],
    stage5Instructions: 'Transform the static prototype created in Stage 4 into a functioning dynamic client application. Connect live state management, interactive filtering, sorting, responsive search, and simulated real-time alert updates.',
    stage5Deliverables: [
      'Interactive reactive state (Vue, React, or vanilla JS store)',
      'Dynamic search and severity level filters',
      'Interactive incident acknowledgment workflow',
      'Consistent design system faithful to the Stage 4 prototype'
    ],
    isDemonstration: true
  },
  {
    id: 'ps2',
    title: '[DEMO] Zero-Trust Access Gateway & Quarantine Portal',
    category: 'Identity & Access Control',
    summary: 'Architect a secure quarantine authentication interface for campus endpoint triage and identity verification following a security breach.',
    fullDescription: 'When endpoints trigger security alarms on campus Wi-Fi, they are redirected to a captive quarantine portal. This portal must guide compromised users through identity verification, credential revocation, and device security compliance checks.',
    stage4Instructions: 'Design a clean, accessible static prototype for the captive quarantine terminal. Provide clear messaging explaining the containment status, next steps for credential reset, and verification progress bars.',
    stage4Deliverables: [
      'Quarantine landing notice with device identification details',
      'Step-by-step verification checklist UI',
      'Security advisory advisory panel for users',
      'Accessible form controls complying with WCAG contrast'
    ],
    stage5Instructions: 'Implement dynamic logic for the quarantine portal. Enable interactive step validation, mock OTP verification, device scan animation, and conditional release state upon passing all checks.',
    stage5Deliverables: [
      'Multi-step dynamic form validation',
      'Simulated security scan with live progress feedback',
      'Dynamic success/quarantine release states',
      'Local state persistence during step transitions'
    ],
    isDemonstration: true
  }
];
