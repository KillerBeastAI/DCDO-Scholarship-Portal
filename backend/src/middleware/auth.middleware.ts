import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, DecodedToken } from '../utils/token.js';

// Extend Express User interface to include decoded JWT fields
declare global {
  namespace Express {
    interface User extends DecodedToken {}
  }
}

/**
 * Middleware that authenticates incoming requests using Bearer JWT tokens.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing or malformed Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    const message = (err as Error).name === 'TokenExpiredError'
      ? 'Access token expired'
      : 'Invalid authentication token';

    res.status(401).json({ error: message });
  }
}
