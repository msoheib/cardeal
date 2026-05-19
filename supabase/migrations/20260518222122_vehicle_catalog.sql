BEGIN;

CREATE TABLE IF NOT EXISTS public.vehicle_makes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  origin_country text,
  classification text,
  notes text,
  source_sheets text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_makes_slug_unique UNIQUE (slug),
  CONSTRAINT vehicle_makes_name_ar_not_blank CHECK (length(btrim(name_ar)) > 0),
  CONSTRAINT vehicle_makes_name_en_not_blank CHECK (name_en IS NULL OR length(btrim(name_en)) > 0)
);

CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id uuid NOT NULL REFERENCES public.vehicle_makes(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name_ar text,
  name_en text NOT NULL,
  source_sheets text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_models_make_slug_unique UNIQUE (make_id, slug),
  CONSTRAINT vehicle_models_name_en_not_blank CHECK (length(btrim(name_en)) > 0),
  CONSTRAINT vehicle_models_name_ar_not_blank CHECK (name_ar IS NULL OR length(btrim(name_ar)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_makes_active_name_ar
  ON public.vehicle_makes(active, name_ar);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_make_active_name_en
  ON public.vehicle_models(make_id, active, name_en);

ALTER TABLE public.vehicle_makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.vehicle_makes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.vehicle_models FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.vehicle_makes TO authenticated;
GRANT SELECT ON TABLE public.vehicle_models TO authenticated;
GRANT ALL ON TABLE public.vehicle_makes TO service_role;
GRANT ALL ON TABLE public.vehicle_models TO service_role;

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

COMMENT ON TABLE public.vehicle_makes IS
  'Reusable Arabic/English vehicle make catalog for supplier inventory entry.';

COMMENT ON TABLE public.vehicle_models IS
  'Reusable vehicle model catalog keyed to vehicle_makes; inventory remains in car_configurations/dealer_inventory.';

COMMIT;
