-- ============================================================
-- 003_update_qm_accomplishments_programs.sql
-- Davao City Scholarship Programs Portal
-- Updates qualification_maps, scholarship_programs, and accomplishments
-- ============================================================

BEGIN;

-- 1. Add new cost and metadata columns to qualification_maps
ALTER TABLE qualification_maps
  ADD COLUMN IF NOT EXISTS appropriation               VARCHAR(50)   DEFAULT 'Current',
  ADD COLUMN IF NOT EXISTS fiscal_year                 VARCHAR(20)   DEFAULT 'FY 2026',
  ADD COLUMN IF NOT EXISTS allocation                  VARCHAR(50)   DEFAULT 'CO',
  ADD COLUMN IF NOT EXISTS book_allowance              NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS new_normal_assistance       NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_accident_insurance   NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS entrepreneurship_fee        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_training_cost         NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_support_fund          NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_book_allowance        NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_new_normal_assistance NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_annual_accident_insurance NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_entrepreneurship_fee  NUMERIC(15,2) DEFAULT 0;

-- 2. Ensure standard scholarship programs exist
INSERT INTO scholarship_programs (program_code, program_name, fiscal_year, total_allocated, total_disbursed)
VALUES
  ('TWSP', 'Training for Work Scholarship Program (TWSP)', 2026, 0, 0),
  ('TTSP', 'Tulong Trabaho Scholarship Program (TTSP)', 2026, 0, 0),
  ('PESFA', 'Private Education Student Financial Assistance (PESFA)', 2026, 0, 0),
  ('STEP', 'Special Training for Employment Program (STEP)', 2026, 0, 0),
  ('TSUPER', 'Tsuper Iskolar', 2026, 0, 0),
  ('RCEF-RTES', 'Rice Training and Extension Services (RCEF-RTES)', 2026, 0, 0),
  ('CFSP', 'Coconut Farmers Scholarship Program (CFSP)', 2026, 0, 0),
  ('CDWs', 'Child Development Workers (CDWs) Scholarship Program', 2026, 0, 0),
  ('LEAP', 'Lifelong Employability and Advancement Program (LEAP)', 2026, 0, 0)
ON CONFLICT (program_code) DO UPDATE 
SET program_name = EXCLUDED.program_name;

-- Standardize names for seeded programs
UPDATE scholarship_programs SET program_name = 'Private Education Student Financial Assistance (PESFA)' WHERE program_name ILIKE '%PESFA%' OR program_code ILIKE '%PESFA%';
UPDATE scholarship_programs SET program_name = 'Training for Work Scholarship Program (TWSP)' WHERE program_name ILIKE '%TWSP%' OR program_code ILIKE '%TWSP%';
UPDATE scholarship_programs SET program_name = 'Special Training for Employment Program (STEP)' WHERE program_name ILIKE '%STEP%' OR program_code ILIKE '%STEP%';

-- 3. Calculate and populate totals for all existing qualification maps
UPDATE qualification_maps
SET 
  total_training_cost = total_slots * COALESCE(training_cost_per_capita, 0),
  total_support_fund = total_slots * COALESCE(support_fund_per_capita, 0),
  total_book_allowance = total_slots * COALESCE(book_allowance, 0),
  total_new_normal_assistance = total_slots * COALESCE(new_normal_assistance, 0),
  total_annual_accident_insurance = total_slots * COALESCE(annual_accident_insurance, 0),
  total_entrepreneurship_fee = total_slots * COALESCE(entrepreneurship_fee, 0),
  total_approved_amount = (
    (total_slots * COALESCE(training_cost_per_capita, 0)) +
    (total_slots * COALESCE(support_fund_per_capita, 0)) +
    (total_slots * COALESCE(book_allowance, 0)) +
    (total_slots * COALESCE(new_normal_assistance, 0)) +
    (total_slots * COALESCE(annual_accident_insurance, 0)) +
    (total_slots * COALESCE(entrepreneurship_fee, 0))
  ),
  fiscal_year = COALESCE(fiscal_year, 'FY 2026'),
  appropriation = COALESCE(appropriation, 'Current'),
  allocation = COALESCE(allocation, 'CO');

COMMIT;
