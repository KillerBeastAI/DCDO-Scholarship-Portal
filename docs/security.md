# Security — Davao City Scholarship Programs Portal

> **Classification:** Internal Government Tool  
> **Last Updated:** 2026-07-31

---

## 1. Threat Model Summary

| Threat | Mitigation |
|--------|-----------|
| Unauthorized external access | No public portal; all routes require JWT issued after Google OAuth or password login |
| Privilege escalation | Role-based access control (RBAC) enforced at middleware layer |
| Credential leakage | Secrets in `.env` only; `.env` in `.gitignore`; no hardcoded credentials |
| SQL injection | Parameterized queries via `pg` driver; no raw string interpolation |
| XSS / CSRF | Helmet headers; SameSite cookies; React's built-in output encoding |
| Brute-force login | Rate limiting on `/api/v1/auth/*` endpoints |
| Data exfiltration | No bulk-export endpoints; aggregate-only data model |

---

## 2. Authentication

### 2.1 Primary — Google OAuth 2.0

1. Frontend redirects to `/api/v1/auth/google`.
2. Passport.js `GoogleStrategy` handles the OAuth flow.
3. On callback, the backend verifies the authenticated email exists in `internal_users`.
4. **If the email is not pre-provisioned → login is rejected** (no self-registration).
5. A JWT access token (short-lived, ~15 min) and a refresh token (~7 days) are issued.

### 2.2 Fallback — Password Login

- For accounts without Google Workspace access.
- Passwords are hashed with **bcrypt** (cost factor 12).
- Endpoint: `POST /api/v1/auth/login` with `{ email, password }`.
- Same JWT issuance flow as OAuth after successful verification.

### 2.3 Token Management

| Token | Storage | Lifetime | Refresh |
|-------|---------|----------|---------|
| Access (JWT) | Memory / `Authorization` header | 15 minutes | Via refresh endpoint |
| Refresh | httpOnly, Secure, SameSite=Strict cookie | 7 days | Rotated on use |

- Tokens contain: `{ sub: user_id, role, iat, exp }`.
- Signing key: `JWT_SECRET` from environment variable (min 256-bit entropy).

---

## 3. Authorization — Role-Based Access Control (RBAC)

### 3.1 Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `admin` | System administrator | Full CRUD on all resources; user management |
| `evaluator` | Program evaluator / monitoring officer | Read/write on providers, qualification maps, accomplishments; read-only billing |
| `finance_auditor` | Finance / audit staff | Read/write on billings; read-only on providers, programs, and accomplishments |

### 3.2 Enforcement

```
Request → authMiddleware (verify JWT) → rbacMiddleware(allowedRoles[]) → handler
```

- `authMiddleware`: Decodes and validates the JWT; attaches `req.user`.
- `rbacMiddleware`: Checks `req.user.role` against the allowed roles list for the route.
- Returns `403 Forbidden` if the role is insufficient.

### 3.3 Route-Role Matrix

| Endpoint Group | admin | evaluator | finance_auditor |
|---------------|:-----:|:---------:|:---------------:|
| `GET /api/v1/dashboard/*` | ✅ | ✅ | ✅ |
| `* /api/v1/users/*` | ✅ | ❌ | ❌ |
| `GET /api/v1/training-providers/*` | ✅ | ✅ | ✅ |
| `POST/PUT /api/v1/training-providers/*` | ✅ | ✅ | ❌ |
| `* /api/v1/scholarship-programs/*` | ✅ | ✅ | ✅ (read) |
| `* /api/v1/qualification-maps/*` | ✅ | ✅ | ✅ (read) |
| `* /api/v1/accomplishments/*` | ✅ | ✅ | ✅ (read) |
| `GET /api/v1/billings/*` | ✅ | ✅ (read) | ✅ |
| `POST/PUT /api/v1/billings/*` | ✅ | ❌ | ✅ |

---

## 4. Secrets Management

### 4.1 Rules

1. **Never commit** `.env` files or any file containing credentials.
2. All secrets are loaded via `dotenv` from a `.env` file at the project root.
3. A `.env.example` template is committed with placeholder values.
4. In Docker Compose, secrets are passed as environment variables.

### 4.2 Required Environment Variables

```env
# Database
DATABASE_URL=postgres://user:password@host:5432/dbname

# Authentication
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
JWT_SECRET=<min 64 characters, cryptographically random>
JWT_REFRESH_SECRET=<separate key, min 64 characters>

# Application
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

---

## 5. API Hardening

### 5.1 HTTP Headers

```ts
import helmet from 'helmet';
app.use(helmet());
```

Helmet sets: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`,
`X-XSS-Protection`, `Content-Security-Policy` (configured for SPA).

### 5.2 Rate Limiting

```ts
import rateLimit from 'express-rate-limit';

// Global: 100 requests per 15 min per IP
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Auth endpoints: 10 requests per 15 min per IP
authRouter.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
```

### 5.3 Input Validation

- All request bodies are validated with a schema validator (e.g., Zod or Joi) in middleware.
- Invalid payloads return `400 Bad Request` with structured error details.
- No raw user input is interpolated into SQL — only parameterized queries.

### 5.4 CORS Policy

```ts
app.use(cors({
    origin: process.env.FRONTEND_URL,   // e.g. http://localhost:3000
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
```

---

## 6. Database Security

| Control | Implementation |
|---------|---------------|
| Connection credentials | Via `DATABASE_URL` env var; never in source |
| Connection encryption | SSL/TLS required in production (`?sslmode=require`) |
| Least privilege | Application DB user has DML rights only; no `CREATE/DROP` in prod |
| Parameterized queries | All queries use `$1, $2…` placeholders via `pg` driver |
| Migrations | Run by a separate privileged user during deployment only |

---

## 7. Zero-Document Policy Enforcement

The system **does not** provide:

- File upload endpoints
- Document storage (S3, local FS, or DB blobs)
- Attachment fields on any table
- Download/preview routes for documents
- Digital signature capture or verification

All billing documentation (invoices, vouchers, receipts) is managed through
physical processes and referenced in the system by `external_reference_no` only.

---

## 8. Audit & Logging Considerations

| Event | Logged? | Storage |
|-------|---------|---------|
| Login success/failure | ✅ | Server logs (stdout in Docker) |
| RBAC denial (403) | ✅ | Server logs |
| Billing record create/update | ✅ | `internal_billings.created_at` + `recorded_by` |
| Data modification | Tracked via `created_at` / `last_updated` columns | Database |

Future enhancement: dedicated `audit_log` table for full change-tracking.

---

## 9. Development vs Production Security Checklist

| Item | Development | Production |
|------|:-----------:|:----------:|
| HTTPS | ❌ (localhost) | ✅ (required) |
| Helmet CSP | Relaxed | Strict |
| JWT expiry | 15 min | 15 min |
| Rate limits | Lenient | Enforced |
| CORS origin | `localhost:3000` | Exact production domain |
| DB SSL | Optional | Required |
| Debug logs | Verbose | Error-only |
