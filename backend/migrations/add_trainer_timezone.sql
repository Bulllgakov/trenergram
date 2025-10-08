-- Add timezone field to trainers table
-- Migration: add_trainer_timezone
-- Date: 2025-10-08

ALTER TABLE trainers ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Moscow';

-- Update existing trainers to have Moscow timezone
UPDATE trainers SET timezone = 'Europe/Moscow' WHERE timezone IS NULL;

COMMENT ON COLUMN trainers.timezone IS 'IANA timezone identifier (e.g. Europe/Moscow, Asia/Yekaterinburg)';
