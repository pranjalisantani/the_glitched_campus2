process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@glitched.campus';
process.env.ADMIN_PASSWORD = 'Admin@Nexus2026!';
process.env.JWT_SECRET = 'test_suite_cryptographically_secure_random_jwt_secret_2026_at_least_32_chars';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app, { seedDefaultAdmin } from '../index';
import { getJwtSecret } from '../config/env';
import { store } from '../store';

let server: http.Server;
let port: number;
let baseUrl: string;

let adminToken: string;
let participantToken: string;
let participantTeamId: string;

function apiRequest(path: string, options: { method?: string; token?: string; body?: any } = {}): Promise<{ status: number; data: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
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

describe('THE GLITCHED CAMPUS // Comprehensive & Security Test Suite', () => {
  after(() => {
    if (server) {
      server.close();
    }
  });

  before(async () => {
    if (typeof (store as any).resetToSeed === 'function') {
      (store as any).resetToSeed();
    }
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
  });

  test('1. System Health Check', async () => {
    const res = await apiRequest('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ONLINE');
    assert.ok(res.data.storeType === 'IN_MEMORY' || res.data.storeType === 'PERSISTENT_FILE_STORE');
  });

  test('2. Admin and Participant Authentication', async () => {
    const adminRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        emailOrTeamName: 'admin@glitched.campus',
        password: 'Admin@Nexus2026!'
      }
    });
    assert.strictEqual(adminRes.status, 200);
    assert.ok(adminRes.data.token);
    assert.strictEqual(adminRes.data.team.role, 'admin');
    adminToken = adminRes.data.token;

    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        teamName: 'CyberSentinels',
        email: 'sentinels@nexus.edu',
        password: 'Password123!',
        members: ['Alice Chen', 'Bob Vance']
      }
    });
    assert.strictEqual(regRes.status, 201);
    assert.ok(regRes.data.token);
    assert.strictEqual(regRes.data.team.role, 'participant');
    participantToken = regRes.data.token;
    participantTeamId = regRes.data.team.id;

    const dupRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        teamName: 'CyberSentinels',
        email: 'sentinels2@nexus.edu',
        password: 'Password123!',
        members: ['Charlie']
      }
    });
    assert.strictEqual(dupRes.status, 409);
  });

  test('3. Admin Clearance and Security Boundaries', async () => {
    // 3.1: Participant token access to admin route returns 403
    const forbiddenRes = await apiRequest('/api/admin/overview', {
      token: participantToken
    });
    assert.strictEqual(forbiddenRes.status, 403);
    assert.strictEqual(forbiddenRes.data.code, 'FORBIDDEN');

    // 3.2: Unauthenticated access returns 401
    const unauthRes = await apiRequest('/api/admin/overview');
    assert.strictEqual(unauthRes.status, 401);
    assert.strictEqual(unauthRes.data.code, 'UNAUTHORIZED');

    // 3.3: Authorized admin token succeeds
    const adminRes = await apiRequest('/api/admin/overview', {
      token: adminToken
    });
    assert.strictEqual(adminRes.status, 200);
  });

  test('4. Global Stage Locking Enforcement', async () => {
    const stagesRes = await apiRequest('/api/stages');
    assert.strictEqual(stagesRes.status, 200);
    for (const stage of stagesRes.data) {
      assert.strictEqual(stage.status, 'LOCKED');
    }

    const lockedRes = await apiRequest('/api/stage1/questions', {
      token: participantToken
    });
    assert.strictEqual(lockedRes.status, 403);
    assert.strictEqual(lockedRes.data.code, 'STAGE_LOCKED');

    // Reject submissions when Stage 1 is locked
    const lockedS1SubmitRes = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: participantToken,
      body: { answers: { q1: 'A' } }
    });
    assert.strictEqual(lockedS1SubmitRes.status, 403);
    assert.strictEqual(lockedS1SubmitRes.data.code, 'STAGE_LOCKED');

    // Reject submissions when Stage 2 is locked
    const lockedS2SubmitRes = await apiRequest('/api/stage2/challenges/challenge-01/submit', {
      method: 'POST',
      token: participantToken,
      body: { answer: 'DECODED' }
    });
    assert.strictEqual(lockedS2SubmitRes.status, 403);
    assert.strictEqual(lockedS2SubmitRes.data.code, 'STAGE_LOCKED');

    const unlockRes = await apiRequest('/api/admin/stages/stage1', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'OPEN' }
    });
    assert.strictEqual(unlockRes.status, 200);
    assert.strictEqual(unlockRes.data.stage.status, 'OPEN');
  });

  test('5. Stage 1 Quiz Privacy & Submission Flow', async () => {
    const qRes = await apiRequest('/api/stage1/questions', {
      token: participantToken
    });
    assert.strictEqual(qRes.status, 200);
    assert.ok(qRes.data.length > 0);

    for (const q of qRes.data) {
      assert.strictEqual(q.correctOptionId, undefined, 'correctOptionId must never be exposed to participants');
      assert.strictEqual(q.explanation, undefined, 'explanation must never be exposed to participants');
      assert.strictEqual(q.options.length, 4, 'Quiz questions must have exactly 4 options');
    }

    const eventRes = await apiRequest('/api/stage1/log-event', {
      method: 'POST',
      token: participantToken,
      body: { eventType: 'tab_blur', details: 'User switched browser tab during quiz' }
    });
    assert.strictEqual(eventRes.status, 201);

    const answers: Record<string, string> = {
      q1: 'A',
      q2: 'B',
      q3: 'C',
      q4: 'A'
    };
    const submitRes = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: participantToken,
      body: { answers }
    });
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data.score, undefined, 'Participant must not see score upon submission');
    assert.strictEqual(submitRes.data.correctCount, undefined, 'Participant must not see correct answers upon submission');
    assert.ok(submitRes.data.submittedAt);

    // Duplicate submission attempt for the same team must return 409 QUIZ_SUBMISSION_EXISTS
    const dupRes = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: participantToken,
      body: { answers: { q1: 'B', q2: 'C', q3: 'D', q4: 'B' } }
    });
    assert.strictEqual(dupRes.status, 409);
    assert.strictEqual(dupRes.data.code, 'QUIZ_SUBMISSION_EXISTS');

    const adminSubsRes = await apiRequest('/api/admin/stage1/submissions', {
      token: adminToken
    });
    assert.strictEqual(adminSubsRes.status, 200);
    const teamSub = adminSubsRes.data.find((s: any) => s.teamId === participantTeamId);
    assert.ok(teamSub);
    assert.strictEqual(teamSub.score, 10);
    assert.strictEqual(teamSub.correctCount, 4);

    const logsRes = await apiRequest('/api/admin/stage1/event-logs', {
      token: adminToken
    });
    assert.strictEqual(logsRes.status, 200);
    assert.ok(logsRes.data.some((l: any) => l.teamId === participantTeamId && l.eventType === 'tab_blur'));
  });

  test('6. Stage 2 Decode & Encode Attempts Limit & Hint Deductions', async () => {
    await apiRequest('/api/admin/stages/stage2', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'OPEN' }
    });

    const chRes = await apiRequest('/api/stage2/challenges', {
      token: participantToken
    });
    assert.strictEqual(chRes.status, 200);
    const challenge1 = chRes.data[0];
    assert.strictEqual(challenge1.expectedAnswer, undefined, 'expectedAnswer must not be exposed');
    assert.strictEqual(challenge1.hintRevealed, undefined, 'Hint must not be revealed initially');

    const hintRes = await apiRequest(`/api/stage2/challenges/${challenge1.id}/hint`, {
      method: 'POST',
      token: participantToken
    });
    assert.strictEqual(hintRes.status, 200);
    assert.ok(hintRes.data.hint);

    const challenge2 = chRes.data[1];
    for (let i = 1; i <= 3; i++) {
      const att = await apiRequest(`/api/stage2/challenges/${challenge2.id}/submit`, {
        method: 'POST',
        token: participantToken,
        body: { answer: 'WRONG_GUESS' }
      });
      assert.strictEqual(att.status, 200);
      assert.strictEqual(att.data.isCorrect, false);
      if (i < 3) {
        assert.strictEqual(att.data.isLockedOut, false);
        assert.strictEqual(att.data.attemptsRemaining, 3 - i);
      } else {
        assert.strictEqual(att.data.isLockedOut, true);
        assert.strictEqual(att.data.attemptsRemaining, 0);
      }
    }

    const fourthAtt = await apiRequest(`/api/stage2/challenges/${challenge2.id}/submit`, {
      method: 'POST',
      token: participantToken,
      body: { answer: 'ANOTHER_GUESS' }
    });
    assert.strictEqual(fourthAtt.status, 200);
    assert.strictEqual(fourthAtt.data.isLockedOut, true);
    assert.ok(fourthAtt.data.message.includes('Maximum 3 attempts reached'));

    const correctAtt = await apiRequest(`/api/stage2/challenges/${challenge1.id}/submit`, {
      method: 'POST',
      token: participantToken,
      body: { answer: 'NEXUS-CORE-2026' }
    });
    assert.strictEqual(correctAtt.status, 200);
    assert.strictEqual(correctAtt.data.isCorrect, true);

    const s2ProgressRes = await apiRequest('/api/admin/stage2/progress', {
      token: adminToken
    });
    assert.strictEqual(s2ProgressRes.status, 200);
    const teamP = s2ProgressRes.data.find((p: any) => p.teamId === participantTeamId);
    assert.ok(teamP);
    assert.strictEqual(teamP.hintsUsedCount, 1);
    assert.strictEqual(teamP.deductionMarks, 2);

    // 6.6 Stage 2 finalization / completion submission
    const preCompleteStatus = await apiRequest('/api/stage2/status', {
      token: participantToken
    });
    assert.strictEqual(preCompleteStatus.status, 200);
    assert.strictEqual(preCompleteStatus.data.hasSubmitted, false);

    const completeRes = await apiRequest('/api/stage2/complete', {
      method: 'POST',
      token: participantToken
    });
    assert.strictEqual(completeRes.status, 200);
    assert.ok(completeRes.data.completedAt);
    assert.strictEqual(completeRes.data.hintsUsed, 1);

    const postCompleteStatus = await apiRequest('/api/stage2/status', {
      token: participantToken
    });
    assert.strictEqual(postCompleteStatus.status, 200);
    assert.strictEqual(postCompleteStatus.data.hasSubmitted, true);
    assert.strictEqual(postCompleteStatus.data.submittedAt, completeRes.data.completedAt);
  });

  test('7. Stage 3 Dataset EDA One-Time Selection & Admin Reset', async () => {
    await apiRequest('/api/admin/stages/stage3', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'OPEN' }
    });

    const dsRes = await apiRequest('/api/stage3/datasets', {
      token: participantToken
    });
    assert.strictEqual(dsRes.status, 200);
    assert.ok(dsRes.data.length >= 2);

    const selRes = await apiRequest('/api/stage3/select', {
      method: 'POST',
      token: participantToken,
      body: { datasetId: 'ds1' }
    });
    assert.strictEqual(selRes.status, 201);

    const secondSelRes = await apiRequest('/api/stage3/select', {
      method: 'POST',
      token: participantToken,
      body: { datasetId: 'ds2' }
    });
    assert.strictEqual(secondSelRes.status, 400);
    assert.ok(secondSelRes.data.error.includes('One-time selection is enforced'));

    const resetRes = await apiRequest('/api/admin/stage3/reset-selection', {
      method: 'POST',
      token: adminToken,
      body: { teamId: participantTeamId }
    });
    assert.strictEqual(resetRes.status, 200);

    const reSelRes = await apiRequest('/api/stage3/select', {
      method: 'POST',
      token: participantToken,
      body: { datasetId: 'ds2' }
    });
    assert.strictEqual(reSelRes.status, 201);
  });

  test('8. Stage 4 & 5 Selection Continuity', async () => {
    await apiRequest('/api/admin/stages/stage4', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'OPEN' }
    });
    await apiRequest('/api/admin/stages/stage5', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'OPEN' }
    });

    const earlyStage5Res = await apiRequest('/api/stage5/problem', {
      token: participantToken
    });
    assert.strictEqual(earlyStage5Res.status, 400);
    assert.strictEqual(earlyStage5Res.data.code, 'STAGE4_SELECTION_REQUIRED');

    const selRes = await apiRequest('/api/stage4/select', {
      method: 'POST',
      token: participantToken,
      body: { problemId: 'ps1' }
    });
    assert.strictEqual(selRes.status, 201);

    const dupRes = await apiRequest('/api/stage4/select', {
      method: 'POST',
      token: participantToken,
      body: { problemId: 'ps2' }
    });
    assert.strictEqual(dupRes.status, 400);

    const stage5Res = await apiRequest('/api/stage5/problem', {
      token: participantToken
    });
    assert.strictEqual(stage5Res.status, 200);
    assert.strictEqual(stage5Res.data.continuityVerified, true);
    assert.strictEqual(stage5Res.data.problem.id, 'ps1');
    assert.ok(stage5Res.data.problem.stage5Instructions);

    const matrixRes = await apiRequest('/api/admin/overview', {
      token: adminToken
    });
    assert.strictEqual(matrixRes.status, 200);
    const progress = matrixRes.data.progress.find((p: any) => p.teamId === participantTeamId);
    assert.ok(progress);
    assert.strictEqual(progress.stage4.problemId, 'ps1');
    assert.strictEqual(progress.stage5.continuityVerified, true);
  });

  /* ========================================================================
     P0 SECURITY SLICE TESTS
     ======================================================================== */

  test('9. Stage 3 Dataset Authorization: Team Selection & Isolation Enforcement', async () => {
    // Team 1 (CyberSentinels) has selected 'ds2' in test 7.
    // 9.1: Team 1 downloading its selected dataset 'ds2' succeeds
    const dlSuccess = await apiRequest('/api/stage3/download/ds2', {
      token: participantToken
    });
    assert.strictEqual(dlSuccess.status, 200);
    assert.ok(dlSuccess.raw.includes('event_id') || dlSuccess.raw.includes('timestamp'), 'Must return valid dataset content');

    // 9.2: Team 1 attempting to download unselected dataset 'ds1' is rejected with 403 DATASET_ACCESS_UNAUTHORIZED
    const dlUnselected = await apiRequest('/api/stage3/download/ds1', {
      token: participantToken
    });
    assert.strictEqual(dlUnselected.status, 403);
    assert.strictEqual(dlUnselected.data.code, 'DATASET_ACCESS_UNAUTHORIZED');

    // 9.3: Register Team B
    const regTeamB = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        teamName: 'ShadowVanguard',
        email: 'vanguard@nexus.edu',
        password: 'Password123!',
        members: ['Carol Danvers', 'Diana Prince']
      }
    });
    assert.strictEqual(regTeamB.status, 201);
    const teamBToken = regTeamB.data.token;

    // 9.4: Team B has not selected a dataset yet -> download attempt is rejected with 403
    const dlNoSel = await apiRequest('/api/stage3/download/ds1', {
      token: teamBToken
    });
    assert.strictEqual(dlNoSel.status, 403);
    assert.strictEqual(dlNoSel.data.code, 'DATASET_ACCESS_UNAUTHORIZED');

    // 9.5: Team B selects 'ds1'
    const teamBSel = await apiRequest('/api/stage3/select', {
      method: 'POST',
      token: teamBToken,
      body: { datasetId: 'ds1' }
    });
    assert.strictEqual(teamBSel.status, 201);

    // 9.6: Team B downloads its selected dataset 'ds1' -> 200 OK
    const dlTeamBSuccess = await apiRequest('/api/stage3/download/ds1', {
      token: teamBToken
    });
    assert.strictEqual(dlTeamBSuccess.status, 200);
    assert.ok(dlTeamBSuccess.raw.includes('source_ip') || dlTeamBSuccess.raw.includes('protocol'));

    // 9.7: Team B attempting to download Team A's selected dataset 'ds2' is rejected
    const dlCrossTeam = await apiRequest('/api/stage3/download/ds2', {
      token: teamBToken
    });
    assert.strictEqual(dlCrossTeam.status, 403);
    assert.strictEqual(dlCrossTeam.data.code, 'DATASET_ACCESS_UNAUTHORIZED');

    // 9.8: Invalid / non-existent dataset ID request
    const dlInvalid = await apiRequest('/api/stage3/download/non-existent-ds-id', {
      token: teamBToken
    });
    assert.strictEqual(dlInvalid.status, 403); // Participant blocked because not selected
  });

  test('10. Filesystem Security, Extension Allowlist & Traversal Shielding', async () => {
    // 10.1: Disallowed file extensions rejected in dataset registration
    const badExtRes = await apiRequest('/api/admin/stage3/datasets', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Malicious Executable Dataset',
        filename: 'payload.exe',
        format: 'JSON'
      }
    });
    assert.strictEqual(badExtRes.status, 400);
    assert.ok(badExtRes.data.error.includes('Disallowed file extension'));

    const badScriptRes = await apiRequest('/api/admin/stage3/datasets', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Shell Script',
        filename: 'reverse_shell.sh',
        format: 'CSV'
      }
    });
    assert.strictEqual(badScriptRes.status, 400);

    // 10.2: Directory traversal in filename rejected
    const traversalRes = await apiRequest('/api/admin/stage3/datasets', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Traversal Attempt',
        filename: '../../package.json',
        format: 'JSON'
      }
    });
    assert.strictEqual(traversalRes.status, 400);
    assert.ok(traversalRes.data.error.includes('Directory traversal and path separators are prohibited'));

    // 10.3: Windows-style backslashes in filename rejected
    const winTraversalRes = await apiRequest('/api/admin/stage3/datasets', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Windows Traversal Attempt',
        filename: '..\\..\\windows\\system.ini.csv',
        format: 'CSV'
      }
    });
    assert.strictEqual(winTraversalRes.status, 400);

    // 10.4: Absolute path in filename rejected
    const absPathRes = await apiRequest('/api/admin/stage3/datasets', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Absolute Path Attempt',
        filename: '/etc/passwd.csv',
        format: 'CSV'
      }
    });
    assert.strictEqual(absPathRes.status, 400);

    // 10.5: Direct URL encoded traversal download request rejected safely
    const encodedTraversalRes = await apiRequest('/api/stage3/download/%2e%2e%2fpackage.json', {
      token: adminToken
    });
    assert.ok([400, 403, 404].includes(encodedTraversalRes.status));
    assert.ok(!encodedTraversalRes.raw.includes('node_modules') && !encodedTraversalRes.raw.includes('express'), 'Internal files must not leak');
  });

  test('11. JWT Configuration Validation & Environment Fail-Safe', () => {
    const savedEnv = process.env.NODE_ENV;
    const savedSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';

      // 11.1: Missing secret in production fails startup
      delete process.env.JWT_SECRET;
      assert.throws(() => getJwtSecret(), /FATAL: JWT_SECRET environment variable is missing in production/);

      // 11.2: Short secret in production (<32 chars) fails startup
      process.env.JWT_SECRET = 'short_insecure_key_123';
      assert.throws(() => getJwtSecret(), /FATAL: JWT_SECRET must be at least 32 characters in production/);

      // 11.3: Known example default secret in production fails startup
      process.env.JWT_SECRET = 'nexus_super_secret_jwt_key_2026_change_in_production';
      assert.throws(() => getJwtSecret(), /FATAL: JWT_SECRET matches a known insecure default example/);

      // 11.4: In development without secret, ephemeral secret is generated
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;
      const ephemeralSecret = getJwtSecret();
      assert.ok(ephemeralSecret && ephemeralSecret.length >= 32);
      assert.notStrictEqual(ephemeralSecret, 'nexus_development_secret_key_change_in_production_2026', 'Must not fall back to static dev secret');
    } finally {
      process.env.NODE_ENV = savedEnv;
      if (savedSecret) {
        process.env.JWT_SECRET = savedSecret;
      }
    }
  });

  test('12. Administrator Bootstrap Credential Preservation & Omission', async () => {
    // 12.1: Bootstrap skipped when configuration is missing
    const savedEmail = process.env.ADMIN_EMAIL;
    const savedPass = process.env.ADMIN_PASSWORD;

    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;

    // Must not throw or create admin
    await seedDefaultAdmin();

    // 12.2: Existing administrator credentials are not overwritten
    const existingAdmin = await store.findTeamByEmail('admin@glitched.campus');
    assert.ok(existingAdmin, 'Existing admin must be present');
    const originalHash = existingAdmin.passwordHash;

    process.env.ADMIN_EMAIL = 'admin@glitched.campus';
    process.env.ADMIN_PASSWORD = 'CompletelyNewAttemptedPassword999!';

    await seedDefaultAdmin();

    const afterAdmin = await store.findTeamByEmail('admin@glitched.campus');
    assert.ok(afterAdmin);
    assert.strictEqual(afterAdmin.passwordHash, originalHash, 'Existing administrator credentials must be preserved');

    // Restore
    process.env.ADMIN_EMAIL = savedEmail;
    process.env.ADMIN_PASSWORD = savedPass;
  });

  test('13. Stage 1 Quiz Concurrency & Atomic Duplicate Shielding', async () => {
    // 13.1 Register a new team specifically for concurrency validation
    const regRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        teamName: 'ConcurrentSentinels',
        email: 'concurrent@nexus.edu',
        password: 'Password123!',
        members: ['Tester Alpha', 'Tester Beta']
      }
    });
    assert.strictEqual(regRes.status, 201);
    const concurrentToken = regRes.data.token;
    const concurrentTeamId = regRes.data.team.id;

    // Ensure Stage 1 is open
    await apiRequest('/api/admin/stages/stage1', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'open' }
    });

    // 13.2 Fire 10 concurrent submission requests for the same team with distinct answers
    const payloadVariations = [
      { q1: 'A', q2: 'B', q3: 'C', q4: 'A' },
      { q1: 'B', q2: 'C', q3: 'D', q4: 'B' },
      { q1: 'C', q2: 'D', q3: 'A', q4: 'C' },
      { q1: 'D', q2: 'A', q3: 'B', q4: 'D' },
      { q1: 'A', q2: 'A', q3: 'A', q4: 'A' },
      { q1: 'B', q2: 'B', q3: 'B', q4: 'B' },
      { q1: 'C', q2: 'C', q3: 'C', q4: 'C' },
      { q1: 'D', q2: 'D', q3: 'D', q4: 'D' },
      { q1: 'A', q2: 'C', q3: 'A', q4: 'C' },
      { q1: 'B', q2: 'D', q3: 'B', q4: 'D' }
    ];

    const concurrentRequests = payloadVariations.map(answers =>
      apiRequest('/api/stage1/submit', {
        method: 'POST',
        token: concurrentToken,
        body: { answers }
      })
    );

    const responses = await Promise.all(concurrentRequests);

    // 13.3 Exactly one request must succeed (HTTP 200), and all other 9 must fail with HTTP 409 QUIZ_SUBMISSION_EXISTS
    const successfulResponses = responses.filter(r => r.status === 200);
    const duplicateResponses = responses.filter(r => r.status === 409);

    assert.strictEqual(successfulResponses.length, 1, 'Exactly one concurrent submission must succeed with HTTP 200');
    assert.strictEqual(duplicateResponses.length, 9, 'All other concurrent submissions must be rejected with HTTP 409');

    for (const dup of duplicateResponses) {
      assert.strictEqual(dup.data.code, 'QUIZ_SUBMISSION_EXISTS');
      assert.ok(dup.data.error.includes('already submitted'));
    }

    // 13.4 Verify that exactly one submission is recorded in the store for this team
    const adminSubsRes = await apiRequest('/api/admin/stage1/submissions', {
      token: adminToken
    });
    assert.strictEqual(adminSubsRes.status, 200);
    const storedTeamSubs = adminSubsRes.data.filter((s: any) => s.teamId === concurrentTeamId);
    assert.strictEqual(storedTeamSubs.length, 1, 'Store must contain exactly one submission for the team');

    const originalStoredSub = storedTeamSubs[0];
    const originalSubmittedAt = originalStoredSub.submittedAt;
    const originalScore = originalStoredSub.score;
    const originalAnswers = { ...originalStoredSub.answers };

    // 13.5 Send a subsequent sequential duplicate request and verify it is rejected and does NOT overwrite original
    const subsequentDup = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: concurrentToken,
      body: { answers: { q1: 'WRONG', q2: 'WRONG' } }
    });
    assert.strictEqual(subsequentDup.status, 409);
    assert.strictEqual(subsequentDup.data.code, 'QUIZ_SUBMISSION_EXISTS');

    // Verify stored submission remains strictly untouched
    const recheckSubs = await apiRequest('/api/admin/stage1/submissions', {
      token: adminToken
    });
    const recheckTeamSub = recheckSubs.data.find((s: any) => s.teamId === concurrentTeamId);
    assert.ok(recheckTeamSub);
    assert.strictEqual(recheckTeamSub.submittedAt, originalSubmittedAt, 'Original submission timestamp must remain untouched');
    assert.strictEqual(recheckTeamSub.score, originalScore, 'Original score must not be recalculated');
    assert.deepStrictEqual(recheckTeamSub.answers, originalAnswers, 'Original answers must not be overwritten');
  });

  test('14. Global Competition Freeze & Primary Admin Server Enforcement', async () => {
    // 14.1 Initial freeze status check
    const initialStatus = await apiRequest('/api/freeze-status');
    assert.strictEqual(initialStatus.status, 200);
    assert.strictEqual(initialStatus.data.isCompetitionFrozen, false);

    // 14.2 Participant unauthorized attempt to toggle freeze rejected
    const participantAttempt = await apiRequest('/api/admin/freeze', {
      method: 'POST',
      token: participantToken,
      body: { freeze: true, reason: 'Participant malicious freeze attempt' }
    });
    assert.strictEqual(participantAttempt.status, 403);
    assert.strictEqual(participantAttempt.data.code, 'FORBIDDEN');

    // 14.3 Non-primary event administrator attempt rejected with FORBIDDEN_PRIMARY_ONLY
    const createAdminRes = await apiRequest('/api/admin/admins', {
      method: 'POST',
      token: adminToken,
      body: {
        email: 'eventadmin.freeze@nexus.edu',
        teamName: 'Event Coordinator Freeze Test',
        password: 'Password123!',
        adminRole: 'event_admin'
      }
    });
    assert.strictEqual(createAdminRes.status, 201);

    const eventAdminLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        emailOrTeamName: 'eventadmin.freeze@nexus.edu',
        password: 'Password123!'
      }
    });
    assert.strictEqual(eventAdminLogin.status, 200);
    const eventAdminToken = eventAdminLogin.data.token;

    const eventAdminAttempt = await apiRequest('/api/admin/freeze', {
      method: 'POST',
      token: eventAdminToken,
      body: { freeze: true, reason: 'Event admin unauthorized freeze attempt' }
    });
    assert.strictEqual(eventAdminAttempt.status, 403);
    assert.strictEqual(eventAdminAttempt.data.code, 'FORBIDDEN_PRIMARY_ONLY');

    // 14.4 Primary administrator enacts global competition freeze
    const enactFreezeRes = await apiRequest('/api/admin/freeze', {
      method: 'POST',
      token: adminToken,
      body: { isFrozen: true, reason: 'Mid-competition audit pause' }
    });
    assert.strictEqual(enactFreezeRes.status, 200);
    assert.strictEqual(enactFreezeRes.data.settings.isCompetitionFrozen, true);
    assert.strictEqual(enactFreezeRes.data.settings.freezeReason, 'Mid-competition audit pause');

    // Verify public status endpoint reports frozen state
    const frozenStatusRes = await apiRequest('/api/freeze-status');
    assert.strictEqual(frozenStatusRes.status, 200);
    assert.strictEqual(frozenStatusRes.data.isCompetitionFrozen, true);
    assert.strictEqual(frozenStatusRes.data.freezeReason, 'Mid-competition audit pause');

    // 14.5 Register a fresh participant team during or right before freeze
    const freshTeamRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        teamName: 'FreezeTestTeam',
        email: 'freezetest@nexus.edu',
        password: 'Password123!',
        members: ['Tester Frozen']
      }
    });
    assert.strictEqual(freshTeamRes.status, 201);
    const freshToken = freshTeamRes.data.token;

    // 14.6 Verify all participant state-mutating endpoints are blocked server-side
    // Stage 1 submit blocked
    const s1Blocked = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: freshToken,
      body: { answers: { q1: 'A' } }
    });
    assert.strictEqual(s1Blocked.status, 403);
    assert.strictEqual(s1Blocked.data.code, 'COMPETITION_FROZEN');

    // Stage 2 hint request blocked
    const s2HintBlocked = await apiRequest('/api/stage2/challenges/challenge-01/hint', {
      method: 'POST',
      token: freshToken
    });
    assert.strictEqual(s2HintBlocked.status, 403);
    assert.strictEqual(s2HintBlocked.data.code, 'COMPETITION_FROZEN');

    // Stage 2 answer submission blocked
    const s2SubmitBlocked = await apiRequest('/api/stage2/challenges/challenge-01/submit', {
      method: 'POST',
      token: freshToken,
      body: { answer: 'DECODED' }
    });
    assert.strictEqual(s2SubmitBlocked.status, 403);
    assert.strictEqual(s2SubmitBlocked.data.code, 'COMPETITION_FROZEN');

    // Stage 2 completion finalization blocked during freeze
    const s2CompleteBlocked = await apiRequest('/api/stage2/complete', {
      method: 'POST',
      token: freshToken
    });
    assert.strictEqual(s2CompleteBlocked.status, 403);
    assert.strictEqual(s2CompleteBlocked.data.code, 'COMPETITION_FROZEN');

    // Stage 3 dataset selection blocked
    const s3Blocked = await apiRequest('/api/stage3/select', {
      method: 'POST',
      token: freshToken,
      body: { datasetId: 'ds-01' }
    });
    assert.strictEqual(s3Blocked.status, 403);
    assert.strictEqual(s3Blocked.data.code, 'COMPETITION_FROZEN');

    // Stage 4 problem selection blocked
    const s4Blocked = await apiRequest('/api/stage4/select', {
      method: 'POST',
      token: freshToken,
      body: { problemId: 'ps-01' }
    });
    assert.strictEqual(s4Blocked.status, 403);
    assert.strictEqual(s4Blocked.data.code, 'COMPETITION_FROZEN');

    // 14.7 Read-only endpoints pass through and work normally during freeze
    const s1Questions = await apiRequest('/api/stage1/questions', { token: freshToken });
    assert.strictEqual(s1Questions.status, 200);
    assert.ok(Array.isArray(s1Questions.data));

    const s2Challenges = await apiRequest('/api/stage2/challenges', { token: freshToken });
    assert.strictEqual(s2Challenges.status, 200);
    assert.ok(Array.isArray(s2Challenges.data));

    const s3Datasets = await apiRequest('/api/stage3/datasets', { token: freshToken });
    assert.strictEqual(s3Datasets.status, 200);
    assert.ok(Array.isArray(s3Datasets.data));

    const s4Problems = await apiRequest('/api/stage4/problems', { token: freshToken });
    assert.strictEqual(s4Problems.status, 200);
    assert.ok(Array.isArray(s4Problems.data));

    // 14.8 Primary administrator lifts the freeze
    const unfreezeRes = await apiRequest('/api/admin/freeze', {
      method: 'POST',
      token: adminToken,
      body: { isFrozen: false }
    });
    assert.strictEqual(unfreezeRes.status, 200);
    assert.strictEqual(unfreezeRes.data.settings.isCompetitionFrozen, false);

    const postUnfreezeStatus = await apiRequest('/api/freeze-status');
    assert.strictEqual(postUnfreezeStatus.status, 200);
    assert.strictEqual(postUnfreezeStatus.data.isCompetitionFrozen, false);

    // Ensure Stage 3 is open for selection
    await apiRequest('/api/admin/stages/stage3', {
      method: 'PATCH',
      token: adminToken,
      body: { status: 'open' }
    });

    // Participant mutation can now proceed normally after freeze is lifted
    const s3AllowedAfter = await apiRequest('/api/stage3/select', {
      method: 'POST',
      token: freshToken,
      body: { datasetId: s3Datasets.data[0].id }
    });
    assert.strictEqual(s3AllowedAfter.status, 201);
    assert.strictEqual(s3AllowedAfter.data.selection.datasetId, s3Datasets.data[0].id);
  });

  test('15. Stage 1 Extended Telemetry & Copy/Cut/Paste/ContextMenu Auditing', async () => {
    // 15.1 Verify all permitted telemetry event types succeed
    const eventTypes = [
      'tab_blur',
      'tab_focus',
      'copy_attempt',
      'cut_attempt',
      'paste_attempt',
      'context_menu'
    ] as const;

    for (const evt of eventTypes) {
      const logRes = await apiRequest('/api/stage1/log-event', {
        method: 'POST',
        token: participantToken,
        body: {
          eventType: evt,
          details: `Automated test signal for ${evt}`
        }
      });
      assert.strictEqual(logRes.status, 201);
      assert.strictEqual(logRes.data.status, 'logged');
    }

    // 15.2 Invalid event type is rejected with 400
    const invalidRes = await apiRequest('/api/stage1/log-event', {
      method: 'POST',
      token: participantToken,
      body: {
        eventType: 'unauthorized_arbitrary_event',
        details: 'Malicious payload'
      }
    });
    assert.strictEqual(invalidRes.status, 400);
    assert.strictEqual(invalidRes.data.error, 'Invalid event type.');

    // 15.3 Admin fetches logs and confirms cut and paste attempts are properly recorded
    const logsRes = await apiRequest('/api/admin/stage1/event-logs', {
      token: adminToken
    });
    assert.strictEqual(logsRes.status, 200);
    assert.ok(Array.isArray(logsRes.data));

    const cutLogs = logsRes.data.filter((l: any) => l.eventType === 'cut_attempt');
    const pasteLogs = logsRes.data.filter((l: any) => l.eventType === 'paste_attempt');
    const copyLogs = logsRes.data.filter((l: any) => l.eventType === 'copy_attempt');
    const ctxLogs = logsRes.data.filter((l: any) => l.eventType === 'context_menu');

    assert.ok(cutLogs.length >= 1, 'Cut attempts must be logged in audit trail');
    assert.ok(pasteLogs.length >= 1, 'Paste attempts must be logged in audit trail');
    assert.ok(copyLogs.length >= 1, 'Copy attempts must be logged in audit trail');
    assert.ok(ctxLogs.length >= 1, 'Context menu attempts must be logged in audit trail');

    // Verify metadata fidelity
    const sampleLog = cutLogs[0];
    assert.ok(sampleLog.teamId, 'Log must include teamId');
    assert.ok(sampleLog.teamName, 'Log must include teamName');
    assert.ok(sampleLog.timestamp, 'Log must include timestamp');
    assert.ok(sampleLog.details.includes('cut_attempt'), 'Log must preserve event details');
  });

  test('16. Input Validation, Type Safety, and Error Shielding', async () => {
    // 16.1 Registration member bounds (maximum 5 members enforced)
    const overMemberRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        teamName: 'OverLimitTeam',
        email: 'overlimit@nexus.edu',
        password: 'Password123!',
        members: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6']
      }
    });
    assert.strictEqual(overMemberRes.status, 400);
    assert.strictEqual(overMemberRes.data.error, 'A team can have a maximum of 5 members.');

    // 16.2 Successful registration within limit
    const valRegRes = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        teamName: 'InputValidationSquad',
        email: 'val_squad@nexus.edu',
        password: 'Password123!',
        members: ['Val Lead', 'QA Specialist']
      }
    });
    assert.strictEqual(valRegRes.status, 201);
    const valToken = valRegRes.data.token;

    // 16.3 Login type safety: non-string email/teamName or password rejected with 400
    const nonStringLogin1 = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        emailOrTeamName: 12345,
        password: 'Password123!'
      }
    });
    assert.strictEqual(nonStringLogin1.status, 400);

    const nonStringLogin2 = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        emailOrTeamName: 'val_squad@nexus.edu',
        password: true
      }
    });
    assert.strictEqual(nonStringLogin2.status, 400);

    // 16.4 Stage 1 submit input validation: empty, array, forbidden keys, or malformed payloads rejected
    const emptyAnswersRes = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: valToken,
      body: { answers: {} }
    });
    assert.strictEqual(emptyAnswersRes.status, 400);

    const arrayAnswersRes = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: valToken,
      body: { answers: ['A', 'B'] }
    });
    assert.strictEqual(arrayAnswersRes.status, 400);

    const forbiddenKeyRes = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: valToken,
      body: { answers: { constructor: 'A' } }
    });
    assert.strictEqual(forbiddenKeyRes.status, 400);

    const nonStringAnswerRes = await apiRequest('/api/stage1/submit', {
      method: 'POST',
      token: valToken,
      body: { answers: { q1: 12345 } }
    });
    assert.strictEqual(nonStringAnswerRes.status, 400);

    // 16.5 Stage 3 select invalid dataset returns 404
    const invalidDatasetRes = await apiRequest('/api/stage3/select', {
      method: 'POST',
      token: valToken,
      body: { datasetId: 'non-existent-dataset-id' }
    });
    assert.strictEqual(invalidDatasetRes.status, 404);

    // 16.6 Stage 4 select invalid problem statement returns 404
    const invalidProblemRes = await apiRequest('/api/stage4/select', {
      method: 'POST',
      token: valToken,
      body: { problemId: 'non-existent-problem-id' }
    });
    assert.strictEqual(invalidProblemRes.status, 404);
  });
});
