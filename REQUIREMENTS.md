# THE GLITCHED CAMPUS // System Requirements Specification

---

## 1. Functional Requirements

### 1.1 Participant Flow & Authentication
- **Team-Centric Authentication**: One account per team. Teams provide a team name, contact email, password (min 6 characters), and member names (1 to 5 members).
- **Security & Password Protection**: Passwords hashed server-side using `bcryptjs` with salt rounds = 10.
- **Session Tokens**: Server generates signed JWT tokens containing team ID, team name, email, and role (`participant` or `admin`).
- **Participant Dashboard**: Centralized matrix displaying the 5 stage cards with real-time lock status and team completion states.

### 1.2 Stage 1: Technical Security Quiz
- **Question Structure**: Multiple-choice format featuring exactly 4 options (A, B, C, D) per question.
- **Privacy & Integrity**: `correctOptionId` is strictly withheld from all participant-facing responses. Answers are verified exclusively on the server.
- **Scoring**: Maximum stage score of 10 marks. Provisional scoring formula: `(correctAnswers / totalActiveQuestions) * 10`. No negative marking.
- **Score Confidentiality**: Scores and correct answers are never revealed to participants; only submission timestamp and confirmation are returned.
- **Browser Event Supervision**: Browser copy restrictions (disabled context menu and copy events) and client-side tab visibility tracking (`visibilitychange` / `blur`) reported to `POST /api/stage1/log-event`.

### 1.3 Stage 2: Cryptographic Decode & Encode
- **Payload Inspection**: Obfuscated strings (Base64, ROT13, Hex) displayed in cyber terminal containers.
- **3-Attempt Limit**: Maximum 3 attempts per challenge. The backend strictly tracks attempt count; after 3 unsuccessful attempts, all subsequent submissions are rejected.
- **Hint Deductions**: Teams can optionally request a hint for any challenge. Each hint used deducts 2 marks from the stage maximum of 10, clamped at a minimum of 0.
- **Evaluation Feedback**: Responses return only `{ isCorrect: boolean, attemptsRemaining: number, isLockedOut: boolean, message: string }`. Scores remain hidden.

### 1.4 Stage 3: Incident Dataset EDA
- **Dataset Catalog**: Admin manages forensic datasets with metadata (format, size, record count, schema summary).
- **One-Time Selection**: Teams select exactly one dataset. The selection is locked on the server and prevents re-selection unless an administrator authorizes a reset.
- **File Download**: Selected datasets can be downloaded directly from the server.
- **Workstation Analysis**: No in-browser notebook or code execution editor; teams analyze data offline on their local machines.

### 1.5 Stage 4: Static UI Prototype
- **Problem Statement Catalog**: Admin registers problem statements detailing descriptions, prototyping instructions, and architectural deliverables.
- **One-Time Selection**: Teams select one problem statement once. Selection is recorded with timestamp.
- **Continuity Link**: The problem selected here serves as the assigned problem statement for Stage 5.

### 1.6 Stage 5: Dynamic Web Application
- **Backend Continuity**: Stage 5 pulls the assigned problem statement directly from the backend. If Stage 4 is incomplete, access is halted with a clear directive.
- **Dynamic Directives**: Full specifications for reactive state, interactivity, and dynamic features are displayed.
- **Local Development**: Teams build locally; no remote repository URLs or deployment links are mandated.

### 1.7 Administrator Control & Auditing
- **Global Stage Gates**: Admin can toggle any stage status between `LOCKED`, `OPEN`, and `CLOSED`.
- **Backend Enforcement**: When a stage is locked or closed, protected participant API endpoints immediately return `403 Stage Locked/Closed`.
- **Management Portals**: CRUD operations for quiz questions, decode challenges, dataset metadata, and problem statements.
- **Telemetry Matrix**: Centralized view of all registered teams, quiz scores, tab-switch counts, challenge attempts, hint deductions, and dataset/problem selections.
- **Authorized Resets**: Dedicated endpoints to reset Stage 3 dataset or Stage 4 problem selections if sanctioned by judges.

---

## 2. Non-Functional Requirements & Constraints

- **In-Memory Store**: All data resides in an in-memory modular store for local development. Data resets on server restart.
- **Zero External Cloud Dependencies**: No Supabase or external hosted databases are connected.
- **Design System**: Dark cyber-forensics aesthetic utilizing custom CSS properties, high contrast badges, accessible form labels, and responsive layout.