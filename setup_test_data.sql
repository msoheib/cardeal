-- Create test data for car sales workflow testing

-- First, create auth users using Supabase's auth.users table
-- These need to be inserted with proper format

-- Generate UUIDs for our test users
DO $$
DECLARE
  dealer_auth_id uuid := '11111111-1111-1111-1111-111111111111';
  buyer_auth_id uuid := '22222222-2222-2222-2222-222222222222';
  dealer_record_id uuid := '33333333-3333-3333-3333-333333333333';
  car_id uuid := '44444444-4444-4444-4444-444444444444';
BEGIN
  -- Clean up existing test data
  DELETE FROM auth.users WHERE id IN (dealer_auth_id, buyer_auth_id);
  DELETE FROM public.users WHERE id IN (dealer_auth_id, buyer_auth_id);
  DELETE FROM public.dealers WHERE id = dealer_record_id;
  DELETE FROM public.cars WHERE id = car_id;
  
  -- Create dealer auth user
  INSERT INTO auth.users (
    id, 
    instance_id,
    email, 
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    dealer_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'testdealer@example.com',
    crypt('testpass123', gen_salt('bf')),
    now(),
    '{"full_name": "Test Dealer", "user_type": "dealer"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    ''
  );
  
  -- Create buyer auth user
  INSERT INTO auth.users (
    id, 
    instance_id,
    email, 
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    buyer_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'testbuyer@example.com',
    crypt('testpass123', gen_salt('bf')),
    now(),
    '{"full_name": "Test Buyer", "user_type": "buyer"}'::jsonb,
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    ''
  );

  -- The trigger should create public.users entries automatically
  -- But let's ensure they exist and update user_type if needed
  UPDATE public.users SET user_type = 'dealer' WHERE id = dealer_auth_id;
  UPDATE public.users SET user_type = 'buyer' WHERE id = buyer_auth_id;
  
  -- Create dealer record
  INSERT INTO public.dealers (
    id,
    user_id,
    company_name,
    commercial_registration,
    verified,
    city,
    contact_info,
    description
  ) VALUES (
    dealer_record_id,
    dealer_auth_id,
    'Test Auto Dealership',
    'CR-12345678',
    true,
    'Riyadh',
    '{"phone": "+966501234567", "email": "testdealer@example.com"}'::jsonb,
    'A trusted dealership for testing purposes'
  );
  
  -- Create a test car
  INSERT INTO public.cars (
    id,
    dealer_id,
    make,
    model,
    year,
    variant,
    wakala_price,
    description,
    specifications,
    status,
    available_quantity,
    original_quantity,
    min_bid_price,
    trim,
    color
  ) VALUES (
    car_id,
    dealer_record_id,
    'Toyota',
    'Camry',
    2024,
    'SE',
    120000.00,
    'Brand new 2024 Toyota Camry SE with full warranty',
    '{"engine": "2.5L 4-Cylinder", "transmission": "Automatic", "fuel": "Petrol", "horsepower": "203 HP"}'::jsonb,
    'active',
    5,
    5,
    115000.00,
    'SE Premium',
    'Pearl White'
  );
  
  RAISE NOTICE 'Test data created successfully!';
  RAISE NOTICE 'Dealer Email: testdealer@example.com / Password: testpass123';
  RAISE NOTICE 'Buyer Email: testbuyer@example.com / Password: testpass123';
END $$;
