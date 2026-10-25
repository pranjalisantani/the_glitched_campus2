<<<<<<< HEAD
# THE GLITCHED CAMPUS

> **A five-stage collegiate technical security and incident containment competition platform.**

---

## 1. Project Overview

**THE GLITCHED CAMPUS** is a technical event competition platform designed for collegiate cybersecurity and forensics tournaments. The platform orchestrates team participation across five distinct technical stages under the lore of campus network incident triage:

1. **Stage 1: Quiz** — Multiple-choice security assessment with server-side answer evaluation and supervised browser tab logging.
2. **Stage 2: Decode & Encode** — Cryptographic payload challenges with a strict 3-attempt limit and 2-mark hint deductions.
3. **Stage 3: Dataset EDA** — Collegiate forensic dataset inspection, one-time selection, and authenticated download for local data analysis.
4. **Stage 4: Static Prototype** — Architectural UI problem statement selection for local static defensive prototype construction.
5. **Stage 5: Dynamic Website** — Full-stack dynamic application implementation strictly maintaining architectural continuity with Stage 4.

---

## 2. Architecture & Tech Stack

The workspace is organized into a clean decoupled architecture:

```
the-glitched-campus/
├── frontend/             # Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
│   ├── src/
│   │   ├── app/          # App router pages: /, /login, /register, /dashboard, /stage/1-5, /admin
│   │   ├── components/   # Cyber-forensics UI components (Navbar, Admin tabs)
│   │   ├── context/      # AuthContext session management
│   │   └── lib/          # Centralized API client
│   └── package.json
├── backend/              # Node.js, Express, TypeScript, in-memory modular store
│   ├── data/datasets/    # Demonstration dataset files (CSV/JSON)
│   ├── src/
│   │   ├── routes/       # Auth, Stage, and Admin API routes
│   │   ├── middleware/   # JWT auth, role clearance, and stage lock gatekeepers
│   │   ├── store/        # Modular IStore interface & MemoryStore implementation
│   │   ├── test/         # Comprehensive automated integration test suite
│   │   └── types/        # Unified TypeScript data contracts
│   └── package.json
├── README.md
├── REQUIREMENTS.md
├── ARCHITECTURE.md
├── SETUP.md
└── package.json          # Root orchestration scripts
```

---

## 3. Quick Start

### Prerequisites
- **Node.js**: v18.0.0+ (Tested with v24.20.0)
- **npm**: v9.0.0+ (Tested with v11.19.0)

### 1. Install Dependencies
```bash
# Install backend dependencies
npm install --prefix backend

# Install frontend dependencies
npm install --prefix frontend
```

### 2. Run Locally
```bash
# Run both frontend and backend concurrently
npm run dev

# Or independently:
npm run dev:backend   # http://localhost:5000
npm run dev:frontend  # http://localhost:3000
```

Visit the frontend at **http://localhost:3000**.
The backend API listens at **http://localhost:5000/api**.

### 3. Run Automated Tests
```bash
npm run test:backend
```

---

## 4. Default Demonstration Credentials

> **In-Memory Store Notice**: For this development phase, all records are stored in memory. All user registrations, answers, and stage selections will reset if the backend server restarts.

- **Admin Account**:
  - Email: `admin@glitched.campus`
  - Access Key: `Admin@Nexus2026!`
- **Sample Participant Team**:
  - Email: `sentinels@nexus.edu`
  - Access Key: `Password123!`
  - Quick-fill buttons are provided on the login page (`/login`) for rapid evaluation.

---

## 5. Security & Fair Play Highlights

- **Server-Guarded Rules**: Answers, scores, and hint states are evaluated strictly on the server. Correct answers are never sent to participant endpoints.
- **Lockout Enforced**: Stage 2 challenges strictly reject submissions after 3 failed attempts.
- **Selection Permanence**: Stage 3 and Stage 4 selections are locked on the server and require an explicit administrator reset to alter.
- **Stage Continuity**: Stage 5 pulls the problem statement directly from the backend to guarantee Stage 4 continuity.
=======
# the_glitched_campus2
>>>>>>> a3d4df2c7775b00c87ed69926ee8bad05986899c
