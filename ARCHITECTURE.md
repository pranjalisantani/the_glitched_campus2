# THE GLITCHED CAMPUS // Architecture Documentation

---

## 1. System Overview

THE GLITCHED CAMPUS architecture cleanly decouples presentation and business logic into two autonomous tiers:

```
+-------------------------------------------------------------+
|                  FRONTEND TIER (Port 3000)                  |
|  Next.js 16 (App Router) + React 19 + TypeScript + Tailwind |
|                                                             |
|  [ AuthContext ]  <-- Session & Profile State               |
|  [ Live Polling ] <-- 8-second refresh for stage statuses    |
|  [ Pages ]        <-- /, /login, /dashboard, /stage/1-5,    |
|                       /admin                                |
+------------------------------+------------------------------+
                               | HTTP REST APIs (JSON / Bearer JWT)
+------------------------------v------------------------------+
|                   BACKEND TIER (Port 5000)                  |
|  Node.js + Express 4 + TypeScript Engine                    |
|                                                             |
|  [ Middleware ]   <-- requireAuth, requireAdmin,            |
|                       requireStageOpen                      |
|  [ Routers ]      <-- /api/auth, /api/stages,               |
|                       /api/stage1-5, /api/admin             |
|  [ Domain Logic ] <-- Score calculation, Attempt tracking,  |
|                       Hint deduction, Continuity gate       |
|  [ Store Layer ]  <-- IStore interface -> MemoryStore       |
+-------------------------------------------------------------+
```

---

## 2. Data Access Layer & Extensibility

The data layer is abstracted behind the TypeScript interface `IStore`:

```typescript
export interface IStore {
  // Teams & Authentication
  createTeam(team: Omit<Team, 'id' | 'createdAt'>): Promise<Team>;
  findTeamByEmail(email: string): Promise<Team | null>;
  findTeamByName(name: string): Promise<Team | null>;
  findTeamById(id: string): Promise<Team | null>;
  getAllTeams(): Promise<Team[]>;

  // Stage Controls
  getAllStages(): Promise<StageConfig[]>;
  getStage(stageId: StageId): Promise<StageConfig | null>;
  updateStageStatus(stageId: StageId, status: StageStatus): Promise<StageConfig>;

  // Stage 1 (Quiz)
  getQuizQuestions(isAdmin: boolean): Promise<QuizQuestion[] | QuizQuestionParticipant[]>;
  submitQuiz(teamId: string, teamName: string, answers: Record<string, string>): Promise<QuizSubmission>;
  logTabFocusEvent(log: Omit<TabFocusLog, 'id' | 'timestamp'>): Promise<TabFocusLog>;

  // Stage 2 (Decode & Encode)
  getDecodeChallenges(isAdmin: boolean, teamId?: string): Promise<DecodeChallenge[] | DecodeChallengeParticipant[]>;
  unlockHint(teamId: string, teamName: string, challengeId: string): Promise<...>;
  submitChallengeAttempt(teamId: string, teamName: string, challengeId: string, answer: string): Promise<...>;

  // Stage 3 (Datasets)
  getDatasets(): Promise<DatasetMetadata[]>;
  selectDataset(teamId: string, teamName: string, datasetId: string): Promise<TeamDatasetSelection>;

  // Stage 4 & 5 (Problems & Continuity)
  getProblemStatements(): Promise<ProblemStatement[]>;
  selectProblemStatement(teamId: string, teamName: string, problemId: string): Promise<TeamProblemSelection>;
  getTeamProblemSelection(teamId: string): Promise<TeamProblemSelection | null>;
}
```

The current implementation `MemoryStore` holds collections in memory Maps and arrays. In the future, a persistent database adapter (e.g. PostgreSQL with Prisma or MongoDB) can be plugged in simply by implementing `IStore` without modifying route controllers.

---

## 3. Security & Access Boundaries

1. **Password Encryption**: All passwords hashed using `bcryptjs` with 10 salt rounds prior to storage.
2. **Authorization Guards**:
   - `requireAuth`: Verifies JWT signature and extracts user claims.
   - `requireAdmin`: Validates that `req.user.role === 'admin'`.
   - `requireStageOpen(stageId)`: Intercepts participant requests; rejects with `403 STAGE_LOCKED` or `403 STAGE_CLOSED` if stage is not active. Admins pass through.
3. **Information Disclosure Prevention**:
   - `QuizQuestion.correctOptionId` is explicitly stripped before returning questions to participants.
   - Stage 1 quiz submissions compute score on the server, but the participant response only returns receipt confirmation.
   - Stage 2 submissions return only `{ isCorrect, attemptsRemaining, isLockedOut, message }` without leaking overall marks.