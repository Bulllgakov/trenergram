-- Add client reminder settings to users table
-- Date: 2025-10-15

-- Add columns for client reminder settings (for confirmed bookings)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS client_reminder_2h_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS client_reminder_1h_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS client_reminder_15m_enabled BOOLEAN DEFAULT TRUE;

-- Add columns to bookings table for tracking client reminders
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS client_reminder_2h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS client_reminder_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS client_reminder_15m_sent BOOLEAN DEFAULT FALSE;

-- Add comments for clarity
COMMENT ON COLUMN users.client_reminder_2h_enabled IS 'Client setting: send reminder 2 hours before confirmed training';
COMMENT ON COLUMN users.client_reminder_1h_enabled IS 'Client setting: send reminder 1 hour before confirmed training';
COMMENT ON COLUMN users.client_reminder_15m_enabled IS 'Client setting: send reminder 15 minutes before confirmed training';

COMMENT ON COLUMN bookings.client_reminder_2h_sent IS 'Whether 2-hour reminder was sent to client for confirmed booking';
COMMENT ON COLUMN bookings.client_reminder_1h_sent IS 'Whether 1-hour reminder was sent to client for confirmed booking';
COMMENT ON COLUMN bookings.client_reminder_15m_sent IS 'Whether 15-minute reminder was sent to client for confirmed booking';
