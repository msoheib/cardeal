-- Add phone numbers to test users
UPDATE users SET phone = '+966501234567' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE users SET phone = '+966509876543' WHERE id = '11111111-1111-1111-1111-111111111111';

-- Update dealer contact_info
UPDATE dealers SET contact_info = '{"phone": "+966508887777"}' WHERE id = '33333333-3333-3333-3333-333333333333';
