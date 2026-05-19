BEGIN;

CREATE OR REPLACE FUNCTION private.current_verified_dealer_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT id
  FROM public.dealers
  WHERE user_id = (SELECT auth.uid())
    AND verified = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.buyer_has_completed_deal_with_dealer(p_dealer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals
    WHERE dealer_id = p_dealer_id
      AND buyer_id = (SELECT auth.uid())
      AND status = 'completed'::public.deal_status
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_dealer_user(p_dealer_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.dealers dl ON dl.id = d.dealer_id
    WHERE d.buyer_id = (SELECT auth.uid())
      AND d.status = 'completed'::public.deal_status
      AND dl.user_id = p_dealer_user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_buyer_user(p_buyer_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    JOIN public.dealers dl ON dl.id = d.dealer_id
    WHERE dl.user_id = (SELECT auth.uid())
      AND dl.verified = true
      AND d.status = 'completed'::public.deal_status
      AND d.buyer_id = p_buyer_id
  );
$$;

REVOKE ALL ON FUNCTION private.current_verified_dealer_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.buyer_has_completed_deal_with_dealer(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_view_dealer_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_view_buyer_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.current_verified_dealer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.buyer_has_completed_deal_with_dealer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_dealer_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_buyer_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "Dealers can view their deals" ON public.deals;
CREATE POLICY "Dealers can view their deals"
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (dealer_id = private.current_verified_dealer_id());

DROP POLICY IF EXISTS "Buyers can view dealer contact after approval" ON public.dealers;
CREATE POLICY "Buyers can view dealer contact after approval"
  ON public.dealers
  FOR SELECT
  TO authenticated
  USING (private.buyer_has_completed_deal_with_dealer(id));

DROP POLICY IF EXISTS "Dealers can view buyers from approved deals" ON public.users;
CREATE POLICY "Dealers can view buyers from approved deals"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (private.can_view_buyer_user(id));

DROP POLICY IF EXISTS "Buyers can view dealer users from approved deals" ON public.users;
CREATE POLICY "Buyers can view dealer users from approved deals"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (private.can_view_dealer_user(id));

DROP POLICY IF EXISTS "Dealers can view support tickets for their deals" ON public.support_tickets;
CREATE POLICY "Dealers can view support tickets for their deals"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (dealer_id = private.current_verified_dealer_id());

COMMENT ON FUNCTION private.current_verified_dealer_id() IS
  'RLS helper that resolves the current approved dealer without recursively evaluating dealer/deal policies.';

COMMENT ON FUNCTION private.buyer_has_completed_deal_with_dealer(uuid) IS
  'RLS helper for post-approval buyer access to dealer contact rows.';

COMMENT ON FUNCTION private.can_view_dealer_user(uuid) IS
  'RLS helper for buyer access to dealer user profiles after buyer approval.';

COMMENT ON FUNCTION private.can_view_buyer_user(uuid) IS
  'RLS helper for dealer access to buyer user profiles after buyer approval.';

COMMIT;
