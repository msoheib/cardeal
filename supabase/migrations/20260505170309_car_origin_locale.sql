BEGIN;

ALTER TABLE public.car_configurations
  ADD COLUMN IF NOT EXISTS origin_locale text;

ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS origin_locale text;

-- Origin/locale is part of the buyer-visible spec, so distinct origins should
-- not collapse into the same shared car configuration.
ALTER TABLE public.car_configurations
  DROP CONSTRAINT IF EXISTS car_configurations_make_model_year_trim_color_variant_key;

ALTER TABLE public.car_configurations
  DROP CONSTRAINT IF EXISTS car_configurations_identity_unique;

ALTER TABLE public.car_configurations
  ADD CONSTRAINT car_configurations_identity_unique
  UNIQUE NULLS NOT DISTINCT (make, model, year, trim, color, variant, origin_locale);

CREATE INDEX IF NOT EXISTS idx_car_configurations_origin_locale
  ON public.car_configurations(origin_locale)
  WHERE origin_locale IS NOT NULL;

COMMENT ON COLUMN public.car_configurations.origin_locale IS
  'Buyer-visible vehicle market/origin, such as Saudi, GCC, American import, European import, or Japanese import.';

COMMENT ON COLUMN public.cars.origin_locale IS
  'Legacy car market/origin field kept in sync with car_configurations for older paths.';

COMMIT;
