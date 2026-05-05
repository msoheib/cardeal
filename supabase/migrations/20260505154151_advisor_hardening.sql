ALTER FUNCTION public.accept_bids_group(uuid, numeric, integer)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.process_fcfs_deposit(uuid)
  SET search_path = public, pg_temp;

CREATE INDEX IF NOT EXISTS idx_dealer_applications_reviewed_by
  ON public.dealer_applications(reviewed_by);

DROP POLICY IF EXISTS "Anyone can view car images" ON storage.objects;
