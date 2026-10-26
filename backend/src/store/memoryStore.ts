import crypto from 'crypto';
import {
  StageId,
  StageStatus,
  StageConfig,
  Team,
  AdminRole,
  AdminPermission,
  AuditLog,
  QuizQuestion,
  QuizQuestionParticipant,
  QuizSubmission,
  TabFocusLog,
  DecodeChallenge,
  DecodeChallengeParticipant,
  TeamStage2Progress,
  TeamChallengeState,
  DatasetMetadata,
  TeamDatasetSelection,
  ProblemStatement,
  TeamProblemSelection,
  TeamProgressSummary,
  SystemSettings
} from '../types';
import {
  INITIAL_STAGES,
  INITIAL_QUIZ_QUESTIONS,
  INITIAL_DECODE_CHALLENGES,
  INITIAL_DATASETS,
  INITIAL_PROBLEM_STATEMENTS
} from '../data/seedData';

export interface IStore {
  // Teams
  createTeam(team: Omit<Team, 'id' | 'createdAt'>): Promise<Team>;
  findTeamByEmail(email: string): Promise<Team | null>;
  findTeamByName(name: string): Promise<Team | null>;
  findTeamById(id: string): Promise<Team | null>;
  getAllTeams(): Promise<Team[]>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team | null>;
  deleteTeam(id: string): Promise<boolean>;

  // Admins & Permissions
  getAdmins(): Promise<Team[]>;
  createAdmin(admin: Omit<Team, 'id' | 'createdAt' | 'role'> & { permissions?: AdminPermission[]; adminRole?: AdminRole }): Promise<Team>;
  updateAdminPermissions(id: string, permissions: AdminPermission[]): Promise<Team | null>;
  deleteAdmin(id: string): Promise<boolean>;

  // Stages
  getAllStages(): Promise<StageConfig[]>;
  getStage(stageId: StageId): Promise<StageConfig | null>;
  updateStageStatus(stageId: StageId, status: StageStatus): Promise<StageConfig>;
  updateStageConfig(stageId: StageId, updates: Partial<StageConfig>): Promise<StageConfig>;

  // Stage 1 (Quiz)
  getQuizQuestions(isAdmin: boolean): Promise<QuizQuestion[] | QuizQuestionParticipant[]>;
  getQuizQuestionById(id: string): Promise<QuizQuestion | null>;
  createQuizQuestion(question: Omit<QuizQuestion, 'id'>): Promise<QuizQuestion>;
  updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion | null>;
  deleteQuizQuestion(id: string): Promise<boolean>;
  submitQuiz(teamId: string, teamName: string, answers: Record<string, string>): Promise<QuizSubmission>;
  getQuizSubmissionByTeam(teamId: string): Promise<QuizSubmission | null>;
  getAllQuizSubmissions(): Promise<QuizSubmission[]>;
  resetQuizSubmission(teamId: string): Promise<boolean>;
  updateQuizSubmissionScore(teamId: string, newScore: number, note?: string): Promise<QuizSubmission | null>;
  logTabFocusEvent(log: Omit<TabFocusLog, 'id' | 'timestamp'>): Promise<TabFocusLog>;
  getTabFocusLogs(teamId?: string): Promise<TabFocusLog[]>;

  // Stage 2 (Decode)
  getDecodeChallenges(isAdmin: boolean, teamId?: string): Promise<DecodeChallenge[] | DecodeChallengeParticipant[]>;
  getDecodeChallengeById(id: string): Promise<DecodeChallenge | null>;
  createDecodeChallenge(ch: Omit<DecodeChallenge, 'id'>): Promise<DecodeChallenge>;
  updateDecodeChallenge(id: string, updates: Partial<DecodeChallenge>): Promise<DecodeChallenge | null>;
  deleteDecodeChallenge(id: string): Promise<boolean>;
  unlockHint(teamId: string, teamName: string, challengeId: string): Promise<{ hint: string; hintsUsedCount: number; deductionMarks: number }>;
  submitChallengeAttempt(teamId: string, teamName: string, challengeId: string, answer: string): Promise<{ isCorrect: boolean; attemptsRemaining: number; isLockedOut: boolean; message: string }>;
  getTeamStage2Progress(teamId: string): Promise<TeamStage2Progress | null>;
  getAllStage2Progress(): Promise<TeamStage2Progress[]>;
  resetStage2Progress(teamId: string): Promise<boolean>;
  updateStage2Score(teamId: string, newScore: number, note?: string): Promise<TeamStage2Progress | null>;
  completeStage2(teamId: string, teamName: string): Promise<TeamStage2Progress>;

  // Stage 3 (Dataset EDA)
  getDatasets(): Promise<DatasetMetadata[]>;
  getDatasetById(id: string): Promise<DatasetMetadata | null>;
  createDataset(data: Omit<DatasetMetadata, 'id'>): Promise<DatasetMetadata>;
  updateDataset(id: string, updates: Partial<DatasetMetadata>): Promise<DatasetMetadata | null>;
  deleteDataset(id: string): Promise<boolean>;
  selectDataset(teamId: string, teamName: string, datasetId: string): Promise<TeamDatasetSelection>;
  getTeamDatasetSelection(teamId: string): Promise<TeamDatasetSelection | null>;
  getAllDatasetSelections(): Promise<TeamDatasetSelection[]>;
  resetTeamDatasetSelection(teamId: string): Promise<boolean>;

  // Stage 4 (Static Prototype)
  getProblemStatements(): Promise<ProblemStatement[]>;
  getProblemStatementById(id: string): Promise<ProblemStatement | null>;
  createProblemStatement(data: Omit<ProblemStatement, 'id'>): Promise<ProblemStatement>;
  updateProblemStatement(id: string, updates: Partial<ProblemStatement>): Promise<ProblemStatement | null>;
  deleteProblemStatement(id: string): Promise<boolean>;
  selectProblemStatement(teamId: string, teamName: string, problemId: string): Promise<TeamProblemSelection>;
  getTeamProblemSelection(teamId: string): Promise<TeamProblemSelection | null>;
  getAllProblemSelections(): Promise<TeamProblemSelection[]>;
  resetTeamProblemSelection(teamId: string): Promise<boolean>;

  // Audit Logs
  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Global Progress Summary
  getTeamProgressSummaries(): Promise<TeamProgressSummary[]>;

  // System Settings & Global Competition Freeze
  getSystemSettings(): Promise<SystemSettings>;
  setCompetitionFreeze(isFrozen: boolean, reason?: string, frozenByEmail?: string): Promise<SystemSettings>;
}

export class DuplicateQuizSubmissionError extends Error {
  readonly code = 'QUIZ_SUBMISSION_EXISTS';
  constructor(message: string = 'Quiz assessment already submitted for this team. Duplicate submissions are prohibited.') {
    super(message);
    this.name = 'DuplicateQuizSubmissionError';
    Object.setPrototypeOf(this, DuplicateQuizSubmissionError.prototype);
  }
}

export class MemoryStore implements IStore {
  readonly storeType: string = 'MEMORY_STORE';
  private teams: Map<string, Team> = new Map();
  private stages: Map<StageId, StageConfig> = new Map();
  private quizQuestions: Map<string, QuizQuestion> = new Map();
  private quizSubmissions: Map<string, QuizSubmission> = new Map(); // teamId -> QuizSubmission
  private tabFocusLogs: TabFocusLog[] = [];

  private decodeChallenges: Map<string, DecodeChallenge> = new Map();
  private stage2Progress: Map<string, TeamStage2Progress> = new Map(); // teamId -> progress

  private datasets: Map<string, DatasetMetadata> = new Map();
  private datasetSelections: Map<string, TeamDatasetSelection> = new Map(); // teamId -> selection

  private problemStatements: Map<string, ProblemStatement> = new Map();
  private problemSelections: Map<string, TeamProblemSelection> = new Map(); // teamId -> selection
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.seed();
  }

  private seed(): void {
    // Seed Stages
    for (const stage of INITIAL_STAGES) {
      this.stages.set(stage.id, { ...stage });
    }

    // Seed Quiz Questions
    for (const q of INITIAL_QUIZ_QUESTIONS) {
      this.quizQuestions.set(q.id, { ...q });
    }

    // Seed Decode Challenges
    for (const ch of INITIAL_DECODE_CHALLENGES) {
      this.decodeChallenges.set(ch.id, { ...ch });
    }

    // Seed Datasets
    for (const ds of INITIAL_DATASETS) {
      this.datasets.set(ds.id, { ...ds });
    }

    // Seed Problem Statements
    for (const ps of INITIAL_PROBLEM_STATEMENTS) {
      this.problemStatements.set(ps.id, { ...ps });
    }
  }

  // TEAMS
  async createTeam(teamData: Omit<Team, 'id' | 'createdAt'>): Promise<Team> {
    const id = `team-${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const team: Team = {
      id,
      ...teamData,
      createdAt
    };
    this.teams.set(id, team);
    return { ...team };
  }

  async findTeamByEmail(email: string): Promise<Team | null> {
    const normalized = email.trim().toLowerCase();
    for (const team of this.teams.values()) {
      if (team.email.toLowerCase() === normalized) {
        return { ...team };
      }
    }
    return null;
  }

  async findTeamByName(name: string): Promise<Team | null> {
    const normalized = name.trim().toLowerCase();
    for (const team of this.teams.values()) {
      if (team.teamName.toLowerCase() === normalized) {
        return { ...team };
      }
    }
    return null;
  }

  async findTeamById(id: string): Promise<Team | null> {
    const team = this.teams.get(id);
    return team ? { ...team } : null;
  }

  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values()).map(t => ({ ...t }));
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | null> {
    const team = this.teams.get(id);
    if (!team) return null;
    const updated = { ...team, ...updates, id: team.id, createdAt: team.createdAt };
    this.teams.set(id, updated);
    return { ...updated };
  }

  async deleteTeam(id: string): Promise<boolean> {
    const deleted = this.teams.delete(id);
    if (deleted) {
      this.quizSubmissions.delete(id);
      this.stage2Progress.delete(id);
      this.datasetSelections.delete(id);
      this.problemSelections.delete(id);
    }
    return deleted;
  }

  async getAdmins(): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(t => t.role === 'admin').map(t => ({ ...t }));
  }

  async createAdmin(adminData: Omit<Team, 'id' | 'createdAt' | 'role'> & { permissions?: AdminPermission[]; adminRole?: AdminRole }): Promise<Team> {
    const id = `admin-${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const admin: Team = {
      id,
      teamName: adminData.teamName,
      email: adminData.email.trim().toLowerCase(),
      passwordHash: adminData.passwordHash,
      members: adminData.members,
      role: 'admin',
      adminRole: adminData.adminRole || 'event_admin',
      permissions: adminData.permissions || [],
      isPrimaryAdmin: false,
      createdAt
    };
    this.teams.set(id, admin);
    return { ...admin };
  }

  async updateAdminPermissions(id: string, permissions: AdminPermission[]): Promise<Team | null> {
    const admin = this.teams.get(id);
    if (!admin || admin.role !== 'admin') return null;
    admin.permissions = permissions;
    this.teams.set(id, admin);
    return { ...admin };
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const admin = this.teams.get(id);
    if (!admin || admin.role !== 'admin' || admin.isPrimaryAdmin) {
      return false;
    }
    return this.teams.delete(id);
  }

  // STAGES
  async getAllStages(): Promise<StageConfig[]> {
    return Array.from(this.stages.values()).sort((a, b) => a.order - b.order);
  }

  async getStage(stageId: StageId): Promise<StageConfig | null> {
    const stage = this.stages.get(stageId);
    return stage ? { ...stage } : null;
  }

  async updateStageStatus(stageId: StageId, status: StageStatus): Promise<StageConfig> {
    const stage = this.stages.get(stageId);
    if (!stage) {
      throw new Error(`Stage not found: ${stageId}`);
    }
    stage.status = status;
    this.stages.set(stageId, stage);
    return { ...stage };
  }

  async updateStageConfig(stageId: StageId, updates: Partial<StageConfig>): Promise<StageConfig> {
    const stage = this.stages.get(stageId);
    if (!stage) {
      throw new Error(`Stage not found: ${stageId}`);
    }
    const updated = { ...stage, ...updates, id: stageId, order: stage.order };
    this.stages.set(stageId, updated);
    return { ...updated };
  }

  // STAGE 1: QUIZ
  async getQuizQuestions(isAdmin: boolean): Promise<QuizQuestion[] | QuizQuestionParticipant[]> {
    const list = Array.from(this.quizQuestions.values());
    if (isAdmin) {
      return list.map(q => ({ ...q }));
    }
    // Participant view: strip correctOptionId and explanation, only return live questions
    return list
      .filter(q => q.isActiveForLiveQuiz)
      .map(q => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options.map(opt => ({ id: opt.id, text: opt.text })),
        isActiveForLiveQuiz: q.isActiveForLiveQuiz,
        isDemonstration: q.isDemonstration
      }));
  }

  async getQuizQuestionById(id: string): Promise<QuizQuestion | null> {
    const q = this.quizQuestions.get(id);
    return q ? { ...q } : null;
  }

  async createQuizQuestion(question: Omit<QuizQuestion, 'id'>): Promise<QuizQuestion> {
    const id = `q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newQ: QuizQuestion = { id, ...question };
    this.quizQuestions.set(id, newQ);
    return { ...newQ };
  }

  async updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion | null> {
    const existing = this.quizQuestions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.quizQuestions.set(id, updated);
    return { ...updated };
  }

  async deleteQuizQuestion(id: string): Promise<boolean> {
    return this.quizQuestions.delete(id);
  }

  async submitQuiz(teamId: string, teamName: string, answers: Record<string, string>): Promise<QuizSubmission> {
    if (this.quizSubmissions.has(teamId)) {
      throw new DuplicateQuizSubmissionError(`Team ${teamId} has already submitted the Stage 1 quiz assessment.`);
    }

    const liveQuestions = Array.from(this.quizQuestions.values()).filter(q => q.isActiveForLiveQuiz);
    const totalQuestions = liveQuestions.length;
    let correctCount = 0;

    for (const q of liveQuestions) {
      const selected = answers[q.id];
      if (selected && selected.toUpperCase() === q.correctOptionId.toUpperCase()) {
        correctCount++;
      }
    }

    // Configurable provisional scoring rule: (correctCount / totalQuestions) * 10
    const rawScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 10 : 0;
    const score = Math.round(rawScore * 10) / 10;

    const submission: QuizSubmission = {
      teamId,
      teamName,
      answers,
      totalQuestions,
      correctCount,
      score,
      submittedAt: new Date().toISOString()
    };

    this.quizSubmissions.set(teamId, submission);
    return { ...submission };
  }

  async getQuizSubmissionByTeam(teamId: string): Promise<QuizSubmission | null> {
    const sub = this.quizSubmissions.get(teamId);
    return sub ? { ...sub } : null;
  }

  async getAllQuizSubmissions(): Promise<QuizSubmission[]> {
    return Array.from(this.quizSubmissions.values());
  }

  async resetQuizSubmission(teamId: string): Promise<boolean> {
    const deleted = this.quizSubmissions.delete(teamId);
    this.tabFocusLogs = this.tabFocusLogs.filter(l => l.teamId !== teamId);
    return deleted;
  }

  async updateQuizSubmissionScore(teamId: string, newScore: number, note?: string): Promise<QuizSubmission | null> {
    const sub = this.quizSubmissions.get(teamId);
    if (!sub) return null;
    sub.score = newScore;
    if (note) {
      sub.overrideNote = note;
    }
    this.quizSubmissions.set(teamId, sub);
    return { ...sub };
  }

  async logTabFocusEvent(logData: Omit<TabFocusLog, 'id' | 'timestamp'>): Promise<TabFocusLog> {
    const id = `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const log: TabFocusLog = {
      id,
      timestamp: new Date().toISOString(),
      ...logData
    };
    this.tabFocusLogs.push(log);
    return { ...log };
  }

  async getTabFocusLogs(teamId?: string): Promise<TabFocusLog[]> {
    if (teamId) {
      return this.tabFocusLogs.filter(l => l.teamId === teamId);
    }
    return [...this.tabFocusLogs];
  }

  // STAGE 2: DECODE & ENCODE
  private getOrCreateTeamStage2(teamId: string, teamName: string): TeamStage2Progress {
    let progress = this.stage2Progress.get(teamId);
    if (!progress) {
      progress = {
        teamId,
        teamName,
        challengeStates: {},
        hintsUsedCount: 0,
        deductionMarks: 0,
        provisionalScore: 0,
        lastActivityAt: new Date().toISOString()
      };
      this.stage2Progress.set(teamId, progress);
    }
    return progress;
  }

  private recalculateStage2Score(progress: TeamStage2Progress): void {
    const activeChallenges = Array.from(this.decodeChallenges.values()).filter(c => c.isActive);
    const totalActive = activeChallenges.length;
    let solvedCount = 0;
    let hintsUsed = 0;

    for (const ch of activeChallenges) {
      const state = progress.challengeStates[ch.id];
      if (state) {
        if (state.isSolved) solvedCount++;
        if (state.hintUsed) hintsUsed++;
      }
    }

    progress.hintsUsedCount = hintsUsed;
    progress.deductionMarks = hintsUsed * 2;

    // Provisional base score: proportional up to 10 marks
    const baseScore = totalActive > 0 ? (solvedCount / totalActive) * 10 : 0;
    // Each hint deducts 2 marks from stage's 10, never below 0
    progress.provisionalScore = Math.max(0, Math.round((baseScore - progress.deductionMarks) * 10) / 10);
  }

  async getDecodeChallenges(isAdmin: boolean, teamId?: string): Promise<DecodeChallenge[] | DecodeChallengeParticipant[]> {
    const list = Array.from(this.decodeChallenges.values());
    if (isAdmin) {
      return list.map(c => ({ ...c }));
    }

    const teamProgress = teamId ? this.stage2Progress.get(teamId) : null;

    return list
      .filter(c => c.isActive)
      .map(c => {
        const state = teamProgress?.challengeStates[c.id];
        const attemptsUsed = state?.attempts?.length || 0;
        const isSolved = state?.isSolved || false;
        const isLockedOut = !isSolved && attemptsUsed >= 3;
        const hintRevealed = state?.hintUsed ? c.hint : undefined;

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          encodedPayload: c.encodedPayload,
          hasHint: Boolean(c.hint),
          hintRevealed,
          isActive: c.isActive,
          isSolved,
          attemptsUsed,
          maxAttempts: 3,
          isLockedOut,
          isDemonstration: c.isDemonstration
        };
      });
  }

  async getDecodeChallengeById(id: string): Promise<DecodeChallenge | null> {
    const c = this.decodeChallenges.get(id);
    return c ? { ...c } : null;
  }

  async createDecodeChallenge(ch: Omit<DecodeChallenge, 'id'>): Promise<DecodeChallenge> {
    const id = `ch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newCh: DecodeChallenge = { id, ...ch };
    this.decodeChallenges.set(id, newCh);
    return { ...newCh };
  }

  async updateDecodeChallenge(id: string, updates: Partial<DecodeChallenge>): Promise<DecodeChallenge | null> {
    const existing = this.decodeChallenges.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.decodeChallenges.set(id, updated);
    return { ...updated };
  }

  async deleteDecodeChallenge(id: string): Promise<boolean> {
    return this.decodeChallenges.delete(id);
  }

  async unlockHint(teamId: string, teamName: string, challengeId: string): Promise<{ hint: string; hintsUsedCount: number; deductionMarks: number }> {
    const ch = this.decodeChallenges.get(challengeId);
    if (!ch) {
      throw new Error('Challenge not found');
    }

    const progress = this.getOrCreateTeamStage2(teamId, teamName);
    let state = progress.challengeStates[challengeId];
    if (!state) {
      state = {
        challengeId,
        attempts: [],
        hintUsed: false,
        isSolved: false
      };
      progress.challengeStates[challengeId] = state;
    }

    if (!state.hintUsed) {
      state.hintUsed = true;
      state.hintUsedAt = new Date().toISOString();
      progress.lastActivityAt = new Date().toISOString();
      this.recalculateStage2Score(progress);
    }

    return {
      hint: ch.hint,
      hintsUsedCount: progress.hintsUsedCount,
      deductionMarks: progress.deductionMarks
    };
  }

  async submitChallengeAttempt(
    teamId: string,
    teamName: string,
    challengeId: string,
    answer: string
  ): Promise<{ isCorrect: boolean; attemptsRemaining: number; isLockedOut: boolean; message: string }> {
    const ch = this.decodeChallenges.get(challengeId);
    if (!ch) {
      throw new Error('Challenge not found');
    }

    const progress = this.getOrCreateTeamStage2(teamId, teamName);
    let state = progress.challengeStates[challengeId];
    if (!state) {
      state = {
        challengeId,
        attempts: [],
        hintUsed: false,
        isSolved: false
      };
      progress.challengeStates[challengeId] = state;
    }

    if (state.isSolved) {
      return {
        isCorrect: true,
        attemptsRemaining: Math.max(0, 3 - state.attempts.length),
        isLockedOut: false,
        message: 'Challenge is already solved successfully.'
      };
    }

    if (state.attempts.length >= 3) {
      return {
        isCorrect: false,
        attemptsRemaining: 0,
        isLockedOut: true,
        message: 'Maximum 3 attempts reached. Further submissions are rejected for this challenge.'
      };
    }

    // Server-side answer comparison (case-insensitive, normalized whitespace)
    const normalizedInput = answer.trim().toUpperCase();
    const normalizedExpected = ch.expectedAnswer.trim().toUpperCase();
    const isCorrect = normalizedInput === normalizedExpected;

    state.attempts.push({
      answer: answer.trim(),
      isCorrect,
      timestamp: new Date().toISOString()
    });

    if (isCorrect) {
      state.isSolved = true;
      state.solvedAt = new Date().toISOString();
    }

    progress.lastActivityAt = new Date().toISOString();
    this.recalculateStage2Score(progress);

    const attemptsRemaining = Math.max(0, 3 - state.attempts.length);
    const isLockedOut = !isCorrect && attemptsRemaining === 0;

    let message = '';
    if (isCorrect) {
      message = 'Correct! Anomaly payload decoded successfully.';
    } else if (isLockedOut) {
      message = 'Incorrect answer. You have exhausted all 3 attempts. Submissions are now locked.';
    } else {
      message = `Incorrect answer. ${attemptsRemaining} attempt(s) remaining.`;
    }

    return {
      isCorrect,
      attemptsRemaining,
      isLockedOut,
      message
    };
  }

  async getTeamStage2Progress(teamId: string): Promise<TeamStage2Progress | null> {
    const progress = this.stage2Progress.get(teamId);
    return progress ? JSON.parse(JSON.stringify(progress)) : null;
  }

  async getAllStage2Progress(): Promise<TeamStage2Progress[]> {
    return Array.from(this.stage2Progress.values()).map(p => JSON.parse(JSON.stringify(p)));
  }

  async resetStage2Progress(teamId: string): Promise<boolean> {
    return this.stage2Progress.delete(teamId);
  }

  async updateStage2Score(teamId: string, newScore: number, note?: string): Promise<TeamStage2Progress | null> {
    const prog = this.stage2Progress.get(teamId);
    if (!prog) return null;
    prog.provisionalScore = newScore;
    if (note) {
      prog.overrideNote = note;
    }
    this.stage2Progress.set(teamId, prog);
    return JSON.parse(JSON.stringify(prog));
  }

  async completeStage2(teamId: string, teamName: string): Promise<TeamStage2Progress> {
    let prog = this.stage2Progress.get(teamId);
    if (!prog) {
      prog = {
        teamId,
        teamName,
        challengeStates: {},
        hintsUsedCount: 0,
        deductionMarks: 0,
        provisionalScore: 10,
        lastActivityAt: new Date().toISOString()
      };
    }
    prog.completedAt = new Date().toISOString();
    prog.lastActivityAt = prog.completedAt;
    this.stage2Progress.set(teamId, prog);
    return JSON.parse(JSON.stringify(prog));
  }

  // STAGE 3: DATASET EDA
  async getDatasets(): Promise<DatasetMetadata[]> {
    return Array.from(this.datasets.values());
  }

  async getDatasetById(id: string): Promise<DatasetMetadata | null> {
    const ds = this.datasets.get(id);
    return ds ? { ...ds } : null;
  }

  async createDataset(data: Omit<DatasetMetadata, 'id'>): Promise<DatasetMetadata> {
    const id = `ds-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newDs: DatasetMetadata = { id, ...data };
    this.datasets.set(id, newDs);
    return { ...newDs };
  }

  async updateDataset(id: string, updates: Partial<DatasetMetadata>): Promise<DatasetMetadata | null> {
    const existing = this.datasets.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.datasets.set(id, updated);
    return { ...updated };
  }

  async deleteDataset(id: string): Promise<boolean> {
    return this.datasets.delete(id);
  }

  async selectDataset(teamId: string, teamName: string, datasetId: string): Promise<TeamDatasetSelection> {
    const existing = this.datasetSelections.get(teamId);
    if (existing) {
      throw new Error(`Team already selected dataset "${existing.datasetName}". One-time selection is enforced unless reset by an administrator.`);
    }

    const dataset = this.datasets.get(datasetId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    const selection: TeamDatasetSelection = {
      teamId,
      teamName,
      datasetId,
      datasetName: dataset.name,
      selectedAt: new Date().toISOString()
    };

    this.datasetSelections.set(teamId, selection);
    return { ...selection };
  }

  async getTeamDatasetSelection(teamId: string): Promise<TeamDatasetSelection | null> {
    const sel = this.datasetSelections.get(teamId);
    return sel ? { ...sel } : null;
  }

  async getAllDatasetSelections(): Promise<TeamDatasetSelection[]> {
    return Array.from(this.datasetSelections.values());
  }

  async resetTeamDatasetSelection(teamId: string): Promise<boolean> {
    return this.datasetSelections.delete(teamId);
  }

  // STAGE 4: STATIC PROTOTYPE
  async getProblemStatements(): Promise<ProblemStatement[]> {
    return Array.from(this.problemStatements.values());
  }

  async getProblemStatementById(id: string): Promise<ProblemStatement | null> {
    const ps = this.problemStatements.get(id);
    return ps ? { ...ps } : null;
  }

  async createProblemStatement(data: Omit<ProblemStatement, 'id'>): Promise<ProblemStatement> {
    const id = `ps-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newPs: ProblemStatement = { id, ...data };
    this.problemStatements.set(id, newPs);
    return { ...newPs };
  }

  async updateProblemStatement(id: string, updates: Partial<ProblemStatement>): Promise<ProblemStatement | null> {
    const existing = this.problemStatements.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.problemStatements.set(id, updated);
    return { ...updated };
  }

  async deleteProblemStatement(id: string): Promise<boolean> {
    return this.problemStatements.delete(id);
  }

  async selectProblemStatement(teamId: string, teamName: string, problemId: string): Promise<TeamProblemSelection> {
    const existing = this.problemSelections.get(teamId);
    if (existing) {
      throw new Error(`Team already selected problem statement "${existing.problemTitle}". One-time selection is enforced unless reset by an administrator.`);
    }

    const problem = this.problemStatements.get(problemId);
    if (!problem) {
      throw new Error('Problem statement not found');
    }

    const selection: TeamProblemSelection = {
      teamId,
      teamName,
      problemId,
      problemTitle: problem.title,
      selectedAt: new Date().toISOString()
    };

    this.problemSelections.set(teamId, selection);
    return { ...selection };
  }

  async getTeamProblemSelection(teamId: string): Promise<TeamProblemSelection | null> {
    const sel = this.problemSelections.get(teamId);
    return sel ? { ...sel } : null;
  }

  async getAllProblemSelections(): Promise<TeamProblemSelection[]> {
    return Array.from(this.problemSelections.values());
  }

  async resetTeamProblemSelection(teamId: string): Promise<boolean> {
    return this.problemSelections.delete(teamId);
  }

  // AUDIT LOGS
  async addAuditLog(logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const log: AuditLog = {
      id,
      timestamp: new Date().toISOString(),
      ...logData
    };
    this.auditLogs.unshift(log);
    return { ...log };
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogs.slice(0, limit);
  }

  // OVERVIEW
  async getTeamProgressSummaries(): Promise<TeamProgressSummary[]> {
    const teams = Array.from(this.teams.values()).filter(t => t.role === 'participant');
    const totalChallenges = Array.from(this.decodeChallenges.values()).filter(c => c.isActive).length;

    return teams.map(team => {
      // Stage 1
      const qSub = this.quizSubmissions.get(team.id);
      const teamLogs = this.tabFocusLogs.filter(l => l.teamId === team.id);

      // Stage 2
      const s2 = this.stage2Progress.get(team.id);
      let solvedCount = 0;
      if (s2) {
        for (const st of Object.values(s2.challengeStates)) {
          if (st.isSolved) solvedCount++;
        }
      }

      // Stage 3
      const s3Sel = this.datasetSelections.get(team.id);

      // Stage 4 & 5
      const s4Sel = this.problemSelections.get(team.id);

      return {
        teamId: team.id,
        teamName: team.teamName,
        email: team.email,
        members: team.members,
        stage1: {
          completed: Boolean(qSub),
          score: qSub ? qSub.score : null,
          submittedAt: qSub ? qSub.submittedAt : null,
          eventCount: teamLogs.length
        },
        stage2: {
          completed: solvedCount > 0 && solvedCount === totalChallenges,
          solvedCount,
          totalChallenges,
          hintsUsed: s2?.hintsUsedCount || 0,
          deduction: s2?.deductionMarks || 0,
          score: s2?.provisionalScore || 0
        },
        stage3: {
          selected: Boolean(s3Sel),
          datasetId: s3Sel?.datasetId || null,
          datasetName: s3Sel?.datasetName || null,
          selectedAt: s3Sel?.selectedAt || null
        },
        stage4: {
          selected: Boolean(s4Sel),
          problemId: s4Sel?.problemId || null,
          problemTitle: s4Sel?.problemTitle || null,
          selectedAt: s4Sel?.selectedAt || null
        },
        stage5: {
          problemId: s4Sel?.problemId || null,
          continuityVerified: Boolean(s4Sel)
        }
      };
    });
  }

  // System Settings & Global Competition Freeze
  private systemSettings: SystemSettings = {
    isCompetitionFrozen: false
  };

  async getSystemSettings(): Promise<SystemSettings> {
    return { ...this.systemSettings };
  }

  async setCompetitionFreeze(isFrozen: boolean, reason?: string, frozenByEmail?: string): Promise<SystemSettings> {
    this.systemSettings = {
      isCompetitionFrozen: isFrozen,
      freezeReason: isFrozen ? (reason || 'Competition paused by Primary Incident Command.') : undefined,
      frozenAt: isFrozen ? new Date().toISOString() : undefined,
      frozenByEmail: isFrozen ? frozenByEmail : undefined
    };
    return { ...this.systemSettings };
  }
}
