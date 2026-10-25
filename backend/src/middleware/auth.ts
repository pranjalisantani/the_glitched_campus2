import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload, StageId, AdminPermission } from '../types';
import { store } from '../store';
import { getJwtSecret } from '../config/env';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '12h' });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token.', code: 'INVALID_TOKEN' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin clearance required. Access denied.', code: 'FORBIDDEN' });
    return;
  }
  next();
}

export function requirePrimaryAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin' || (!req.user.isPrimaryAdmin && req.user.adminRole !== 'primary_admin')) {
    res.status(403).json({ error: 'Primary administrator clearance required. Access denied.', code: 'FORBIDDEN_PRIMARY_ONLY' });
    return;
  }
  next();
}

export function requirePermission(permission: AdminPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Admin clearance required. Access denied.', code: 'FORBIDDEN' });
      return;
    }

    // Primary admin has all permissions inherently
    if (req.user.isPrimaryAdmin || req.user.adminRole === 'primary_admin') {
      return next();
    }

    const userPerms = req.user.permissions || [];
    if (!userPerms.includes(permission)) {
      res.status(403).json({
        error: `Access denied. Lacking administrative permission: '${permission}'.`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredPermission: permission
      });
      return;
    }

    next();
  };
}

/**
 * Stage gate middleware: enforces that a stage is OPEN for participant submissions/access.
 * Admin users are granted preview pass-through.
 */
export function requireStageOpen(stageId: StageId) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Admin pass-through for stage management & verification
      if (req.user?.role === 'admin') {
        return next();
      }

      const stage = await store.getStage(stageId);
      if (!stage) {
        res.status(404).json({ error: `Stage ${stageId} configuration not found.`, code: 'STAGE_NOT_FOUND' });
        return;
      }

      if (stage.status === 'LOCKED') {
        res.status(403).json({
          error: `${stage.name} is currently locked by the administrators. Await signal authorization.`,
          code: 'STAGE_LOCKED',
          stageId,
          stageName: stage.name
        });
        return;
      }

      if (stage.status === 'CLOSED') {
        res.status(403).json({
          error: `${stage.name} has concluded and is closed. No further submissions are accepted.`,
          code: 'STAGE_CLOSED',
          stageId,
          stageName: stage.name
        });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({ error: 'Internal stage verification error.', details: err.message });
    }
  };
}

/**
 * Global competition freeze middleware:
 * Blocks participant mutations (submissions, hints, selections) when competition is frozen.
 * Admin users bypass this restriction.
 */
export async function requireNotFrozen(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user?.role === 'admin') {
      return next();
    }

    const settings = await store.getSystemSettings();
    if (settings.isCompetitionFrozen) {
      res.status(403).json({
        error: settings.freezeReason || 'Competition is currently frozen by Incident Command. All stage submissions and selections are temporarily suspended.',
        code: 'COMPETITION_FROZEN',
        frozenAt: settings.frozenAt
      });
      return;
    }

    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Internal system verification error.', details: err.message });
  }
}
