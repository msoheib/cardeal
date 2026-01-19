-- FCFS Full Verification Script (Self-Contained)
-- Run this in Supabase Studio at http://127.0.0.1:54323/project/default/sql/1

BEGIN;

-- 1. Setup Test Data (bypassing auth, directly in public schema for testing)
DO $$
DECLARE
  dealer_user_id uuid := '11111111-1111-1111-1111-111111111111';
  buyer_user_id uuid := '22222222-2222-2222-2222-222222222222';
  dealer_record_id uuid := '33333333-3333-3333-3333-333333333333';
  config_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_bid_id UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
BEGIN
  -- Clean up previous test run
  DELETE FROM deals WHERE bid_id = v_bid_id;
  DELETE FROM bids WHERE id = v_bid_id;
  DELETE FROM dealer_inventory WHERE car_configuration_id = config_id;
  DELETE FROM car_configurations WHERE id = config_id;
  DELETE FROM dealers WHERE id = dealer_record_id;
  DELETE FROM users WHERE id IN (dealer_user_id, buyer_user_id);
  DELETE FROM auth.users WHERE id IN (dealer_user_id, buyer_user_id);

  -- Create Auth Users (for login)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role, created_at, updated_at)
  VALUES 
    (dealer_user_id, '00000000-0000-0000-0000-000000000000', 'testdealer@example.com', crypt('test123', gen_salt('bf')), now(), '{"full_name": "Test Dealer", "user_type": "dealer"}', 'authenticated', 'authenticated', now(), now()),
    (buyer_user_id, '00000000-0000-0000-0000-000000000000', 'testbuyer@example.com', crypt('test123', gen_salt('bf')), now(), '{"full_name": "Test Buyer", "user_type": "buyer"}', 'authenticated', 'authenticated', now(), now());

  -- Create Users in public.users (trigger should do this, but we ensure it)
  INSERT INTO users (id, email, full_name, user_type)
  VALUES 
    (dealer_user_id, 'testdealer@example.com', 'Test Dealer', 'dealer'),
    (buyer_user_id, 'testbuyer@example.com', 'Test Buyer', 'buyer')
  ON CONFLICT (id) DO NOTHING;

  -- Create Dealer Record
  INSERT INTO dealers (id, user_id, company_name, commercial_registration, verified, city, contact_info)
  VALUES (dealer_record_id, dealer_user_id, 'Test Auto', 'CR-12345678', true, 'Riyadh', '{"phone": "123"}');

  -- Create Car Configuration
  INSERT INTO car_configurations (id, make, model, year, trim, color, msrp)
  VALUES (config_id, 'Toyota', 'Camry', 2025, 'SE', 'White', 120000);

  -- Add Dealer Inventory
  INSERT INTO dealer_inventory (dealer_id, car_configuration_id, quantity, status)
  VALUES (dealer_record_id, config_id, 5, 'active');

  -- Create Bid (simulating a paid commitment fee)
  INSERT INTO bids (id, car_configuration_id, buyer_id, bid_price, status, commitment_fee_paid)
  VALUES (v_bid_id, config_id, buyer_user_id, 118000, 'pending', true);

  -- 2. Execute FCFS Logic
  RAISE NOTICE 'Executing process_fcfs_deposit...';
  PERFORM process_fcfs_deposit(v_bid_id);

  -- 3. Verify Results
  RAISE NOTICE '--- VERIFICATION RESULTS ---';
  
  -- Check Deal Created
  IF EXISTS (SELECT 1 FROM deals WHERE bid_id = v_bid_id) THEN
      RAISE NOTICE 'SUCCESS: Deal created.';
  ELSE
      RAISE NOTICE 'FAILURE: Deal NOT created.';
  END IF;

  -- Check Inventory Decremented
  IF (SELECT quantity FROM dealer_inventory WHERE dealer_id = dealer_record_id AND car_configuration_id = config_id) = 4 THEN
      RAISE NOTICE 'SUCCESS: Inventory decremented to 4.';
  ELSE
      RAISE NOTICE 'FAILURE: Inventory NOT decremented (Qty: %).', (SELECT quantity FROM dealer_inventory WHERE dealer_id = dealer_record_id AND car_configuration_id = config_id);
  END IF;

  -- Check Bid Status
  IF (SELECT status FROM bids WHERE id = v_bid_id) = 'accepted' THEN
      RAISE NOTICE 'SUCCESS: Bid status updated to accepted.';
  ELSE
      RAISE NOTICE 'FAILURE: Bid status NOT updated (Status: %).', (SELECT status FROM bids WHERE id = v_bid_id);
  END IF;

END $$;

COMMIT; -- Data will persist
