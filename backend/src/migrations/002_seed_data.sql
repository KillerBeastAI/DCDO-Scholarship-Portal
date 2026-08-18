-- ============================================================
-- 002_seed_data.sql
-- Davao City Scholarship Programs Portal
-- Inserts fictional sample data for development and testing.
-- All names, addresses, and values are entirely fictional.
-- ============================================================

BEGIN;

-- ── 1. Internal Users (password = "Password123!" hashed with bcrypt) ─
-- Hash: $2b$10$vArmeJ0qHoKqQnV7NV8phOwxzPleAKCVCHq4dTUk.I8Cyuxz43Vyu
INSERT INTO internal_users (user_id, username, email, password_hash, department, role)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'CATHERYN PEREZ', 'csperez@tesda.gov.ph',
   '$2b$10$ULh/v7H0sMnrbf8giEYpM.kmLcYHjzD0HUEMUnYxZFASGVtbJC5fa',
   'TESDA DCDO Scholarship Focal', 'admin')
ON CONFLICT (user_id) DO NOTHING;

-- ── 2. Training Providers ───────────────────────────────────
INSERT INTO training_providers (provider_id, institution_name, institution_type, classification, school_id, complete_address, contact_number, status)
VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'Davao Technical Skills Institute',
   'TVI', 'Private', 'DTSI-2024-001',
   '123 Bonifacio St., Poblacion District, Davao City 8000',
   '(082) 555-0101', 'active'),

  ('b0000000-0000-0000-0000-000000000002',
   'Mindanao Polytechnic College',
   'HEI', 'Public', 'MPC-2024-002',
   '456 Rizal Ave., Buhangin, Davao City 8000',
   '(082) 555-0202', 'active'),

  ('b0000000-0000-0000-0000-000000000003',
   'Southern Philippines Vocational Academy',
   'TVI', 'Private', 'SPVA-2024-003',
   '789 Mabini Rd., Toril, Davao City 8000',
   '(082) 555-0303', 'active'),

  ('b0000000-0000-0000-0000-000000000004',
   'Ateneo de Davao Training Center',
   'HEI', 'Private', 'ADTC-2024-004',
   '321 Jacinto St., Poblacion District, Davao City 8000',
   '(082) 555-0404', 'inactive')
ON CONFLICT (provider_id) DO NOTHING;

-- ── 3. Scholarship Programs ────────────────────────────────
INSERT INTO scholarship_programs (program_id, program_code, program_name, fiscal_year, total_allocated, total_disbursed)
VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'PESFA-2026', 'Private Education Student Financial Assistance', 2026, 15000000.00, 4250000.00),

  ('c0000000-0000-0000-0000-000000000002',
   'TWSP-2026', 'Training for Work Scholarship Program', 2026, 25000000.00, 8750000.00),

  ('c0000000-0000-0000-0000-000000000003',
   'STEP-2026', 'Special Training for Employment Program', 2026, 10000000.00, 1500000.00)
ON CONFLICT (program_id) DO NOTHING;

-- ── 4. Qualification Maps ──────────────────────────────────
INSERT INTO qualification_maps (qm_id, program_id, provider_id, rqm_code, nqm_code, pqm_code, sector, tvet_qualification, qualification_level, delivery_mode, total_slots, training_cost_per_capita, support_fund_per_capita, assessment_fee, total_approved_amount, status)
VALUES
  ('d0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'RQM-001', 'NQM-001', 'PQM-001',
   'Information and Communication Technology',
   'Computer Systems Servicing NC II', 'NC II', 'Institution-Based',
   30, 15000.00, 3000.00, 1500.00, 585000.00, 'approved'),

  ('d0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'RQM-002', 'NQM-002', 'PQM-002',
   'Tourism (Hotel and Restaurant)',
   'Food and Beverage Services NC II', 'NC II', 'Institution-Based',
   25, 12000.00, 2500.00, 1200.00, 392500.00, 'approved'),

  ('d0000000-0000-0000-0000-000000000003',
   'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003',
   'RQM-003', 'NQM-003', 'PQM-003',
   'Electrical and Electronics',
   'Electrical Installation and Maintenance NC II', 'NC II', 'Dual Training System',
   20, 18000.00, 3500.00, 1800.00, 466000.00, 'draft'),

  ('d0000000-0000-0000-0000-000000000004',
   'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'RQM-004', 'NQM-004', 'PQM-004',
   'Automotive and Land Transportation',
   'Automotive Servicing NC I', 'NC I', 'Community-Based',
   15, 10000.00, 2000.00, 1000.00, 195000.00, 'approved')
ON CONFLICT (qm_id) DO NOTHING;

-- ── 5. Physical Accomplishments ────────────────────────────
INSERT INTO physical_accomplishments (accomplishment_id, qm_id, enrolled_male, enrolled_female, dropped_male, dropped_female, dropped_amount_deduction, graduated_completed_male, graduated_completed_female, graduated_pending_assessment_male, graduated_pending_assessment_female, assessed_male, assessed_female, certified_male, certified_female, employed_male, employed_female, unutilized_slots, unutilized_amount)
VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000001',
   18, 12,  1, 0, 19500.00,
   15, 11,  2, 1,
   13, 10,  12, 9,
   8, 7,  0, 0.00),

  ('e0000000-0000-0000-0000-000000000002',
   'd0000000-0000-0000-0000-000000000002',
   10, 15,  0, 2, 15700.00,
   9, 12,  1, 1,
   8, 11,  7, 10,
   5, 8,  0, 0.00),

  ('e0000000-0000-0000-0000-000000000003',
   'd0000000-0000-0000-0000-000000000004',
   10, 5,  1, 1, 13000.00,
   8, 4,  1, 0,
   7, 3,  6, 3,
   4, 2,  2, 26000.00)
ON CONFLICT (accomplishment_id) DO NOTHING;

-- ── 6. Internal Billings ───────────────────────────────────
INSERT INTO internal_billings (billing_id, provider_id, qm_id, external_reference_no, claimed_amount, verification_status, recorded_by)
VALUES
  ('f0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'INV-2026-DVO-00145', 292500.00, 'verified',
   'a0000000-0000-0000-0000-000000000001'),

  ('f0000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'INV-2026-DVO-00198', 292500.00, 'pending',
   'a0000000-0000-0000-0000-000000000001'),

  ('f0000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
   'INV-2026-MPC-00067', 196250.00, 'verified',
   'a0000000-0000-0000-0000-000000000001'),

  ('f0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
   'INV-2026-MPC-00089', 196250.00, 'rejected',
   'a0000000-0000-0000-0000-000000000001'),

  ('f0000000-0000-0000-0000-000000000005',
   'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004',
   'INV-2026-DVO-00210', 97500.00, 'pending',
   'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (billing_id) DO NOTHING;

COMMIT;
