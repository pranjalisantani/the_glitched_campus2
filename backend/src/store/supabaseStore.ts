import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

export class SupabaseStore implements IStore {
  readonly storeType: string = 'SUPABASE_POSTGRES';
  private client: SupabaseClient;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Local cache maps for high throughput
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

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    this.initPromise = this.initStore();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async initStore(): Promise<void> {
    try {
      console.log('[SUPABASE] Loading persistent tournament records from Supabase...');

      // 1. Stages
      const { data: stagesData, error: stagesErr } = await this.client.from('stages').select('*');
      if (!stagesErr && stagesData && stagesData.length > 0) {
        for (const row of stagesData) {
          const cfg: StageConfig = {
            id: row.id,
            name: row.name,
            order: row.stage_order ?? row.order ?? 1,
            status: row.status,
            description: row.description,
            maxScore: row.max_score != null ? Number(row.max_score) : 10,
            isScoringProvisional: row.is_scoring_provisional,
            scoringRuleNotes: row.scoring_rule_notes,
            evaluationCriteria: row.evaluation_criteria || [],
            submissionRequirements: row.submission_requirements || []
          };
          this.stages.set(cfg.id, cfg);
        }
      } else {
        for (const s of INITIAL_STAGES) {
          this.stages.set(s.id, { ...s });
          await this.syncUpsert('stages', {
            id: s.id,
            name: s.name,
            stage_order: s.order,
            status: s.status,
            description: s.description,
            max_score: s.maxScore || 10,
            is_scoring_provisional: s.isScoringProvisional ?? true,
            scoring_rule_notes: s.scoringRuleNotes || null,
            evaluation_criteria: s.evaluationCriteria || [],
            submission_requirements: s.submissionRequirements || []
          });
        }
      }

      // 2. Quiz Questions
      const { data: qData, error: qErr } = await this.client.from('quiz_questions').select('*');
      if (!qErr && qData && qData.length > 0) {
        for (const row of qData) {
          const q: QuizQuestion = {
            id: row.id,
            prompt: row.prompt,
            options: row.options || [],
            correctOptionId: row.correct_option_id,
            isActiveForLiveQuiz: row.is_active_for_live_quiz,
            explanation: row.explanation,
            points: row.points != null ? Number(row.points) : 1,
            isDemonstration: Boolean(row.is_demonstration)
          };
          this.quizQuestions.set(q.id, q);
        }
      } else {
        for (const q of INITIAL_QUIZ_QUESTIONS) {
          this.quizQuestions.set(q.id, { ...q });
          await this.syncUpsert('quiz_questions', {
            id: q.id,
            prompt: q.prompt,
            options: q.options,
            correct_option_id: q.correctOptionId,
            is_active_for_live_quiz: q.isActiveForLiveQuiz,
            explanation: q.explanation || null,
            points: q.points || 1,
            is_demonstration: q.isDemonstration || false
          });
        }
      }

      // 3. Decode Challenges
      const { data: chData, error: chErr } = await this.client.from('decode_challenges').select('*');
      if (!chErr && chData && chData.length > 0) {
        for (const row of chData) {
          const ch: DecodeChallenge = {
            id: row.id,
            title: row.title,
            description: row.description,
            encodedPayload: row.encoded_payload,
            expectedAnswer: row.expected_answer,
            hint: row.hint,
            points: row.points != null ? Number(row.points) : 10,
            maxAttempts: row.max_attempts != null ? Number(row.max_attempts) : 3,
            hintDeduction: row.hint_deduction != null ? Number(row.hint_deduction) : 2,
            isActive: Boolean(row.is_active),
            isDemonstration: Boolean(row.is_demonstration)
          };
          this.decodeChallenges.set(ch.id, ch);
        }
      } else {
        for (const ch of INITIAL_DECODE_CHALLENGES) {
          this.decodeChallenges.set(ch.id, { ...ch });
          await this.syncUpsert('decode_challenges', {
            id: ch.id,
            title: ch.title,
            description: ch.description,
            encoded_payload: ch.encodedPayload,
            expected_answer: ch.expectedAnswer,
            hint: ch.hint,
            points: ch.points || 10,
            max_attempts: ch.maxAttempts || 3,
            hint_deduction: ch.hintDeduction || 2,
            is_active: ch.isActive,
            is_demonstration: ch.isDemonstration || false
          });
        }
      }

      // 4. Datasets
      const { data: dsData, error: dsErr } = await this.client.from('datasets').select('*');
      if (!dsErr && dsData && dsData.length > 0) {
        for (const row of dsData) {
          const ds: DatasetMetadata = {
            id: row.id,
            name: row.name,
            description: row.description,
            filename: row.filename,
            format: row.format,
            filesize: row.filesize,
            recordCount: row.record_count != null ? Number(row.record_count) : 0,
            schemaSummary: row.schema_summary,
            evaluationCriteria: row.evaluation_criteria || [],
            submissionRequirements: row.submission_requirements || [],
            isDemonstration: Boolean(row.is_demonstration)
          };
          this.datasets.set(ds.id, ds);
        }
      } else {
        for (const ds of INITIAL_DATASETS) {
          this.datasets.set(ds.id, { ...ds });
          await this.syncUpsert('datasets', {
            id: ds.id,
            name: ds.name,
            description: ds.description,
            filename: ds.filename,
            format: ds.format,
            filesize: ds.filesize,
            record_count: ds.recordCount,
            schema_summary: ds.schemaSummary,
            evaluation_criteria: ds.evaluationCriteria || [],
            submission_requirements: ds.submissionRequirements || [],
            is_demonstration: ds.isDemonstration || false
          });
        }
      }

      // 5. Problem Statements
      const { data: psData, error: psErr } = await this.client.from('problem_statements').select('*');
      if (!psErr && psData && psData.length > 0) {
        for (const row of psData) {
          const ps: ProblemStatement = {
            id: row.id,
            title: row.title,
            category: row.category,
            summary: row.summary,
            fullDescription: row.full_description,
            stage4Instructions: row.stage4_instructions,
            stage4Deliverables: row.stage4_deliverables || [],
            stage5Instructions: row.stage5_instructions,
            stage5Deliverables: row.stage5_deliverables || [],
            evaluationCriteria: row.evaluation_criteria || [],
            maxTeamAllocation: row.max_team_allocation != null ? Number(row.max_team_allocation) : 5,
            isDemonstration: Boolean(row.is_demonstration)
          };
          this.problemStatements.set(ps.id, ps);
        }
      } else {
        for (const ps of INITIAL_PROBLEM_STATEMENTS) {
          this.problemStatements.set(ps.id, { ...ps });
          await this.syncUpsert('problem_statements', {
            id: ps.id,
            title: ps.title,
            category: ps.category,
            summary: ps.summary,
            full_description: ps.fullDescription,
            stage4_instructions: ps.stage4Instructions,
            stage4_deliverables: ps.stage4Deliverables,
            stage5_instructions: ps.stage5Instructions,
            stage5_deliverables: ps.stage5Deliverables,
            evaluation_criteria: ps.evaluationCriteria || [],
            max_team_allocation: ps.maxTeamAllocation || 5,
            is_demonstration: ps.isDemonstration || false
          });
        }
      }

      // 6. System Settings
      const { data: setRow } = await this.client.from('system_settings').select('*').eq('id', 'singleton').maybeSingle();
      if (setRow) {
        this.systemSettings = {
          isCompetitionFrozen: Boolean(setRow.is_competition_frozen),
          freezeReason: setRow.freeze_reason || undefined,
          frozenAt: setRow.frozen_at || undefined,
          frozenByEmail: setRow.frozen_by_email || undefined
        };
      }

      // 7. Teams
      const { data: teamRows } = await this.client.from('teams').select('*');
      if (teamRows) {
        for (const r of teamRows) {
          const tm: Team = {
            id: r.id,
            teamName: r.team_name,
            email: r.email,
            passwordHash: r.password_hash,
            members: r.members || [],
            role: r.role,
            adminRole: r.admin_role || undefined,
            permissions: r.permissions || [],
            isPrimaryAdmin: Boolean(r.is_primary_admin),
            createdAt: r.created_at
          };
          this.teams.set(tm.id, tm);
        }
      }

      // 8. Quiz Submissions
      const { data: qSubs } = await this.client.from('quiz_submissions').select('*');
      if (qSubs) {
        for (const r of qSubs) {
          const sub: QuizSubmission = {
            teamId: r.team_id,
            teamName: r.team_name,
            answers: r.answers || {},
            totalQuestions: r.total_questions,
            correctCount: r.correct_count,
            score: Number(r.score),
            scoreOverride: r.score_override != null ? Number(r.score_override) : undefined,
            evaluationNote: r.evaluation_note || undefined,
            overrideNote: r.override_note || undefined,
            submittedAt: r.submitted_at
          };
          this.quizSubmissions.set(sub.teamId, sub);
        }
      }

      // 9. Stage 2 Progress
      const { data: s2Rows } = await this.client.from('stage2_progress').select('*');
      if (s2Rows) {
        for (const r of s2Rows) {
          const p: TeamStage2Progress = {
            teamId: r.team_id,
            teamName: r.team_name,
            challengeStates: r.challenge_states || {},
            hintsUsedCount: r.hints_used_count || 0,
            deductionMarks: Number(r.deduction_marks || 0),
            provisionalScore: Number(r.provisional_score || 0),
            scoreOverride: r.score_override != null ? Number(r.score_override) : undefined,
            overrideNote: r.override_note || undefined,
            completedAt: r.completed_at || undefined,
            lastActivityAt: r.last_activity_at || new Date().toISOString()
          };
          this.stage2Progress.set(p.teamId, p);
        }
      }

      // 10. Dataset Selections
      const { data: dsSels } = await this.client.from('dataset_selections').select('*');
      if (dsSels) {
        for (const r of dsSels) {
          this.datasetSelections.set(r.team_id, {
            teamId: r.team_id,
            teamName: r.team_name,
            datasetId: r.dataset_id,
            datasetName: r.dataset_name || '',
            selectedAt: r.selected_at
          });
        }
      }

      // 11. Problem Selections
      const { data: psSels } = await this.client.from('problem_selections').select('*');
      if (psSels) {
        for (const r of psSels) {
          this.problemSelections.set(r.team_id, {
            teamId: r.team_id,
            teamName: r.team_name,
            problemId: r.problem_id,
            problemTitle: r.problem_title || '',
            selectedAt: r.selected_at
          });
        }
      }

      // 12. Audit Logs
      const { data: aLogs } = await this.client.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200);
      if (aLogs) {
        this.auditLogs = aLogs.map(r => ({
          id: r.id,
          timestamp: r.timestamp,
          actorId: r.actor_id,
          actorEmail: r.actor_email,
          actorRole: r.actor_role,
          action: r.action,
          targetType: r.target_type,
          targetId: r.target_id || undefined,
          details: r.details || undefined
        }));
      }

      this.isInitialized = true;
      console.log(`[SUPABASE] Successfully connected and loaded (${this.teams.size} teams, ${this.stages.size} stages).`);
    } catch (err: any) {
      console.error('[SUPABASE] Initialization encountered an issue:', err.message || err);
      this.isInitialized = true;
    }
  }

  private async syncUpsert(table: string, payload: any): Promise<void> {
    try {
      const { error } = await this.client.from(table).upsert(payload);
      if (error) {
        console.warn(`[SUPABASE SYNC WARNING] Failed to upsert into ${table}:`, error.message);
      }
    } catch (err: any) {
      console.warn(`[SUPABASE SYNC EXCEPTION] Failed to upsert into ${table}:`, err.message || err);
    }
  }

  private async syncDelete(table: string, idCol: string, idVal: string): Promise<void> {
    try {
      const { error } = await this.client.from(table).delete().eq(idCol, idVal);
      if (error) {
        console.warn(`[SUPABASE SYNC WARNING] Failed to delete from ${table}:`, error.message);
      }
    } catch (err: any) {
      console.warn(`[SUPABASE SYNC EXCEPTION] Failed to delete from ${table}:`, err.message || err);
    }
  }

  // TEAMS & PARTICIPANTS
  async createTeam(data: Omit<Team, 'id' | 'createdAt'>): Promise<Team> {
    await this.ensureInitialized();
    const team: Team = {
      ...data,
      id: `team-${crypto.randomBytes(4).toString('hex')}`,
      createdAt: new Date().toISOString()
    };
    this.teams.set(team.id, team);
    await this.syncUpsert('teams', {
      id: team.id,
      team_name: team.teamName,
      email: team.email.toLowerCase(),
      password_hash: team.passwordHash,
      members: team.members,
      role: team.role,
      admin_role: team.adminRole || null,
      permissions: team.permissions || [],
      is_primary_admin: Boolean(team.isPrimaryAdmin),
      created_at: team.createdAt
    });
    return { ...team };
  }

  async findTeamByEmail(email: string): Promise<Team | null> {
    await this.ensureInitialized();
    const normalized = email.toLowerCase().trim();
    for (const t of this.teams.values()) {
      if (t.email.toLowerCase() === normalized) {
        return { ...t };
      }
    }
    return null;
  }

  async findTeamByName(name: string): Promise<Team | null> {
    await this.ensureInitialized();
    const normalized = name.toLowerCase().trim();
    for (const t of this.teams.values()) {
      if (t.teamName.toLowerCase() === normalized) {
        return { ...t };
      }
    }
    return null;
  }

  async findTeamById(id: string): Promise<Team | null> {
    await this.ensureInitialized();
    const t = this.teams.get(id);
    return t ? { ...t } : null;
  }

  async getAllTeams(): Promise<Team[]> {
    await this.ensureInitialized();
    return Array.from(this.teams.values()).map(t => ({ ...t }));
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | null> {
    await this.ensureInitialized();
    const existing = this.teams.get(id);
    if (!existing) return null;
    const updated: Team = { ...existing, ...updates };
    this.teams.set(id, updated);
    await this.syncUpsert('teams', {
      id: updated.id,
      team_name: updated.teamName,
      email: updated.email.toLowerCase(),
      password_hash: updated.passwordHash,
      members: updated.members,
      role: updated.role,
      admin_role: updated.adminRole || null,
      permissions: updated.permissions || [],
      is_primary_admin: Boolean(updated.isPrimaryAdmin),
      created_at: updated.createdAt
    });
    return { ...updated };
  }

  async deleteTeam(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.teams.has(id)) return false;
    this.teams.delete(id);
    this.quizSubmissions.delete(id);
    this.stage2Progress.delete(id);
    this.datasetSelections.delete(id);
    this.problemSelections.delete(id);
    await this.syncDelete('teams', 'id', id);
    await this.syncDelete('quiz_submissions', 'team_id', id);
    await this.syncDelete('stage2_progress', 'team_id', id);
    await this.syncDelete('dataset_selections', 'team_id', id);
    await this.syncDelete('problem_selections', 'team_id', id);
    return true;
  }

  // ADMINS & PERMISSIONS
  async getAdmins(): Promise<Team[]> {
    await this.ensureInitialized();
    return Array.from(this.teams.values())
      .filter(t => t.role === 'admin')
      .map(t => ({ ...t }));
  }

  async createAdmin(admin: Omit<Team, 'id' | 'createdAt' | 'role'> & { permissions?: AdminPermission[]; adminRole?: AdminRole }): Promise<Team> {
    return this.createTeam({
      ...admin,
      role: 'admin',
      adminRole: admin.adminRole || 'event_admin',
      permissions: admin.permissions || []
    });
  }

  async updateAdminPermissions(id: string, permissions: AdminPermission[]): Promise<Team | null> {
    return this.updateTeam(id, { permissions });
  }

  async deleteAdmin(id: string): Promise<boolean> {
    return this.deleteTeam(id);
  }

  // STAGES CONFIGURATION
  async getAllStages(): Promise<StageConfig[]> {
    await this.ensureInitialized();
    return Array.from(this.stages.values())
      .sort((a, b) => a.order - b.order)
      .map(s => ({ ...s }));
  }

  async getStage(stageId: StageId): Promise<StageConfig | null> {
    await this.ensureInitialized();
    const s = this.stages.get(stageId);
    return s ? { ...s } : null;
  }

  async updateStageStatus(stageId: StageId, status: StageStatus): Promise<StageConfig> {
    await this.ensureInitialized();
    const stage = this.stages.get(stageId);
    if (!stage) throw new Error(`Stage ${stageId} not found.`);
    stage.status = status;
    this.stages.set(stageId, stage);
    await this.syncUpsert('stages', {
      id: stage.id,
      name: stage.name,
      stage_order: stage.order,
      status: stage.status,
      description: stage.description,
      max_score: stage.maxScore,
      is_scoring_provisional: stage.isScoringProvisional,
      scoring_rule_notes: stage.scoringRuleNotes,
      evaluation_criteria: stage.evaluationCriteria,
      submission_requirements: stage.submissionRequirements
    });
    return { ...stage };
  }

  async updateStageConfig(stageId: StageId, updates: Partial<StageConfig>): Promise<StageConfig> {
    await this.ensureInitialized();
    const stage = this.stages.get(stageId);
    if (!stage) throw new Error(`Stage ${stageId} not found.`);
    const updated: StageConfig = { ...stage, ...updates, id: stageId };
    this.stages.set(stageId, updated);
    await this.syncUpsert('stages', {
      id: updated.id,
      name: updated.name,
      stage_order: updated.order,
      status: updated.status,
      description: updated.description,
      max_score: updated.maxScore,
      is_scoring_provisional: updated.isScoringProvisional,
      scoring_rule_notes: updated.scoringRuleNotes,
      evaluation_criteria: updated.evaluationCriteria,
      submission_requirements: updated.submissionRequirements
    });
    return { ...updated };
  }

  // STAGE 1: QUIZ
  async getQuizQuestions(isAdmin: boolean): Promise<QuizQuestion[] | QuizQuestionParticipant[]> {
    await this.ensureInitialized();
    const all = Array.from(this.quizQuestions.values());
    if (isAdmin) return all.map(q => ({ ...q }));
    return all.map(q => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
      isActiveForLiveQuiz: q.isActiveForLiveQuiz,
      isDemonstration: q.isDemonstration
    }));
  }

  async getQuizQuestionById(id: string): Promise<QuizQuestion | null> {
    await this.ensureInitialized();
    const q = this.quizQuestions.get(id);
    return q ? { ...q } : null;
  }

  async createQuizQuestion(question: Omit<QuizQuestion, 'id'>): Promise<QuizQuestion> {
    await this.ensureInitialized();
    const q: QuizQuestion = {
      ...question,
      id: `q-${crypto.randomBytes(3).toString('hex')}`
    };
    this.quizQuestions.set(q.id, q);
    await this.syncUpsert('quiz_questions', {
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      correct_option_id: q.correctOptionId,
      is_active_for_live_quiz: q.isActiveForLiveQuiz,
      explanation: q.explanation || null,
      points: q.points || 1,
      is_demonstration: q.isDemonstration || false
    });
    return { ...q };
  }

  async updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion | null> {
    await this.ensureInitialized();
    const existing = this.quizQuestions.get(id);
    if (!existing) return null;
    const updated: QuizQuestion = { ...existing, ...updates, id };
    this.quizQuestions.set(id, updated);
    await this.syncUpsert('quiz_questions', {
      id: updated.id,
      prompt: updated.prompt,
      options: updated.options,
      correct_option_id: updated.correctOptionId,
      is_active_for_live_quiz: updated.isActiveForLiveQuiz,
      explanation: updated.explanation || null,
      points: updated.points || 1,
      is_demonstration: updated.isDemonstration || false
    });
    return { ...updated };
  }

  async deleteQuizQuestion(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.quizQuestions.has(id)) return false;
    this.quizQuestions.delete(id);
    await this.syncDelete('quiz_questions', 'id', id);
    return true;
  }

  async submitQuiz(teamId: string, teamName: string, answers: Record<string, string>): Promise<QuizSubmission> {
    await this.ensureInitialized();
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
    await this.syncUpsert('quiz_submissions', {
      team_id: submission.teamId,
      team_name: submission.teamName,
      answers: submission.answers,
      total_questions: submission.totalQuestions,
      correct_count: submission.correctCount,
      score: submission.score,
      score_override: null,
      evaluation_note: null,
      override_note: null,
      submitted_at: submission.submittedAt
    });
    return { ...submission };
  }

  async getQuizSubmissionByTeam(teamId: string): Promise<QuizSubmission | null> {
    await this.ensureInitialized();
    const s = this.quizSubmissions.get(teamId);
    return s ? { ...s } : null;
  }

  async getAllQuizSubmissions(): Promise<QuizSubmission[]> {
    await this.ensureInitialized();
    return Array.from(this.quizSubmissions.values()).map(s => ({ ...s }));
  }

  async resetQuizSubmission(teamId: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.quizSubmissions.has(teamId)) return false;
    this.quizSubmissions.delete(teamId);
    await this.syncDelete('quiz_submissions', 'team_id', teamId);
    return true;
  }

  async updateQuizSubmissionScore(teamId: string, newScore: number, note?: string): Promise<QuizSubmission | null> {
    await this.ensureInitialized();
    const sub = this.quizSubmissions.get(teamId);
    if (!sub) return null;
    sub.scoreOverride = newScore;
    sub.score = newScore;
    if (note) sub.overrideNote = note;
    this.quizSubmissions.set(teamId, sub);
    await this.syncUpsert('quiz_submissions', {
      team_id: sub.teamId,
      team_name: sub.teamName,
      answers: sub.answers,
      total_questions: sub.totalQuestions,
      correct_count: sub.correctCount,
      score: sub.score,
      score_override: sub.scoreOverride,
      override_note: sub.overrideNote || null,
      submitted_at: sub.submittedAt
    });
    return { ...sub };
  }

  async logTabFocusEvent(log: Omit<TabFocusLog, 'id' | 'timestamp'>): Promise<TabFocusLog> {
    const entry: TabFocusLog = {
      ...log,
      id: `tf-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString()
    };
    this.tabFocusLogs.push(entry);
    await this.syncUpsert('tab_focus_logs', {
      id: entry.id,
      team_id: entry.teamId,
      team_name: entry.teamName,
      event_type: entry.eventType,
      timestamp: entry.timestamp,
      details: entry.details || null
    });
    return { ...entry };
  }

  async getTabFocusLogs(teamId?: string): Promise<TabFocusLog[]> {
    await this.ensureInitialized();
    if (teamId) {
      return this.tabFocusLogs.filter(l => l.teamId === teamId);
    }
    return [...this.tabFocusLogs];
  }

  // STAGE 2: DECODE & ENCODE
  async getDecodeChallenges(isAdmin: boolean, teamId?: string): Promise<DecodeChallenge[] | DecodeChallengeParticipant[]> {
    await this.ensureInitialized();
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
        const isLockedOut = attemptsUsed >= maxAtt && !isSolved;

        return {
          id: ch.id,
          title: ch.title,
          description: ch.description,
          encodedPayload: ch.encodedPayload,
          hasHint: Boolean(ch.hint),
          hintRevealed: state?.hintUsed ? ch.hint : undefined,
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
    await this.ensureInitialized();
    const c = this.decodeChallenges.get(id);
    return c ? { ...c } : null;
  }

  async createDecodeChallenge(ch: Omit<DecodeChallenge, 'id'>): Promise<DecodeChallenge> {
    await this.ensureInitialized();
    const id = `c-${crypto.randomBytes(3).toString('hex')}`;
    const newCh: DecodeChallenge = { id, ...ch };
    this.decodeChallenges.set(id, newCh);
    await this.syncUpsert('decode_challenges', {
      id: newCh.id,
      title: newCh.title,
      description: newCh.description,
      encoded_payload: newCh.encodedPayload,
      expected_answer: newCh.expectedAnswer,
      hint: newCh.hint,
      points: newCh.points || 10,
      max_attempts: newCh.maxAttempts || 3,
      hint_deduction: newCh.hintDeduction || 2,
      is_active: newCh.isActive,
      is_demonstration: newCh.isDemonstration || false
    });
    return { ...newCh };
  }

  async updateDecodeChallenge(id: string, updates: Partial<DecodeChallenge>): Promise<DecodeChallenge | null> {
    await this.ensureInitialized();
    const existing = this.decodeChallenges.get(id);
    if (!existing) return null;
    const updated: DecodeChallenge = { ...existing, ...updates, id };
    this.decodeChallenges.set(id, updated);
    await this.syncUpsert('decode_challenges', {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      encoded_payload: updated.encodedPayload,
      expected_answer: updated.expectedAnswer,
      hint: updated.hint,
      points: updated.points || 10,
      max_attempts: updated.maxAttempts || 3,
      hint_deduction: updated.hintDeduction || 2,
      is_active: updated.isActive,
      is_demonstration: updated.isDemonstration || false
    });
    return { ...updated };
  }

  async deleteDecodeChallenge(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.decodeChallenges.has(id)) return false;
    this.decodeChallenges.delete(id);
    await this.syncDelete('decode_challenges', 'id', id);
    return true;
  }

  async unlockHint(teamId: string, teamName: string, challengeId: string): Promise<{ hint: string; hintsUsedCount: number; deductionMarks: number }> {
    await this.ensureInitialized();
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
      const deductionPerHint = challenge.hintDeduction ?? 2;
      progress.deductionMarks = progress.hintsUsedCount * deductionPerHint;
      progress.provisionalScore = Math.max(0, 10 - progress.deductionMarks);
      progress.lastActivityAt = new Date().toISOString();

      this.stage2Progress.set(teamId, progress);
      await this.syncUpsert('stage2_progress', {
        team_id: progress.teamId,
        team_name: progress.teamName,
        challenge_states: progress.challengeStates,
        hints_used_count: progress.hintsUsedCount,
        deduction_marks: progress.deductionMarks,
        provisional_score: progress.provisionalScore,
        score_override: progress.scoreOverride || null,
        override_note: progress.overrideNote || null,
        completed_at: progress.completedAt || null,
        last_activity_at: progress.lastActivityAt
      });
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
    await this.ensureInitialized();
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

    await this.syncUpsert('stage2_progress', {
      team_id: progress.teamId,
      team_name: progress.teamName,
      challenge_states: progress.challengeStates,
      hints_used_count: progress.hintsUsedCount,
      deduction_marks: progress.deductionMarks,
      provisional_score: progress.provisionalScore,
      score_override: progress.scoreOverride || null,
      override_note: progress.overrideNote || null,
      completed_at: progress.completedAt || null,
      last_activity_at: progress.lastActivityAt
    });

    const attemptsRemaining = Math.max(0, maxAtt - state.attempts.length);
    const isLockedOut = attemptsRemaining === 0 && !isCorrect;

    return {
      isCorrect,
      attemptsRemaining,
      isLockedOut,
      message: isCorrect
        ? 'Decryption verified. Flag accepted.'
        : isLockedOut
        ? 'Maximum attempts reached. Challenge locked out.'
        : `Decryption mismatch. ${attemptsRemaining} attempt(s) remaining.`
    };
  }

  async getTeamStage2Progress(teamId: string): Promise<TeamStage2Progress | null> {
    await this.ensureInitialized();
    const p = this.stage2Progress.get(teamId);
    return p ? { ...p } : null;
  }

  async getAllStage2Progress(): Promise<TeamStage2Progress[]> {
    await this.ensureInitialized();
    return Array.from(this.stage2Progress.values()).map(p => ({ ...p }));
  }

  async resetStage2Progress(teamId: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.stage2Progress.has(teamId)) return false;
    this.stage2Progress.delete(teamId);
    await this.syncDelete('stage2_progress', 'team_id', teamId);
    return true;
  }

  async updateStage2Score(teamId: string, newScore: number, note?: string): Promise<TeamStage2Progress | null> {
    await this.ensureInitialized();
    const prog = this.stage2Progress.get(teamId);
    if (!prog) return null;
    prog.scoreOverride = newScore;
    prog.provisionalScore = newScore;
    if (note) prog.overrideNote = note;
    this.stage2Progress.set(teamId, prog);
    await this.syncUpsert('stage2_progress', {
      team_id: prog.teamId,
      team_name: prog.teamName,
      challenge_states: prog.challengeStates,
      hints_used_count: prog.hintsUsedCount,
      deduction_marks: prog.deductionMarks,
      provisional_score: prog.provisionalScore,
      score_override: prog.scoreOverride,
      override_note: prog.overrideNote || null,
      completed_at: prog.completedAt || null,
      last_activity_at: prog.lastActivityAt
    });
    return { ...prog };
  }

  async completeStage2(teamId: string, teamName: string): Promise<TeamStage2Progress> {
    await this.ensureInitialized();
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
    await this.syncUpsert('stage2_progress', {
      team_id: progress.teamId,
      team_name: progress.teamName,
      challenge_states: progress.challengeStates,
      hints_used_count: progress.hintsUsedCount,
      deduction_marks: progress.deductionMarks,
      provisional_score: progress.provisionalScore,
      completed_at: progress.completedAt,
      last_activity_at: progress.lastActivityAt
    });
    return { ...progress };
  }

  // STAGE 3: DATASETS
  async getDatasets(): Promise<DatasetMetadata[]> {
    await this.ensureInitialized();
    return Array.from(this.datasets.values()).map(d => ({ ...d }));
  }

  async getDatasetById(id: string): Promise<DatasetMetadata | null> {
    await this.ensureInitialized();
    const ds = this.datasets.get(id);
    return ds ? { ...ds } : null;
  }

  async createDataset(data: Omit<DatasetMetadata, 'id'>): Promise<DatasetMetadata> {
    await this.ensureInitialized();
    const id = `ds-${crypto.randomBytes(3).toString('hex')}`;
    const newDs: DatasetMetadata = { id, ...data };
    this.datasets.set(id, newDs);
    await this.syncUpsert('datasets', {
      id: newDs.id,
      name: newDs.name,
      description: newDs.description,
      filename: newDs.filename,
      format: newDs.format,
      filesize: newDs.filesize,
      record_count: newDs.recordCount,
      schema_summary: newDs.schemaSummary,
      evaluation_criteria: newDs.evaluationCriteria || [],
      submission_requirements: newDs.submissionRequirements || [],
      is_demonstration: newDs.isDemonstration || false
    });
    return { ...newDs };
  }

  async updateDataset(id: string, updates: Partial<DatasetMetadata>): Promise<DatasetMetadata | null> {
    await this.ensureInitialized();
    const existing = this.datasets.get(id);
    if (!existing) return null;
    const updated: DatasetMetadata = { ...existing, ...updates, id };
    this.datasets.set(id, updated);
    await this.syncUpsert('datasets', {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      filename: updated.filename,
      format: updated.format,
      filesize: updated.filesize,
      record_count: updated.recordCount,
      schema_summary: updated.schemaSummary,
      evaluation_criteria: updated.evaluationCriteria || [],
      submission_requirements: updated.submissionRequirements || [],
      is_demonstration: updated.isDemonstration || false
    });
    return { ...updated };
  }

  async deleteDataset(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.datasets.has(id)) return false;
    this.datasets.delete(id);
    await this.syncDelete('datasets', 'id', id);
    return true;
  }

  async selectDataset(teamId: string, teamName: string, datasetId: string): Promise<TeamDatasetSelection> {
    await this.ensureInitialized();
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
    await this.syncUpsert('dataset_selections', {
      team_id: selection.teamId,
      team_name: selection.teamName,
      dataset_id: selection.datasetId,
      dataset_name: selection.datasetName,
      selected_at: selection.selectedAt
    });
    return { ...selection };
  }

  async getTeamDatasetSelection(teamId: string): Promise<TeamDatasetSelection | null> {
    await this.ensureInitialized();
    const s = this.datasetSelections.get(teamId);
    return s ? { ...s } : null;
  }

  async getAllDatasetSelections(): Promise<TeamDatasetSelection[]> {
    await this.ensureInitialized();
    return Array.from(this.datasetSelections.values()).map(s => ({ ...s }));
  }

  async resetTeamDatasetSelection(teamId: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.datasetSelections.has(teamId)) return false;
    this.datasetSelections.delete(teamId);
    await this.syncDelete('dataset_selections', 'team_id', teamId);
    return true;
  }

  // STAGE 4 & 5: PROBLEMS
  async getProblemStatements(): Promise<ProblemStatement[]> {
    await this.ensureInitialized();
    return Array.from(this.problemStatements.values()).map(p => ({ ...p }));
  }

  async getProblemStatementById(id: string): Promise<ProblemStatement | null> {
    await this.ensureInitialized();
    const ps = this.problemStatements.get(id);
    return ps ? { ...ps } : null;
  }

  async createProblemStatement(data: Omit<ProblemStatement, 'id'>): Promise<ProblemStatement> {
    await this.ensureInitialized();
    const id = `ps-${crypto.randomBytes(3).toString('hex')}`;
    const newPs: ProblemStatement = { id, ...data };
    this.problemStatements.set(id, newPs);
    await this.syncUpsert('problem_statements', {
      id: newPs.id,
      title: newPs.title,
      category: newPs.category,
      summary: newPs.summary,
      full_description: newPs.fullDescription,
      stage4_instructions: newPs.stage4Instructions,
      stage4_deliverables: newPs.stage4Deliverables,
      stage5_instructions: newPs.stage5Instructions,
      stage5_deliverables: newPs.stage5Deliverables,
      evaluation_criteria: newPs.evaluationCriteria || [],
      max_team_allocation: newPs.maxTeamAllocation || 5,
      is_demonstration: newPs.isDemonstration || false
    });
    return { ...newPs };
  }

  async updateProblemStatement(id: string, updates: Partial<ProblemStatement>): Promise<ProblemStatement | null> {
    await this.ensureInitialized();
    const existing = this.problemStatements.get(id);
    if (!existing) return null;
    const updated: ProblemStatement = { ...existing, ...updates, id };
    this.problemStatements.set(id, updated);
    await this.syncUpsert('problem_statements', {
      id: updated.id,
      title: updated.title,
      category: updated.category,
      summary: updated.summary,
      full_description: updated.fullDescription,
      stage4_instructions: updated.stage4Instructions,
      stage4_deliverables: updated.stage4Deliverables,
      stage5_instructions: updated.stage5Instructions,
      stage5_deliverables: updated.stage5Deliverables,
      evaluation_criteria: updated.evaluationCriteria || [],
      max_team_allocation: updated.maxTeamAllocation || 5,
      is_demonstration: updated.isDemonstration || false
    });
    return { ...updated };
  }

  async deleteProblemStatement(id: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.problemStatements.has(id)) return false;
    this.problemStatements.delete(id);
    await this.syncDelete('problem_statements', 'id', id);
    return true;
  }

  async selectProblemStatement(teamId: string, teamName: string, problemId: string): Promise<TeamProblemSelection> {
    await this.ensureInitialized();
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
    await this.syncUpsert('problem_selections', {
      team_id: selection.teamId,
      team_name: selection.teamName,
      problem_id: selection.problemId,
      problem_title: selection.problemTitle,
      selected_at: selection.selectedAt
    });
    return { ...selection };
  }

  async getTeamProblemSelection(teamId: string): Promise<TeamProblemSelection | null> {
    await this.ensureInitialized();
    const s = this.problemSelections.get(teamId);
    return s ? { ...s } : null;
  }

  async getAllProblemSelections(): Promise<TeamProblemSelection[]> {
    await this.ensureInitialized();
    return Array.from(this.problemSelections.values()).map(s => ({ ...s }));
  }

  async resetTeamProblemSelection(teamId: string): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.problemSelections.has(teamId)) return false;
    this.problemSelections.delete(teamId);
    await this.syncDelete('problem_selections', 'team_id', teamId);
    return true;
  }

  // AUDIT LOGS
  async addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const entry: AuditLog = {
      ...log,
      id: `audit-${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(entry);
    await this.syncUpsert('audit_logs', {
      id: entry.id,
      timestamp: entry.timestamp,
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      actor_role: entry.actorRole,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId || null,
      details: entry.details || null
    });
    return { ...entry };
  }

  async getAuditLogs(limit?: number): Promise<AuditLog[]> {
    await this.ensureInitialized();
    if (limit && limit > 0) {
      return this.auditLogs.slice(0, limit).map(l => ({ ...l }));
    }
    return this.auditLogs.map(l => ({ ...l }));
  }

  // TEAM PROGRESS MATRIX
  async getTeamProgressSummaries(): Promise<TeamProgressSummary[]> {
    await this.ensureInitialized();
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
          datasetName: s3 ? this.datasets.get(s3.datasetId)?.name || null : null,
          selectedAt: s3 ? s3.selectedAt : null
        },
        stage4: {
          selected: Boolean(s4),
          problemId: s4 ? s4.problemId : null,
          problemTitle: s4 ? this.problemStatements.get(s4.problemId)?.title || null : null,
          selectedAt: s4 ? s4.selectedAt : null
        },
        stage5: {
          problemId: s4 ? s4.problemId : null,
          continuityVerified: Boolean(s4)
        }
      };
    });
  }

  // SYSTEM SETTINGS & GLOBAL COMPETITION FREEZE
  async getSystemSettings(): Promise<SystemSettings> {
    await this.ensureInitialized();
    return { ...this.systemSettings };
  }

  async setCompetitionFreeze(isFrozen: boolean, reason?: string, frozenByEmail?: string): Promise<SystemSettings> {
    await this.ensureInitialized();
    this.systemSettings = {
      isCompetitionFrozen: isFrozen,
      freezeReason: isFrozen ? (reason || 'Competition paused by Primary Incident Command.') : undefined,
      frozenAt: isFrozen ? new Date().toISOString() : undefined,
      frozenByEmail: isFrozen ? frozenByEmail : undefined
    };
    await this.syncUpsert('system_settings', {
      id: 'singleton',
      is_competition_frozen: this.systemSettings.isCompetitionFrozen,
      freeze_reason: this.systemSettings.freezeReason || null,
      frozen_at: this.systemSettings.frozenAt || null,
      frozen_by_email: this.systemSettings.frozenByEmail || null
    });
    return { ...this.systemSettings };
  }
}
