import crypto from 'crypto';

export interface Stage1TestSubmission {
  answers: Record<string, string>;
  score: number;
  maxScore: number;
  totalQuestions: number;
  correctAnswersCount: number;
  submittedAt: string;
  questionResults: Record<string, {
    chosenOptionId: string;
    correctOptionId: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
}

export interface Stage2TestChallengeState {
  attemptsUsed: number;
  maxAttempts: number;
  isSolved: boolean;
  isLockedOut: boolean;
  hintRevealed?: string;
  hasUsedHint: boolean;
  attemptHistory: {
    answer: string;
    isCorrect: boolean;
    timestamp: string;
  }[];
}

export interface AdminTestSession {
  sessionId: string;
  adminId: string;
  adminEmail: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;

  // Isolated Stage States
  stage1Submission?: Stage1TestSubmission;
  stage2: {
    hintsUsedCount: number;
    deductionMarks: number;
    challengeStates: Record<string, Stage2TestChallengeState>;
  };
  stage3DatasetSelection?: {
    datasetId: string;
    datasetName: string;
    selectedAt: string;
  };
  stage4ProblemSelection?: {
    problemId: string;
    problemTitle: string;
    selectedAt: string;
  };
}

class AdminTestSessionStore {
  private sessions: Map<string, AdminTestSession> = new Map();
  private readonly SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

  createSession(adminId: string, adminEmail: string): AdminTestSession {
    const sessionId = `test-session-${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TTL_MS).toISOString();

    const session: AdminTestSession = {
      sessionId,
      adminId,
      adminEmail,
      createdAt: now.toISOString(),
      lastActiveAt: now.toISOString(),
      expiresAt,
      stage2: {
        hintsUsedCount: 0,
        deductionMarks: 0,
        challengeStates: {}
      }
    };

    this.sessions.set(sessionId, session);
    return this.clone(session);
  }

  getSession(sessionId: string): AdminTestSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }

    session.lastActiveAt = new Date().toISOString();
    return this.clone(session);
  }

  endSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  updateSession(session: AdminTestSession): void {
    session.lastActiveAt = new Date().toISOString();
    this.sessions.set(session.sessionId, this.clone(session));
  }

  clearAll(): void {
    this.sessions.clear();
  }

  private clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

export const adminTestStore = new AdminTestSessionStore();
