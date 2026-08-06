import { query } from '../config/db.js';
import { comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, TokenPayload } from '../utils/token.js';

export interface UserRecord {
  user_id: string;
  username: string;
  email: string;
  password_hash: string | null;
  department: string;
  role: 'admin' | 'evaluator' | 'finance_auditor';
  created_at: Date;
}

export interface UserPublicProfile {
  userId: string;
  username: string;
  email: string;
  department: string;
  role: 'admin' | 'evaluator' | 'finance_auditor';
}

export interface AuthResponse {
  user: UserPublicProfile;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Finds an internal user by email address.
   */
  static async findUserByEmail(email: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(
      'SELECT user_id, username, email, password_hash, department, role, created_at FROM internal_users WHERE email = $1',
      [email.toLowerCase().trim()],
    );
    return res.rows[0] ?? null;
  }

  /**
   * Finds an internal user by user ID.
   */
  static async findUserById(userId: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(
      'SELECT user_id, username, email, password_hash, department, role, created_at FROM internal_users WHERE user_id = $1',
      [userId],
    );
    return res.rows[0] ?? null;
  }

  /**
   * Formats a user record into a safe public profile (excluding sensitive fields like password_hash).
   */
  static toPublicProfile(user: UserRecord): UserPublicProfile {
    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      department: user.department,
      role: user.role,
    };
  }

  /**
   * Authenticates internal user via email and password fallback.
   */
  static async loginWithPassword(email: string, password: string): Promise<AuthResponse> {
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.password_hash) {
      throw new Error('This account must sign in using Google OAuth');
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const payload: TokenPayload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      username: user.username,
      department: user.department,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: this.toPublicProfile(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verifies Google OAuth email against pre-provisioned internal_users table.
   * Internal policy: No public signups or auto-registration.
   */
  static async authenticateGoogleUser(email: string): Promise<AuthResponse> {
    const user = await this.findUserByEmail(email);

    if (!user) {
      throw new Error('Unauthorized internal email. Please contact your system administrator.');
    }

    const payload: TokenPayload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      username: user.username,
      department: user.department,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: this.toPublicProfile(user),
      accessToken,
      refreshToken,
    };
  }
}
