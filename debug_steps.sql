-- Replicate exact getDealerOpportunities logic step by step

-- Step 1: Get dealer_id for user 11111111-1111-1111-1111-111111111111 (testdealer@example.com)
SELECT 'STEP 1 - DEALER ID' as step;
SELECT id as dealer_id, company_name FROM dealers WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Step 2: Get active inventory for this dealer
SELECT 'STEP 2 - INVENTORY' as step;
SELECT id, car_configuration_id, quantity, status 
FROM dealer_inventory 
WHERE dealer_id = '33333333-3333-3333-3333-333333333333' 
  AND status = 'active' 
  AND quantity > 0;

-- Step 3: Get pending bids with commitment_fee_paid for configs from step 2
SELECT 'STEP 3 - MATCHING BIDS' as step;
SELECT b.id, b.car_configuration_id, b.status, b.commitment_fee_paid, b.bid_price
FROM bids b
WHERE b.car_configuration_id IN (
  SELECT car_configuration_id FROM dealer_inventory 
  WHERE dealer_id = '33333333-3333-3333-3333-333333333333' 
    AND status = 'active' 
    AND quantity > 0
)
AND b.status = 'pending'
AND b.commitment_fee_paid = true;

-- Step 4: Check if there's a bid at all with pending status
SELECT 'STEP 4 - ALL PENDING BIDS' as step;
SELECT * FROM bids WHERE status = 'pending';
