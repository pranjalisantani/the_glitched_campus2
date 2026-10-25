import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { store, DuplicateQuizSubmissionError } from '../store';
import { requireAuth, requireStageOpen, AuthenticatedRequest } from '../middleware/auth';
import { resolveSecureDatasetPath } from '../utils/datasetStorage';

const router = Router();

// Public: View all stage statuses (Locked, Open, Closed)
router.get('/stages', async (req: Request, res: Response): Promise<void> => {
  try {
    const stages = await store.getAllStages();
    res.json(stages);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stages.', details: err.message });
  }
});

/* ==========================================================================
   STAGE 1: QUIZ ROUTES
   ========================================================================== */

// Get live quiz questions (Admin stripped: never sends correctOptionId!)
router.get('/stage1/questions', requireAuth, requireStageOpen('stage1'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const questions = await store.getQuizQuestions(false);
    res.json(questions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve quiz questions.', details: err.message });
  }
});

// Submit live quiz answers
router.post('/stage1/submit', requireAuth, requireStageOpen('stage1'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ error: 'Answers payload must be an object mapping question IDs to chosen options.' });
      return;
    }

    // Submit answers and compute server-side score
    const submission = await store.submitQuiz(req.user.teamId, req.user.teamName, answers);

    // CRITICAL REQUIREMENT: "Participants cannot see their scores or correct answers."
    // Return only confirmation and submission timestamp.
    res.json({
      message: 'Quiz assessment submitted successfully and recorded for evaluation.',
      submittedAt: submission.submittedAt,
      totalQuestionsAnswered: Object.keys(answers).length
    });
  } catch (err: any) {
    if (err instanceof DuplicateQuizSubmissionError || err?.code === 'QUIZ_SUBMISSION_EXISTS') {
      console.warn(`[STAGE 1] Duplicate submission attempt blocked for team ${req.user?.teamId}`);
      res.status(409).json({
        error: 'Quiz assessment already submitted for this team. Duplicate submissions are not permitted.',
        code: 'QUIZ_SUBMISSION_EXISTS'
      });
      return;
    }
    console.error(`[STAGE 1] Failed to submit quiz for team ${req.user?.teamId}:`, err);
    res.status(500).json({ error: 'Failed to submit quiz.' });
  }
});

// Check team's Stage 1 status
router.get('/stage1/status', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const submission = await store.getQuizSubmissionByTeam(req.user.teamId);
    res.json({
      hasSubmitted: Boolean(submission),
      submittedAt: submission?.submittedAt || null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check quiz status.', details: err.message });
  }
});

// Log browser supervision events (tab focus blur, copy attempts)
router.post('/stage1/log-event', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { eventType, details } = req.body;
    if (!['tab_blur', 'tab_focus', 'copy_attempt', 'context_menu'].includes(eventType)) {
      res.status(400).json({ error: 'Invalid event type.' });
      return;
    }

    const log = await store.logTabFocusEvent({
      teamId: req.user.teamId,
      teamName: req.user.teamName,
      eventType,
      details: details ? String(details) : undefined
    });

    res.status(201).json({ status: 'logged', id: log.id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to log event.', details: err.message });
  }
});

/* ==========================================================================
   STAGE 2: DECODE & ENCODE ROUTES
   ========================================================================== */

// Get decode challenges with team-specific attempt states
router.get('/stage2/challenges', requireAuth, requireStageOpen('stage2'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const challenges = await store.getDecodeChallenges(false, req.user.teamId);
    res.json(challenges);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve challenges.', details: err.message });
  }
});

// Request / unlock challenge hint (deducts 2 marks server-side)
router.post('/stage2/challenges/:id/hint', requireAuth, requireStageOpen('stage2'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const challengeId = req.params.id;
    const result = await store.unlockHint(req.user.teamId, req.user.teamName, challengeId);

    res.json({
      hint: result.hint,
      message: 'Hint decrypted. Note: Hint usage incurs a 2-mark stage deduction as per competition rules.'
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Submit challenge attempt (Enforces max 3 attempts rule)
router.post('/stage2/challenges/:id/submit', requireAuth, requireStageOpen('stage2'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const challengeId = req.params.id;
    const { answer } = req.body;

    if (!answer || typeof answer !== 'string') {
      res.status(400).json({ error: 'An answer string must be provided.' });
      return;
    }

    const result = await store.submitChallengeAttempt(
      req.user.teamId,
      req.user.teamName,
      challengeId,
      answer
    );

    // Return feedback on correctness & attempts remaining. NEVER reveal scores!
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get team Stage 2 summary
router.get('/stage2/status', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const progress = await store.getTeamStage2Progress(req.user.teamId);
    res.json({
      hintsUsed: progress?.hintsUsedCount || 0,
      challengeStates: progress?.challengeStates || {}
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve Stage 2 status.', details: err.message });
  }
});

/* ==========================================================================
   STAGE 3: DATASET EDA ROUTES
   ========================================================================== */

// Get available datasets
router.get('/stage3/datasets', requireAuth, requireStageOpen('stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const datasets = await store.getDatasets();
    res.json(datasets);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve datasets.', details: err.message });
  }
});

// Select one dataset (Enforces strict one-time selection per team)
router.post('/stage3/select', requireAuth, requireStageOpen('stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { datasetId } = req.body;
    if (!datasetId || typeof datasetId !== 'string') {
      res.status(400).json({ error: 'datasetId is required.' });
      return;
    }

    const selection = await store.selectDataset(req.user.teamId, req.user.teamName, datasetId);
    res.status(201).json({
      message: `Dataset "${selection.datasetName}" selected successfully. Download the dataset and proceed with local analysis.`,
      selection
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get current team dataset selection
router.get('/stage3/my-selection', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const selection = await store.getTeamDatasetSelection(req.user.teamId);
    res.json({ selection });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check dataset selection.', details: err.message });
  }
});

// Download selected dataset file
router.get('/stage3/download/:id', requireAuth, requireStageOpen('stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const datasetId = req.params.id;

    // Participant verification: team can only download its selected dataset
    if (req.user.role !== 'admin') {
      const selection = await store.getTeamDatasetSelection(req.user.teamId);
      if (!selection || selection.datasetId !== datasetId) {
        res.status(403).json({
          error: 'Access denied. You can only download the dataset selected by your team.',
          code: 'DATASET_ACCESS_UNAUTHORIZED'
        });
        return;
      }
    }

    const dataset = await store.getDatasetById(datasetId);
    if (!dataset) {
      res.status(404).json({ error: 'Dataset not found.' });
      return;
    }

    const pathCheck = resolveSecureDatasetPath(dataset.filename);
    if (!pathCheck.valid || !pathCheck.resolvedPath) {
      res.status(pathCheck.statusCode || 400).json({ error: pathCheck.error });
      return;
    }

    res.download(pathCheck.resolvedPath, path.basename(dataset.filename));
  } catch (err: any) {
    console.error(`[STAGE 3] Dataset download error for team ${req.user?.teamId}:`, err);
    res.status(500).json({ error: 'Download failed.' });
  }
});

/* ==========================================================================
   STAGE 4: STATIC PROTOTYPE ROUTES
   ========================================================================== */

// Get available problem statements
router.get('/stage4/problems', requireAuth, requireStageOpen('stage4'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const problems = await store.getProblemStatements();
    res.json(problems);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve problem statements.', details: err.message });
  }
});

// Select one problem statement (Strict one-time selection)
router.post('/stage4/select', requireAuth, requireStageOpen('stage4'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { problemId } = req.body;
    if (!problemId || typeof problemId !== 'string') {
      res.status(400).json({ error: 'problemId is required.' });
      return;
    }

    const selection = await store.selectProblemStatement(req.user.teamId, req.user.teamName, problemId);
    res.status(201).json({
      message: `Problem statement "${selection.problemTitle}" chosen. Proceed to build your local static prototype.`,
      selection
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get current team problem selection
router.get('/stage4/my-selection', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const selection = await store.getTeamProblemSelection(req.user.teamId);
    res.json({ selection });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check problem selection.', details: err.message });
  }
});

/* ==========================================================================
   STAGE 5: DYNAMIC WEBSITE ROUTES
   ========================================================================== */

// Retrieve problem statement selected in Stage 4 (Backend continuity)
router.get('/stage5/problem', requireAuth, requireStageOpen('stage5'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const selection = await store.getTeamProblemSelection(req.user.teamId);
    if (!selection) {
      res.status(400).json({
        error: 'No problem statement was selected in Stage 4. You must first lock in your selection in Stage 4.',
        code: 'STAGE4_SELECTION_REQUIRED'
      });
      return;
    }

    const problem = await store.getProblemStatementById(selection.problemId);
    if (!problem) {
      res.status(404).json({ error: 'Selected problem statement definition not found.' });
      return;
    }

    res.json({
      continuityVerified: true,
      selectionTimestamp: selection.selectedAt,
      problem: {
        id: problem.id,
        title: problem.title,
        category: problem.category,
        summary: problem.summary,
        fullDescription: problem.fullDescription,
        stage4Instructions: problem.stage4Instructions,
        stage4Deliverables: problem.stage4Deliverables,
        stage5Instructions: problem.stage5Instructions,
        stage5Deliverables: problem.stage5Deliverables,
        isDemonstration: problem.isDemonstration
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve Stage 5 problem statement.', details: err.message });
  }
});

export default router;

