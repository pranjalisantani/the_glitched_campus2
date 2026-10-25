import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  StageId,
  StageStatus,
  StageConfig,
  Team,
  AdminPermission,
  AdminRole,
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
import { IStore, DuplicateQuizSubmissionError } from './memoryStore';

export class PersistentFileStore implements IStore {
  private storageDir: string;
  private teams: Map<string, Team> = new Map();
  private stages: Map<StageId, StageConfig> = new Map();
  private quizQuestions: Map<string, QuizQuestion> = new Map();
  private quizSubmissions: Map<string, QuizSubmission> = new Map();
  private tabFocusLogs: TabFocusLog[] = [];

  private decodeChallenges: Map<string, DecodeChallenge> = new Map();
  private stage2Progress: Map<string, TeamStage2Progress> = new Map();

  private datasets: Map<string, DatasetMetadata> = new Map();
  private datasetSelections: Map<string, TeamDatasetSelection> = new Map();

  private problemStatements: Map<string, ProblemStatement> = new Map();
  private problemSelections: Map<string, TeamProblemSelection> = new Map();
  private auditLogs: AuditLog[] = [];
  private systemSettings: SystemSettings = {
    isCompetitionFrozen: false
  };

  constructor(customStorageDir?: string) {
    const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));
    const defaultDir = isTest
      ? path.resolve(__dirname, '../../storage/test_data')
      : path.resolve(__dirname, '../../storage/data');
    this.storageDir = customStorageDir || defaultDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    this.initStore();
  }

  private getFilePath(filename: string): string {
    return path.join(this.storageDir, filename);
  }

  private saveCollectionSync(filename: string, data: any): void {
    try {
      const filePath = this.getFilePath(filename);
      const tmpPath = `${filePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
      try {
        fs.renameSync(tmpPath, filePath);
      } catch (renameErr: any) {
        if (renameErr.code === 'EPERM' || renameErr.code === 'EBUSY') {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          try { fs.unlinkSync(tmpPath); } catch {}
        } else {
          throw renameErr;
        }
      }
    } catch (err) {
      console.error(`[STORAGE ERROR] Failed to persist ${filename}:`, err);
    }
  }

  private loadCollectionSync<T>(filename: string): T | null {
    try {
      const filePath = this.getFilePath(filename);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as T;
      }
    } catch (err) {
      console.error(`[STORAGE ERROR] Failed to load ${filename}:`, err);
    }
    return null;
  }

  private initStore(): void {
    // 1. Stages
    const savedStages = this.loadCollectionSync<StageConfig[]>('stages.json');
    if (savedStages && Array.isArray(savedStages) && savedStages.length > 0) {
      for (const s of savedStages) this.stages.set(s.id, s);
    } else {
      for (const s of INITIAL_STAGES) this.stages.set(s.id, { ...s });
      this.saveCollectionSync('stages.json', Array.from(this.stages.values()));
    }

    // 2. Quiz Questions
    const savedQuestions = this.loadCollectionSync<QuizQuestion[]>('quiz_questions.json');
    if (savedQuestions && Array.isArray(savedQuestions) && savedQuestions.length > 0) {
      for (const q of savedQuestions) this.quizQuestions.set(q.id, q);
    } else {
      for (const q of INITIAL_QUIZ_QUESTIONS) this.quizQuestions.set(q.id, { ...q });
      this.saveCollectionSync('quiz_questions.json', Array.from(this.quizQuestions.values()));
    }

    // 3. Decode Challenges
    const savedChallenges = this.loadCollectionSync<DecodeChallenge[]>('decode_challenges.json');
    if (savedChallenges && Array.isArray(savedChallenges) && savedChallenges.length > 0) {
      for (const ch of savedChallenges) this.decodeChallenges.set(ch.id, ch);
    } else {
      for (const ch of INITIAL_DECODE_CHALLENGES) this.decodeChallenges.set(ch.id, { ...ch });
      this.saveCollectionSync('decode_challenges.json', Array.from(this.decodeChallenges.values()));
    }

    // 4. Datasets
    const savedDatasets = this.loadCollectionSync<DatasetMetadata[]>('datasets.json');
    if (savedDatasets && Array.isArray(savedDatasets) && savedDatasets.length > 0) {
      for (const ds of savedDatasets) this.datasets.set(ds.id, ds);
    } else {
      for (const ds of INITIAL_DATASETS) this.datasets.set(ds.id, { ...ds });
      this.saveCollectionSync('datasets.json', Array.from(this.datasets.values()));
    }

    // 5. Problem Statements
    const savedProblems = this.loadCollectionSync<ProblemStatement[]>('problem_statements.json');
    if (savedProblems && Array.isArray(savedProblems) && savedProblems.length > 0) {
      for (const ps of savedProblems) this.problemStatements.set(ps.id, ps);
    } else {
      for (const ps of INITIAL_PROBLEM_STATEMENTS) this.problemStatements.set(ps.id, { ...ps });
      this.saveCollectionSync('problem_statements.json', Array.from(this.problemStatements.values()));
    }

    // Dynamic collections
    const savedTeams = this.loadCollectionSync<Team[]>('teams.json');
    if (savedTeams) for (const t of savedTeams) this.teams.set(t.id, t);

    const savedSubmissions = this.loadCollectionSync<QuizSubmission[]>('quiz_submissions.json');
    if (savedSubmissions) for (const sub of savedSubmissions) this.quizSubmissions.set(sub.teamId, sub);

    const savedLogs = this.loadCollectionSync<TabFocusLog[]>('tab_logs.json');
    if (savedLogs) this.tabFocusLogs = savedLogs;

    const savedS2 = this.loadCollectionSync<TeamStage2Progress[]>('stage2_progress.json');
    if (savedS2) for (const s of savedS2) this.stage2Progress.set(s.teamId, s);

    const savedS3 = this.loadCollectionSync<TeamDatasetSelection[]>('dataset_selections.json');
    if (savedS3) for (const s of savedS3) this.datasetSelections.set(s.teamId, s);

    const savedS4 = this.loadCollectionSync<TeamProblemSelection[]>('problem_selections.json');
    if (savedS4) for (const s of savedS4) this.problemSelections.set(s.teamId, s);

    const savedAudits = this.loadCollectionSync<AuditLog[]>('audit_logs.json');
    if (savedAudits) this.auditLogs = savedAudits;

    const savedSettings = this.loadCollectionSync<SystemSettings>('system_settings.json');
    if (savedSettings && typeof savedSettings === 'object') {
      this.systemSettings = { ...savedSettings };
    } else {
      this.systemSettings = { isCompetitionFrozen: false };
      this.saveCollectionSync('system_settings.json', this.systemSettings);
    }
  }

  // TEAMS & PARTICIPANTS
  async createTeam(teamData: Omit<Team, 'id' | 'createdAt'>): Promise<Team> {
    const id = `team-${crypto.randomBytes(4).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const team: Team = {
      id,
      ...teamData,
      createdAt
    };
    this.teams.set(id, team);
    this.saveCollectionSync('teams.json', Array.from(this.teams.values()));
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
    this.saveCollectionSync('teams.json', Array.from(this.teams.values()));
    return { ...updated };
  }

  async deleteTeam(id: string): Promise<boolean> {
    const deleted = this.teams.delete(id);
    if (deleted) {
      this.quizSubmissions.delete(id);
      this.stage2Progress.delete(id);
      this.datasetSelections.delete(id);
      this.problemSelections.delete(id);
      this.saveCollectionSync('teams.json', Array.from(this.teams.values()));
      this.saveCollectionSync('quiz_submissions.json', Array.from(this.quizSubmissions.values()));
      this.saveCollectionSync('stage2_progress.json', Array.from(this.stage2Progress.values()));
      this.saveCollectionSync('dataset_selections.json', Array.from(this.datasetSelections.values()));
      this.saveCollectionSync('problem_selections.json', Array.from(this.problemSelections.values()));
    }
    return deleted;
  }

  // ADMIN ACCOUNTS MANAGEMENT
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
    this.saveCollectionSync('teams.json', Array.from(this.teams.values()));
    return { ...admin };
  }

  async updateAdminPermissions(id: string, permissions: AdminPermission[]): Promise<Team | null> {
    const admin = this.teams.get(id);
    if (!admin || admin.role !== 'admin') return null;
    admin.permissions = permissions;
    this.teams.set(id, admin);
    this.saveCollectionSync('teams.json', Array.from(this.teams.values()));
    return { ...admin };
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const admin = this.teams.get(id);
    if (!admin || admin.role !== 'admin' || admin.isPrimaryAdmin) {
      return false;
    }
    const deleted = this.teams.delete(id);
    if (deleted) {
      this.saveCollectionSync('teams.json', Array.from(this.teams.values()));
    }
    return deleted;
  }

  // STAGES CONFIGURATION
  async getAllStages(): Promise<StageConfig[]> {
    return Array.from(this.stages.values()).sort((a, b) => a.order - b.order);
  }

  async getStage(stageId: StageId): Promise<StageConfig | null> {
    const stage = this.stages.get(stageId);
    return stage ? { ...stage } : null;
  }

  async updateStageStatus(stageId: StageId, status: StageStatus): Promise<StageConfig> {
    const stage = this.stages.get(stageId);
    if (!stage) throw new Error(`Stage not found: ${stageId}`);
    stage.status = status;
    this.stages.set(stageId, stage);
    this.saveCollectionSync('stages.json', Array.from(this.stages.values()));
    return { ...stage };
  }

  async updateStageConfig(stageId: StageId, updates: Partial<StageConfig>): Promise<StageConfig> {
    const stage = this.stages.get(stageId);
    if (!stage) throw new Error(`Stage not found: ${stageId}`);
    const updated: StageConfig = {
      ...stage,
      ...updates,
      id: stage.id,
      order: stage.order
    };
    this.stages.set(stageId, updated);
    this.saveCollectionSync('stages.json', Array.from(this.stages.values()));
    return { ...updated };
  }

  // STAGE 1: QUIZ
  async getQuizQuestions(isAdmin: boolean): Promise<QuizQuestion[] | QuizQuestionParticipant[]> {
    const list = Array.from(this.quizQuestions.values());
    if (isAdmin) {
      return list.map(q => ({ ...q }));
    }
    return list
      .filter(q => q.isActiveForLiveQuiz)
      .map(q => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        points: q.points,
        isActiveForLiveQuiz: q.isActiveForLiveQuiz,
        isDemonstration: q.isDemonstration
      }));
  }

  async getQuizQuestionById(id: string): Promise<QuizQuestion | null> {
    const q = this.quizQuestions.get(id);
    return q ? { ...q } : null;
  }

  async createQuizQuestion(question: Omit<QuizQuestion, 'id'>): Promise<QuizQuestion> {
    const id = `q-${crypto.randomBytes(3).toString('hex')}`;
    const newQ: QuizQuestion = { id, ...question };
    this.quizQuestions.set(id, newQ);
    this.saveCollectionSync('quiz_questions.json', Array.from(this.quizQuestions.values()));
    return { ...newQ };
  }

  async updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion | null> {
    const existing = this.quizQuestions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.quizQuestions.set(id, updated);
    this.saveCollectionSync('quiz_questions.json', Array.from(this.quizQuestions.values()));
    return { ...updated };
  }

  async deleteQuizQuestion(id: string): Promise<boolean> {
    const deleted = this.quizQuestions.delete(id);
    if (deleted) {
      this.saveCollectionSync('quiz_questions.json', Array.from(this.quizQuestions.values()));
    }
    return deleted;
  }

  async submitQuiz(teamId: string, teamName: string, answers: Record<string, string>): Promise<QuizSubmission> {
    if (this.quizSubmissions.has(teamId)) {
      throw new DuplicateQuizSubmissionError();
    }

    const allQuestions = Array.from(this.quizQuestions.values());
    const activeQuestions = allQuestions.filter(q => q.isActiveForLiveQuiz !== false);
    const totalQuestions = activeQuestions.length;

    let correctCount = 0;
    for (const q of activeQuestions) {
      if (answers[q.id] && answers[q.id] === q.correctOptionId) {
        correctCount++;
      }
    }

    const maxScore = 10;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * maxScore * 100) / 100 : 0;
    const submittedAt = new Date().toISOString();

    const submission: QuizSubmission = {
      teamId,
      teamName,
      answers,
      totalQuestions,
      correctCount,
      score,
      submittedAt
    };

    this.quizSubmissions.set(teamId, submission);
    this.saveCollectionSync('quiz_submissions.json', Array.from(this.quizSubmissions.values()));
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
    if (deleted) {
      this.saveCollectionSync('quiz_submissions.json', Array.from(this.quizSubmissions.values()));
    }
    return deleted;
  }

  async updateQuizSubmissionScore(teamId: string, newScore: number, note?: string): Promise<QuizSubmission | null> {
    const sub = this.quizSubmissions.get(teamId);
    if (!sub) return null;
    sub.score = newScore;
    sub.scoreOverride = newScore;
    if (note) {
      sub.evaluationNote = note;
      sub.overrideNote = note;
    }
    this.quizSubmissions.set(teamId, sub);
    this.saveCollectionSync('quiz_submissions.json', Array.from(this.quizSubmissions.values()));
    return { ...sub };
  }

  async logTabFocusEvent(log: Omit<TabFocusLog, 'id' | 'timestamp'>): Promise<TabFocusLog> {
    const newLog: TabFocusLog = {
      id: `log-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...log
    };
    this.tabFocusLogs.push(newLog);
    this.saveCollectionSync('tab_logs.json', this.tabFocusLogs);
    return { ...newLog };
  }

  async getTabFocusLogs(teamId?: string): Promise<TabFocusLog[]> {
    if (teamId) {
      return this.tabFocusLogs.filter(l => l.teamId === teamId);
    }
    return [...this.tabFocusLogs];
  }

  // STAGE 2: DECODE & ENCODE
  async getDecodeChallenges(isAdmin: boolean, teamId?: string): Promise<DecodeChallenge[] | DecodeChallengeParticipant[]> {
    const list = Array.from(this.decodeChallenges.values());
    if (isAdmin) {
      return list.map(ch => ({ ...ch }));
    }

    const teamProgress = teamId ? this.stage2Progress.get(teamId) : null;
    return list
      .filter(ch => ch.isActive)
      .map(ch => {
        const state = teamProgress?.challengeStates[ch.id];
        const attemptsUsed = state ? state.attempts.length : 0;
        const isSolved = state ? state.isSolved : false;
        const maxAtt = ch.maxAttempts || 3;
        const isLockedOut = !isSolved && attemptsUsed >= maxAtt;
        const hintRevealed = state && state.hintUsed ? ch.hint : undefined;

        return {
          id: ch.id,
          title: ch.title,
          description: ch.description,
          encodedPayload: ch.encodedPayload,
          hasHint: Boolean(ch.hint),
          hintRevealed,
          isActive: ch.isActive,
          isSolved,
          attemptsUsed,
          maxAttempts: maxAtt,
          isLockedOut,
          isDemonstration: ch.isDemonstration
        };
      });
  }

  async getDecodeChallengeById(id: string): Promise<DecodeChallenge | null> {
    const ch = this.decodeChallenges.get(id);
    return ch ? { ...ch } : null;
  }

  async createDecodeChallenge(ch: Omit<DecodeChallenge, 'id'>): Promise<DecodeChallenge> {
    const id = `c-${crypto.randomBytes(3).toString('hex')}`;
    const newCh: DecodeChallenge = { id, ...ch };
    this.decodeChallenges.set(id, newCh);
    this.saveCollectionSync('decode_challenges.json', Array.from(this.decodeChallenges.values()));
    return { ...newCh };
  }

  async updateDecodeChallenge(id: string, updates: Partial<DecodeChallenge>): Promise<DecodeChallenge | null> {
    const existing = this.decodeChallenges.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.decodeChallenges.set(id, updated);
    this.saveCollectionSync('decode_challenges.json', Array.from(this.decodeChallenges.values()));
    return { ...updated };
  }

  async deleteDecodeChallenge(id: string): Promise<boolean> {
    const deleted = this.decodeChallenges.delete(id);
    if (deleted) {
      this.saveCollectionSync('decode_challenges.json', Array.from(this.decodeChallenges.values()));
    }
    return deleted;
  }

  async unlockHint(teamId: string, teamName: string, challengeId: string): Promise<{ hint: string; hintsUsedCount: number; deductionMarks: number }> {
    const challenge = this.decodeChallenges.get(challengeId);
    if (!challenge) throw new Error('Challenge not found.');

    let progress = this.stage2Progress.get(teamId);
    if (!progress) {
      progress = {
        teamId,
        teamName,
        challengeStates: {},
        hintsUsedCount: 0,
        deductionMarks: 0,
        provisionalScore: 10,
        lastActivityAt: new Date().toISOString()
      };
    }

    if (!progress.challengeStates[challengeId]) {
      progress.challengeStates[challengeId] = {
        challengeId,
        attempts: [],
        hintUsed: false,
        isSolved: false
      };
    }

    const state = progress.challengeStates[challengeId];
    if (!state.hintUsed) {
      state.hintUsed = true;
      state.hintUsedAt = new Date().toISOString();
      progress.hintsUsedCount += 1;
      const deductionPerHint = challenge.hintDeduction || 2;
      progress.deductionMarks = Math.min(10, progress.hintsUsedCount * deductionPerHint);
      progress.provisionalScore = Math.max(0, 10 - progress.deductionMarks);
      progress.lastActivityAt = new Date().toISOString();
      this.stage2Progress.set(teamId, progress);
      this.saveCollectionSync('stage2_progress.json', Array.from(this.stage2Progress.values()));
    }

    return {
      hint: challenge.hint,
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
    const challenge = this.decodeChallenges.get(challengeId);
    if (!challenge) throw new Error('Challenge not found.');

    let progress = this.stage2Progress.get(teamId);
    if (!progress) {
      progress = {
        teamId,
        teamName,
        challengeStates: {},
        hintsUsedCount: 0,
        deductionMarks: 0,
        provisionalScore: 10,
        lastActivityAt: new Date().toISOString()
      };
    }

    if (!progress.challengeStates[challengeId]) {
      progress.challengeStates[challengeId] = {
        challengeId,
        attempts: [],
        hintUsed: false,
        isSolved: false
      };
    }

    const state = progress.challengeStates[challengeId];
    if (state.isSolved) {
      return { isCorrect: true, attemptsRemaining: 0, isLockedOut: false, message: 'Challenge has already been resolved.' };
    }

    const maxAtt = challenge.maxAttempts || 3;
    if (state.attempts.length >= maxAtt) {
      return {
        isCorrect: false,
        attemptsRemaining: 0,
        isLockedOut: true,
        message: 'Maximum 3 attempts reached. Further submissions are rejected for this challenge.'
      };
    }

    const normalizedAnswer = answer.trim().toLowerCase();
    const expected = challenge.expectedAnswer.trim().toLowerCase();
    const isCorrect = normalizedAnswer === expected;

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
    this.stage2Progress.set(teamId, progress);
    this.saveCollectionSync('stage2_progress.json', Array.from(this.stage2Progress.values()));

    const attemptsUsed = state.attempts.length;
    const attemptsRemaining = Math.max(0, maxAtt - attemptsUsed);
    const isLockedOut = !isCorrect && attemptsRemaining === 0;

    let message = '';
    if (isCorrect) {
      message = 'Correct! Anomaly payload decoded successfully.';
    } else if (isLockedOut) {
      message = 'Incorrect answer. You have exhausted all 3 attempts. Submissions are now locked.';
    } else {
      message = `Incorrect answer. ${attemptsRemaining} attempt(s) remaining.`;
    }

    return { isCorrect, attemptsRemaining, isLockedOut, message };
  }

  async getTeamStage2Progress(teamId: string): Promise<TeamStage2Progress | null> {
    const p = this.stage2Progress.get(teamId);
    return p ? { ...p } : null;
  }

  async getAllStage2Progress(): Promise<TeamStage2Progress[]> {
    return Array.from(this.stage2Progress.values());
  }

  async resetStage2Progress(teamId: string): Promise<boolean> {
    const deleted = this.stage2Progress.delete(teamId);
    if (deleted) {
      this.saveCollectionSync('stage2_progress.json', Array.from(this.stage2Progress.values()));
    }
    return deleted;
  }

  async updateStage2Score(teamId: string, newScore: number, note?: string): Promise<TeamStage2Progress | null> {
    const progress = this.stage2Progress.get(teamId);
    if (!progress) return null;
    progress.provisionalScore = newScore;
    progress.scoreOverride = newScore;
    if (note) {
      progress.evaluationNote = note;
      progress.overrideNote = note;
    }
    this.stage2Progress.set(teamId, progress);
    this.saveCollectionSync('stage2_progress.json', Array.from(this.stage2Progress.values()));
    return { ...progress };
  }

  async completeStage2(teamId: string, teamName: string): Promise<TeamStage2Progress> {
    let progress = this.stage2Progress.get(teamId);
    if (!progress) {
      progress = {
        teamId,
        teamName,
        challengeStates: {},
        hintsUsedCount: 0,
        deductionMarks: 0,
        provisionalScore: 10,
        lastActivityAt: new Date().toISOString()
      };
    }
    progress.completedAt = new Date().toISOString();
    progress.lastActivityAt = progress.completedAt;
    this.stage2Progress.set(teamId, progress);
    this.saveCollectionSync('stage2_progress.json', Array.from(this.stage2Progress.values()));
    return { ...progress };
  }

  // STAGE 3: DATASETS
  async getDatasets(): Promise<DatasetMetadata[]> {
    return Array.from(this.datasets.values());
  }

  async getDatasetById(id: string): Promise<DatasetMetadata | null> {
    const ds = this.datasets.get(id);
    return ds ? { ...ds } : null;
  }

  async createDataset(data: Omit<DatasetMetadata, 'id'>): Promise<DatasetMetadata> {
    const id = `ds-${crypto.randomBytes(3).toString('hex')}`;
    const newDs: DatasetMetadata = { id, ...data };
    this.datasets.set(id, newDs);
    this.saveCollectionSync('datasets.json', Array.from(this.datasets.values()));
    return { ...newDs };
  }

  async updateDataset(id: string, updates: Partial<DatasetMetadata>): Promise<DatasetMetadata | null> {
    const existing = this.datasets.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.datasets.set(id, updated);
    this.saveCollectionSync('datasets.json', Array.from(this.datasets.values()));
    return { ...updated };
  }

  async deleteDataset(id: string): Promise<boolean> {
    const deleted = this.datasets.delete(id);
    if (deleted) {
      this.saveCollectionSync('datasets.json', Array.from(this.datasets.values()));
    }
    return deleted;
  }

  async selectDataset(teamId: string, teamName: string, datasetId: string): Promise<TeamDatasetSelection> {
    const existing = this.datasetSelections.get(teamId);
    if (existing) {
      throw new Error(`Team already selected dataset "${existing.datasetName}". One-time selection is enforced unless reset by an administrator.`);
    }

    const dataset = this.datasets.get(datasetId);
    if (!dataset) throw new Error('Dataset not found.');

    const selection: TeamDatasetSelection = {
      teamId,
      teamName,
      datasetId,
      datasetName: dataset.name,
      selectedAt: new Date().toISOString()
    };
    this.datasetSelections.set(teamId, selection);
    this.saveCollectionSync('dataset_selections.json', Array.from(this.datasetSelections.values()));
    return { ...selection };
  }

  async getTeamDatasetSelection(teamId: string): Promise<TeamDatasetSelection | null> {
    const s = this.datasetSelections.get(teamId);
    return s ? { ...s } : null;
  }

  async getAllDatasetSelections(): Promise<TeamDatasetSelection[]> {
    return Array.from(this.datasetSelections.values());
  }

  async resetTeamDatasetSelection(teamId: string): Promise<boolean> {
    const deleted = this.datasetSelections.delete(teamId);
    if (deleted) {
      this.saveCollectionSync('dataset_selections.json', Array.from(this.datasetSelections.values()));
    }
    return deleted;
  }

  // STAGE 4 & 5: PROBLEMS
  async getProblemStatements(): Promise<ProblemStatement[]> {
    return Array.from(this.problemStatements.values());
  }

  async getProblemStatementById(id: string): Promise<ProblemStatement | null> {
    const ps = this.problemStatements.get(id);
    return ps ? { ...ps } : null;
  }

  async createProblemStatement(data: Omit<ProblemStatement, 'id'>): Promise<ProblemStatement> {
    const id = `ps-${crypto.randomBytes(3).toString('hex')}`;
    const newPs: ProblemStatement = { id, ...data };
    this.problemStatements.set(id, newPs);
    this.saveCollectionSync('problem_statements.json', Array.from(this.problemStatements.values()));
    return { ...newPs };
  }

  async updateProblemStatement(id: string, updates: Partial<ProblemStatement>): Promise<ProblemStatement | null> {
    const existing = this.problemStatements.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, id };
    this.problemStatements.set(id, updated);
    this.saveCollectionSync('problem_statements.json', Array.from(this.problemStatements.values()));
    return { ...updated };
  }

  async deleteProblemStatement(id: string): Promise<boolean> {
    const deleted = this.problemStatements.delete(id);
    if (deleted) {
      this.saveCollectionSync('problem_statements.json', Array.from(this.problemStatements.values()));
    }
    return deleted;
  }

  async selectProblemStatement(teamId: string, teamName: string, problemId: string): Promise<TeamProblemSelection> {
    const existing = this.problemSelections.get(teamId);
    if (existing) {
      throw new Error(`Team already selected problem statement "${existing.problemTitle}". One-time selection is enforced unless reset by an administrator.`);
    }

    const ps = this.problemStatements.get(problemId);
    if (!ps) throw new Error('Problem statement not found.');

    const selection: TeamProblemSelection = {
      teamId,
      teamName,
      problemId,
      problemTitle: ps.title,
      selectedAt: new Date().toISOString()
    };
    this.problemSelections.set(teamId, selection);
    this.saveCollectionSync('problem_selections.json', Array.from(this.problemSelections.values()));
    return { ...selection };
  }

  async getTeamProblemSelection(teamId: string): Promise<TeamProblemSelection | null> {
    const s = this.problemSelections.get(teamId);
    return s ? { ...s } : null;
  }

  async getAllProblemSelections(): Promise<TeamProblemSelection[]> {
    return Array.from(this.problemSelections.values());
  }

  async resetTeamProblemSelection(teamId: string): Promise<boolean> {
    const deleted = this.problemSelections.delete(teamId);
    if (deleted) {
      this.saveCollectionSync('problem_selections.json', Array.from(this.problemSelections.values()));
    }
    return deleted;
  }

  // AUDIT LOGS
  async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const entry: AuditLog = {
      id: `audit-${crypto.randomBytes(5).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...log
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    this.saveCollectionSync('audit_logs.json', this.auditLogs);
    return entry;
  }

  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogs.slice(0, limit);
  }

  // TEAM PROGRESS MATRIX
  async getTeamProgressSummaries(): Promise<TeamProgressSummary[]> {
    const teams = Array.from(this.teams.values()).filter(t => t.role === 'participant');
    const totalChallenges = Array.from(this.decodeChallenges.values()).filter(c => c.isActive).length;

    return teams.map(team => {
      const qSub = this.quizSubmissions.get(team.id);
      const s2 = this.stage2Progress.get(team.id);
      const s3 = this.datasetSelections.get(team.id);
      const s4 = this.problemSelections.get(team.id);
      const focusCount = this.tabFocusLogs.filter(l => l.teamId === team.id).length;

      let s2Solved = 0;
      if (s2) {
        for (const st of Object.values(s2.challengeStates)) {
          if (st.isSolved) s2Solved++;
        }
      }

      return {
        teamId: team.id,
        teamName: team.teamName,
        email: team.email,
        members: team.members,
        stage1: {
          completed: Boolean(qSub),
          score: qSub ? qSub.score : null,
          submittedAt: qSub ? qSub.submittedAt : null,
          eventCount: focusCount
        },
        stage2: {
          completed: s2Solved >= Math.max(1, totalChallenges),
          solvedCount: s2Solved,
          totalChallenges,
          hintsUsed: s2 ? s2.hintsUsedCount : 0,
          deduction: s2 ? s2.deductionMarks : 0,
          score: s2 ? s2.provisionalScore : 0
        },
        stage3: {
          selected: Boolean(s3),
          datasetId: s3 ? s3.datasetId : null,
          datasetName: s3 ? s3.datasetName : null,
          selectedAt: s3 ? s3.selectedAt : null
        },
        stage4: {
          selected: Boolean(s4),
          problemId: s4 ? s4.problemId : null,
          problemTitle: s4 ? s4.problemTitle : null,
          selectedAt: s4 ? s4.selectedAt : null
        },
        stage5: {
          problemId: s4 ? s4.problemId : null,
          continuityVerified: Boolean(s4)
        }
      };
    });
  }

  public resetToSeed(): void {
    this.stages.clear();
    for (const s of INITIAL_STAGES) this.stages.set(s.id, { ...s });
    this.saveCollectionSync('stages.json', Array.from(this.stages.values()));

    this.quizQuestions.clear();
    for (const q of INITIAL_QUIZ_QUESTIONS) this.quizQuestions.set(q.id, { ...q });
    this.saveCollectionSync('quiz_questions.json', Array.from(this.quizQuestions.values()));

    this.decodeChallenges.clear();
    for (const ch of INITIAL_DECODE_CHALLENGES) this.decodeChallenges.set(ch.id, { ...ch });
    this.saveCollectionSync('decode_challenges.json', Array.from(this.decodeChallenges.values()));

    this.datasets.clear();
    for (const ds of INITIAL_DATASETS) this.datasets.set(ds.id, { ...ds });
    this.saveCollectionSync('datasets.json', Array.from(this.datasets.values()));

    this.problemStatements.clear();
    for (const ps of INITIAL_PROBLEM_STATEMENTS) this.problemStatements.set(ps.id, { ...ps });
    this.saveCollectionSync('problem_statements.json', Array.from(this.problemStatements.values()));

    this.teams.clear();
    this.saveCollectionSync('teams.json', []);

    this.quizSubmissions.clear();
    this.saveCollectionSync('quiz_submissions.json', []);

    this.tabFocusLogs = [];
    this.saveCollectionSync('tab_logs.json', []);

    this.stage2Progress.clear();
    this.saveCollectionSync('stage2_progress.json', []);

    this.datasetSelections.clear();
    this.saveCollectionSync('dataset_selections.json', []);

    this.problemSelections.clear();
    this.saveCollectionSync('problem_selections.json', []);

    this.auditLogs = [];
    this.saveCollectionSync('audit_logs.json', []);

    this.systemSettings = { isCompetitionFrozen: false };
    this.saveCollectionSync('system_settings.json', this.systemSettings);
  }

  // System Settings & Global Competition Freeze
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
    this.saveCollectionSync('system_settings.json', this.systemSettings);
    return { ...this.systemSettings };
  }
}
