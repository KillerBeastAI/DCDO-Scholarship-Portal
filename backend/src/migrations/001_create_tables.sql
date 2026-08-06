-- ============================================================
-- 001_create_tables.sql
-- Davao City Scholarship Programs Portal
-- Creates all domain tables with constraints and indexes.
-- ============================================================

BEGIN;

-- ── 1. internal_users ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS internal_users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(100)  NOT NULL UNIQUE,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    department      VARCHAR(150)  NOT NULL,
    role            VARCHAR(30)   NOT NULL
                        CHECK (role IN ('admin', 'evaluator', 'finance_auditor')),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON internal_users (email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON internal_users (role);

-- ── 2. training_providers ───────────────────────────────────
CREATE TABLE IF NOT EXISTS training_providers (
    provider_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name  VARCHAR(255) NOT NULL,
    institution_type  VARCHAR(100) NOT NULL,
    classification    VARCHAR(100) NOT NULL,
    school_id         VARCHAR(50)  UNIQUE,
    complete_address  TEXT         NOT NULL,
    contact_number    VARCHAR(30),
    status            VARCHAR(20)  NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'inactive', 'suspended'))
);

CREATE INDEX IF NOT EXISTS idx_providers_status ON training_providers (status);

-- ── 3. scholarship_programs ─────────────────────────────────
CREATE TABLE IF NOT EXISTS scholarship_programs (
    program_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_code     VARCHAR(50)   NOT NULL UNIQUE,
    program_name     VARCHAR(255)  NOT NULL,
    fiscal_year      INT           NOT NULL,
    total_allocated  NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_disbursed  NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_programs_fy ON scholarship_programs (fiscal_year);

-- ── 4. qualification_maps ───────────────────────────────────
CREATE TABLE IF NOT EXISTS qualification_maps (
    qm_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id               UUID          NOT NULL REFERENCES scholarship_programs(program_id),
    provider_id              UUID          NOT NULL REFERENCES training_providers(provider_id),
    rqm_code                 VARCHAR(50),
    nqm_code                 VARCHAR(50),
    pqm_code                 VARCHAR(50),
    sector                   VARCHAR(150)  NOT NULL,
    tvet_qualification       VARCHAR(255)  NOT NULL,
    qualification_level      VARCHAR(30)   NOT NULL,
    delivery_mode            VARCHAR(50)   NOT NULL,
    total_slots              INT           NOT NULL CHECK (total_slots >= 0),
    training_cost_per_capita NUMERIC(12,2) NOT NULL,
    support_fund_per_capita  NUMERIC(12,2) NOT NULL DEFAULT 0,
    assessment_fee           NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_approved_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
    status                   VARCHAR(20)   NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'approved', 'completed', 'cancelled')),
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qm_program  ON qualification_maps (program_id);
CREATE INDEX IF NOT EXISTS idx_qm_provider ON qualification_maps (provider_id);
CREATE INDEX IF NOT EXISTS idx_qm_status   ON qualification_maps (status);

-- ── 5. physical_accomplishments ─────────────────────────────
CREATE TABLE IF NOT EXISTS physical_accomplishments (
    accomplishment_id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qm_id                               UUID          NOT NULL UNIQUE
                                             REFERENCES qualification_maps(qm_id),
    enrolled_male                        INT NOT NULL DEFAULT 0,
    enrolled_female                      INT NOT NULL DEFAULT 0,
    dropped_male                         INT NOT NULL DEFAULT 0,
    dropped_female                       INT NOT NULL DEFAULT 0,
    dropped_amount_deduction             NUMERIC(12,2) NOT NULL DEFAULT 0,
    graduated_completed_male             INT NOT NULL DEFAULT 0,
    graduated_completed_female           INT NOT NULL DEFAULT 0,
    graduated_pending_assessment_male    INT NOT NULL DEFAULT 0,
    graduated_pending_assessment_female  INT NOT NULL DEFAULT 0,
    assessed_male                        INT NOT NULL DEFAULT 0,
    assessed_female                      INT NOT NULL DEFAULT 0,
    certified_male                       INT NOT NULL DEFAULT 0,
    certified_female                     INT NOT NULL DEFAULT 0,
    employed_male                        INT NOT NULL DEFAULT 0,
    employed_female                      INT NOT NULL DEFAULT 0,
    unutilized_slots                     INT NOT NULL DEFAULT 0,
    unutilized_amount                    NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_updated                         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 6. internal_billings ────────────────────────────────────
CREATE TABLE IF NOT EXISTS internal_billings (
    billing_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id           UUID          NOT NULL REFERENCES training_providers(provider_id),
    qm_id                 UUID          NOT NULL REFERENCES qualification_maps(qm_id),
    external_reference_no VARCHAR(100)  NOT NULL,
    claimed_amount        NUMERIC(15,2) NOT NULL CHECK (claimed_amount >= 0),
    verification_status   VARCHAR(30)   NOT NULL DEFAULT 'pending'
                              CHECK (verification_status IN ('pending', 'verified', 'rejected', 'returned')),
    recorded_by           UUID          NOT NULL REFERENCES internal_users(user_id),
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billings_provider ON internal_billings (provider_id);
CREATE INDEX IF NOT EXISTS idx_billings_qm       ON internal_billings (qm_id);
CREATE INDEX IF NOT EXISTS idx_billings_status   ON internal_billings (verification_status);

-- ── Migration tracking ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS _migrations (
    id         SERIAL PRIMARY KEY,
    filename   VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMIT;
