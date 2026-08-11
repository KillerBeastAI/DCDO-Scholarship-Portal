import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './config/db.js';
import { runMigrations } from './utils/migrate.js';
import { configurePassport } from './config/passport.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { providerRouter } from './routes/provider.routes.js';
import { programRouter } from './routes/program.routes.js';
import { qmRouter } from './routes/qm.routes.js';
import { accomplishmentRouter } from './routes/accomplishment.routes.js';
import { billingRouter } from './routes/billing.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { swaggerRouter } from './config/swagger.js';
import { errorHandlerMiddleware } from './middleware/error.middleware.js';

const app = express();

// ── Trust Proxy for Nginx ───────────────────────────────────
app.set('trust proxy', 1);

// ── Security & Core middleware ──────────────────────────────
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  }),
);

// ── Rate Limiting ───────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api/', apiLimiter);

// ── Passport OAuth setup ────────────────────────────────────
configurePassport();
app.use(passport.initialize());

// ── Health check ────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const dbOk = await checkDatabaseHealth();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'unreachable',
  });
});

// ── Routes ──────────────────────────────────────────────────
app.get('/api/v1', (_req, res) => {
  res.json({
    message: 'Davao City Scholarship Programs Portal — API v1',
    version: '0.1.0',
  });
});

app.use(['/api/v1/auth', '/v1/auth'], authRouter);
app.use(['/api/v1/users', '/v1/users'], userRouter);
app.use(['/api/v1/training-providers', '/v1/training-providers'], providerRouter);
app.use(['/api/v1/scholarship-programs', '/v1/scholarship-programs'], programRouter);
app.use(['/api/v1/qualification-maps', '/v1/qualification-maps'], qmRouter);
app.use(['/api/v1/accomplishments', '/v1/accomplishments'], accomplishmentRouter);
app.use(['/api/v1/billings', '/v1/billings'], billingRouter);
app.use(['/api/v1/dashboard', '/v1/dashboard'], dashboardRouter);
app.use(['/api/docs', '/docs'], swaggerRouter);

// ── 404 catch-all ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handling ──────────────────────────────────────────
app.use(errorHandlerMiddleware);

// ── Start server ────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    console.log('[server] Running migrations…');
    await runMigrations();

    app.listen(env.PORT, () => {
      console.log(`[server] Backend listening on http://localhost:${env.PORT}`);
      console.log(`[server] Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('[server] Fatal startup error:', err);
    process.exit(1);
  }
}

// Start server if not running inside Jest test or Vercel serverless environment
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  start();
}

export default app;
