import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../config/db.js';

const currentFilePath = typeof __filename !== 'undefined' ? __filename : '';
const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.resolve(process.cwd(), 'src/utils');

/**
 * Simple forward-only migration runner.
 * Reads .sql files from the migrations/ directory in alphabetical order,
 * skips any that have already been applied (tracked in `_migrations`),
 * and executes the rest inside their own transactions.
 */
export async function runMigrations(): Promise<void> {
  try {
    // Ensure the tracking table exists (idempotent)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    const distMigrationsDir = path.resolve(currentDir, '../migrations');
    const srcMigrationsDir = path.resolve(process.cwd(), 'src/migrations');
    const rootBackendMigrationsDir = path.resolve(process.cwd(), 'backend/src/migrations');

    let migrationsDir: string | null = null;
    if (fs.existsSync(distMigrationsDir)) {
      migrationsDir = distMigrationsDir;
    } else if (fs.existsSync(srcMigrationsDir)) {
      migrationsDir = srcMigrationsDir;
    } else if (fs.existsSync(rootBackendMigrationsDir)) {
      migrationsDir = rootBackendMigrationsDir;
    }

    if (!migrationsDir) {
      console.log('[migrate] No migrations directory found on filesystem. Skipping migration runner.');
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // Fetch already-applied migrations
    const { rows: applied } = await pool.query<{ filename: string }>(
      'SELECT filename FROM _migrations ORDER BY filename',
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[migrate] skip  ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      console.log(`[migrate] apply ${file} …`);

      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        console.log(`[migrate] done  ${file}`);
      } catch (err) {
        console.error(`[migrate] FAILED ${file}:`, err);
        throw err;
      }
    }

    console.log('[migrate] all migrations up to date');
  } catch (err) {
    console.error('[migrate] Migration runner error:', err);
    // In serverless, do not crash the app if filesystem migration files cannot be loaded
    if (process.env.VERCEL) {
      console.warn('[migrate] Running in Vercel serverless environment; continuing.');
      return;
    }
    throw err;
  }
}

// Allow running directly: npx tsx src/utils/migrate.ts
const isDirectRun = Boolean(process.argv[1] && currentFilePath && path.resolve(process.argv[1]) === path.resolve(currentFilePath));

if (isDirectRun) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
