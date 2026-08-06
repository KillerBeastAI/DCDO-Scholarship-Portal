# Architecture — Davao City Scholarship Programs Portal

> **Classification:** Internal Government Tool — Municipal Personnel Only  
> **Last Updated:** 2026-07-31

---

## 1. High-Level Overview

The portal is a three-tier, monorepo web application designed for internal
municipal staff to monitor scholarship programs, training providers, qualification
maps, physical accomplishments, and billing ledgers.

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                         │
│              React + Vite  (port 3000 dev)                   │
└──────────────────────┬───────────────────────────────────────┘
                       │  HTTPS / JSON
┌──────────────────────▼───────────────────────────────────────┐
│                     Nginx Reverse Proxy                      │
│             Serves SPA static assets (prod)                  │
│             Forwards /api/* → backend:5000                   │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│                   Node.js / Express API                      │
│              TypeScript — port 5000                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │  Auth    │ │  Routes  │ │ Services │ │  Middleware     │  │
│  │ (Google  │ │ /api/v1  │ │ (biz     │ │ (RBAC, helmet, │  │
│  │  OAuth + │ │          │ │  logic)  │ │  rate-limit,   │  │
│  │  JWT)    │ │          │ │          │ │  validation)   │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
└──────────────────────┬───────────────────────────────────────┘
                       │  pg driver (SSL in prod)
┌──────────────────────▼───────────────────────────────────────┐
│                     PostgreSQL 15                            │
│              Docker container — port 5432                    │
│         6 tables · see docs/database-schema.md               │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Project Structure

```
Program Projects/                (monorepo root)
├── backend/
│   ├── src/
│   │   ├── config/              # DB pool, env loader, Passport strategies
│   │   ├── middleware/           # auth, rbac, error-handler, rate-limit
│   │   ├── routes/              # Express routers (/api/v1/*)
│   │   ├── services/            # Business logic layer
│   │   ├── models/              # SQL query builders / data-access
│   │   ├── utils/               # Helpers (token, hashing, validators)
│   │   ├── seed/                # Seed scripts (sample data only)
│   │   ├── migrations/          # Incremental SQL migration files
│   │   ├── __tests__/           # Jest + Supertest test suites
│   │   └── index.ts             # Express entry point
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios instance + typed API wrappers
│   │   ├── components/          # Shared UI components (Sidebar, Header…)
│   │   ├── layouts/             # AppLayout (sidebar + content area)
│   │   ├── pages/               # Route-level page components
│   │   ├── contexts/            # AuthContext, ThemeContext
│   │   ├── hooks/               # Custom React hooks
│   │   ├── types/               # Shared TypeScript interfaces
│   │   ├── utils/               # Formatting, constants
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── nginx/
│   └── nginx.conf
├── docs/                        # ← you are here
│   ├── architecture.md
│   ├── database-schema.md
│   ├── security.md
│   └── implementation-plan.md
├── docker-compose.yml
├── .env.example                 # Template — never committed with real values
└── package.json                 # Workspace root (npm workspaces)
```

---

## 3. Service Responsibilities

| Service | Runtime | Responsibility |
|---------|---------|---------------|
| **Frontend** | React 19 + Vite 8 | SPA with role-based sidebar, dashboard, CRUD views, data tables |
| **Backend** | Node 18 + Express 4 + TS | REST API, authentication, authorization (RBAC), business rules, Swagger docs |
| **PostgreSQL** | 15-alpine (Docker) | Persistent relational storage for all domain data |
| **Nginx** | Alpine (Docker) | Reverse proxy; serves built SPA assets in production; forwards `/api/*` to backend |

---

## 4. Authentication & Authorization Flow

```
User ──► Google OAuth 2.0 Consent
              │
              ▼
      Backend /api/v1/auth/google/callback
              │
              ├─ Verify user email exists in `internal_users`
              │  (pre-provisioned by Admin — no self-registration)
              │
              ├─ Generate JWT (access + refresh tokens)
              │
              └─ Return tokens → Frontend stores in httpOnly cookie / memory
              
Every protected request:
  Bearer JWT → authMiddleware → rbacMiddleware(role) → route handler
```

**Fallback:** bcrypt-hashed password login for accounts without Google Workspace.

---

## 5. API Design Principles

- **Versioned:** All routes prefixed `/api/v1/`.
- **RESTful:** Standard resource nouns — `training-providers`, `qualification-maps`, `billings`, etc.
- **Pagination:** Cursor-based or offset pagination on list endpoints.
- **Validation:** Request bodies validated via middleware before reaching services.
- **Error format:** Consistent `{ error: string, details?: object }` JSON envelope.
- **Documentation:** Swagger/OpenAPI served at `/api/docs`.

---

## 6. Deployment Topology (Docker Compose)

```yaml
services:
  postgres      # Data persistence, env-configured credentials
  backend       # Node.js API container
  frontend      # Multi-stage build → static assets served by Nginx
  nginx         # Port 80 → SPA + reverse-proxy to backend
```

All secrets are injected via environment variables (`.env` file, never committed).

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| No individual scholar tables | Aggregate/institutional tracking per government monitoring standards |
| No file upload endpoints | Zero-Document Policy — physical/official docs stay outside the system |
| No payment gateway integration | Billing is ledger-entry only (external reference numbers) |
| Pre-provisioned user accounts | Internal-only tool; no public registration |
| TypeScript on backend | Catches schema mismatches at compile time; better DX for a team |
| Monorepo with npm workspaces | Single `npm install` at root; shared dev tooling |
