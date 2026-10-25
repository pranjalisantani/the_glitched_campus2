process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@glitched.campus';
process.env.ADMIN_PASSWORD = 'Admin@Nexus2026!';
process.env.JWT_SECRET = 'test_suite_cryptographically_secure_random_jwt_secret_2026_at_least_32_chars';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app, { seedDefaultAdmin } from '../index';
import { store } from '../store';
import { adminTestStore } from '../store/adminTestStore';

let server: http.Server;
let port: number;
let baseUrl: string;

let adminToken: string;
let participantToken: string;
let participantTeamId: string;

function apiRequest(path: string, options: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}): Promise<{ status: number; data: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try {
          const data = raw ? JSON.parse(raw) : null;
          resolve({ status: res.statusCode || 500, data, raw });
        } catch {
          resolve({ status: res.statusCode || 500, data: raw, raw });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('THE GLITCHED CAMPUS // Admin Test Mode Security & Data Isolation Suite', () => {
  after(() => {
    if (server) {
      server.close();
    }
  });

  before(async () => {
    await seedDefaultAdmin();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          port = address.port;
          baseUrl = `http://localhost:${port}`;
        }
        resolve();
      });
    });

    // Login default admin
    const adminRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        emailOrTeamName: 'admin@glitched.campus',
        password: 'Admin@Nexus2026!'
      }
    });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.data.token;

    // Register a participant team
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        teamName: 'Security Audit Team',
        leaderName: 'Agent Cipher',
        email: 'agent.cipher@nexus.campus',
        password: 'CipherPassword2026!',
        members: ['Agent Cipher', 'Analyst Trace']
      }
    });
    if (regRes.status !== 201) {
      console.error('Registration failed:', regRes.data);
    }
    assert.strictEqual(regRes.status, 201);
    participantToken = regRes.data.token;
    participantTeamId = regRes.data.team.id;

    // Lock all stages to test locked-stage isolation
    await store.updateStageStatus('stage1', 'LOCKED');
    await store.updateStageStatus('stage2', 'LOCKED');
    await store.updateStageStatus('stage3', 'LOCKED');
    await store.updateStageStatus('stage4', 'LOCKED');
    await store.updateStageStatus('stage5', 'LOCKED');
  });

  test('1. Unauthenticated user cannot access admin testing endpoints', async () => {
    const res1 = await apiRequest('/api/admin/test-mode/session', { method: 'POST' });
    assert.strictEqual(res1.status, 401);

    const res2 = await apiRequest('/api/admin/test-mode/stage1/questions');
    assert.strictEqual(res2.status, 401);

    const res3 = await apiRequest('/api/admin/test-mode/stage2/challenges');
    assert.strictEqual(res3.status, 401);
  });

  test('2. Participant cannot access admin test APIs (Strict 403 Forbidden)', async () => {
    const res1 = await apiRequest('/api/admin/test-mode/session', {
      method: 'POST',
      token: participantToken
    });
    assert.strictEqual(res1.status, 403);
    assert.strictEqual(res1.data.code, 'FORBIDDEN');

    const res2 = await apiRequest('/api/admin/test-mode/stage1/questions', {
      token: participantToken
    });
    assert.strictEqual(res2.status, 403);

    const res3 = await apiRequest('/api/admin/test-mode/stage3/datasets', {
      token: participantToken
    });
    assert.strictEqual(res3.status, 403);
  });

  let testSessionId: string;

  test('3. Admin can initialize an isolated test session', async () => {
    const res = await apiRequest('/api/admin/test-mode/session', {
      method: 'POST',
      token: adminToken
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.data.sessionId);
    assert.ok(res.data.createdAt);
    assert.ok(res.data.expiresAt);
    testSessionId = res.data.sessionId;

    // Verify session retrieval
    const getRes = await apiRequest('/api/admin/test-mode/session', {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.data.session.sessionId, testSessionId);
    assert.strictEqual(getRes.data.session.adminEmail, 'admin@glitched.campus');
  });

  test('4. Admin can test a locked stage, but locked stage remains locked for participants', async () => {
    // Stage 1 is locked for participants
    const participantRes = await apiRequest('/api/stage1/questions', {
      token: participantToken
    });
    assert.strictEqual(participantRes.status, 403);
    assert.strictEqual(participantRes.data.code, 'STAGE_LOCKED');

    // Admin test mode allows previewing questions without unlocking the stage for participants
    const adminTestRes = await apiRequest('/api/admin/test-mode/stage1/questions', {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(adminTestRes.status, 200);
    assert.ok(Array.isArray(adminTestRes.data));
    assert.ok(adminTestRes.data.length > 0);

    // Verify participant is STILL locked out afterwards
    const participantRecheck = await apiRequest('/api/stage1/questions', {
      token: participantToken
    });
    assert.strictEqual(participantRecheck.status, 403);
    assert.strictEqual(participantRecheck.data.code, 'STAGE_LOCKED');
  });

  test('5. Stage 1 test submission evaluates answers in isolated test session without altering participant scores or records', async () => {
    const questionsRes = await apiRequest('/api/admin/test-mode/stage1/questions', {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    const questions = questionsRes.data;

    // Formulate a test answer payload
    const testAnswers: Record<string, string> = {};
    for (const q of questions) {
      testAnswers[q.id] = q.options[0]?.id || 'opt-1';
    }

    const submitRes = await apiRequest('/api/admin/test-mode/stage1/submit', {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId },
      body: { answers: testAnswers }
    });
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data.isTestMode, true);
    assert.ok(typeof submitRes.data.score === 'number');
    assert.ok(submitRes.data.questionResults);

    // Strict isolation checks:
    // 1. MemoryStore quizSubmissions must NOT contain the test submission
    const storedSubmissions = await store.getAllQuizSubmissions();
    const testStored = storedSubmissions.find(s => s.teamId === testSessionId || s.teamId === 'admin');
    assert.strictEqual(testStored, undefined, 'Test submission must not be written to production quizSubmissions');

    // 2. Participant team has zero submissions
    const participantSub = await store.getQuizSubmissionByTeam(participantTeamId);
    assert.strictEqual(participantSub, null, 'Participant team must have zero submissions');

    // 3. Team progress summaries must show 0/null score for participant and completed: false
    const progressList = await store.getTeamProgressSummaries();
    const participantProgress = progressList.find(p => p.teamId === participantTeamId);
    assert.ok(participantProgress);
    assert.strictEqual(participantProgress.stage1.completed, false);
    assert.strictEqual(participantProgress.stage1.score, null);
  });

  test('6. Stage 2 test challenges enforce 3 attempts and 2-mark deductions strictly in test session without polluting participant records', async () => {
    // Stage 2 is locked for participants
    const partRes = await apiRequest('/api/stage2/challenges', {
      token: participantToken
    });
    assert.strictEqual(partRes.status, 403);
    assert.strictEqual(partRes.data.code, 'STAGE_LOCKED');

    // Admin can get test challenges
    const chRes = await apiRequest('/api/admin/test-mode/stage2/challenges', {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(chRes.status, 200);
    assert.ok(chRes.data.challenges.length > 0);
    const targetChallenge = chRes.data.challenges[0];

    // Admin requests hint in test mode
    const hintRes = await apiRequest(`/api/admin/test-mode/stage2/challenges/${targetChallenge.id}/hint`, {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(hintRes.status, 200);
    assert.strictEqual(hintRes.data.hintsUsedCount, 1);
    assert.strictEqual(hintRes.data.deductionMarks, 2);

    // Admin submits incorrect attempt 1
    const att1 = await apiRequest(`/api/admin/test-mode/stage2/challenges/${targetChallenge.id}/attempt`, {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId },
      body: { answer: 'INCORRECT_ANSWER_1' }
    });
    assert.strictEqual(att1.status, 200);
    assert.strictEqual(att1.data.isCorrect, false);
    assert.strictEqual(att1.data.attemptsRemaining, 2);

    // Admin submits incorrect attempt 2
    const att2 = await apiRequest(`/api/admin/test-mode/stage2/challenges/${targetChallenge.id}/attempt`, {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId },
      body: { answer: 'INCORRECT_ANSWER_2' }
    });
    assert.strictEqual(att2.status, 200);
    assert.strictEqual(att2.data.attemptsRemaining, 1);

    // Admin submits incorrect attempt 3 (lockout)
    const att3 = await apiRequest(`/api/admin/test-mode/stage2/challenges/${targetChallenge.id}/attempt`, {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId },
      body: { answer: 'INCORRECT_ANSWER_3' }
    });
    assert.strictEqual(att3.status, 200);
    assert.strictEqual(att3.data.attemptsRemaining, 0);
    assert.strictEqual(att3.data.isLockedOut, true);

    // Attempt 4 is rejected because max attempts reached
    const att4 = await apiRequest(`/api/admin/test-mode/stage2/challenges/${targetChallenge.id}/attempt`, {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId },
      body: { answer: 'INCORRECT_ANSWER_4' }
    });
    assert.strictEqual(att4.status, 400);

    // Strict isolation check: Real stage2 progress must have ZERO records
    const allStage2 = await store.getAllStage2Progress();
    assert.strictEqual(allStage2.length, 0, 'Production stage2Progress must not contain any test session attempts');
  });

  test('7. Stage 3 dataset test selection and authorized download are strictly isolated', async () => {
    const listRes = await apiRequest('/api/admin/test-mode/stage3/datasets', {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.data.datasets.length > 0);
    const datasetToSelect = listRes.data.datasets[0];

    // Select dataset in test mode
    const selectRes = await apiRequest(`/api/admin/test-mode/stage3/datasets/${datasetToSelect.id}/select`, {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(selectRes.status, 201);
    assert.strictEqual(selectRes.data.selection.datasetId, datasetToSelect.id);

    // Authorized download in test mode
    const downloadRes = await apiRequest(`/api/admin/test-mode/stage3/datasets/${datasetToSelect.id}/download`, {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(downloadRes.status, 200);

    // Unauthorized download for unselected dataset
    const otherDatasetId = listRes.data.datasets[1]?.id || 'non-existent-id';
    const unauthDownload = await apiRequest(`/api/admin/test-mode/stage3/datasets/${otherDatasetId}/download`, {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(unauthDownload.status, 403);
    assert.strictEqual(unauthDownload.data.code, 'TEST_DATASET_UNAUTHORIZED');

    // Strict isolation check: Production store has ZERO dataset selections
    const realSelections = await store.getAllDatasetSelections();
    assert.strictEqual(realSelections.length, 0, 'Production datasetSelections must not contain test selections');
  });

  test('8. Stage 4 problem selection in test mode does not alter production selections', async () => {
    const probList = await apiRequest('/api/admin/test-mode/stage4/problems', {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(probList.status, 200);
    assert.ok(probList.data.problems.length > 0);
    const problemToSelect = probList.data.problems[0];

    // Select problem in test session
    const selectRes = await apiRequest(`/api/admin/test-mode/stage4/problems/${problemToSelect.id}/select`, {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(selectRes.status, 201);
    assert.strictEqual(selectRes.data.selection.problemId, problemToSelect.id);

    // Strict isolation check: Production store has ZERO problem selections
    const realProblemSelections = await store.getAllProblemSelections();
    assert.strictEqual(realProblemSelections.length, 0, 'Production problemSelections must not contain test selections');
  });

  test('9. Stage 5 test continuity uses the isolated test-session selection and never falls back to real teams', async () => {
    // 1. Create a fresh second test session with NO stage 4 selection
    const freshSessionRes = await apiRequest('/api/admin/test-mode/session', {
      method: 'POST',
      token: adminToken
    });
    const freshSessionId = freshSessionRes.data.sessionId;

    // Stage 5 query must fail with 400 STAGE4_SELECTION_REQUIRED
    const emptyContinuity = await apiRequest('/api/admin/test-mode/stage5/problem', {
      token: adminToken,
      headers: { 'x-test-session-id': freshSessionId }
    });
    assert.strictEqual(emptyContinuity.status, 400);
    assert.strictEqual(emptyContinuity.data.code, 'STAGE4_SELECTION_REQUIRED');

    // 2. Now add a real team selection in the production store for the participant team
    const problems = await store.getProblemStatements();
    const participantProblem = problems[0];
    await store.selectProblemStatement(participantTeamId, 'Security Audit Team', participantProblem.id);

    // Verify real team selection is in store
    const teamSel = await store.getTeamProblemSelection(participantTeamId);
    assert.ok(teamSel);

    // Verify fresh test session STILL fails with STAGE4_SELECTION_REQUIRED (never falls back to participant selection)
    const stillEmptyContinuity = await apiRequest('/api/admin/test-mode/stage5/problem', {
      token: adminToken,
      headers: { 'x-test-session-id': freshSessionId }
    });
    assert.strictEqual(stillEmptyContinuity.status, 400);
    assert.strictEqual(stillEmptyContinuity.data.code, 'STAGE4_SELECTION_REQUIRED');

    // 3. In our original test session where problem[0] was selected, Stage 5 continuity succeeds
    const validContinuity = await apiRequest('/api/admin/test-mode/stage5/problem', {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(validContinuity.status, 200);
    assert.strictEqual(validContinuity.data.continuityVerified, true);
    assert.strictEqual(validContinuity.data.isTestSession, true);
    assert.ok(validContinuity.data.problem.id);
  });

  test('10. Ending test session purges state and disables further test operations', async () => {
    const endRes = await apiRequest('/api/admin/test-mode/session/end', {
      method: 'POST',
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(endRes.status, 200);

    // Subsequent call with ended testSessionId must fail with 404 TEST_SESSION_NOT_FOUND
    const retryRes = await apiRequest('/api/admin/test-mode/stage1/questions', {
      token: adminToken,
      headers: { 'x-test-session-id': testSessionId }
    });
    assert.strictEqual(retryRes.status, 404);
    assert.strictEqual(retryRes.data.code, 'TEST_SESSION_NOT_FOUND');
  });

  test('11. Stage 1 has NO countdown timer in questions payload', async () => {
    const questions = await store.getQuizQuestions(true);
    for (const q of questions) {
      assert.strictEqual((q as any).timer, undefined);
      assert.strictEqual((q as any).timeLimit, undefined);
      assert.strictEqual((q as any).duration, undefined);
      assert.strictEqual((q as any).countdownTimer, undefined);
    }
  });

  test('12. Existing participant stage locks and security boundaries remain intact', async () => {
    // Stage 1 is locked; participant cannot access or submit
    const submitLocked = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: participantToken,
      body: { answers: { q1: 'test' } }
    });
    assert.strictEqual(submitLocked.status, 403);
    assert.strictEqual(submitLocked.data.code, 'STAGE_LOCKED');

    // Stage 2 locked
    const stage2Locked = await apiRequest('/api/stage2/challenges', {
      token: participantToken
    });
    assert.strictEqual(stage2Locked.status, 403);
    assert.strictEqual(stage2Locked.data.code, 'STAGE_LOCKED');

    // Stage 3 locked
    const stage3Locked = await apiRequest('/api/stage3/datasets', {
      token: participantToken
    });
    assert.strictEqual(stage3Locked.status, 403);
    assert.strictEqual(stage3Locked.data.code, 'STAGE_LOCKED');

    // Stage 4 locked
    const stage4Locked = await apiRequest('/api/stage4/problems', {
      token: participantToken
    });
    assert.strictEqual(stage4Locked.status, 403);
    assert.strictEqual(stage4Locked.data.code, 'STAGE_LOCKED');

    // Stage 5 locked
    const stage5Locked = await apiRequest('/api/stage5/problem', {
      token: participantToken
    });
    assert.strictEqual(stage5Locked.status, 403);
    assert.strictEqual(stage5Locked.data.code, 'STAGE_LOCKED');
  });
});
