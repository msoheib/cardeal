-- Reset the test bid to pending status so it shows in dealer opportunities
UPDATE bids 
SET status = 'pending'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Also delete the deal that was auto-created
DELETE FROM deals WHERE bid_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Restore inventory quantity (it was decremented by FCFS)
UPDATE dealer_inventory 
SET quantity = 5
WHERE car_configuration_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
