# Implementation Plan — Davao City Scholarship Programs Portal

> **Last Updated:** 2026-07-31

---

## Current State

The workspace is a fresh monorepo scaffold:

- **Root:** npm workspaces with `concurrently` for parallel dev servers.
- **Backend:** Bare Express server (`src/index.js`) with a single `/api/health`
  endpoint. Dependencies installed: Express, pg, bcrypt, jsonwebtoken,
  passport + Google OAuth strategy, swagger-jsdoc/ui, dotenv. **No TypeScript
  configured yet.**
- **Frontend:** Vite + React 19 with the default template (counter demo).
  Dependencies: axios, react-router-dom. Proxy configured to `localhost:3001`.
- **Nginx:** Basic reverse proxy config (proxies everything to backend).
- **Docker Compose:** PostgreSQL 15, backend, nginx. Credentials are hardcoded
  in the compose file (will be externalized to `.env`).

---

## Implementation Phases

### Phase 1 — Backend Foundation & TypeScript Migration

**Goal:** Convert the backend to TypeScript; establish config, DB pool, and migration infrastructure.

| # | Task | Files |
|---|------|-------|
| 1.1 | Add `tsconfig.json`, TypeScript deps, update `package.json` scripts | `backend/tsconfig.json`, `backend/package.json` |
| 1.2 | Create environment config loader (reads `.env`, validates required vars) | `backend/src/config/env.ts` |
| 1.3 | Create PostgreSQL connection pool module | `backend/src/config/db.ts` |
| 1.4 | Create migration runner + initial migration SQL (`001_create_tables.sql`) | `backend/src/migrations/` |
| 1.5 | Create seed script with sample data (`002_seed_data.sql`) | `backend/src/seed/` |
| 1.6 | Rewrite `index.js` → `index.ts` as Express app with structured middleware | `backend/src/index.ts` |
| 1.7 | Create `.env.example` at project root | `.env.example` |
| 1.8 | Update `docker-compose.yml` to use `.env` for credentials | `docker-compose.yml` |

**Verification:** `npm run dev:backend` starts without errors; migration creates tables; seed populates sample data.

---

### Phase 2 — Authentication & Authorization

**Goal:** Google OAuth + password fallback; JWT issuance; RBAC middleware.

| # | Task | Files |
|---|------|-------|
| 2.1 | Configure Passport Google OAuth strategy | `backend/src/config/passport.ts` |
| 2.2 | Create auth routes (`/api/v1/auth/google`, `/callback`, `/login`, `/refresh`, `/logout`) | `backend/src/routes/auth.routes.ts` |
| 2.3 | Create auth service (token generation, password verification) | `backend/src/services/auth.service.ts` |
| 2.4 | Create `authMiddleware` (JWT verification) | `backend/src/middleware/auth.middleware.ts` |
| 2.5 | Create `rbacMiddleware` (role checking) | `backend/src/middleware/rbac.middleware.ts` |
| 2.6 | Create error-handling middleware | `backend/src/middleware/error.middleware.ts` |
| 2.7 | Add Helmet, CORS, rate-limiting setup | `backend/src/index.ts` |

**Verification:** Jest tests for login, token refresh, and RBAC denial scenarios.

---

### Phase 3 — Backend CRUD API Modules

**Goal:** RESTful endpoints for all six domain entities with Swagger docs.

| # | Entity | Route Prefix | Key Operations |
|---|--------|-------------|----------------|
| 3.1 | Internal Users | `/api/v1/users` | List, create, update, deactivate (admin only) |
| 3.2 | Training Providers | `/api/v1/training-providers` | Full CRUD |
| 3.3 | Scholarship Programs | `/api/v1/scholarship-programs` | Full CRUD |
| 3.4 | Qualification Maps | `/api/v1/qualification-maps` | Full CRUD with FK validation |
| 3.5 | Physical Accomplishments | `/api/v1/accomplishments` | Create/update per `qm_id` |
| 3.6 | Internal Billings | `/api/v1/billings` | Create, update status, list with filters |
| 3.7 | Dashboard Aggregates | `/api/v1/dashboard` | Summary stats, counts, budget utilization |

Each module includes:
- Router → Service → Model (data-access) layers
- Request validation middleware
- Swagger JSDoc annotations

**Verification:** Supertest integration tests for each endpoint group.

---

### Phase 4 — Frontend Shell & Layout

**Goal:** Replace the Vite template with the application shell — sidebar navigation, auth context, routing.

| # | Task | Files |
|---|------|-------|
| 4.1 | Design system: CSS variables, typography (Inter font), color palette | `frontend/src/index.css` |
| 4.2 | Create `AuthContext` (login state, JWT storage, role info) | `frontend/src/contexts/AuthContext.tsx` |
| 4.3 | Create `AppLayout` with responsive sidebar | `frontend/src/layouts/AppLayout.tsx` |
| 4.4 | Create `Sidebar` component with role-based navigation links | `frontend/src/components/Sidebar.tsx` |
| 4.5 | Create `Header` component (user info, logout) | `frontend/src/components/Header.tsx` |
| 4.6 | Set up React Router with protected routes | `frontend/src/App.tsx` |
| 4.7 | Create Axios instance with JWT interceptor | `frontend/src/api/client.ts` |
| 4.8 | Create Login page (Google OAuth button + password fallback form) | `frontend/src/pages/LoginPage.tsx` |

**Verification:** Browser shows login → sidebar → empty dashboard; sidebar collapses on mobile.

---

### Phase 5 — Frontend CRUD Pages

**Goal:** Build all data management pages with tables, forms, and filters.

| # | Page | Key Features |
|---|------|-------------|
| 5.1 | Dashboard | KPI cards (total programs, providers, budget utilization, billing status), summary charts |
| 5.2 | Training Providers | Searchable data table, add/edit modal, status badges |
| 5.3 | Scholarship Programs | Table with fiscal-year filter, add/edit form, budget bar |
| 5.4 | Qualification Maps | Linked selectors (program → provider), detail view, status workflow |
| 5.5 | Physical Accomplishments | Gender-disaggregated form, inline editing, computed totals |
| 5.6 | Internal Billings | Ledger table, reference-no entry, verification status badges |
| 5.7 | User Management (admin) | User list, role assignment, add user form |

Shared components created along the way:
- `DataTable` (sortable, paginated)
- `Modal`, `FormField`, `StatusBadge`, `KpiCard`

**Verification:** Full CRUD workflow for each entity via the UI; responsive on mobile.

---

### Phase 6 — Testing & Quality

| # | Task | Tool |
|---|------|------|
| 6.1 | Backend unit tests for services | Jest |
| 6.2 | Backend integration tests for API routes | Jest + Supertest |
| 6.3 | Frontend linting | oxlint (already configured) |
| 6.4 | TypeScript strict-mode compliance | `tsc --noEmit` |
| 6.5 | Accessibility review (semantic HTML, ARIA, keyboard nav) | Manual + axe-core |

**Verification:** `npm test` in backend passes ≥ 80% coverage on services; no lint errors.

---

### Phase 7 — Docker & Deployment Hardening

| # | Task | Files |
|---|------|-------|
| 7.1 | Multi-stage backend Dockerfile (build TS → run JS) | `backend/Dockerfile` |
| 7.2 | Multi-stage frontend Dockerfile (build → serve via Nginx) | `frontend/Dockerfile` |
| 7.3 | Update `docker-compose.yml` with all services, health checks, `.env` refs | `docker-compose.yml` |
| 7.4 | Update `nginx.conf` to serve SPA + proxy `/api/*` | `nginx/nginx.conf` |
| 7.5 | Add Swagger UI route guarded by auth | `backend/src/config/swagger.ts` |

**Verification:** `docker compose up --build` starts all services; app accessible on `localhost:80`.

---

### Phase 8 — Documentation & Finalization

| # | Task | Files |
|---|------|-------|
| 8.1 | Update `README.md` with setup, test, and run instructions | `README.md` |
| 8.2 | Finalize `docs/architecture.md` | `docs/architecture.md` |
| 8.3 | Finalize `docs/database-schema.md` | `docs/database-schema.md` |
| 8.4 | Finalize `docs/security.md` | `docs/security.md` |
| 8.5 | Create `.env.example` with all required variables | `.env.example` |

---

## Proposed Implementation Order

```
Phase 1  ━━► Phase 2  ━━► Phase 3  ━━► Phase 4  ━━► Phase 5  ━━► Phase 6
  │                                                                   │
  └─ docs/ created (this file + architecture, schema, security)       │
                                                                      ▼
                                                              Phase 7  ━━► Phase 8
```

Phases 1–3 (backend) and Phase 4 (frontend shell) can partially overlap once
the API contracts are defined.

---

## Key Constraints Checklist

- [x] Internal users only — no public registration
- [x] Zero-document policy — no uploads, downloads, or attachments
- [x] Ledger-driven billing — manual entry with external reference numbers
- [x] Aggregate tracking — no individual scholar tables
- [x] Secrets externalized — `.env` only, never in source
- [x] Seeded sample data — no real personal information
