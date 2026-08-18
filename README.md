# Davao City Scholarship Programs Management System (DCSPMS)

> **Internal-use portal** for managing scholarship programs, training providers, qualification maps, physical accomplishments, and billing ledgers for the Davao City government.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [API Documentation](#api-documentation)

---

## Overview

DCSPMS is a full-stack TypeScript monorepo with:

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 15 |
| Auth | Password login + Google OAuth 2.0, JWT (access + refresh) |
| Proxy | Nginx (production) |
| Container | Docker + Docker Compose |

### Key Design Constraints

- **Internal users only** — no public registration; accounts are pre-provisioned by an admin.
- **Zero-document policy** — no file uploads or downloads.
- **Ledger-driven billing** — manual entry with external reference numbers only.
- **Aggregate tracking** — accomplishments are recorded as gender-disaggregated totals, not per individual scholar.

---

## Architecture

```
┌──────────────┐     HTTPS      ┌──────────────┐
│   Browser    │ ─────────────► │    Nginx     │
└──────────────┘                └──────┬───────┘
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼             │
                   ┌──────────┐  ┌──────────┐       │
                   │ Frontend │  │ Backend  │       │
                   │ (React)  │  │(Express) │       │
                   └──────────┘  └────┬─────┘       │
                                      │              │
                                 ┌────▼─────┐        │
                                 │ Postgres │        │
                                 └──────────┘        │
```

See [`docs/architecture.md`](docs/architecture.md) for full detail.

---

## Prerequisites

- [Node.js](https://nodejs.org) v20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for the database container)
- A Google Cloud OAuth 2.0 credential (optional for local dev)

---

## Quick Start (Docker)

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd DCDO-Scholarship-Portal

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your secrets

# 3. Start all services
docker compose up --build

# App is now available at http://localhost:80
# Swagger UI is at http://localhost:80/api/docs
```

---

## Local Development

The monorepo uses npm workspaces. Run everything from the **project root**.

```bash
# Install all dependencies (root + workspaces)
npm install

# Start the PostgreSQL database (Docker)
docker compose up -d postgres

# Run both backend and frontend dev servers concurrently
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Swagger UI | http://localhost:5000/api/docs |

### Backend only

```bash
cd backend
npm run dev      # ts-node with --watch
npm run build    # compile TypeScript → dist/
npm start        # run compiled dist/index.js
```

### Frontend only

```bash
cd frontend
npm run dev      # Vite HMR dev server
npm run build    # production bundle
npm run lint     # oxlint check
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all required values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | 64-char random string for access tokens |
| `JWT_REFRESH_SECRET` | ✅ | 64-char random string for refresh tokens |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth app client secret |
| `GOOGLE_CALLBACK_URL` | Optional | OAuth redirect URI |
| `FRONTEND_URL` | Optional | CORS origin (default: `http://localhost:3000`) |
| `PORT` | Optional | Backend port (default: `5000`) |

---

## Running Tests

```bash
# From the project root
npm test

# Or directly in the backend workspace
cd backend && npm test
```

Tests use **Jest + Supertest** with the database fully mocked — no live database connection is required.

Current coverage: **45 tests across 2 suites** (auth + CRUD API).

---

## Project Structure

```
DCDO-Scholarship-Portal/
├── backend/
│   ├── src/
│   │   ├── config/         # DB pool, env loader, Passport, Swagger
│   │   ├── middleware/     # auth, RBAC, error handler
│   │   ├── migrations/     # SQL migration files
│   │   ├── models/         # Data-access layer (raw SQL via pg)
│   │   ├── routes/         # Express routers
│   │   ├── services/       # Business logic
│   │   ├── types/          # Shared TypeScript domain types
│   │   ├── utils/          # JWT helpers, password hashing, migration runner
│   │   └── __tests__/      # Jest integration tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, ProtectedRoute
│   │   ├── context/        # AuthContext
│   │   ├── pages/          # Dashboard, Providers, Programs, QM, Accomplishments, Billings, Users
│   │   ├── services/       # Axios client (api.ts)
│   │   └── types/          # Domain type definitions
│   └── Dockerfile
├── nginx/                  # Reverse proxy config
├── docs/                   # Architecture, schema, security docs
├── docker-compose.yml
└── .env.example
```

---

## User Roles

| Role | Permissions |
|---|---|
| `admin` | Full access including user management |
| `evaluator` | Create/edit providers, programs, qualification maps, accomplishments, billings |
| `finance_auditor` | View-only + billing verification |

---

## API Documentation

Interactive Swagger UI is served at `/api/docs` (requires authentication in production).

All endpoints follow the pattern `/api/v1/<resource>` and return JSON with a `data` envelope:

```json
{ "data": { ... } }
```

Errors return:

```json
{ "error": "Human-readable message" }
```

### Endpoint Groups

| Prefix | Resource |
|---|---|
| `/api/v1/auth` | Login, Google OAuth, token refresh, logout, profile |
| `/api/v1/users` | Internal user management (admin only) |
| `/api/v1/training-providers` | TVET institution CRUD |
| `/api/v1/scholarship-programs` | Scholarship program CRUD |
| `/api/v1/qualification-maps` | Qualification map CRUD + status workflow |
| `/api/v1/accomplishments` | Physical accomplishment upsert + query |
| `/api/v1/billings` | Internal billing ledger + verification |
| `/api/v1/dashboard` | KPI summary, budget breakdown, billing status |
