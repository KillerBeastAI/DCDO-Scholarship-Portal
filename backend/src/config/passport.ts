import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { AuthService } from '../services/auth.service.js';

export function configurePassport(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.warn('[auth] Google OAuth credentials missing (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET). Google login endpoint will be disabled.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          const user = await AuthService.findUserByEmail(email);
          if (!user) {
            return done(null, false, {
              message: 'Unauthorized internal email. Please contact your system administrator.',
            });
          }

          return done(null, {
            userId: user.user_id,
            email: user.email,
            role: user.role,
            username: user.username,
            department: user.department,
          });
        } catch (err) {
          return done(err as Error, undefined);
        }
      },
    ),
  );
}
