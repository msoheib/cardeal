BEGIN;

REVOKE SELECT ON TABLE public.vehicle_makes FROM anon;
REVOKE SELECT ON TABLE public.vehicle_models FROM anon;

DROP POLICY IF EXISTS "Vehicle makes are readable" ON public.vehicle_makes;
CREATE POLICY "Vehicle makes are readable"
  ON public.vehicle_makes
  FOR SELECT
  TO authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Vehicle models are readable" ON public.vehicle_models;
CREATE POLICY "Vehicle models are readable"
  ON public.vehicle_models
  FOR SELECT
  TO authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1
      FROM public.vehicle_makes vm
      WHERE vm.id = vehicle_models.make_id
        AND vm.active = true
    )
  );

COMMIT;
