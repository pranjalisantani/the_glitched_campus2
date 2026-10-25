import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { store } from '../store';
import { generateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Participant / Team Registration
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamName, email, password, members } = req.body;

    if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2) {
      res.status(400).json({ error: 'Team name must be at least 2 characters long.' });
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

    if (!Array.isArray(members) || members.length === 0) {
      res.status(400).json({ error: 'At least one team member name must be provided.' });
      return;
    }

    const cleanMembers = members
      .map((m: any) => (typeof m === 'string' ? m.trim() : ''))
      .filter((m: string) => m.length > 0);

    if (cleanMembers.length === 0) {
      res.status(400).json({ error: 'Please list valid names for all participating team members.' });
      return;
    }

    if (cleanMembers.length > 5) {
      res.status(400).json({ error: 'A team can have a maximum of 5 members.' });
      return;
    }

    const existingEmail = await store.findTeamByEmail(email);
    if (existingEmail) {
      res.status(409).json({ error: 'A team is already registered with this email address.' });
      return;
    }

    const existingName = await store.findTeamByName(teamName);
    if (existingName) {
      res.status(409).json({ error: 'A team with this name already exists. Please choose another name.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const team = await store.createTeam({
      teamName: teamName.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      members: cleanMembers,
      role: 'participant'
    });

    const token = generateToken({
      teamId: team.id,
      teamName: team.teamName,
      email: team.email,
      role: team.role
    });

    res.status(201).json({
      message: 'Team successfully registered in THE GLITCHED CAMPUS matrix.',
      token,
      team: {
        id: team.id,
        teamName: team.teamName,
        email: team.email,
        members: team.members,
        role: team.role,
        createdAt: team.createdAt
      }
    });
  } catch (err: any) {
    console.error('[AUTH] Registration server error:', err);
    res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

// Team / Admin Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrTeamName, password } = req.body;

    if (!emailOrTeamName || typeof emailOrTeamName !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Please provide both email/team name and password.' });
      return;
    }

    let team = await store.findTeamByEmail(emailOrTeamName);
    if (!team) {
      team = await store.findTeamByName(emailOrTeamName);
    }

    if (!team) {
      res.status(401).json({ error: 'Invalid terminal credentials. Access denied.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, team.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid terminal credentials. Access denied.' });
      return;
    }

    const token = generateToken({
      teamId: team.id,
      teamName: team.teamName,
      email: team.email,
      role: team.role,
      adminRole: team.adminRole,
      permissions: team.permissions,
      isPrimaryAdmin: team.isPrimaryAdmin
    });

    res.json({
      message: 'Terminal access granted.',
      token,
      team: {
        id: team.id,
        teamName: team.teamName,
        email: team.email,
        members: team.members,
        role: team.role,
        adminRole: team.adminRole,
        permissions: team.permissions,
        isPrimaryAdmin: team.isPrimaryAdmin,
        createdAt: team.createdAt
      }
    });
  } catch (err: any) {
    console.error('[AUTH] Login server error:', err);
    res.status(500).json({ error: 'Login failure.' });
  }
});

// Authenticated Team / User Profile & Status Matrix
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const team = await store.findTeamById(req.user.teamId);
    if (!team) {
      res.status(404).json({ error: 'Team record not found.' });
      return;
    }

    // Retrieve team's progress indicators
    const quizSub = await store.getQuizSubmissionByTeam(team.id);
    const s2Progress = await store.getTeamStage2Progress(team.id);
    const s3Selection = await store.getTeamDatasetSelection(team.id);
    const s4Selection = await store.getTeamProblemSelection(team.id);

    res.json({
      team: {
        id: team.id,
        teamName: team.teamName,
        email: team.email,
        members: team.members,
        role: team.role,
        adminRole: team.adminRole,
        permissions: team.permissions,
        isPrimaryAdmin: team.isPrimaryAdmin,
        createdAt: team.createdAt
      },
      progress: {
        stage1: {
          hasSubmitted: Boolean(quizSub),
          submittedAt: quizSub?.submittedAt || null
        },
        stage2: {
          hintsUsed: s2Progress?.hintsUsedCount || 0,
          challenges: s2Progress?.challengeStates || {}
        },
        stage3: {
          hasSelected: Boolean(s3Selection),
          selection: s3Selection
        },
        stage4: {
          hasSelected: Boolean(s4Selection),
          selection: s4Selection
        },
        stage5: {
          hasSelectedProblem: Boolean(s4Selection),
          selectedProblemTitle: s4Selection?.problemTitle || null
        }
      }
    });
  } catch (err: any) {
    console.error('[AUTH] Profile retrieval error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

export default router;
