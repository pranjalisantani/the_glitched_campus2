import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { store } from '../store';
import { ALL_ADMIN_PERMISSIONS } from '../types';

// Helper to make local in-process HTTP requests using global fetch against the Express app
import express from 'express';
import cors from 'cors';
import authRoutes from '../routes/authRoutes';
import stageRoutes from '../routes/stageRoutes';
import adminRoutes from '../routes/adminRoutes';
import adminTestRoutes from '../routes/adminTestRoutes';

function createTestApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/auth', authRoutes);
  app.use('/api', stageRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/test-mode', adminTestRoutes);
  return app;
}

test('THE GLITCHED CAMPUS // Admin Event Data Management Test Suite', async (t) => {
  const app = createTestApp();
  let server: any;
  let baseUrl = '';

  let primaryAdminToken = '';
  let eventAdminToken = '';
  let restrictedAdminToken = '';
  let participantToken = '';
  let testTeamId = '';

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  t.after(() => {
    if (server) server.close();
  });

  // Setup Test Users
  await t.test('Setup: Create primary admin, event admin, and participant accounts', async () => {
    if (typeof (store as any).resetToSeed === 'function') {
      (store as any).resetToSeed();
    }
    const passwordHash = await bcrypt.hash('AdminP@ss123!', 10);
    
    // 1. Primary Admin
    const primaryAdmin = await store.createTeam({
      teamName: 'Master Control Admin',
      email: 'master-primary@glitched.campus',
      passwordHash,
      members: ['Primary Architect'],
      role: 'admin',
      adminRole: 'primary_admin',
      isPrimaryAdmin: true,
      permissions: [...ALL_ADMIN_PERMISSIONS]
    });
    primaryAdminToken = generateToken({
      teamId: primaryAdmin.id,
      teamName: primaryAdmin.teamName,
      email: primaryAdmin.email,
      role: 'admin',
      adminRole: 'primary_admin',
      isPrimaryAdmin: true,
      permissions: [...ALL_ADMIN_PERMISSIONS]
    });

    // 2. Event Admin with full event management permissions (but NOT primary)
    const eventAdmin = await store.createAdmin({
      teamName: 'Event Operations Admin',
      email: 'ops@glitched.campus',
      passwordHash,
      members: ['Operations Specialist'],
      adminRole: 'event_admin',
      permissions: [
        'manage_stages',
        'manage_stage1',
        'manage_stage2',
        'manage_stage3',
        'manage_stage4',
        'manage_stage5',
        'manage_teams',
        'manage_submissions',
        'view_audit_logs'
      ]
    });
    eventAdminToken = generateToken({
      teamId: eventAdmin.id,
      teamName: eventAdmin.teamName,
      email: eventAdmin.email,
      role: 'admin',
      adminRole: 'event_admin',
      isPrimaryAdmin: false,
      permissions: eventAdmin.permissions
    });

    // 3. Restricted Event Admin with only Stage 1 permission
    const restrictedAdmin = await store.createAdmin({
      teamName: 'Stage1 Only Admin',
      email: 'stage1-admin@glitched.campus',
      passwordHash,
      members: ['Stage 1 Proctor'],
      adminRole: 'event_admin',
      permissions: ['manage_stage1']
    });
    restrictedAdminToken = generateToken({
      teamId: restrictedAdmin.id,
      teamName: restrictedAdmin.teamName,
      email: restrictedAdmin.email,
      role: 'admin',
      adminRole: 'event_admin',
      isPrimaryAdmin: false,
      permissions: restrictedAdmin.permissions
    });

    // 4. Participant Team
    const team = await store.createTeam({
      teamName: 'Test Matrix Squad',
      email: 'squad-test@student.edu',
      passwordHash,
      members: ['Member Alpha', 'Member Beta'],
      role: 'participant'
    });
    testTeamId = team.id;
    participantToken = generateToken({
      teamId: team.id,
      teamName: team.teamName,
      email: team.email,
      role: 'participant'
    });

    assert.ok(primaryAdminToken);
    assert.ok(eventAdminToken);
    assert.ok(participantToken);
  });

  await t.test('1. Authorization: Only Primary Admin can manage admin accounts', async () => {
    // Primary admin can view admins
    const res1 = await fetch(`${baseUrl}/admin/admins`, {
      headers: { Authorization: `Bearer ${primaryAdminToken}` }
    });
    assert.equal(res1.status, 200);
    const admins = await res1.json();
    assert.ok(Array.isArray(admins));

    // Event admin CANNOT access /admin/admins (returns 403)
    const res2 = await fetch(`${baseUrl}/admin/admins`, {
      headers: { Authorization: `Bearer ${eventAdminToken}` }
    });
    assert.equal(res2.status, 403);
    const err = (await res2.json()) as any;
    assert.equal(err.code, 'FORBIDDEN_PRIMARY_ONLY');

    // Participant CANNOT access (returns 403)
    const res3 = await fetch(`${baseUrl}/admin/admins`, {
      headers: { Authorization: `Bearer ${participantToken}` }
    });
    assert.equal(res3.status, 403);
  });

  await t.test('2. Authorization: Event admins cannot elevate own privileges or create primary admins', async () => {
    // Attempt by event admin to create an admin
    const res1 = await fetch(`${baseUrl}/admin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        teamName: 'Hacker Admin',
        email: 'hacker@admin.com',
        password: 'Password123!',
        permissions: ['manage_admins']
      })
    });
    assert.equal(res1.status, 403);

    // Primary admin creates a valid event admin
    const uniqueEmail = `junior-${Date.now()}@glitched.campus`;
    const res2 = await fetch(`${baseUrl}/admin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${primaryAdminToken}`
      },
      body: JSON.stringify({
        teamName: 'Junior Monitor',
        email: uniqueEmail,
        password: 'Password123!',
        permissions: ['view_audit_logs']
      })
    });
    assert.equal(res2.status, 201);
    const data = (await res2.json()) as any;
    assert.equal(data.admin.adminRole, 'event_admin');
    assert.equal(data.admin.isPrimaryAdmin, false);
  });

  await t.test('3. RBAC Enforcement: Restricted admin cannot manage stages outside permissions', async () => {
    // Restricted admin has only manage_stage1. They can read Stage 1 questions:
    const res1 = await fetch(`${baseUrl}/admin/stage1/questions`, {
      headers: { Authorization: `Bearer ${restrictedAdminToken}` }
    });
    assert.equal(res1.status, 200);

    // But they CANNOT manage Stage 2 (returns 403 INSUFFICIENT_PERMISSIONS)
    const res2 = await fetch(`${baseUrl}/admin/stage2/challenges`, {
      headers: { Authorization: `Bearer ${restrictedAdminToken}` }
    });
    assert.equal(res2.status, 403);
    const err2 = (await res2.json()) as any;
    assert.equal(err2.code, 'INSUFFICIENT_PERMISSIONS');

    // Nor can they manage Stage 3 datasets
    const res3 = await fetch(`${baseUrl}/admin/stage3/datasets`, {
      headers: { Authorization: `Bearer ${restrictedAdminToken}` }
    });
    assert.equal(res3.status, 403);
  });

  await t.test('4. Stage 1 Content Management: Add, Edit, Delete questions and verify answers', async () => {
    // 1. Create a question
    const res1 = await fetch(`${baseUrl}/admin/stage1/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        prompt: 'What protocol does THE GLITCHED CAMPUS mainframe intercept?',
        options: [
          { id: 'A', text: 'HTTP/3 Quic' },
          { id: 'B', text: 'Encrypted DNS (DoH)' },
          { id: 'C', text: 'Campus TLS Anomaly' },
          { id: 'D', text: 'Plaintext Telnet' }
        ],
        correctOptionId: 'C',
        isActiveForLiveQuiz: true,
        explanation: 'TLS anomalies trigger gateway tripwires.',
        points: 2
      })
    });
    assert.equal(res1.status, 201);
    const createdQ = (await res1.json()) as any;
    assert.ok(createdQ.id);
    assert.equal(createdQ.correctOptionId, 'C');

    // 2. Edit the question
    const res2 = await fetch(`${baseUrl}/admin/stage1/questions/${createdQ.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        points: 5,
        explanation: 'Updated explanation for TLS anomalies.'
      })
    });
    assert.equal(res2.status, 200);
    const updatedQ = (await res2.json()) as any;
    assert.equal(updatedQ.points, 5);

    // 3. Delete the question
    const res3 = await fetch(`${baseUrl}/admin/stage1/questions/${createdQ.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${eventAdminToken}` }
    });
    assert.equal(res3.status, 200);
  });

  await t.test('5. Stage 1 Scoring & Submissions: Submit, Score Override, and Reset', async () => {
    // Ensure Stage 1 is OPEN
    await store.updateStageStatus('stage1', 'OPEN');

    // Submit quiz as participant
    const res1 = await fetch(`${baseUrl}/stage1/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${participantToken}`
      },
      body: JSON.stringify({
        answers: { 'q-demo-1': 'A' }
      })
    });
    assert.equal(res1.status, 200);
    const sub = await res1.json();

    // Admin views submissions
    const res2 = await fetch(`${baseUrl}/admin/stage1/submissions`, {
      headers: { Authorization: `Bearer ${eventAdminToken}` }
    });
    assert.equal(res2.status, 200);
    const subList = (await res2.json()) as any;
    const teamSub = subList.find((s: any) => s.teamId === testTeamId);
    assert.ok(teamSub);

    // Admin overrides score
    const res3 = await fetch(`${baseUrl}/admin/stage1/submissions/${testTeamId}/score`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        score: 9.5,
        note: 'Forensic penalty adjusted on review'
      })
    });
    assert.equal(res3.status, 200);
    const over = (await res3.json()) as any;
    assert.equal(over.submission.score, 9.5);
    assert.equal(over.submission.overrideNote, 'Forensic penalty adjusted on review');

    // Admin resets quiz submission for team
    const res4 = await fetch(`${baseUrl}/admin/stage1/submissions/${testTeamId}/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${eventAdminToken}` }
    });
    assert.equal(res4.status, 200);

    // Verify team can submit again after reset
    const checkSub = await store.getQuizSubmissionByTeam(testTeamId);
    assert.equal(checkSub, null);
  });

  await t.test('6. Stage 2 Decode: Challenges, Progress, and Score Override', async () => {
    // 1. Create a decode challenge
    const res1 = await fetch(`${baseUrl}/admin/stage2/challenges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        title: 'Quantum Key Derivation',
        description: 'Decode the polyalphabetic stream.',
        encodedPayload: 'V2VsY29tZVRvVGhlTWF0cml4',
        expectedAnswer: 'MATRIX-KEY-404',
        hint: 'Base64 decode then check offset',
        points: 15,
        maxAttempts: 3,
        hintDeduction: 3
      })
    });
    assert.equal(res1.status, 201);
    const ch = (await res1.json()) as any;
    assert.ok(ch.id);

    // 2. Open Stage 2 & participant attempts challenge
    await store.updateStageStatus('stage2', 'OPEN');
    const attRes = await fetch(`${baseUrl}/stage2/challenges/${ch.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${participantToken}`
      },
      body: JSON.stringify({
        answer: 'WRONG-ANSWER'
      })
    });
    assert.equal(attRes.status, 200);

    // 3. Admin views progress
    const resProgress = await fetch(`${baseUrl}/admin/stage2/progress`, {
      headers: { Authorization: `Bearer ${eventAdminToken}` }
    });
    assert.equal(resProgress.status, 200);

    // 4. Admin overrides Stage 2 score
    const resOverride = await fetch(`${baseUrl}/admin/stage2/progress/${testTeamId}/score`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        score: 8.0,
        note: 'Manual review bonus applied'
      })
    });
    assert.equal(resOverride.status, 200);
    const overData = (await resOverride.json()) as any;
    assert.equal(overData.progress.provisionalScore, 8.0);
    assert.equal(overData.progress.overrideNote, 'Manual review bonus applied');

    // 5. Admin resets Stage 2 progress
    const resReset = await fetch(`${baseUrl}/admin/stage2/progress/${testTeamId}/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${eventAdminToken}` }
    });
    assert.equal(resReset.status, 200);

    // Clean up created challenge
    await store.deleteDecodeChallenge(ch.id);
  });

  await t.test('7. Stage 3 Datasets: Secure File Upload & Directory Traversal Shielding', async () => {
    // 1. Upload valid CSV dataset
    const uploadRes = await fetch(`${baseUrl}/admin/stage3/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        filename: 'custom_security_telemetry.csv',
        name: 'Custom Security Telemetry',
        description: 'Live sensor telemetry dataset',
        content: 'timestamp,sensor_id,val\n2026-10-24T12:00:00Z,s1,99.4\n',
        recordCount: 1,
        schemaSummary: '3 columns'
      })
    });
    assert.equal(uploadRes.status, 201);
    const uploaded = (await uploadRes.json()) as any;
    assert.equal(uploaded.dataset.filename, 'custom_security_telemetry.csv');

    // 2. Reject directory traversal file upload
    const traversalRes = await fetch(`${baseUrl}/admin/stage3/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        filename: '../../../../malicious.csv',
        content: 'pwned'
      })
    });
    assert.equal(traversalRes.status, 400);

    // 3. Reject disallowed file extension
    const extRes = await fetch(`${baseUrl}/admin/stage3/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        filename: 'exploit.sh',
        content: '#!/bin/bash\necho bad'
      })
    });
    assert.equal(extRes.status, 400);

    // Clean up dataset metadata
    await store.deleteDataset(uploaded.dataset.id);
  });

  await t.test('8. Stage Operational Configuration & Stage 5 Requirements/Criteria', async () => {
    // Update Stage 5 configuration
    const res = await fetch(`${baseUrl}/admin/stages/stage5`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        status: 'OPEN',
        maxScore: 25,
        scoringRuleNotes: 'Evaluated on architecture diagram clarity and threat mitigation depth.',
        evaluationCriteria: [
          'Completeness of forensic pipeline',
          'Scalability of incident response architecture',
          'Live presentation defense'
        ],
        submissionRequirements: [
          'Architecture diagram (PDF or SVG)',
          'Executive summary presentation deck'
        ]
      })
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as any;
    assert.equal(data.stage.maxScore, 25);
    assert.equal(data.stage.evaluationCriteria.length, 3);
    assert.equal(data.stage.submissionRequirements.length, 2);
  });

  await t.test('9. Participant Management: Update roster, Reset password, Delete team', async () => {
    // 1. Update roster
    const resUpdate = await fetch(`${baseUrl}/admin/participants/${testTeamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        teamName: 'Updated Matrix Elite',
        members: ['Member Alpha', 'Member Beta', 'Member Gamma']
      })
    });
    assert.equal(resUpdate.status, 200);
    const updated = (await resUpdate.json()) as any;
    assert.equal(updated.team.teamName, 'Updated Matrix Elite');
    assert.equal(updated.team.members.length, 3);

    // 2. Reset password
    const resPass = await fetch(`${baseUrl}/admin/participants/${testTeamId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventAdminToken}`
      },
      body: JSON.stringify({
        newPassword: 'BrandNewSecureP@ss123'
      })
    });
    assert.equal(resPass.status, 200);

    // 3. Delete team
    const resDel = await fetch(`${baseUrl}/admin/participants/${testTeamId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${eventAdminToken}` }
    });
    assert.equal(resDel.status, 200);

    const check = await store.findTeamById(testTeamId);
    assert.equal(check, null);
  });

  await t.test('10. Audit Logging: Administrative mutations are recorded with actor and timestamp', async () => {
    const res = await fetch(`${baseUrl}/admin/audit-logs?limit=50`, {
      headers: { Authorization: `Bearer ${eventAdminToken}` }
    });
    assert.equal(res.status, 200);
    const logs = (await res.json()) as any;
    assert.ok(Array.isArray(logs));
    assert.ok(logs.length > 0);

    // Verify properties of log entry
    const sample = logs[0];
    assert.ok(sample.id);
    assert.ok(sample.timestamp);
    assert.ok(sample.actorEmail);
    assert.ok(sample.action);
  });

  await t.test('11. Data Safety: Persistent storage creates atomic JSON files on disk', async () => {
    const storageDir = path.resolve(__dirname, '../../storage/data');
    assert.ok(fs.existsSync(storageDir), 'Storage directory must exist on disk');

    const stagesFile = path.join(storageDir, 'stages.json');
    assert.ok(fs.existsSync(stagesFile), 'stages.json must exist');

    const content = JSON.parse(fs.readFileSync(stagesFile, 'utf8'));
    assert.ok(Array.isArray(content), 'stages.json must contain array of stage configs');
  });
});
