import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from project root (one level above backend/)
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// Also try loading from CWD (for Docker where .env may be mounted in /app)
dotenv.config();

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  FRONTEND_URL: string;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env: EnvConfig = {
  PORT: parseInt(optionalEnv('PORT', '5000'), 10),
  NODE_ENV: optionalEnv('NODE_ENV', 'production'),
  DATABASE_URL: optionalEnv(
    'DATABASE_URL',
    'postgresql://postgres.czpfkhhfvswddwqmdlgf:Tesda_dcdo2026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
  ),
  JWT_SECRET: optionalEnv(
    'JWT_SECRET',
    'tesda_dcdo_super_secret_jwt_key_2026_scholarship'
  ),
  JWT_REFRESH_SECRET: optionalEnv(
    'JWT_REFRESH_SECRET',
    'tesda_dcdo_super_secret_jwt_refresh_key_2026_scholarship'
  ),
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  GOOGLE_CLIENT_ID: optionalEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: optionalEnv('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_CALLBACK_URL: optionalEnv('GOOGLE_CALLBACK_URL', 'http://localhost:5000/api/v1/auth/google/callback'),
  FRONTEND_URL: optionalEnv('FRONTEND_URL', 'http://localhost:3000'),
};

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
