-- Check if buyer data is accessible
SELECT 'DEALS WITH BUYER' as check_type;
SELECT d.id, d.buyer_id, u.full_name, u.phone, u.email
FROM deals d
LEFT JOIN users u ON u.id = d.buyer_id
WHERE d.bid_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Check buyer user record exists
SELECT 'BUYER USER' as check_type;
SELECT id, full_name, phone, email FROM users WHERE id = '22222222-2222-2222-2222-222222222222';
