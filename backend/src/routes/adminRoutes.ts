import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../store';
import {
  requireAuth,
  requireAdmin,
  requirePrimaryAdmin,
  requirePermission,
  AuthenticatedRequest
} from '../middleware/auth';
import { StageId, StageStatus, AdminPermission, ALL_ADMIN_PERMISSIONS } from '../types';
import { validateDatasetFilename, saveSecureDatasetFile } from '../utils/datasetStorage';

const router = Router();

// Apply base authentication and administrator clearance to all routes
router.use(requireAuth, requireAdmin);

/**
 * Standard audit trail logger for admin operations
 */
async function logAudit(
  req: AuthenticatedRequest,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, any>
): Promise<void> {
  if (!req.user) return;
  await store.addAuditLog({
    actorId: req.user.teamId,
    actorEmail: req.user.email,
    actorRole: req.user.adminRole || (req.user.isPrimaryAdmin ? 'primary_admin' : 'event_admin'),
    action,
    targetType,
    targetId,
    details
  });
}

/* ==========================================================================
   PRIMARY ADMIN ONLY: ADMINISTRATOR ACCOUNT & PERMISSION MANAGEMENT
   ========================================================================== */

// List all administrator accounts (Primary Admin only)
router.get('/admins', requirePrimaryAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admins = await store.getAdmins();
    const sanitized = admins.map(a => ({
      id: a.id,
      teamName: a.teamName,
      email: a.email,
      role: a.role,
      adminRole: a.adminRole || (a.isPrimaryAdmin ? 'primary_admin' : 'event_admin'),
      permissions: a.permissions || [],
      isPrimaryAdmin: Boolean(a.isPrimaryAdmin),
      createdAt: a.createdAt
    }));
    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve admin accounts.', details: err.message });
  }
});

// Create a new Event Admin account (Primary Admin only)
// Note: Only event_admin can be created; cannot elevate to primary_admin
router.post('/admins', requirePrimaryAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamName, email, password, permissions } = req.body;

    if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2) {
      res.status(400).json({ error: 'Admin display name must be at least 2 characters long.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await store.findTeamByEmail(cleanEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Filter permitted permissions to only valid ones; prevent elevating to manage_admins unless explicitly allowed
    const validPerms: AdminPermission[] = Array.isArray(permissions)
      ? permissions.filter((p: any): p is AdminPermission => ALL_ADMIN_PERMISSIONS.includes(p))
      : [];

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await store.createAdmin({
      teamName: teamName.trim(),
      email: cleanEmail,
      passwordHash,
      members: ['Event Admin'],
      adminRole: 'event_admin',
      permissions: validPerms
    });

    await logAudit(req, 'admin.create', 'admin_account', created.id, {
      adminEmail: cleanEmail,
      adminName: teamName,
      permissions: validPerms
    });

    res.status(201).json({
      message: 'Event administrator account created successfully.',
      admin: {
        id: created.id,
        teamName: created.teamName,
        email: created.email,
        role: created.role,
        adminRole: created.adminRole,
        permissions: created.permissions,
        isPrimaryAdmin: false,
        createdAt: created.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create administrator account.', details: err.message });
  }
});

// Update an Event Admin's permissions (Primary Admin only)
router.put('/admins/:id/permissions', requirePrimaryAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.params.id;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({ error: 'Permissions must be provided as an array.' });
      return;
    }

    const targetAdmin = await store.findTeamById(adminId);
    if (!targetAdmin || targetAdmin.role !== 'admin') {
      res.status(404).json({ error: 'Administrator account not found.' });
      return;
    }

    if (targetAdmin.isPrimaryAdmin) {
      res.status(403).json({ error: 'Primary administrator permissions cannot be altered.' });
      return;
    }

    const validPerms: AdminPermission[] = permissions.filter((p: any): p is AdminPermission =>
      ALL_ADMIN_PERMISSIONS.includes(p)
    );

    const updated = await store.updateAdminPermissions(adminId, validPerms);

    await logAudit(req, 'admin.update_permissions', 'admin_account', adminId, {
      adminEmail: targetAdmin.email,
      permissions: validPerms
    });

    res.json({
      message: 'Administrator permissions updated successfully.',
      admin: {
        id: updated?.id,
        teamName: updated?.teamName,
        email: updated?.email,
        adminRole: updated?.adminRole,
        permissions: updated?.permissions,
        isPrimaryAdmin: false
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update administrator permissions.', details: err.message });
  }
});

// Delete an Event Admin (Primary Admin only)
router.delete('/admins/:id', requirePrimaryAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.params.id;
    const targetAdmin = await store.findTeamById(adminId);

    if (!targetAdmin || targetAdmin.role !== 'admin') {
      res.status(404).json({ error: 'Administrator account not found.' });
      return;
    }

    if (targetAdmin.isPrimaryAdmin) {
      res.status(403).json({ error: 'The primary administrator account cannot be deleted.' });
      return;
    }

    const deleted = await store.deleteAdmin(adminId);
    if (!deleted) {
      res.status(400).json({ error: 'Failed to delete administrator account.' });
      return;
    }

    await logAudit(req, 'admin.delete', 'admin_account', adminId, {
      adminEmail: targetAdmin.email,
      adminName: targetAdmin.teamName
    });

    res.json({ message: 'Administrator account successfully deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete administrator account.', details: err.message });
  }
});

/* ==========================================================================
   EVENT OPERATIONS: OVERVIEW & AUDIT LOGS
   ========================================================================== */

// Overview / Team Matrix
router.get('/overview', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teams = await store.getAllTeams();
    const progress = await store.getTeamProgressSummaries();
    const stages = await store.getAllStages();

    res.json({
      teamsCount: teams.filter(t => t.role === 'participant').length,
      stages,
      progress
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve overview.', details: err.message });
  }
});

// Audit Logs query (Permission: view_audit_logs)
router.get('/audit-logs', requirePermission('view_audit_logs'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 100;
    const logs = await store.getAuditLogs(limit);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs.', details: err.message });
  }
});

/* ==========================================================================
   STAGE CONFIGURATION & STATUS MANAGEMENT
   ========================================================================== */

// Update stage status or operational configuration (Permission: manage_stages)
router.patch('/stages/:stageId', requirePermission('manage_stages'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const stageId = req.params.stageId as StageId;
    const {
      status,
      name,
      description,
      maxScore,
      isScoringProvisional,
      scoringRuleNotes,
      evaluationCriteria,
      submissionRequirements
    } = req.body;

    const updates: Partial<any> = {};

    if (status !== undefined) {
      if (!['LOCKED', 'OPEN', 'CLOSED'].includes(status)) {
        res.status(400).json({ error: 'Invalid stage status. Must be LOCKED, OPEN, or CLOSED.' });
        return;
      }
      updates.status = status as StageStatus;
    }

    if (name && typeof name === 'string') updates.name = name.trim();
    if (description && typeof description === 'string') updates.description = description.trim();
    if (maxScore !== undefined) updates.maxScore = Number(maxScore);
    if (isScoringProvisional !== undefined) updates.isScoringProvisional = Boolean(isScoringProvisional);
    if (scoringRuleNotes !== undefined) updates.scoringRuleNotes = String(scoringRuleNotes);
    if (Array.isArray(evaluationCriteria)) updates.evaluationCriteria = evaluationCriteria;
    if (Array.isArray(submissionRequirements)) updates.submissionRequirements = submissionRequirements;

    const updated = await store.updateStageConfig(stageId, updates);

    await logAudit(req, 'stage.update_config', 'stage', stageId, { updates });

    res.json({
      message: `${updated.name} configuration updated successfully.`,
      stage: updated
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/* ==========================================================================
   GLOBAL COMPETITION FREEZE (PRIMARY ADMIN ONLY)
   ========================================================================== */

// Get competition freeze status
router.get('/freeze', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const settings = await store.getSystemSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve system settings.', details: err.message });
  }
});

// Toggle competition freeze (Strictly Primary Administrator clearance required)
router.post('/freeze', requirePrimaryAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { isFrozen, reason } = req.body;
    if (typeof isFrozen !== 'boolean') {
      res.status(400).json({ error: 'Field "isFrozen" must be a boolean (true to freeze, false to unfreeze).' });
      return;
    }

    const updated = await store.setCompetitionFreeze(
      isFrozen,
      reason ? String(reason).trim() : undefined,
      req.user?.email
    );

    await logAudit(
      req,
      isFrozen ? 'competition.freeze' : 'competition.unfreeze',
      'system_settings',
      'global',
      { isFrozen, reason: updated.freezeReason, frozenAt: updated.frozenAt }
    );

    res.json({
      message: isFrozen
        ? 'Competition successfully frozen. All participant mutations and submissions are paused.'
        : 'Competition freeze lifted. Normal operations restored.',
      settings: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update competition freeze state.', details: err.message });
  }
});

/* ==========================================================================
   PARTICIPANT MANAGEMENT (Permission: manage_teams)
   ========================================================================== */

// View all participant teams
router.get('/teams', requirePermission('manage_teams'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teams = await store.getAllTeams();
    const sanitized = teams
      .filter(t => t.role === 'participant')
      .map(t => ({
        id: t.id,
        teamName: t.teamName,
        email: t.email,
        members: t.members,
        role: t.role,
        createdAt: t.createdAt
      }));
    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch teams.', details: err.message });
  }
});

// Update participant team information (roster, email, name)
router.put('/participants/:id', requirePermission('manage_teams'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teamId = req.params.id;
    const { teamName, email, members } = req.body;

    const existing = await store.findTeamById(teamId);
    if (!existing || existing.role !== 'participant') {
      res.status(404).json({ error: 'Participant team not found.' });
      return;
    }

    const updates: Partial<any> = {};
    if (teamName && typeof teamName === 'string') updates.teamName = teamName.trim();
    if (email && typeof email === 'string' && email.includes('@')) updates.email = email.trim().toLowerCase();
    if (Array.isArray(members)) {
      const cleanMembers = members.map((m: any) => String(m).trim()).filter(m => m.length > 0);
      if (cleanMembers.length > 0) updates.members = cleanMembers;
    }

    const updated = await store.updateTeam(teamId, updates);

    await logAudit(req, 'participant.update', 'team', teamId, { updates });

    res.json({
      message: 'Participant team record updated successfully.',
      team: {
        id: updated?.id,
        teamName: updated?.teamName,
        email: updated?.email,
        members: updated?.members,
        createdAt: updated?.createdAt
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update participant team.', details: err.message });
  }
});

// Reset participant team password
router.post('/participants/:id/reset-password', requirePermission('manage_teams'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teamId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const existing = await store.findTeamById(teamId);
    if (!existing || existing.role !== 'participant') {
      res.status(404).json({ error: 'Participant team not found.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await store.updateTeam(teamId, { passwordHash });

    await logAudit(req, 'participant.reset_password', 'team', teamId, {
      teamName: existing.teamName,
      email: existing.email
    });

    res.json({ message: `Password for team ${existing.teamName} has been reset successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset password.', details: err.message });
  }
});

// Delete participant team (destructive, requires confirmation)
router.delete('/participants/:id', requirePermission('manage_teams'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teamId = req.params.id;
    const existing = await store.findTeamById(teamId);

    if (!existing || existing.role !== 'participant') {
      res.status(404).json({ error: 'Participant team not found.' });
      return;
    }

    const deleted = await store.deleteTeam(teamId);
    if (!deleted) {
      res.status(400).json({ error: 'Failed to delete participant team.' });
      return;
    }

    await logAudit(req, 'participant.delete', 'team', teamId, {
      teamName: existing.teamName,
      email: existing.email
    });

    res.json({ message: `Participant team ${existing.teamName} and all associated stage data were deleted.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete participant team.', details: err.message });
  }
});

/* ==========================================================================
   ADMIN STAGE 1: QUIZ MANAGEMENT, SUBMISSIONS & SCORE OVERRIDE
   ========================================================================== */

router.get('/stage1/questions', requirePermission('manage_stage1'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const questions = await store.getQuizQuestions(true);
    res.json(questions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch quiz questions.', details: err.message });
  }
});

router.post('/stage1/questions', requirePermission('manage_stage1'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { prompt, options, correctOptionId, isActiveForLiveQuiz, explanation, points } = req.body;
    if (!prompt || !options || !Array.isArray(options) || options.length !== 4 || !correctOptionId) {
      res.status(400).json({ error: 'Question must have a prompt, exactly 4 options, and a correctOptionId.' });
      return;
    }

    const newQ = await store.createQuizQuestion({
      prompt,
      options,
      correctOptionId,
      isActiveForLiveQuiz: Boolean(isActiveForLiveQuiz),
      explanation: explanation || '',
      points: Number(points) || 1,
      isDemonstration: false
    });

    await logAudit(req, 'stage1.create_question', 'quiz_question', newQ.id, { prompt });

    res.status(201).json(newQ);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create question.', details: err.message });
  }
});

router.put('/stage1/questions/:id', requirePermission('manage_stage1'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const questionId = req.params.id;
    const updated = await store.updateQuizQuestion(questionId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }

    await logAudit(req, 'stage1.update_question', 'quiz_question', questionId, { updates: req.body });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update question.', details: err.message });
  }
});

router.delete('/stage1/questions/:id', requirePermission('manage_stage1'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const questionId = req.params.id;
    const deleted = await store.deleteQuizQuestion(questionId);

    await logAudit(req, 'stage1.delete_question', 'quiz_question', questionId);

    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete question.', details: err.message });
  }
});

router.get('/stage1/submissions', requirePermission('manage_submissions'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const submissions = await store.getAllQuizSubmissions();
    res.json(submissions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch submissions.', details: err.message });
  }
});

// Override Stage 1 score
router.patch('/stage1/submissions/:teamId/score', requirePermission('manage_submissions'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teamId = req.params.teamId;
    const { score, note } = req.body;

    if (score === undefined || isNaN(Number(score))) {
      res.status(400).json({ error: 'Valid numerical score is required.' });
      return;
    }

    const updated = await store.updateQuizSubmissionScore(teamId, Number(score), note);
    if (!updated) {
      res.status(404).json({ error: 'Quiz submission not found for specified team.' });
      return;
    }

    await logAudit(req, 'stage1.override_score', 'submission', teamId, {
      newScore: Number(score),
      note
    });

    res.json({
      message: `Stage 1 score for team ${teamId} updated to ${score}.`,
      submission: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update score.', details: err.message });
  }
});

// Reset Stage 1 quiz submission
router.post('/stage1/submissions/:teamId/reset', requirePermission('manage_submissions'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teamId = req.params.teamId;
    const reset = await store.resetQuizSubmission(teamId);

    await logAudit(req, 'stage1.reset_submission', 'submission', teamId);

    res.json({
      message: `Stage 1 quiz submission for team ${teamId} has been reset.`,
      reset
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset quiz submission.', details: err.message });
  }
});

router.get('/stage1/event-logs', requirePermission('manage_stage1'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const logs = await store.getTabFocusLogs(teamId);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch event logs.', details: err.message });
  }
});

/* ==========================================================================
   ADMIN STAGE 2: DECODE CHALLENGES, PROGRESS & SCORE OVERRIDE
   ========================================================================== */

router.get('/stage2/challenges', requirePermission('manage_stage2'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const challenges = await store.getDecodeChallenges(true);
    res.json(challenges);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch challenges.', details: err.message });
  }
});

router.post('/stage2/challenges', requirePermission('manage_stage2'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, encodedPayload, expectedAnswer, hint, isActive, points, maxAttempts, hintDeduction } = req.body;
    if (!title || !description || !encodedPayload || !expectedAnswer || !hint) {
      res.status(400).json({ error: 'All challenge fields (title, description, payload, expected answer, hint) are required.' });
      return;
    }

    const created = await store.createDecodeChallenge({
      title,
      description,
      encodedPayload,
      expectedAnswer,
      hint,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      points: Number(points) || 10,
      maxAttempts: Number(maxAttempts) || 3,
      hintDeduction: Number(hintDeduction) || 2,
      isDemonstration: false
    });

    await logAudit(req, 'stage2.create_challenge', 'decode_challenge', created.id, { title });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create challenge.', details: err.message });
  }
});

router.put('/stage2/challenges/:id', requirePermission('manage_stage2'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const challengeId = req.params.id;
    const updated = await store.updateDecodeChallenge(challengeId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Challenge not found.' });
      return;
    }

    await logAudit(req, 'stage2.update_challenge', 'decode_challenge', challengeId, { updates: req.body });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update challenge.', details: err.message });
  }
});

router.delete('/stage2/challenges/:id', requirePermission('manage_stage2'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const challengeId = req.params.id;
    const deleted = await store.deleteDecodeChallenge(challengeId);

    await logAudit(req, 'stage2.delete_challenge', 'decode_challenge', challengeId);

    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete challenge.', details: err.message });
  }
});

router.get('/stage2/progress', requirePermission('manage_submissions'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const progressList = await store.getAllStage2Progress();
    res.json(progressList);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch Stage 2 progress.', details: err.message });
  }
});

// Override Stage 2 score
router.patch('/stage2/progress/:teamId/score', requirePermission('manage_submissions'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teamId = req.params.teamId;
    const { score, note } = req.body;

    if (score === undefined || isNaN(Number(score))) {
      res.status(400).json({ error: 'Valid numerical score is required.' });
      return;
    }

    const updated = await store.updateStage2Score(teamId, Number(score), note);
    if (!updated) {
      res.status(404).json({ error: 'Stage 2 progress record not found for team.' });
      return;
    }

    await logAudit(req, 'stage2.override_score', 'progress', teamId, {
      newScore: Number(score),
      note
    });

    res.json({
      message: `Stage 2 score for team ${teamId} updated to ${score}.`,
      progress: updated
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update score.', details: err.message });
  }
});

// Reset Stage 2 progress
router.post('/stage2/progress/:teamId/reset', requirePermission('manage_submissions'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teamId = req.params.teamId;
    const reset = await store.resetStage2Progress(teamId);

    await logAudit(req, 'stage2.reset_progress', 'progress', teamId);

    res.json({
      message: `Stage 2 decode progress for team ${teamId} has been reset.`,
      reset
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset stage 2 progress.', details: err.message });
  }
});

/* ==========================================================================
   ADMIN STAGE 3: DATASET MANAGEMENT & FILE UPLOAD
   ========================================================================== */

router.get('/stage3/datasets', requirePermission('manage_stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const datasets = await store.getDatasets();
    res.json(datasets);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch datasets.', details: err.message });
  }
});

router.post('/stage3/datasets', requirePermission('manage_stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, filename, format, filesize, recordCount, schemaSummary } = req.body;
    if (!name || !filename || !format) {
      res.status(400).json({ error: 'Dataset name, filename, and format are required.' });
      return;
    }

    const filenameCheck = validateDatasetFilename(filename);
    if (!filenameCheck.valid) {
      res.status(400).json({ error: filenameCheck.error });
      return;
    }

    const created = await store.createDataset({
      name,
      description: description || '',
      filename,
      format: format === 'JSON' ? 'JSON' : 'CSV',
      filesize: filesize || '0 KB',
      recordCount: Number(recordCount) || 0,
      schemaSummary: schemaSummary || '',
      isDemonstration: false
    });

    await logAudit(req, 'stage3.create_dataset', 'dataset', created.id, { name, filename });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register dataset metadata.', details: err.message });
  }
});

// Secure Dataset File Upload & Metadata Registration
router.post('/stage3/upload', requirePermission('manage_stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { filename, content, name, description, recordCount, schemaSummary } = req.body;

    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ error: 'Valid dataset filename is required.' });
      return;
    }

    if (content === undefined || content === null) {
      res.status(400).json({ error: 'File content must be provided.' });
      return;
    }

    const saveResult = saveSecureDatasetFile(filename, content);
    if (!saveResult.success) {
      res.status(400).json({ error: saveResult.error });
      return;
    }

    const format = filename.toLowerCase().endsWith('.json') ? 'JSON' : 'CSV';
    const datasetName = name && typeof name === 'string' && name.trim().length > 0
      ? name.trim()
      : filename.replace(/\.[^/.]+$/, '');

    const created = await store.createDataset({
      name: datasetName,
      description: description || `Uploaded dataset ${filename}`,
      filename,
      format,
      filesize: saveResult.filesize || '1 KB',
      recordCount: Number(recordCount) || 0,
      schemaSummary: schemaSummary || `Format: ${format}`,
      isDemonstration: false
    });

    await logAudit(req, 'stage3.upload_dataset', 'dataset', created.id, {
      filename,
      filesize: saveResult.filesize
    });

    res.status(201).json({
      message: `Dataset ${filename} uploaded and registered successfully.`,
      dataset: created
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Dataset file upload failed.', details: err.message });
  }
});

router.put('/stage3/datasets/:id', requirePermission('manage_stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const datasetId = req.params.id;
    if (req.body.filename !== undefined) {
      const filenameCheck = validateDatasetFilename(req.body.filename);
      if (!filenameCheck.valid) {
        res.status(400).json({ error: filenameCheck.error });
        return;
      }
    }
    const updated = await store.updateDataset(datasetId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Dataset metadata not found.' });
      return;
    }

    await logAudit(req, 'stage3.update_dataset', 'dataset', datasetId, { updates: req.body });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update dataset.', details: err.message });
  }
});

router.delete('/stage3/datasets/:id', requirePermission('manage_stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const datasetId = req.params.id;
    const deleted = await store.deleteDataset(datasetId);

    await logAudit(req, 'stage3.delete_dataset', 'dataset', datasetId);

    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete dataset.', details: err.message });
  }
});

router.get('/stage3/selections', requirePermission('manage_stage3'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const selections = await store.getAllDatasetSelections();
    res.json(selections);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch dataset selections.', details: err.message });
  }
});

router.post('/stage3/reset-selection', requirePermission('manage_submissions'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      res.status(400).json({ error: 'teamId is required for reset authorization.' });
      return;
    }

    const reset = await store.resetTeamDatasetSelection(teamId);

    await logAudit(req, 'stage3.reset_selection', 'selection', teamId);

    res.json({
      message: `Stage 3 dataset selection for team ${teamId} has been reset.`,
      reset
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset selection.', details: err.message });
  }
});

/* ==========================================================================
   ADMIN STAGE 4 & 5: PROBLEMS & CONTINUITY MANAGEMENT
   ========================================================================== */

router.get('/stage4/problems', requirePermission('manage_stage4'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const problems = await store.getProblemStatements();
    res.json(problems);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch problems.', details: err.message });
  }
});

router.post('/stage4/problems', requirePermission('manage_stage4'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      category,
      summary,
      fullDescription,
      stage4Instructions,
      stage4Deliverables,
      stage5Instructions,
      stage5Deliverables,
      evaluationCriteria
    } = req.body;

    if (!title || !category || !fullDescription) {
      res.status(400).json({ error: 'Title, category, and fullDescription are required.' });
      return;
    }

    const created = await store.createProblemStatement({
      title,
      category,
      summary: summary || '',
      fullDescription,
      stage4Instructions: stage4Instructions || '',
      stage4Deliverables: Array.isArray(stage4Deliverables) ? stage4Deliverables : [],
      stage5Instructions: stage5Instructions || '',
      stage5Deliverables: Array.isArray(stage5Deliverables) ? stage5Deliverables : [],
      evaluationCriteria: Array.isArray(evaluationCriteria) ? evaluationCriteria : [],
      isDemonstration: false
    });

    await logAudit(req, 'stage4.create_problem', 'problem_statement', created.id, { title });

    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create problem statement.', details: err.message });
  }
});

router.put('/stage4/problems/:id', requirePermission('manage_stage4'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const problemId = req.params.id;
    const updated = await store.updateProblemStatement(problemId, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Problem statement not found.' });
      return;
    }

    await logAudit(req, 'stage4.update_problem', 'problem_statement', problemId, { updates: req.body });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update problem statement.', details: err.message });
  }
});

router.delete('/stage4/problems/:id', requirePermission('manage_stage4'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const problemId = req.params.id;
    const deleted = await store.deleteProblemStatement(problemId);

    await logAudit(req, 'stage4.delete_problem', 'problem_statement', problemId);

    res.json({ success: deleted });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete problem statement.', details: err.message });
  }
});

router.get('/stage4/selections', requirePermission('manage_stage4'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const selections = await store.getAllProblemSelections();
    res.json(selections);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch problem selections.', details: err.message });
  }
});

router.post('/stage4/reset-selection', requirePermission('manage_submissions'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      res.status(400).json({ error: 'teamId is required for reset authorization.' });
      return;
    }

    const reset = await store.resetTeamProblemSelection(teamId);

    await logAudit(req, 'stage4.reset_selection', 'selection', teamId);

    res.json({
      message: `Stage 4/5 problem selection for team ${teamId} has been reset.`,
      reset
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset selection.', details: err.message });
  }
});

export default router;
