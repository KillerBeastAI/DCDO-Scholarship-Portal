-- Migration: rename date_validity to date_of_expiration in training_providers
-- Run once against the live database

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_providers'
      AND column_name = 'date_validity'
  ) THEN
    ALTER TABLE training_providers RENAME COLUMN date_validity TO date_of_expiration;
    RAISE NOTICE 'Column renamed: date_validity -> date_of_expiration';
  ELSE
    RAISE NOTICE 'Column date_validity does not exist (may already be renamed). Skipping.';
  END IF;
END $$;
