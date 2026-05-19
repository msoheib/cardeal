BEGIN;

CREATE INDEX IF NOT EXISTS idx_support_tickets_reviewed_by
  ON public.support_tickets(reviewed_by)
  WHERE reviewed_by IS NOT NULL;

COMMIT;
