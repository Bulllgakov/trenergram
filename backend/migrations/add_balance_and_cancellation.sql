-- Add balance charging and cancellation fields
-- Migration: add_balance_and_cancellation
-- Date: 2025-10-08

-- Add cancellation_hours to users table (for trainers)
ALTER TABLE users ADD COLUMN IF NOT EXISTS cancellation_hours INTEGER DEFAULT 24;

-- Add balance charging fields to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_charged BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS charged_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN users.cancellation_hours IS 'Hours before training when balance is automatically charged (24 = charge 24 hours before)';
COMMENT ON COLUMN bookings.is_charged IS 'Whether client balance was charged for this booking';
COMMENT ON COLUMN bookings.charged_at IS 'When the balance was charged from client';

-- Update existing trainers to have default 24 hours
UPDATE users SET cancellation_hours = 24 WHERE cancellation_hours IS NULL AND role = 'trainer';
