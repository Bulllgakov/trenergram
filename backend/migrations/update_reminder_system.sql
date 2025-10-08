-- Update reminder system to simplified version
-- Migration: update_reminder_system
-- Date: 2025-10-08

-- For old trainers table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trainers') THEN
        -- Drop old columns if they exist
        ALTER TABLE trainers DROP COLUMN IF EXISTS reminder_1_hours;
        ALTER TABLE trainers DROP COLUMN IF EXISTS reminder_2_delay;
        ALTER TABLE trainers DROP COLUMN IF EXISTS reminder_3_delay;
        ALTER TABLE trainers DROP COLUMN IF EXISTS auto_cancel_delay;

        -- Add new columns
        ALTER TABLE trainers ADD COLUMN IF NOT EXISTS reminder_1_days_before INTEGER DEFAULT 1;
        ALTER TABLE trainers ADD COLUMN IF NOT EXISTS reminder_1_time TIME DEFAULT '20:00';
        ALTER TABLE trainers ADD COLUMN IF NOT EXISTS reminder_2_hours_after INTEGER DEFAULT 1;
        ALTER TABLE trainers ADD COLUMN IF NOT EXISTS reminder_3_hours_after INTEGER DEFAULT 1;
        ALTER TABLE trainers ADD COLUMN IF NOT EXISTS auto_cancel_hours_after INTEGER DEFAULT 1;

        -- Add comments
        COMMENT ON COLUMN trainers.reminder_1_days_before IS 'Days before training to send first reminder (1, 2, or 3)';
        COMMENT ON COLUMN trainers.reminder_1_time IS 'Time to send first reminder (HH:MM format)';
        COMMENT ON COLUMN trainers.reminder_2_hours_after IS 'Hours after first reminder to send second (1, 2, or 3)';
        COMMENT ON COLUMN trainers.reminder_3_hours_after IS 'Hours after second reminder to send third (1, 2, or 3)';
        COMMENT ON COLUMN trainers.auto_cancel_hours_after IS 'Hours after third reminder to auto-cancel (1, 2, or 3)';
    END IF;
END $$;

-- For new unified users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Add cancellation_hours if not exists
        ALTER TABLE users ADD COLUMN IF NOT EXISTS cancellation_hours INTEGER DEFAULT 24;

        -- Add new reminder columns
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_1_days_before INTEGER DEFAULT 1;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_1_time VARCHAR(10) DEFAULT '20:00';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_2_hours_after INTEGER DEFAULT 1;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_3_hours_after INTEGER DEFAULT 1;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_cancel_hours_after INTEGER DEFAULT 1;

        -- Add comments
        COMMENT ON COLUMN users.cancellation_hours IS 'Hours before training when money is charged from client balance';
        COMMENT ON COLUMN users.reminder_1_days_before IS 'Days before training to send first reminder (1, 2, or 3)';
        COMMENT ON COLUMN users.reminder_1_time IS 'Time to send first reminder (HH:MM format)';
        COMMENT ON COLUMN users.reminder_2_hours_after IS 'Hours after first reminder to send second (1, 2, or 3)';
        COMMENT ON COLUMN users.reminder_3_hours_after IS 'Hours after second reminder to send third (1, 2, or 3)';
        COMMENT ON COLUMN users.auto_cancel_hours_after IS 'Hours after third reminder to auto-cancel (1, 2, or 3)';

        -- Update existing trainers to use new defaults
        UPDATE users
        SET
            reminder_1_days_before = 1,
            reminder_1_time = '20:00',
            reminder_2_hours_after = 1,
            reminder_3_hours_after = 1,
            auto_cancel_hours_after = 1
        WHERE role = 'TRAINER'
        AND (reminder_1_days_before IS NULL OR reminder_1_time IS NULL);
    END IF;
END $$;
