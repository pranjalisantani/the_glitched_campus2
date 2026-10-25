import { STAGES_METADATA, StageMeta, StageStatus } from './stages';

export interface BackendStageConfig {
  id: string;
  name: string;
  order: number;
  status: 'LOCKED' | 'OPEN' | 'CLOSED';
  description: string;
  maxScore?: number;
  scoringRuleNotes?: string;
}

export interface BackendTeamProgress {
  stage1?: {
    hasSubmitted: boolean;
    submittedAt: string | null;
  };
  stage2?: {
    hintsUsed: number;
    challenges: Record<string, { isSolved?: boolean; attemptsUsed?: number }>;
  };
  stage3?: {
    hasSelected: boolean;
    selection: { datasetName: string; selectedAt: string } | null;
  };
  stage4?: {
    hasSelected: boolean;
    selection: { problemTitle: string; selectedAt: string } | null;
  };
  stage5?: {
    hasSelectedProblem: boolean;
    selectedProblemTitle: string | null;
  };
}

export interface ResolvedStage {
  meta: StageMeta;
  status: StageStatus;
  serverStatus: 'LOCKED' | 'OPEN' | 'CLOSED' | 'UNKNOWN';
  progressDetail: string | null;
  actionLabel: string;
  actionHref: string;
  isActionable: boolean;
  maxScore?: number;
}

export interface StageAdapterResult {
  stages: ResolvedStage[];
  isServerAuthoritative: boolean;
  dataSource: 'server-api' | 'local-fallback';
  fetchedAt: string;
}

/**
 * Maps backend stage config and team progress to client-facing stage state.
 * Backend remains the sole source of truth for authorization.
 */
export function adaptStages(
  backendStages: BackendStageConfig[] | null,
  teamProgress: BackendTeamProgress | null,
  isAuthenticated: boolean
): StageAdapterResult {
  const isServerAuthoritative = Boolean(backendStages && backendStages.length > 0);
  const serverStagesMap = new Map<string, BackendStageConfig>();

  if (backendStages) {
    for (const s of backendStages) {
      serverStagesMap.set(s.id, s);
    }
  }

  const stages: ResolvedStage[] = STAGES_METADATA.map((meta) => {
    const serverStage = serverStagesMap.get(meta.id);
    const serverStatus = serverStage ? serverStage.status : (isServerAuthoritative ? 'LOCKED' : 'UNKNOWN');

    let status: StageStatus = 'locked';
    let progressDetail: string | null = null;

    if (!isServerAuthoritative) {
      // Local development fallback when backend is unreachable
      status = meta.number === 1 ? 'available' : 'locked';
      progressDetail = 'Offline fallback mode';
    } else if (serverStatus === 'LOCKED') {
      status = 'locked';
      progressDetail = 'Locked by administrator';
    } else if (serverStatus === 'CLOSED') {
      // Stage concluded globally
      const hasCompleted = checkCompletion(meta.number, teamProgress);
      status = hasCompleted ? 'completed' : 'locked';
      progressDetail = hasCompleted ? 'Completed prior to stage close' : 'Stage concluded';
    } else {
      // Server status is OPEN
      if (!isAuthenticated) {
        status = 'available';
        progressDetail = 'Authentication required to enter';
      } else {
        const resolution = evaluateParticipantStageState(meta.number, teamProgress);
        status = resolution.status;
        progressDetail = resolution.detail;
      }
    }

    const { actionLabel, actionHref, isActionable } = deriveAction(meta, status, isAuthenticated);

    return {
      meta,
      status,
      serverStatus,
      progressDetail,
      actionLabel,
      actionHref,
      isActionable,
      maxScore: serverStage?.maxScore
    };
  });

  return {
    stages,
    isServerAuthoritative,
    dataSource: isServerAuthoritative ? 'server-api' : 'local-fallback',
    fetchedAt: new Date().toISOString()
  };
}

function checkCompletion(stageNumber: number, progress: BackendTeamProgress | null): boolean {
  if (!progress) return false;
  switch (stageNumber) {
    case 1:
      return Boolean(progress.stage1?.hasSubmitted);
    case 2: {
      const challenges = progress.stage2?.challenges || {};
      const challengeList = Object.values(challenges);
      return challengeList.length > 0 && challengeList.every((c) => c.isSolved);
    }
    case 3:
      return Boolean(progress.stage3?.hasSelected);
    case 4:
      return Boolean(progress.stage4?.hasSelected);
    case 5:
      return Boolean(progress.stage5?.hasSelectedProblem);
    default:
      return false;
  }
}

function evaluateParticipantStageState(
  stageNumber: number,
  progress: BackendTeamProgress | null
): { status: StageStatus; detail: string | null } {
  if (!progress) {
    return { status: 'available', detail: 'Ready to begin' };
  }

  switch (stageNumber) {
    case 1: {
      if (progress.stage1?.hasSubmitted) {
        return { status: 'completed', detail: 'Assessment submitted for evaluation' };
      }
      return { status: 'available', detail: 'Ready for assessment' };
    }
    case 2: {
      const challenges = progress.stage2?.challenges || {};
      const challengeEntries = Object.values(challenges);
      const solvedCount = challengeEntries.filter((c) => c.isSolved).length;
      const anyAttempts = challengeEntries.some((c) => (c.attemptsUsed ?? 0) > 0);
      const hintsUsed = progress.stage2?.hintsUsed ?? 0;

      if (challengeEntries.length > 0 && solvedCount === challengeEntries.length) {
        return { status: 'completed', detail: `All ${solvedCount} challenges decoded` };
      }
      if (solvedCount > 0 || anyAttempts || hintsUsed > 0) {
        return { status: 'in-progress', detail: `${solvedCount} decoded | ${hintsUsed} hint(s) used` };
      }
      return { status: 'available', detail: 'Challenges active' };
    }
    case 3: {
      if (progress.stage3?.hasSelected) {
        return {
          status: 'completed',
          detail: `Selected: ${progress.stage3.selection?.datasetName || 'Forensic dataset'}`
        };
      }
      return { status: 'available', detail: 'Awaiting dataset selection' };
    }
    case 4: {
      if (progress.stage4?.hasSelected) {
        return {
          status: 'completed',
          detail: `Selected: ${progress.stage4.selection?.problemTitle || 'Prototype directive'}`
        };
      }
      return { status: 'available', detail: 'Awaiting problem statement selection' };
    }
    case 5: {
      if (!progress.stage4?.hasSelected) {
        return { status: 'locked', detail: 'Requires Stage 4 problem selection for continuity' };
      }
      return {
        status: 'in-progress',
        detail: `Continuity linked: ${progress.stage5?.selectedProblemTitle || 'Active directive'}`
      };
    }
    default:
      return { status: 'available', detail: null };
  }
}

function deriveAction(
  meta: StageMeta,
  status: StageStatus,
  isAuthenticated: boolean
): { actionLabel: string; actionHref: string; isActionable: boolean } {
  if (!isAuthenticated) {
    return {
      actionLabel: 'Login Required',
      actionHref: '/login',
      isActionable: true
    };
  }

  switch (status) {
    case 'available':
      return {
        actionLabel: 'Enter Stage',
        actionHref: meta.href,
        isActionable: true
      };
    case 'in-progress':
      return {
        actionLabel: 'Resume Stage',
        actionHref: meta.href,
        isActionable: true
      };
    case 'completed':
      return {
        actionLabel: 'Review Stage',
        actionHref: meta.href,
        isActionable: true
      };
    case 'locked':
    default:
      return {
        actionLabel: 'Stage Locked',
        actionHref: meta.href,
        isActionable: false
      };
  }
}
