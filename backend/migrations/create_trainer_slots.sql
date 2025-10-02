-- Create trainer_slots table for PostgreSQL
CREATE TABLE IF NOT EXISTS trainer_slots (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trainer_slots_trainer_id ON trainer_slots(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_slots_day_of_week ON trainer_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_trainer_slots_is_active ON trainer_slots(is_active);