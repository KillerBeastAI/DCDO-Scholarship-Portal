import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';

// Mock DB before importing app or AuthService
const MOCK_USERS = [
  {
    user_id: 'a0000000-0000-0000-0000-000000000001',
    username: 'admin.reyes',
    email: 'admin.reyes@davao.gov.ph',
    password_hash: '$2b$10$vArmeJ0qHoKqQnV7NV8phOwxzPleAKCVCHq4dTUk.I8Cyuxz43Vyu',
    department: 'City Social Welfare and Development Office',
    role: 'admin',
    created_at: new Date(),
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000002',
    username: 'eval.santos',
    email: 'eval.santos@davao.gov.ph',
    password_hash: '$2b$10$vArmeJ0qHoKqQnV7NV8phOwxzPleAKCVCHq4dTUk.I8Cyuxz43Vyu',
    department: 'Scholarship Monitoring Division',
    role: 'evaluator',
    created_at: new Date(),
  },
  {
    user_id: 'a0000000-0000-0000-0000-000000000003',
    username: 'finance.dela.cruz',
    email: 'finance.delacruz@davao.gov.ph',
    password_hash: '$2b$10$vArmeJ0qHoKqQnV7NV8phOwxzPleAKCVCHq4dTUk.I8Cyuxz43Vyu',
    department: 'City Accounting Office',
    role: 'finance_auditor',
    created_at: new Date(),
  },
];

jest.mock('../config/db.js', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn(async () => undefined),
    on: jest.fn(),
  },
  query: jest.fn(async (text: string, params?: unknown[]) => {
    if (text.includes('WHERE email = $1')) {
      const email = params?.[0] as string;
      const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    if (text.includes('WHERE user_id = $1')) {
      const userId = params?.[0] as string;
      const user = MOCK_USERS.find((u) => u.user_id === userId);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    if (text.includes('SELECT 1')) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }),
  checkDatabaseHealth: jest.fn(async () => true),
}));

// Now import app after mocking DB
import app from '../index.js';
import { generateAccessToken } from '../utils/token.js';
import { rbacMiddleware } from '../middleware/rbac.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import express, { Request, Response } from 'express';

describe('Authentication & Authorization API', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should authenticate pre-provisioned user with valid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin.reyes@davao.gov.ph',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toMatchObject({
        email: 'admin.reyes@davao.gov.ph',
        role: 'admin',
        username: 'admin.reyes',
      });
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin.reyes@davao.gov.ph',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should reject unprovisioned external email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unauthorized.external@gmail.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should deny request without Authorization header', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('should return user profile with valid Bearer token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'eval.santos@davao.gov.ph',
          password: 'Password123!',
        });

      const token = loginRes.body.accessToken;

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toMatchObject({
        email: 'eval.santos@davao.gov.ph',
        role: 'evaluator',
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new access token when given valid refresh token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'finance.delacruz@davao.gov.ph',
          password: 'Password123!',
        });

      const refreshToken = loginRes.body.refreshToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');
      expect(refreshRes.body.user).toMatchObject({
        role: 'finance_auditor',
      });
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.status).toBe(401);
    });
  });

  describe('RBAC Middleware Enforcement', () => {
    let testApp: express.Application;

    beforeAll(() => {
      testApp = express();
      testApp.use(express.json());

      // Endpoint accessible only by admin
      testApp.get(
        '/admin-only',
        authMiddleware,
        rbacMiddleware(['admin']),
        (_req: Request, res: Response) => {
          res.json({ message: 'Admin access granted' });
        },
      );

      // Endpoint accessible by admin & evaluator
      testApp.get(
        '/eval-or-admin',
        authMiddleware,
        rbacMiddleware(['admin', 'evaluator']),
        (_req: Request, res: Response) => {
          res.json({ message: 'Access granted' });
        },
      );
    });

    it('should allow access to admin user on admin-only route', async () => {
      const adminToken = generateAccessToken({
        userId: MOCK_USERS[0].user_id,
        email: MOCK_USERS[0].email,
        role: 'admin',
        username: MOCK_USERS[0].username,
        department: MOCK_USERS[0].department,
      });

      const res = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Admin access granted');
    });

    it('should deny access to evaluator user on admin-only route (403 Forbidden)', async () => {
      const evalToken = generateAccessToken({
        userId: MOCK_USERS[1].user_id,
        email: MOCK_USERS[1].email,
        role: 'evaluator',
        username: MOCK_USERS[1].username,
        department: MOCK_USERS[1].department,
      });

      const res = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${evalToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Access denied. Role 'evaluator' is not authorized");
    });

    it('should allow access to evaluator user on eval-or-admin route', async () => {
      const evalToken = generateAccessToken({
        userId: MOCK_USERS[1].user_id,
        email: MOCK_USERS[1].email,
        role: 'evaluator',
        username: MOCK_USERS[1].username,
        department: MOCK_USERS[1].department,
      });

      const res = await request(testApp)
        .get('/eval-or-admin')
        .set('Authorization', `Bearer ${evalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Access granted');
    });
  });
});
