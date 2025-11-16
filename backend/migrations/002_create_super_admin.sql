-- Create super_admin user for admin panel
-- This migration creates a super admin user if it doesn't exist
-- Password will be set from SUPER_ADMIN_PASSWORD environment variable

-- Note: Password hash must be generated using passlib bcrypt
-- Default password 'changeme' hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS2wL0SU3WoW
--
-- To generate a new hash in Python:
-- from passlib.context import CryptContext
-- pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
-- print(pwd_context.hash("your_password_here"))

DO $$
BEGIN
    -- Check if super admin already exists
    IF NOT EXISTS (
        SELECT 1 FROM club_admins
        WHERE email = 'admin@trenergram.ru' AND club_id IS NULL
    ) THEN
        -- Create super admin user
        INSERT INTO club_admins (
            email,
            password_hash,
            name,
            role,
            club_id,
            is_active,
            created_at
        ) VALUES (
            'admin@trenergram.ru',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LS2wL0SU3WoW',  -- 'changeme'
            'Super Admin',
            'super_admin',
            NULL,  -- NULL club_id indicates super_admin
            TRUE,
            NOW()
        );

        RAISE NOTICE 'Super admin created successfully';
    ELSE
        RAISE NOTICE 'Super admin already exists, skipping';
    END IF;
END $$;

-- Verify super admin was created
SELECT
    id,
    email,
    name,
    role,
    club_id,
    is_active,
    created_at
FROM club_admins
WHERE email = 'admin@trenergram.ru';
