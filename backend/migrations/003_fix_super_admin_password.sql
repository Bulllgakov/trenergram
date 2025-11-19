-- Fix super admin password hash
-- The previous hash was incompatible with bcrypt library
-- This migration updates to a properly generated bcrypt hash for password 'changeme'

UPDATE club_admins
SET password_hash = '$2b$12$/Ud46U/RYPa5z7Eo6MR9POheSYgl22fna7ZXSEHsiYHOom7zu9kLS'
WHERE email = 'admin@trenergram.ru' AND role = 'super_admin';

-- Verify update
SELECT
    id,
    email,
    name,
    role,
    LENGTH(password_hash) as hash_length,
    is_active
FROM club_admins
WHERE email = 'admin@trenergram.ru';
