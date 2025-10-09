-- Cleanup script for test data before production launch
-- Run this on production database

-- Step 1: Check what we're about to delete
SELECT 'Test Trainer:' as type, id, telegram_id, name, role FROM users WHERE telegram_id = '236692046'
UNION ALL
SELECT 'Test Client:' as type, id, telegram_id, name, role FROM users WHERE telegram_id = '8384084241';

-- Step 2: Check bookings between them
SELECT 'Bookings to delete:' as info, COUNT(*) as count
FROM bookings b
JOIN users trainer ON b.trainer_id = trainer.id
JOIN users client ON b.client_id = client.id
WHERE trainer.telegram_id = '236692046' AND client.telegram_id = '8384084241';

-- Step 3: Check trainer_clients relationship
SELECT 'Trainer-Client relationships:' as info, COUNT(*) as count
FROM trainer_clients tc
JOIN users trainer ON tc.trainer_id = trainer.id
JOIN users client ON tc.client_id = client.id
WHERE trainer.telegram_id = '236692046' AND client.telegram_id = '8384084241';

-- UNCOMMENT BELOW TO EXECUTE DELETION:

-- BEGIN;

-- -- Delete bookings
-- DELETE FROM bookings
-- WHERE id IN (
--     SELECT b.id
--     FROM bookings b
--     JOIN users trainer ON b.trainer_id = trainer.id
--     JOIN users client ON b.client_id = client.id
--     WHERE trainer.telegram_id = '236692046' AND client.telegram_id = '8384084241'
-- );

-- -- Delete trainer_clients relationship
-- DELETE FROM trainer_clients
-- WHERE id IN (
--     SELECT tc.id
--     FROM trainer_clients tc
--     JOIN users trainer ON tc.trainer_id = trainer.id
--     JOIN users client ON tc.client_id = client.id
--     WHERE trainer.telegram_id = '236692046' AND client.telegram_id = '8384084241'
-- );

-- -- Delete test client
-- DELETE FROM users WHERE telegram_id = '8384084241';

-- -- Delete test trainer
-- DELETE FROM users WHERE telegram_id = '236692046';

-- COMMIT;

-- Verify deletion
-- SELECT 'Remaining users:' as info, COUNT(*) as count FROM users;
-- SELECT 'Remaining bookings:' as info, COUNT(*) as count FROM bookings;
-- SELECT 'Remaining relationships:' as info, COUNT(*) as count FROM trainer_clients;
