# THE GLITCHED CAMPUS // Setup & Deployment Guide

---

## 1. Prerequisites

Ensure your development environment meets the following specifications:
- **Operating System**: Windows, macOS, or Linux
- **Node.js**: v18.0.0 or later (v24.20.0 recommended)
- **npm**: v9.0.0 or later (v11.19.0 recommended)

---

## 2. Workspace Setup

### 2.1 Clone / Access Directory
```bash
cd C:\Users\pranjali\the-glitched-campus
```

### 2.2 Install Dependencies
Install dependencies for both frontend and backend modules:
```bash
# Backend dependencies
npm install --prefix backend

# Frontend dependencies
npm install --prefix frontend

# Root dependencies (concurrently)
npm install
```

---

## 3. Environment Configuration

Copy the example environment configurations:
```bash
# Root
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

### Backend Variables (`backend/.env`):
| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | Port for Express API |
| `CLIENT_ORIGIN` | `http://localhost:3000` | CORS allowed origin |
| `JWT_SECRET` | `nexus_super_secret_jwt_key_2026_change_in_production` | JWT signing secret |
| `ADMIN_EMAIL` | `admin@glitched.campus` | Initial admin account email |
| `ADMIN_PASSWORD` | `Admin@Nexus2026!` | Initial admin account password |

### Frontend Variables (`frontend/.env.local`):
| Variable | Default Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | Base URL for backend HTTP APIs |

---

## 4. Running the Platform Locally

### Start Both Services Concurrently
From the workspace root:
```bash
npm run dev
```

### Or Run in Separate Terminals:
- **Terminal 1 (Backend API)**:
  ```bash
  npm run dev:backend
  ```
  The API will start at **http://localhost:5000**.

- **Terminal 2 (Frontend Client)**:
  ```bash
  npm run dev:frontend
  ```
  The Next.js application will start at **http://localhost:3000**.

---

## 5. Verification & Testing

### 5.1 Run Automated Backend Integration Tests
Execute the comprehensive test suite verifying authentication, stage gating, quiz scoring, attempt limits, and Stage 4/5 continuity:
```bash
npm run test:backend
```
Expected output: 8 tests passing with 0 failures.

### 5.2 Build Production Bundles
Verify that both projects compile cleanly for production:
```bash
# Build backend
npm run build:backend

# Build frontend
npm run build:frontend
```

---

## 6. Default Demonstration Accounts

- **Admin Console (`/admin`)**:
  - Email: `admin@glitched.campus`
  - Password: `Admin@Nexus2026!`
- **Sample Participant Team (`/login`)**:
  - Email: `sentinels@nexus.edu`
  - Password: `Password123!`
  - Quick-fill buttons are provided on the login page for convenience.