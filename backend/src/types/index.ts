export type StageId = 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5';

export type StageStatus = 'LOCKED' | 'OPEN' | 'CLOSED';

export type AdminRole = 'primary_admin' | 'event_admin';

export type AdminPermission =
  | 'manage_admins'
  | 'manage_stages'
  | 'manage_stage1'
  | 'manage_stage2'
  | 'manage_stage3'
  | 'manage_stage4'
  | 'manage_stage5'
  | 'manage_teams'
  | 'manage_submissions'
  | 'view_audit_logs';

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  'manage_admins',
  'manage_stages',
  'manage_stage1',
  'manage_stage2',
  'manage_stage3',
  'manage_stage4',
  'manage_stage5',
  'manage_teams',
  'manage_submissions',
  'view_audit_logs'
];

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
}

export interface StageConfig {
  id: StageId;
  name: string;
  order: number;
  status: StageStatus;
  description: string;
  maxScore?: number;
  isScoringProvisional?: boolean;
  scoringRuleNotes?: string;
  evaluationCriteria?: string[];
  submissionRequirements?: string[];
}

export interface Team {
  id: string;
  teamName: string;
  email: string;
  passwordHash: string;
  members: string[];
  role: 'participant' | 'admin';
  adminRole?: AdminRole;
  permissions?: AdminPermission[];
  isPrimaryAdmin?: boolean;
  createdAt: string;
}

export interface TeamPublicProfile {
  id: string;
  teamName: string;
  email: string;
  members: string[];
  role: 'participant' | 'admin';
  adminRole?: AdminRole;
  permissions?: AdminPermission[];
  isPrimaryAdmin?: boolean;
  createdAt: string;
}

export interface AuthTokenPayload {
  teamId: string;
  teamName: string;
  email: string;
  role: 'participant' | 'admin';
  adminRole?: AdminRole;
  permissions?: AdminPermission[];
  isPrimaryAdmin?: boolean;
}

// Stage 1: Quiz Models
export interface QuizOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string; // Private, NEVER sent to participants!
  isActiveForLiveQuiz: boolean;
  explanation?: string;
  points?: number;
  isDemonstration: boolean;
}

export interface QuizQuestionParticipant {
  id: string;
  prompt: string;
  options: QuizOption[];
  points?: number;
  isActiveForLiveQuiz: boolean;
  isDemonstration: boolean;
}

export interface QuizSubmission {
  teamId: string;
  teamName: string;
  answers: Record<string, string>; // questionId -> optionId
  totalQuestions: number;
  correctCount: number;
  score: number; // max 10 provisional
  scoreOverride?: number;
  evaluationNote?: string;
  overrideNote?: string;
  submittedAt: string;
}

export interface TabFocusLog {
  id: string;
  teamId: string;
  teamName: string;
  eventType: 'tab_blur' | 'tab_focus' | 'copy_attempt' | 'context_menu';
  timestamp: string;
  details?: string;
}

// Stage 2: Decode & Encode Models
export interface DecodeChallenge {
  id: string;
  title: string;
  description: string;
  encodedPayload: string;
  expectedAnswer: string; // Private to admin
  hint: string;
  maxAttempts?: number;
  hintDeduction?: number;
  points?: number;
  isActive: boolean;
  isDemonstration: boolean;
}

export interface DecodeChallengeParticipant {
  id: string;
  title: string;
  description: string;
  encodedPayload: string;
  hasHint: boolean;
  hintRevealed?: string; // Only if unlocked by team
  isActive: boolean;
  isSolved: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  isLockedOut: boolean;
  isDemonstration: boolean;
}

export interface ChallengeAttempt {
  answer: string;
  isCorrect: boolean;
  timestamp: string;
}

export interface TeamChallengeState {
  challengeId: string;
  attempts: ChallengeAttempt[];
  hintUsed: boolean;
  hintUsedAt?: string;
  isSolved: boolean;
  solvedAt?: string;
}

export interface TeamStage2Progress {
  teamId: string;
  teamName: string;
  challengeStates: Record<string, TeamChallengeState>; // challengeId -> state
  hintsUsedCount: number;
  deductionMarks: number; // 2 per hint used
  provisionalScore: number; // calculated max 10 minus deductions, clamp at 0
  scoreOverride?: number;
  evaluationNote?: string;
  overrideNote?: string;
  lastActivityAt: string;
}

// Stage 3: Dataset EDA Models
export interface DatasetMetadata {
  id: string;
  name: string;
  description: string;
  filename: string; // actual file on disk
  format: 'CSV' | 'JSON';
  filesize: string;
  recordCount: number;
  schemaSummary: string;
  evaluationCriteria?: string[];
  submissionRequirements?: string[];
  isDemonstration: boolean;
}

export interface TeamDatasetSelection {
  teamId: string;
  teamName: string;
  datasetId: string;
  datasetName: string;
  selectedAt: string;
}

// Stage 4 & 5: Static Prototype & Dynamic Website Models
export interface ProblemStatement {
  id: string;
  title: string;
  category: string;
  summary: string;
  fullDescription: string;
  stage4Instructions: string;
  stage4Deliverables: string[];
  stage5Instructions: string;
  stage5Deliverables: string[];
  evaluationCriteria?: string[];
  maxTeamAllocation?: number;
  isDemonstration: boolean;
}

export interface TeamProblemSelection {
  teamId: string;
  teamName: string;
  problemId: string;
  problemTitle: string;
  selectedAt: string;
}

// Global Team Progress Matrix (Admin overview)
export interface TeamProgressSummary {
  teamId: string;
  teamName: string;
  email: string;
  members: string[];
  stage1: {
    completed: boolean;
    score: number | null;
    submittedAt: string | null;
    eventCount: number;
  };
  stage2: {
    completed: boolean;
    solvedCount: number;
    totalChallenges: number;
    hintsUsed: number;
    deduction: number;
    score: number;
  };
  stage3: {
    selected: boolean;
    datasetId: string | null;
    datasetName: string | null;
    selectedAt: string | null;
  };
  stage4: {
    selected: boolean;
    problemId: string | null;
    problemTitle: string | null;
    selectedAt: string | null;
  };
  stage5: {
    problemId: string | null;
    continuityVerified: boolean;
  };
}
