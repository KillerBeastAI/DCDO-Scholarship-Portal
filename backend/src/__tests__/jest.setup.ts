/**
 * Jest global setup — injects required environment variables before any
 * module is loaded. This prevents `env.ts` from throwing during test runs.
 *
 * All values here are intentionally fake; the DB is always mocked in tests.
 */
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest-only-do-not-use-in-production';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-jest-only';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
