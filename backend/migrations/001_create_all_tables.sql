-- Create all database tables for Trenergram
-- This migration creates the complete database schema

-- Users table (v2)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(200),
    first_name VARCHAR(200),
    last_name VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'client',  -- client, trainer
    timezone VARCHAR(50) DEFAULT 'Europe/Moscow',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Trainer-Client relationships
CREATE TABLE IF NOT EXISTS trainer_clients (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',  -- active, archived
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trainer_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_clients_trainer ON trainer_clients(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_clients_client ON trainer_clients(client_id);

-- Clubs table (v2)
CREATE TABLE IF NOT EXISTS clubs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    district VARCHAR(100),
    metro VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    working_hours JSONB,
    tariff VARCHAR(20) DEFAULT 'basic',  -- basic, standard, premium
    tariff_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Club admins table (for admin panel)
CREATE TABLE IF NOT EXISTS club_admins (
    id SERIAL PRIMARY KEY,
    club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
    telegram_id VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(200),
    role VARCHAR(20) DEFAULT 'admin',  -- super_admin, club_owner, club_admin
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_club_admins_email ON club_admins(email);
CREATE INDEX IF NOT EXISTS idx_club_admins_club_id ON club_admins(club_id);
CREATE INDEX IF NOT EXISTS idx_club_admins_role ON club_admins(role);

-- Club tariffs
CREATE TABLE IF NOT EXISTS club_tariffs (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Club payments
CREATE TABLE IF NOT EXISTS club_payments (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    tariff VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, paid, failed, refunded
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Club QR codes
CREATE TABLE IF NOT EXISTS club_qr_codes (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200),
    location VARCHAR(200),
    scans_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedules table (v2)
CREATE TABLE IF NOT EXISTS schedules (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,  -- 0=Monday, 6=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trainer_id, day_of_week, start_time)
);

CREATE INDEX IF NOT EXISTS idx_schedules_trainer ON schedules(trainer_id);

-- Time slots table (v2)
CREATE TABLE IF NOT EXISTS time_slots (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'available',  -- available, booked, blocked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_time_slots_schedule ON time_slots(schedule_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots(date);

-- Bookings table (v2)
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_id INTEGER REFERENCES time_slots(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(200),
    status VARCHAR(20) DEFAULT 'confirmed',  -- pending, confirmed, cancelled_by_client, cancelled_by_trainer, auto_cancelled, completed
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by INTEGER REFERENCES users(id),

    -- Reminder fields
    reminder_1_time TIME,
    reminder_1_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_2_time TIME,
    reminder_2_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_3_time TIME,
    reminder_3_sent_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_trainer ON bookings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
