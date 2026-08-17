-- ============================================================
-- 004_cleanup_legacy_programs.sql
-- Clean up legacy scholarship programs (e.g. TWSP CO 2026)
-- ============================================================

BEGIN;

-- Reassign any QMs pointing to old TWSP CO 2026 to official TWSP
UPDATE qualification_maps 
SET program_id = (SELECT program_id FROM scholarship_programs WHERE program_code = 'TWSP' LIMIT 1)
WHERE program_id IN (SELECT program_id FROM scholarship_programs WHERE program_code = 'TWSP CO 2026');

-- Delete old non-standard program codes
DELETE FROM scholarship_programs 
WHERE program_code NOT IN ('TWSP', 'TTSP', 'PESFA', 'STEP', 'TSUPER', 'RCEF-RTES', 'CFSP', 'CDWs', 'LEAP');

COMMIT;
