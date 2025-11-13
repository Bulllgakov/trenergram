-- Fix is_paid NULL values in bookings table
-- Set is_paid to FALSE where it's NULL (default value)

UPDATE bookings
SET is_paid = FALSE
WHERE is_paid IS NULL;

-- Add NOT NULL constraint to prevent future NULL values
ALTER TABLE bookings
ALTER COLUMN is_paid SET DEFAULT FALSE,
ALTER COLUMN is_paid SET NOT NULL;
