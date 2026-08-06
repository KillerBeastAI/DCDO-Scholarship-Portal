import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '../utils/token.js';

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Internal password login fallback for municipal personnel.
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const authResult = await AuthService.loginWithPassword(email, password);
    res.json(authResult);
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Exchanges a valid refresh token for a new access token and refresh token pair.
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required.' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await AuthService.findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: 'User no longer exists.' });
      return;
    }

    const payload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      username: user.username,
      department: user.department,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({
      user: AuthService.toPublicProfile(user),
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (_err) {
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

/**
 * GET /api/v1/auth/me
 * Returns profile info for the currently authenticated user.
 */
authRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await AuthService.findUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    res.json({ user: AuthService.toPublicProfile(user) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/v1/auth/google
 * Initiates Google OAuth 2.0 flow.
 */
authRouter.get('/google', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

/**
 * GET /api/v1/auth/google/callback
 * Handles Google OAuth callback and returns access/refresh tokens.
 */
authRouter.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', { session: false }, async (err: Error | null, user: any, info: any) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!user) {
        res.status(401).json({ error: info?.message || 'Google authentication failed.' });
        return;
      }

      try {
        const authResult = await AuthService.authenticateGoogleUser(user.email);
        res.json(authResult);
      } catch (authErr) {
        res.status(401).json({ error: (authErr as Error).message });
      }
    })(req, res, next);
  },
);

/**
 * POST /api/v1/auth/logout
 * Client-side logout acknowledgment.
 */
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully.' });
});
