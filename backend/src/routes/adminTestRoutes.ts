import { Router, Response, NextFunction } from 'express';
import path from 'path';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { store } from '../store';
import { adminTestStore, AdminTestSession } from '../store/adminTestStore';
import { resolveSecureDatasetPath } from '../utils/datasetStorage';
import { QuizQuestion, DecodeChallenge } from '../types';

export interface AdminTestRequest extends AuthenticatedRequest {
  testSession?: AdminTestSession;
}

const router = Router();

// Apply base admin authentication
router.use(requireAuth, requireAdmin);

/**
 * Middleware: extracts and validates the test session from headers or body
 */
export function requireTestSession(req: AdminTestRequest, res: Response, next: NextFunction): void {
  const sessionId = (req.headers['x-test-session-id'] as string) || req.body?.testSessionId || (req.query?.testSessionId as string);

  if (!sessionId) {
    res.status(400).json({
      error: 'Missing active test session. Header "x-test-session-id" or parameter "testSessionId" is required.',
      code: 'TEST_SESSION_REQUIRED'
    });
    return;
  }

  const session = adminTestStore.getSession(sessionId);
  if (!session) {
    res.status(404).json({
      error: 'Admin test session not found or expired. Please initialize a new test session.',
      code: 'TEST_SESSION_NOT_FOUND'
    });
    return;
  }

  // Security: Ensure session belongs to the authenticated admin
  if (session.adminId !== req.user?.teamId) {
    res.status(403).json({
      error: 'Access denied: Test session belongs to another administrator.',
      code: 'TEST_SESSION_FORBIDDEN'
    });
    return;
  }

  req.testSession = session;
  next();
}

/* ==========================================================================
   SESSION LIFECYCLE ENDPOINTS
   ========================================================================== */

// Start a new isolated admin test session
router.post('/session', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const session = adminTestStore.createSession(req.user.teamId, req.user.email);
    console.log(`[ADMIN TEST MODE] Session initialized: ${session.sessionId} by admin ${req.user.email}`);

    res.status(201).json({
      message: 'Admin test session initialized in isolated sandbox.',
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create test session.', details: err.message });
  }
});

// Get current test session status
router.get('/session', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  res.json({
    session: req.testSession
  });
});

// Explicitly terminate an admin test session
router.post('/session/end', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  const sessionId = req.testSession!.sessionId;
  adminTestStore.endSession(sessionId);
  console.log(`[ADMIN TEST MODE] Session terminated: ${sessionId}`);

  res.json({
    message: 'Admin test session ended. All temporary test state has been purged.',
    sessionId
  });
});

/* ==========================================================================
   STAGE 1 TEST ENDPOINTS (BIT BLITZ)
   ========================================================================== */

// Preview questions for testing (even if Stage 1 is locked for participants)
router.get('/stage1/questions', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    // Return questions with options for preview
    const questions = (await store.getQuizQuestions(true)) as QuizQuestion[];
    // Sanitize correctOptionId for realistic participant simulation, but allow preview
    const preview = questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      isDemonstration: q.isDemonstration,
      explanation: q.explanation // included in admin preview
    }));
    res.json(preview);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load test quiz questions.', details: err.message });
  }
});

// Submit test answers in isolated test session
router.post('/stage1/submit', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ error: 'Answers payload must be an object mapping question IDs to chosen options.' });
      return;
    }

    const allQuestions = (await store.getQuizQuestions(true)) as QuizQuestion[];
    const activeQuestions = allQuestions.filter((q: any) => q.isActiveForLiveQuiz !== false);
    const totalQuestions = activeQuestions.length;

    let correctCount = 0;
    const questionResults: Record<string, any> = {};

    for (const q of activeQuestions) {
      const chosen = answers[q.id];
      const isCorrect = chosen !== undefined && chosen === q.correctOptionId;
      if (isCorrect) correctCount++;

      questionResults[q.id] = {
        chosenOptionId: chosen || null,
        correctOptionId: q.correctOptionId,
        isCorrect,
        explanation: q.explanation
      };
    }

    const maxScore = 10;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * maxScore * 100) / 100 : 0;
    const submittedAt = new Date().toISOString();

    session.stage1Submission = {
      answers,
      score,
      maxScore,
      totalQuestions,
      correctAnswersCount: correctCount,
      submittedAt,
      questionResults
    };

    adminTestStore.updateSession(session);

    res.json({
      message: 'Test quiz evaluation complete. Result recorded in isolated test session.',
      isTestMode: true,
      score,
      maxScore,
      totalQuestions,
      correctAnswersCount: correctCount,
      questionResults,
      submittedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit test quiz.', details: err.message });
  }
});

/* ==========================================================================
   STAGE 2 TEST ENDPOINTS (DECODE & ENCODE)
   ========================================================================== */

// Get decode challenges with test session attempt state
router.get('/stage2/challenges', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const challenges = await store.getDecodeChallenges(true);

    const testChallenges = challenges.map((ch: any) => {
      const state = session.stage2.challengeStates[ch.id] || {
        attemptsUsed: 0,
        maxAttempts: 3,
        isSolved: false,
        isLockedOut: false,
        hasUsedHint: false
      };

      return {
        id: ch.id,
        title: ch.title,
        description: ch.description,
        encodedPayload: ch.encodedPayload,
        hasHint: Boolean(ch.hint),
        hintRevealed: state.hintRevealed || undefined,
        isActive: ch.isActive,
        isSolved: state.isSolved,
        attemptsUsed: state.attemptsUsed,
        maxAttempts: 3,
        isLockedOut: state.isLockedOut,
        isDemonstration: ch.isDemonstration,
        expectedAnswer: ch.expectedAnswer // Admin preview benefit
      };
    });

    res.json({
      challenges: testChallenges,
      summary: {
        hintsUsedCount: session.stage2.hintsUsedCount,
        deductionMarks: session.stage2.deductionMarks
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve test challenges.', details: err.message });
  }
});

// Unlock test hint with isolated 2-mark deduction
router.post('/stage2/challenges/:id/hint', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const challengeId = req.params.id;

    const challenge = await store.getDecodeChallengeById(challengeId);
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    if (!session.stage2.challengeStates[challengeId]) {
      session.stage2.challengeStates[challengeId] = {
        attemptsUsed: 0,
        maxAttempts: 3,
        isSolved: false,
        isLockedOut: false,
        hasUsedHint: false,
        attemptHistory: []
      };
    }

    const state = session.stage2.challengeStates[challengeId];
    if (!state.hasUsedHint) {
      state.hasUsedHint = true;
      state.hintRevealed = challenge.hint;
      session.stage2.hintsUsedCount += 1;
      session.stage2.deductionMarks = Math.min(10, session.stage2.hintsUsedCount * 2);
    }

    adminTestStore.updateSession(session);

    res.json({
      hint: challenge.hint,
      hintsUsedCount: session.stage2.hintsUsedCount,
      deductionMarks: session.stage2.deductionMarks,
      message: 'Hint unlocked in test session. 2-mark deduction applied to test state only.'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to unlock test hint.', details: err.message });
  }
});

// Submit test attempt (Strict 3-attempt limit in test session)
router.post('/stage2/challenges/:id/attempt', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const challengeId = req.params.id;
    const { answer } = req.body;

    if (!answer || typeof answer !== 'string') {
      res.status(400).json({ error: 'An answer string must be provided.' });
      return;
    }

    const challenge = await store.getDecodeChallengeById(challengeId);
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    if (!session.stage2.challengeStates[challengeId]) {
      session.stage2.challengeStates[challengeId] = {
        attemptsUsed: 0,
        maxAttempts: 3,
        isSolved: false,
        isLockedOut: false,
        hasUsedHint: false,
        attemptHistory: []
      };
    }

    const state = session.stage2.challengeStates[challengeId];

    if (state.isSolved) {
      res.status(400).json({ error: 'Challenge already solved in test session.' });
      return;
    }

    if (state.attemptsUsed >= 3) {
      res.status(400).json({
        error: 'Maximum attempts (3) exceeded for this challenge in test session.',
        isLockedOut: true,
        attemptsRemaining: 0
      });
      return;
    }

    state.attemptsUsed += 1;
    const isCorrect = answer.trim().toLowerCase() === challenge.expectedAnswer.trim().toLowerCase();

    state.attemptHistory.push({
      answer: answer.trim(),
      isCorrect,
      timestamp: new Date().toISOString()
    });

    if (isCorrect) {
      state.isSolved = true;
    } else if (state.attemptsUsed >= 3) {
      state.isLockedOut = true;
    }

    adminTestStore.updateSession(session);

    res.json({
      isCorrect,
      attemptsRemaining: Math.max(0, 3 - state.attemptsUsed),
      isLockedOut: state.isLockedOut,
      message: isCorrect
        ? 'Payload decoded successfully in test session!'
        : state.isLockedOut
        ? 'Maximum attempts reached. Terminal locked out for this challenge in test session.'
        : `Decryption failed. ${3 - state.attemptsUsed} attempt(s) remaining.`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process test attempt.', details: err.message });
  }
});

/* ==========================================================================
   STAGE 3 TEST ENDPOINTS (DATASET EDA)
   ========================================================================== */

// Preview datasets for test mode
router.get('/stage3/datasets', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const datasets = await store.getDatasets();

    res.json({
      datasets,
      testSelection: session.stage3DatasetSelection || null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve datasets for testing.', details: err.message });
  }
});

// Select dataset in test session
router.post('/stage3/datasets/:id/select', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const datasetId = req.params.id;

    const dataset = await store.getDatasetById(datasetId);
    if (!dataset) {
      res.status(404).json({ error: 'Dataset not found.' });
      return;
    }

    session.stage3DatasetSelection = {
      datasetId,
      datasetName: dataset.name,
      selectedAt: new Date().toISOString()
    };

    adminTestStore.updateSession(session);

    res.status(201).json({
      message: `Dataset "${dataset.name}" selected in test session. You may now test file download.`,
      selection: session.stage3DatasetSelection
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to select dataset in test session.', details: err.message });
  }
});

// Authorized test download (verifies test session selection and enforces filesystem security)
router.get('/stage3/datasets/:id/download', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const datasetId = req.params.id;

    if (!session.stage3DatasetSelection || session.stage3DatasetSelection.datasetId !== datasetId) {
      res.status(403).json({
        error: 'Access denied. You can only download the dataset currently selected in your test session.',
        code: 'TEST_DATASET_UNAUTHORIZED'
      });
      return;
    }

    const dataset = await store.getDatasetById(datasetId);
    if (!dataset) {
      res.status(404).json({ error: 'Dataset record not found.' });
      return;
    }

    const pathCheck = resolveSecureDatasetPath(dataset.filename);
    if (!pathCheck.valid || !pathCheck.resolvedPath) {
      res.status(pathCheck.statusCode || 400).json({ error: pathCheck.error });
      return;
    }

    res.download(pathCheck.resolvedPath, path.basename(dataset.filename));
  } catch (err: any) {
    res.status(500).json({ error: 'Test download failed.', details: err.message });
  }
});

/* ==========================================================================
   STAGE 4 TEST ENDPOINTS (STATIC PROTOTYPE)
   ========================================================================== */

// Preview problem statements for test mode
router.get('/stage4/problems', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const problems = await store.getProblemStatements();

    res.json({
      problems,
      testSelection: session.stage4ProblemSelection || null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve problems for testing.', details: err.message });
  }
});

// Select problem statement in test session
router.post('/stage4/problems/:id/select', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;
    const problemId = req.params.id;

    const problem = await store.getProblemStatementById(problemId);
    if (!problem) {
      res.status(404).json({ error: 'Problem statement not found.' });
      return;
    }

    session.stage4ProblemSelection = {
      problemId,
      problemTitle: problem.title,
      selectedAt: new Date().toISOString()
    };

    adminTestStore.updateSession(session);

    res.status(201).json({
      message: `Problem statement "${problem.title}" selected in test session. Continuity to Stage 5 enabled.`,
      selection: session.stage4ProblemSelection
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to select problem statement in test session.', details: err.message });
  }
});

/* ==========================================================================
   STAGE 5 TEST ENDPOINTS (DYNAMIC WEBSITE CONTINUITY)
   ========================================================================== */

// Verify continuity from test session's Stage 4 selection
router.get('/stage5/problem', requireTestSession, async (req: AdminTestRequest, res: Response): Promise<void> => {
  try {
    const session = req.testSession!;

    if (!session.stage4ProblemSelection) {
      res.status(400).json({
        error: 'No problem statement selected in test session. You must first lock in a selection in Stage 4 test mode to verify Stage 5 continuity.',
        code: 'STAGE4_SELECTION_REQUIRED'
      });
      return;
    }

    const problem = await store.getProblemStatementById(session.stage4ProblemSelection.problemId);
    if (!problem) {
      res.status(404).json({ error: 'Selected problem statement definition not found.' });
      return;
    }

    res.json({
      continuityVerified: true,
      isTestSession: true,
      selectionTimestamp: session.stage4ProblemSelection.selectedAt,
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
    res.status(500).json({ error: 'Failed to retrieve Stage 5 test problem statement.', details: err.message });
  }
});

export default router;
