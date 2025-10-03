-- Add session_duration field to users table
-- Migration: Add session_duration for trainers

ALTER TABLE users
ADD COLUMN session_duration INTEGER DEFAULT 60;

-- Add comment
COMMENT ON COLUMN users.session_duration IS 'Training session duration in minutes (default 60)';

-- Update existing trainers to have default 60 minutes
UPDATE users
SET session_duration = 60
WHERE role = 'trainer' AND session_duration IS NULL;