BEGIN;

-- This app does not use Supabase GraphQL. Keep the local API exposure to REST
-- and avoid granting executable access to the GraphQL endpoint when present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'graphql_public') THEN
    REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated;
    REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA graphql_public FROM anon, authenticated;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = (SELECT auth.uid())
      AND user_type = 'admin'::public.user_type
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- User creation must never trust client-editable metadata for authorization.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, full_name, user_type)
  VALUES (
    new.id,
    new.email,
    NULLIF(new.raw_user_meta_data->>'phone', ''),
    COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), 'New User'),
    'buyer'::public.user_type
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
    updated_at = now();

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user trigger failed: %', SQLERRM;
    RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.prevent_user_type_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.user_type IS DISTINCT FROM OLD.user_type AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_user_type_self_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS prevent_user_type_self_update ON public.users;
CREATE TRIGGER prevent_user_type_self_update
  BEFORE UPDATE OF user_type ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_type_self_update();

CREATE TABLE IF NOT EXISTS public.dealer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  commercial_registration text NOT NULL,
  city text NOT NULL,
  contact_info jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES public.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dealer_applications_user_unique UNIQUE (user_id),
  CONSTRAINT dealer_applications_cr_unique UNIQUE (commercial_registration)
);

ALTER TABLE public.dealer_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own dealer application" ON public.dealer_applications;
CREATE POLICY "Users can view their own dealer application"
  ON public.dealer_applications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own dealer application" ON public.dealer_applications;
CREATE POLICY "Users can create their own dealer application"
  ON public.dealer_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND NOT private.is_admin()
  );

DROP POLICY IF EXISTS "Users can update pending dealer application" ON public.dealer_applications;
CREATE POLICY "Users can update pending dealer application"
  ON public.dealer_applications
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status IN ('pending', 'rejected'))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Admins can manage dealer applications" ON public.dealer_applications;
CREATE POLICY "Admins can manage dealer applications"
  ON public.dealer_applications
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Admin visibility and mutation policies used by the dashboard.
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins can view all dealers" ON public.dealers;
CREATE POLICY "Admins can view all dealers"
  ON public.dealers
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can manage all dealers" ON public.dealers;
CREATE POLICY "Admins can manage all dealers"
  ON public.dealers
  FOR ALL
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins can view all cars" ON public.cars;
CREATE POLICY "Admins can view all cars"
  ON public.cars
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can update all cars" ON public.cars;
CREATE POLICY "Admins can update all cars"
  ON public.cars
  FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins can view all bids" ON public.bids;
CREATE POLICY "Admins can view all bids"
  ON public.bids
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can view all deals" ON public.deals;
CREATE POLICY "Admins can view all deals"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can view all commitment fees" ON public.commitment_fees;
CREATE POLICY "Admins can view all commitment fees"
  ON public.commitment_fees
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

-- Tighten and optimize existing auth.uid() policies.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()) AND user_type = 'buyer'::public.user_type);

DROP POLICY IF EXISTS "Dealers can view and update their own data" ON public.dealers;
CREATE POLICY "Dealers can view and update their own data"
  ON public.dealers
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id AND verified = true);

DROP POLICY IF EXISTS "Buyers can manage their own bids" ON public.bids;
CREATE POLICY "Buyers can manage their own bids"
  ON public.bids
  FOR ALL
  TO authenticated
  USING (buyer_id = (SELECT auth.uid()))
  WITH CHECK (buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own fees" ON public.commitment_fees;
CREATE POLICY "Users can view their own fees"
  ON public.commitment_fees
  FOR SELECT
  TO authenticated
  USING (buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Buyers can view their deals" ON public.deals;
CREATE POLICY "Buyers can view their deals"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Dealers can view their deals" ON public.deals;
CREATE POLICY "Dealers can view their deals"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM public.dealers
      WHERE user_id = (SELECT auth.uid())
        AND verified = true
    )
  );

DROP POLICY IF EXISTS "Dealers can manage their own cars" ON public.cars;
CREATE POLICY "Dealers can manage their own cars"
  ON public.cars
  FOR ALL
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM public.dealers
      WHERE user_id = (SELECT auth.uid())
        AND verified = true
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM public.dealers
      WHERE user_id = (SELECT auth.uid())
        AND verified = true
    )
  );

DROP POLICY IF EXISTS "Dealers manage their own inventory" ON public.dealer_inventory;
CREATE POLICY "Dealers manage their own inventory"
  ON public.dealer_inventory
  FOR ALL
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM public.dealers
      WHERE user_id = (SELECT auth.uid())
        AND verified = true
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM public.dealers
      WHERE user_id = (SELECT auth.uid())
        AND verified = true
    )
  );

DROP POLICY IF EXISTS "Dealers can create car configurations" ON public.car_configurations;
CREATE POLICY "Dealers can create car configurations"
  ON public.car_configurations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dealers
      WHERE user_id = (SELECT auth.uid())
        AND verified = true
    )
  );

DROP POLICY IF EXISTS "Dealers can update car configurations they sell" ON public.car_configurations;
CREATE POLICY "Dealers can update car configurations they sell"
  ON public.car_configurations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dealer_inventory di
      JOIN public.dealers d ON d.id = di.dealer_id
      WHERE di.car_configuration_id = car_configurations.id
        AND d.user_id = (SELECT auth.uid())
        AND d.verified = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dealers
      WHERE user_id = (SELECT auth.uid())
        AND verified = true
    )
  );

DROP POLICY IF EXISTS "Dealers can view bids for their inventory" ON public.bids;
CREATE POLICY "Dealers can view bids for their inventory"
  ON public.bids
  FOR SELECT
  TO authenticated
  USING (
    car_configuration_id IN (
      SELECT di.car_configuration_id
      FROM public.dealer_inventory di
      JOIN public.dealers d ON di.dealer_id = d.id
      WHERE d.user_id = (SELECT auth.uid())
        AND d.verified = true
    )
  );

DROP POLICY IF EXISTS "Dealers can view buyers from their deals" ON public.users;
CREATE POLICY "Dealers can view buyers from their deals"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT d.buyer_id
      FROM public.deals d
      JOIN public.dealers dl ON dl.id = d.dealer_id
      WHERE dl.user_id = (SELECT auth.uid())
        AND dl.verified = true
    )
  );

DROP POLICY IF EXISTS "Buyers can view dealer users from their deals" ON public.users;
CREATE POLICY "Buyers can view dealer users from their deals"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT dl.user_id
      FROM public.deals d
      JOIN public.dealers dl ON dl.id = d.dealer_id
      WHERE d.buyer_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_bids_car_configuration_id ON public.bids(car_configuration_id);
CREATE INDEX IF NOT EXISTS idx_commitment_fees_bid_id ON public.commitment_fees(bid_id);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_car_configuration_id ON public.dealer_inventory(car_configuration_id);
CREATE INDEX IF NOT EXISTS idx_deals_bid_id ON public.deals(bid_id);
CREATE INDEX IF NOT EXISTS idx_deals_car_configuration_id ON public.deals(car_configuration_id);
CREATE INDEX IF NOT EXISTS idx_deals_car_id ON public.deals(car_id);
CREATE INDEX IF NOT EXISTS idx_dealer_applications_status ON public.dealer_applications(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.process_moyasar_commitment_fee(
  p_bid_id uuid,
  p_config_id uuid,
  p_payment_reference text,
  p_paid_amount_halalas integer,
  p_currency text,
  p_gateway_response jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_existing_fee public.commitment_fees%ROWTYPE;
  v_expected_halalas integer := 50000;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'service_role_required');
  END IF;

  IF p_payment_reference IS NULL OR length(trim(p_payment_reference)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_payment_reference');
  END IF;

  IF p_currency <> 'SAR' OR p_paid_amount_halalas <> v_expected_halalas THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_payment_amount');
  END IF;

  SELECT *
  INTO v_bid
  FROM public.bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'bid_not_found');
  END IF;

  IF v_bid.car_configuration_id IS DISTINCT FROM p_config_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'bid_config_mismatch');
  END IF;

  SELECT *
  INTO v_existing_fee
  FROM public.commitment_fees
  WHERE transaction_reference = p_payment_reference
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_fee.bid_id IS DISTINCT FROM p_bid_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'payment_reference_used');
    END IF;

    UPDATE public.bids
    SET commitment_fee_paid = true,
        commitment_fee_amount = 500,
        payment_reference = p_payment_reference,
        updated_at = now()
    WHERE id = p_bid_id;

    RETURN jsonb_build_object('success', true, 'already_processed', true);
  END IF;

  IF v_bid.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'bid_not_pending');
  END IF;

  IF v_bid.commitment_fee_paid AND v_bid.payment_reference IS DISTINCT FROM p_payment_reference THEN
    RETURN jsonb_build_object('success', false, 'error', 'bid_already_paid');
  END IF;

  UPDATE public.bids
  SET commitment_fee_paid = true,
      commitment_fee_amount = 500,
      payment_reference = p_payment_reference,
      updated_at = now()
  WHERE id = p_bid_id;

  INSERT INTO public.commitment_fees (
    bid_id,
    buyer_id,
    amount,
    status,
    transaction_reference,
    processed_at,
    gateway_response
  )
  VALUES (
    p_bid_id,
    v_bid.buyer_id,
    500,
    'paid',
    p_payment_reference,
    now(),
    COALESCE(p_gateway_response, '{}'::jsonb)
  );

  RETURN jsonb_build_object('success', true, 'already_processed', false);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'duplicate_payment_reference');
END;
$$;

REVOKE ALL ON FUNCTION public.process_moyasar_commitment_fee(uuid, uuid, text, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_moyasar_commitment_fee(uuid, uuid, text, integer, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_moyasar_commitment_fee(uuid, uuid, text, integer, text, jsonb) TO service_role;

DROP FUNCTION IF EXISTS public.accept_bid(uuid, uuid);

CREATE OR REPLACE FUNCTION public.accept_bid(p_bid_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bid public.bids%ROWTYPE;
  v_dealer public.dealers%ROWTYPE;
  v_qty integer;
  v_deal_id uuid;
BEGIN
  SELECT *
  INTO v_dealer
  FROM public.dealers
  WHERE user_id = (SELECT auth.uid())
    AND verified = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'approved_dealer_required');
  END IF;

  SELECT *
  INTO v_bid
  FROM public.bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid not found');
  END IF;

  IF v_bid.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid is not pending');
  END IF;

  IF NOT v_bid.commitment_fee_paid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commitment fee not paid');
  END IF;

  SELECT quantity
  INTO v_qty
  FROM public.dealer_inventory
  WHERE dealer_id = v_dealer.id
    AND car_configuration_id = v_bid.car_configuration_id
    AND status = 'active'
  FOR UPDATE;

  IF v_qty IS NULL OR v_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No inventory available');
  END IF;

  INSERT INTO public.deals (
    car_configuration_id,
    dealer_id,
    buyer_id,
    bid_id,
    final_price,
    status,
    created_at
  )
  VALUES (
    v_bid.car_configuration_id,
    v_dealer.id,
    v_bid.buyer_id,
    p_bid_id,
    v_bid.bid_price,
    'pending_payment',
    now()
  )
  RETURNING id INTO v_deal_id;

  UPDATE public.bids
  SET status = 'accepted',
      updated_at = now()
  WHERE id = p_bid_id;

  UPDATE public.dealer_inventory
  SET quantity = quantity - 1,
      updated_at = now()
  WHERE dealer_id = v_dealer.id
    AND car_configuration_id = v_bid.car_configuration_id;

  RETURN jsonb_build_object('success', true, 'deal_id', v_deal_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_bid(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_bid(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_bid(uuid) TO authenticated;

-- Lock down legacy RPCs that are no longer used by the client.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'accept_bids_group'
  ) THEN
    REVOKE ALL ON FUNCTION public.accept_bids_group(uuid, numeric, integer) FROM PUBLIC, anon, authenticated, service_role;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'process_fcfs_deposit'
  ) THEN
    REVOKE ALL ON FUNCTION public.process_fcfs_deposit(uuid) FROM PUBLIC, anon, authenticated, service_role;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.approve_dealer_application(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_application public.dealer_applications%ROWTYPE;
  v_dealer_id uuid;
BEGIN
  IF NOT private.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'admin_required');
  END IF;

  SELECT *
  INTO v_application
  FROM public.dealer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'application_not_found');
  END IF;

  IF v_application.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'application_not_pending');
  END IF;

  SELECT id
  INTO v_dealer_id
  FROM public.dealers
  WHERE user_id = v_application.user_id
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    INSERT INTO public.dealers (
      user_id,
      company_name,
      commercial_registration,
      verified,
      city,
      contact_info,
      created_at,
      updated_at
    )
    VALUES (
      v_application.user_id,
      v_application.company_name,
      v_application.commercial_registration,
      true,
      v_application.city,
      v_application.contact_info,
      now(),
      now()
    )
    RETURNING id INTO v_dealer_id;
  ELSE
    UPDATE public.dealers
    SET company_name = v_application.company_name,
        commercial_registration = v_application.commercial_registration,
        verified = true,
        city = v_application.city,
        contact_info = v_application.contact_info,
        updated_at = now()
    WHERE id = v_dealer_id;
  END IF;

  UPDATE public.users
  SET user_type = 'dealer'::public.user_type,
      updated_at = now()
  WHERE id = v_application.user_id;

  UPDATE public.dealer_applications
  SET status = 'approved',
      reviewed_by = (SELECT auth.uid()),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object('success', true, 'dealer_id', v_dealer_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'dealer_record_conflict');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_dealer_application(
  p_application_id uuid,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT private.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'admin_required');
  END IF;

  SELECT status
  INTO v_status
  FROM public.dealer_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'application_not_found');
  END IF;

  IF v_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'application_not_pending');
  END IF;

  UPDATE public.dealer_applications
  SET status = 'rejected',
      rejection_reason = NULLIF(p_rejection_reason, ''),
      reviewed_by = (SELECT auth.uid()),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_application_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_dealer_application(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_dealer_application(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_dealer_application(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.reject_dealer_application(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_dealer_application(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_dealer_application(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_user_type_self_update() FROM PUBLIC, anon, authenticated, service_role;

-- Car image bucket and object policies.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'car-images',
  'car-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can view car images" ON storage.objects;
CREATE POLICY "Anyone can view car images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'car-images');

DROP POLICY IF EXISTS "Authenticated users can upload own car images" ON storage.objects;
CREATE POLICY "Authenticated users can upload own car images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'car-images'
    AND (storage.foldername(name))[1] = 'cars'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated users can update own car images" ON storage.objects;
CREATE POLICY "Authenticated users can update own car images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'car-images'
    AND (storage.foldername(name))[1] = 'cars'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'car-images'
    AND (storage.foldername(name))[1] = 'cars'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete own car images" ON storage.objects;
CREATE POLICY "Authenticated users can delete own car images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'car-images'
    AND (storage.foldername(name))[1] = 'cars'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

COMMIT;
