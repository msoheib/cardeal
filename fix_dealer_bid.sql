-- Comprehensive fix: Ensure dealer has inventory and bid is pending
-- Run this in Supabase Studio

-- 1. Check current state
SELECT 'CURRENT BID' as check_type, id, status, commitment_fee_paid, car_configuration_id FROM bids;
SELECT 'CURRENT INVENTORY' as check_type, di.*, d.company_name FROM dealer_inventory di JOIN dealers d ON d.id = di.dealer_id;

-- 2. Ensure bid is pending
UPDATE bids SET status = 'pending' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- 3. Ensure dealer_inventory exists and is active with quantity > 0
INSERT INTO dealer_inventory (dealer_id, car_configuration_id, quantity, status)
VALUES ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, 'active')
ON CONFLICT (dealer_id, car_configuration_id) 
DO UPDATE SET quantity = 5, status = 'active';

-- 4. Delete any stale deals
DELETE FROM deals WHERE bid_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- 5. Verify
SELECT 'AFTER FIX - BID' as check_type, id, status, commitment_fee_paid FROM bids WHERE status = 'pending';
SELECT 'AFTER FIX - INVENTORY' as check_type, di.quantity, di.status, d.company_name 
FROM dealer_inventory di 
JOIN dealers d ON d.id = di.dealer_id
WHERE di.status = 'active' AND di.quantity > 0;
