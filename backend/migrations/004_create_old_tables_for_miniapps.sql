-- Restore old tables for Mini Apps (trainers, clients)
-- These are needed for existing Mini Apps to continue working

-- Create trainers table (old schema)
CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    telegram_username VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    club_id INTEGER REFERENCES clubs(id),
    specialization JSON,
    price INTEGER DEFAULT 2000,
    description TEXT,
    rating INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,

    -- Reminder settings
    reminder_1_days_before INTEGER DEFAULT 1,
    reminder_1_time TIME DEFAULT '20:00',
    reminder_2_hours_after INTEGER DEFAULT 1,
    reminder_3_hours_after INTEGER DEFAULT 1,
    auto_cancel_hours_after INTEGER DEFAULT 1,

    -- Transfer rules
    transfer_block_hours INTEGER DEFAULT 24,

    -- Working hours
    working_hours JSON,

    -- Timezone
    timezone VARCHAR(50) DEFAULT 'Europe/Moscow',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create clients table (old schema)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    telegram_username VARCHAR(100),
    name VARCHAR(200),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create invitations table if not exists
CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER REFERENCES trainers(id) NOT NULL,
    client_id INTEGER REFERENCES clients(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Create profile_views table if not exists
CREATE TABLE IF NOT EXISTS profile_views (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER REFERENCES trainers(id) NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    telegram_id VARCHAR(50),
    source VARCHAR(50),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create club_clients table if not exists
CREATE TABLE IF NOT EXISTS club_clients (
    id SERIAL PRIMARY KEY,
    club_id INTEGER REFERENCES clubs(id) NOT NULL,
    client_id INTEGER REFERENCES clients(id) NOT NULL,
    source VARCHAR(50),
    qr_code_id INTEGER,
    first_visit_date DATE,
    total_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trainers_telegram_id ON trainers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_trainers_club_id ON trainers(club_id);
CREATE INDEX IF NOT EXISTS idx_clients_telegram_id ON clients(telegram_id);

SELECT 'Old tables for Mini Apps created successfully' as message;
