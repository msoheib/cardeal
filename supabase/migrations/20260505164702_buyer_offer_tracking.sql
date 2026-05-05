BEGIN;

-- Public dealer details that are safe to show before a buyer approves an offer.
-- Full dealer rows include contact_info and stay protected by RLS below.
DROP VIEW IF EXISTS public.dealer_public_profiles;
CREATE TABLE IF NOT EXISTS public.dealer_public_profiles (
  id uuid PRIMARY KEY REFERENCES public.dealers(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  city text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  logo_url text,
  description text,
  rating numeric(3,2) DEFAULT 0,
  total_sales integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.dealer_public_profiles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.dealer_public_profiles (
  id,
  company_name,
  city,
  verified,
  logo_url,
  description,
  rating,
  total_sales,
  created_at,
  updated_at
)
SELECT
  id,
  company_name,
  city,
  verified,
  logo_url,
  description,
  rating,
  total_sales,
  created_at,
  updated_at
FROM public.dealers
WHERE verified = true
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  city = EXCLUDED.city,
  verified = EXCLUDED.verified,
  logo_url = EXCLUDED.logo_url,
  description = EXCLUDED.description,
  rating = EXCLUDED.rating,
  total_sales = EXCLUDED.total_sales,
  updated_at = EXCLUDED.updated_at;

DROP POLICY IF EXISTS "Anyone can view public verified dealer profiles" ON public.dealer_public_profiles;
CREATE POLICY "Anyone can view public verified dealer profiles"
  ON public.dealer_public_profiles
  FOR SELECT
  TO authenticated
  USING (verified = true);

DROP POLICY IF EXISTS "Admins can view all dealer public profiles" ON public.dealer_public_profiles;
CREATE POLICY "Admins can view all dealer public profiles"
  ON public.dealer_public_profiles
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

CREATE OR REPLACE FUNCTION private.sync_dealer_public_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.dealer_public_profiles WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.verified = true THEN
    INSERT INTO public.dealer_public_profiles (
      id,
      company_name,
      city,
      verified,
      logo_url,
      description,
      rating,
      total_sales,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.company_name,
      NEW.city,
      NEW.verified,
      NEW.logo_url,
      NEW.description,
      NEW.rating,
      NEW.total_sales,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      city = EXCLUDED.city,
      verified = EXCLUDED.verified,
      logo_url = EXCLUDED.logo_url,
      description = EXCLUDED.description,
      rating = EXCLUDED.rating,
      total_sales = EXCLUDED.total_sales,
      updated_at = EXCLUDED.updated_at;
  ELSE
    DELETE FROM public.dealer_public_profiles WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_dealer_public_profile ON public.dealers;
CREATE TRIGGER sync_dealer_public_profile
  AFTER INSERT OR UPDATE OR DELETE ON public.dealers
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_dealer_public_profile();

REVOKE ALL ON FUNCTION private.sync_dealer_public_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.sync_dealer_public_profile() FROM anon, authenticated;

COMMENT ON TABLE public.dealer_public_profiles IS
  'Safe dealer projection for pre-approval screens. Excludes user_id, commercial_registration, and contact_info.';

-- Do not expose full dealer contact rows to every authenticated user.
DROP POLICY IF EXISTS "Anyone can view verified dealers" ON public.dealers;

DROP POLICY IF EXISTS "Buyers can view dealer contact after approval" ON public.dealers;
CREATE POLICY "Buyers can view dealer contact after approval"
  ON public.dealers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.dealer_id = dealers.id
        AND d.buyer_id = (SELECT auth.uid())
        AND d.status = 'completed'
    )
  );

-- Cross-party user profiles are contact-bearing rows. Reveal them only once
-- the buyer approves the accepted offer and the deal reaches completed.
DROP POLICY IF EXISTS "Dealers can view buyers from their deals" ON public.users;
CREATE POLICY "Dealers can view buyers from approved deals"
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
        AND d.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Buyers can view dealer users from their deals" ON public.users;
CREATE POLICY "Buyers can view dealer users from approved deals"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT dl.user_id
      FROM public.deals d
      JOIN public.dealers dl ON dl.id = d.dealer_id
      WHERE d.buyer_id = (SELECT auth.uid())
        AND d.status = 'completed'
    )
  );

CREATE OR REPLACE FUNCTION public.approve_received_offer(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deal public.deals%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'authentication_required');
  END IF;

  SELECT *
  INTO v_deal
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF NOT FOUND OR v_deal.buyer_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'deal_not_found');
  END IF;

  IF v_deal.status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_approved', true,
      'deal_id', v_deal.id
    );
  END IF;

  IF v_deal.status <> 'pending_payment' THEN
    RETURN jsonb_build_object('success', false, 'error', 'deal_not_approvable');
  END IF;

  UPDATE public.deals
  SET status = 'completed',
      completed_at = COALESCE(completed_at, now())
  WHERE id = p_deal_id
  RETURNING * INTO v_deal;

  UPDATE public.commitment_fees
  SET status = 'applied_to_purchase',
      processed_at = COALESCE(processed_at, now())
  WHERE bid_id = v_deal.bid_id
    AND buyer_id = v_deal.buyer_id
    AND status = 'paid';

  RETURN jsonb_build_object(
    'success', true,
    'already_approved', false,
    'deal_id', v_deal.id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_received_offer(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_received_offer(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_received_offer(uuid) TO authenticated;

COMMENT ON FUNCTION public.approve_received_offer(uuid) IS
  'Buyer-only terminal approval for an accepted offer. Unlocks cross-party contact visibility by moving the deal to completed.';

COMMIT;
