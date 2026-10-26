# THE GLITCHED CAMPUS

> A full-stack, five-stage collegiate cybersecurity and forensic incident triage competition platform.

---

## 1. Project Overview

**THE GLITCHED CAMPUS** is an incident response and cybersecurity competition platform designed for collegiate tournaments and hackathons. Participating teams step into the role of forensic incident responders investigating security anomalies across a compromised campus network.

The platform orchestrates competition progression across five sequential stages:

1. **Stage 1: Security Assessment Quiz** — Multiple-choice assessment testing core security fundamentals. Features server-side answer verification, anti-cheat tab-focus tracking, clipboard auditing, and duplicate submission shielding.
2. **Stage 2: Cryptographic Decode & Encode** — Cryptographic payload challenges (Base64, ROT13, Hex) featuring a strict 3-attempt limit per challenge, optional hints with a 2-mark deduction, and real-time evaluation feedback.
3. **Stage 3: Forensic Dataset EDA** — Catalog of incident datasets (CSV/JSON) available for forensic exploration. Enforces a one-time team selection lock with authenticated downloads and directory traversal protections.
4. **Stage 4: Static Defensive Prototype** — Architectural UI/UX problem statements for static defensive workflow prototyping, locked upon selection to ensure continuity.
5. **Stage 5: Dynamic Security Application** — Full-stack implementation requirements that pull the assigned problem directly from the backend to guarantee strict continuity with Stage 4.

---

## 2. Core Features

### 2.1 Participant Experience
- **Team-Centric Authentication**: One account per team with roster management (1 to 5 members), password encryption using `bcryptjs` (10 salt rounds), and signed JWT session tokens.
- **Interactive Stage Map & Dashboard**: Real-time status matrix reflecting stage availability (`LOCKED`, `OPEN`, `CLOSED`), active team completion states, and live polling every 8 seconds.
- **Server-Guarded Integrity**: Answer keys, scoring criteria, and internal state are evaluated exclusively on the server. Correct answers are never sent to participant clients.
- **Competition Freeze Shield**: Visual lock overlay that immediately halts participant interactions when an emergency competition freeze is toggled by an administrator.

### 2.2 Administrative Control Center
- **Role-Based Access Control (RBAC)**: Distinct permissions for Primary Administrators and Event Admins (`manage_teams`, `manage_stage1`, `manage_stage2`, `manage_stage3`, `manage_stage4`, `manage_submissions`, `view_audit_logs`).
- **Global Stage Gates**: Administrative toggles to lock, open, or close stages dynamically during the event.
- **Admin Test Mode**: Isolated sandbox environment allowing administrators to test and verify locked or open stages without altering participant scores or production selections.
- **Participant Management & Overrides**: Administrative capabilities to view team telemetry, update team rosters, reset passwords, adjust scores, and reset stage selections if sanctioned by tournament judges.
- **Audit Logging**: Comprehensive, timestamped audit log capturing administrative actions (stage status changes, score adjustments, question/challenge updates).

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | [Next.js](https://nextjs.org/) 16 (App Router with Turbopack), [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/) 5, [Tailwind CSS](https://tailwindcss.com/) 4, [Lucide React](https://lucide.dev/) |
| **Backend** | [Node.js](https://nodejs.org/) (v18+), [Express](https://expressjs.com/) 4, [TypeScript](https://www.typescriptlang.org/) 5, `tsx` (runtime/watcher), `bcryptjs`, `jsonwebtoken`, `cors` |
| **Storage Engine** | Modular `IStore` interface with `PersistentFileStore` (atomic JSON file-backed persistence under `backend/storage/data`) and `MemoryStore` |
| **Testing** | Node.js native test runner (`node --test` / `tsx --test`) with 41 automated integration and security tests |
| **Orchestration** | `concurrently` for synchronized multi-service development |

---

## 4. Project Structure

```
the-glitched-campus/
|-- frontend/                       # Next.js App Router client application
|   |-- src/
|   |   |-- app/                    # Routes: /, /login, /register, /dashboard, /stages, /admin
|   |   |   |-- admin/              # Admin dashboard, RBAC tabs, and test mode
|   |   |   |-- dashboard/          # Participant dashboard and stage status matrix
|   |   |   |-- stages/             # Stage 1 to 5 interactive challenges
|   |   |   `-- globals.css         # Cyber-forensics design system
|   |   |-- components/             # Reusable UI components (Navbar, StageMap, Panel, Modals)
|   |   |-- context/                # AuthContext session state & user clearance
|   |   `-- lib/                    # API client with retry policies, timeouts & freeze checks
|   |-- public/                     # Static media and icons
|   `-- package.json
|-- backend/                        # Express API service
|   |-- src/
|   |   |-- config/                 # Environment validation and fail-safe JWT secret handling
|   |   |-- data/                   # Seed data for stages, quizzes, challenges, and datasets
|   |   |-- middleware/             # JWT authentication, RBAC clearance & stage gating
|   |   |-- routes/                 # Auth, stages 1-5, admin management, and test-mode routes
|   |   |-- store/                  # IStore interface, PersistentFileStore, and MemoryStore
|   |   |-- test/                   # Automated integration, security, and RBAC test suites
|   |   |-- types/                  # Unified TypeScript interfaces and domain contracts
|   |   `-- index.ts                # Express application bootstrap & route mounting
|   |-- storage/                    # Persistent runtime data (JSON store)
|   |-- data/datasets/              # Forensic sample datasets for Stage 3
|   `-- package.json
|-- .env.example                    # Root example environment configuration
|-- ARCHITECTURE.md                 # System architecture and data flow documentation
|-- REQUIREMENTS.md                 # Full functional and non-functional specifications
|-- SETUP.md                        # Detailed local setup and verification guide
`-- package.json                    # Workspace orchestration scripts
```

---

## 5. Prerequisites

Before setting up the project locally, verify that your machine has the following tools installed:

- **Node.js**: v18.0.0 or higher (v20+ or v24 LTS recommended)
- **npm**: v9.0.0 or higher
- **Git**: Modern version for source control

---

## 6. Installation & Setup

### 6.1 Install Dependencies
Run the install command from the project root to install workspace, backend, and frontend packages:

```bash
# Option A: Install all dependencies at once
npm run install:all

# Option B: Install individually
npm install
npm install --prefix backend
npm install --prefix frontend
```

---

## 7. Environment Configuration

The application requires configuration files for the backend and frontend. Templates with placeholders are provided in the repository.

### 7.1 Backend Configuration (`backend/.env` or root `.env`)

Create a `backend/.env` file based on `backend/.env.example`:

```ini
# Server Port & CORS Origin
PORT=5000
CLIENT_ORIGIN=http://localhost:3000

# JSON Web Token Secret (MUST be at least 32 characters in production)
JWT_SECRET=your_cryptographically_secure_jwt_secret_min_32_chars

# Initial Primary Administrator Bootstrap (Optional for local dev)
ADMIN_EMAIL=your_admin_email@example.com
ADMIN_PASSWORD=your_secure_admin_password
```

> **Security Note on Production Secret Enforcement**:
> In `production` mode (`NODE_ENV=production`), the backend enforces that `JWT_SECRET` is defined, is at least 32 characters long, and does not match any known sample or default string. In development mode without a `JWT_SECRET`, an ephemeral cryptographically random key is generated automatically for safety.

### 7.2 Frontend Configuration (`frontend/.env.local`)

Create a `frontend/.env.local` file based on `frontend/.env.example`:

```ini
# Base URL for Backend API Endpoints
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 8. Running the Application Locally

### 8.1 Start Services Concurrently
From the project root:

```bash
npm run dev
```

This launches both the backend and frontend simultaneously with prefix-labeled logs:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### 8.2 Run Services Separately
If you prefer running services in dedicated terminal windows:

```bash
# Terminal 1 - Backend API Server
npm run dev:backend

# Terminal 2 - Frontend Development Server
npm run dev:frontend
```

---

## 9. Verification & Testing

The backend includes a comprehensive automated test suite verifying authentication boundaries, stage locks, quiz scoring integrity, attempt limits, data isolation, and RBAC policies:

```bash
# Run the automated backend test suite
npm run test:backend
```

To run linting and type checks across both tiers:

```bash
# Run type checks and linters
npm run lint

# Build both applications for production validation
npm run build
```

---

## 10. Deployment Architecture

The application is deployed across modern cloud infrastructure:

- **Frontend Tier (Vercel)**:
  - Deployed on Vercel as a Next.js App Router application.
  - Set the `NEXT_PUBLIC_API_URL` environment variable in the Vercel project settings to the public URL of your backend API (e.g., `https://api.yourdomain.com/api`).

- **Backend Tier (Node.js Service)**:
  - Deployed as a persistent Node.js service (e.g., Railway, Render, Fly.io, AWS, or VPS).
  - Ensure `PORT`, `CLIENT_ORIGIN` (set to your Vercel deployment URL), `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are configured in your production environment settings.
  - Mount or persist the `backend/storage` directory to ensure administrative changes, audit logs, and team progress persist across container restarts.

---

## 11. Security & Operational Best Practices

1. **Protect Administrative Credentials**:
   - Never commit plain-text credentials, passwords, or API keys to source control.
   - Set strong, unique passwords for the initial administrator account via environment variables during deployment.
2. **Rotate Secrets Regularly**:
   - If demonstration or default credentials were ever used in a shared or public environment, rotate the `JWT_SECRET` and update all administrative account passwords immediately.
3. **CORS Hardening**:
   - Set `CLIENT_ORIGIN` in the backend environment to match your deployed frontend domain to prevent unauthorized cross-origin requests.
4. **Server-Side Authority**:
   - All competition state, challenge validations, and stage restrictions are strictly server-authoritative. Clients only receive the information required for the active state.

---

## 12. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **`NETWORK_ERROR` / Unable to connect to server** | Backend service is offline or unreachable from the frontend. | Ensure `npm run dev:backend` is running on port 5000 and `NEXT_PUBLIC_API_URL` matches. |
| **CORS Error on API requests** | `CLIENT_ORIGIN` does not match the frontend domain. | Update `CLIENT_ORIGIN` in `backend/.env` to match the frontend host (e.g., `http://localhost:3000` or your Vercel URL). |
| **Administrator bootstrap skipped** | `ADMIN_EMAIL` or `ADMIN_PASSWORD` not supplied in environment. | Ensure both variables are defined in `backend/.env` if you want an initial admin account auto-created on startup. |
| **Stage 403 Forbidden / Stage Locked** | The requested stage is currently set to `LOCKED` or `CLOSED`. | An administrator must unlock the stage from the Admin Stage Controls portal (`/admin`). |
| **Competition Frozen modal displayed** | Global competition freeze has been engaged. | The primary administrator can disengage the freeze from the admin console. |
