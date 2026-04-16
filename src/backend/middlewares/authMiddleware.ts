import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_lexargar';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    tier: string;
    email: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  // 1. Check cookies first, fallback to Authorization header
  let token = req.cookies?.token;
  
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Support legacy x-user-id for backwards compatibility during migration (Optional but helpful)
  if (!token && req.headers['x-user-id']) {
    const legacyId = parseInt(req.headers['x-user-id'] as string, 10);
    if (!isNaN(legacyId)) {
        const u = db.prepare('SELECT id, tier, email FROM users WHERE id = ?').get(legacyId) as any;
        if (u) {
            req.user = { userId: u.id, tier: u.tier, email: u.email };
            return next();
        }
    }
  }

  if (!token) {
     res.status(401).json({ error: 'No se proporcionó token de autenticación. Inicia sesión.' });
     return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      userId: decoded.userId,
      tier: decoded.tier,
      email: decoded.email
    };
    next();
  } catch (error) {
     res.status(401).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
     return;
  }
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.user || req.user.tier !== 'super_admin') {
         res.status(403).json({ error: 'Acceso denegado: Se requiere rol de superadministrador.' });
         return;
    }
    next();
}
