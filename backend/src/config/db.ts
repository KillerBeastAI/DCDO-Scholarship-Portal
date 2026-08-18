import pg from 'pg';
import { env, isProduction } from './env.js';

const { Pool } = pg;

const useSsl = isProduction || env.DATABASE_URL.includes('supabase.co') || env.DATABASE_URL.includes('pooler.supabase.com');

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});

// Log pool errors to prevent unhandled crashes
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Convenience helper — runs a parameterized query and returns the rows.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (env.NODE_ENV === 'development') {
    console.log('[DB] query', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
  }

  return result;
}

/**
 * Health check — verifies the database connection is alive.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
