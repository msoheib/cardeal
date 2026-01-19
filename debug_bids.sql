-- Check current state
SELECT 'BID STATUS' as check_type;
SELECT id, status, commitment_fee_paid, car_configuration_id FROM bids WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT 'DEALER INVENTORY' as check_type;
SELECT di.dealer_id, di.car_configuration_id, di.quantity, di.status, d.company_name, d.user_id
FROM dealer_inventory di
JOIN dealers d ON d.id = di.dealer_id
WHERE di.car_configuration_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT 'LOGGED IN DEALER' as check_type;
SELECT id, user_id, company_name FROM dealers WHERE company_name = 'Test Dealer' OR company_name LIKE '%Test%';

SELECT 'ALL DEALERS' as check_type;
SELECT id, user_id, company_name FROM dealers;
