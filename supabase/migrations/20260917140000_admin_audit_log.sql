-- Audit trail for the admin console (/admin). Written only by the server with the
-- service role; admins can read it, nobody can change it through the API.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kept (as NULL) if the admin's account is later deleted.
  admin_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource text NOT NULL,
  record_ids uuid[] NOT NULL DEFAULT '{}',
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_resource ON public.admin_audit_log (resource, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read the audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read the audit log"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (private.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM anon, authenticated;
