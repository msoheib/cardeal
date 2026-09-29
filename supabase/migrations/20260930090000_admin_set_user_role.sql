-- Lets an admin change a user's role from the admin console.
--
-- public.users has a BEFORE UPDATE trigger (prevent_user_type_self_update) that
-- rejects any role change unless private.is_admin() is true, and is_admin()
-- needs auth.uid(). The admin console writes with the service role, which has
-- no auth.uid(), so every role change failed with "Only admins can change user
-- roles". The API now calls this function with the admin's own JWT instead —
-- same pattern as approve_dealer_application — so the trigger still guards the
-- table and the caller is still a verified admin.

CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  p_user_id uuid,
  p_user_type public.user_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current public.user_type;
BEGIN
  IF NOT private.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'admin_required');
  END IF;

  -- An admin must not lock themselves out of the console.
  IF p_user_id = (SELECT auth.uid()) AND p_user_type <> 'admin'::public.user_type THEN
    RETURN jsonb_build_object('success', false, 'error', 'cannot_demote_self');
  END IF;

  SELECT user_type
  INTO v_current
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  IF v_current = p_user_type THEN
    RETURN jsonb_build_object('success', true, 'unchanged', true, 'user_type', v_current);
  END IF;

  UPDATE public.users
  SET user_type = p_user_type,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'user_type', p_user_type, 'previous_user_type', v_current);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.user_type) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.user_type) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.user_type) TO authenticated;

COMMENT ON FUNCTION public.admin_set_user_role(uuid, public.user_type) IS
  'Admin-only role change. Granting the dealer role here does not create a dealers row; use approve_dealer_application for that.';
