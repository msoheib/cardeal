-- Check bid and deal status after dealer acceptance
SELECT 'BID STATUS' as check_type;
SELECT id, status, commitment_fee_paid FROM bids WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT 'DEALS CREATED' as check_type;
SELECT * FROM deals WHERE bid_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
