-- Multi-color dealer listings.
--
-- car_configurations remains the color-specific commercial identity used by
-- bids, payments, and deals. vehicle_listing_specs groups those configurations
-- by the fields shared across colors, while dealer_listings owns shared dealer
-- content and dealer_inventory remains the per-color stock ledger.

CREATE TABLE IF NOT EXISTS public.vehicle_listing_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL CHECK (year BETWEEN 1900 AND 2100),
  trim text NOT NULL,
  origin_locale text NOT NULL,
  variant text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (make, model, year, trim, origin_locale, variant)
);

ALTER TABLE public.vehicle_listing_specs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicle listing specs are publicly readable" ON public.vehicle_listing_specs;
CREATE POLICY "Vehicle listing specs are publicly readable"
  ON public.vehicle_listing_specs FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.vehicle_listing_specs TO anon, authenticated;

ALTER TABLE public.car_configurations
  ADD COLUMN IF NOT EXISTS listing_spec_id uuid REFERENCES public.vehicle_listing_specs(id) ON DELETE RESTRICT;

INSERT INTO public.vehicle_listing_specs (make, model, year, trim, origin_locale, variant)
SELECT DISTINCT
  btrim(cc.make),
  btrim(cc.model),
  cc.year,
  COALESCE(NULLIF(btrim(cc.trim), ''), 'غير محدد'),
  COALESCE(NULLIF(btrim(cc.origin_locale), ''), 'غير محدد'),
  COALESCE(NULLIF(btrim(cc.variant), ''), 'أخرى')
FROM public.car_configurations cc
ON CONFLICT (make, model, year, trim, origin_locale, variant) DO NOTHING;

UPDATE public.car_configurations cc
SET listing_spec_id = spec.id
FROM public.vehicle_listing_specs spec
WHERE cc.listing_spec_id IS NULL
  AND spec.make = btrim(cc.make)
  AND spec.model = btrim(cc.model)
  AND spec.year = cc.year
  AND spec.trim = COALESCE(NULLIF(btrim(cc.trim), ''), 'غير محدد')
  AND spec.origin_locale = COALESCE(NULLIF(btrim(cc.origin_locale), ''), 'غير محدد')
  AND spec.variant = COALESCE(NULLIF(btrim(cc.variant), ''), 'أخرى');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.car_configurations WHERE listing_spec_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill car_configurations.listing_spec_id';
  END IF;
END;
$$;

ALTER TABLE public.car_configurations ALTER COLUMN listing_spec_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_car_configurations_listing_spec
  ON public.car_configurations(listing_spec_id, color);

CREATE TABLE IF NOT EXISTS public.dealer_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  listing_spec_id uuid NOT NULL REFERENCES public.vehicle_listing_specs(id) ON DELETE RESTRICT,
  agency_price numeric(12, 2) NOT NULL CHECK (agency_price > 0),
  listing_description text,
  listing_images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(listing_images) <= 5)
);

ALTER TABLE public.dealer_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dealers can view their own listings" ON public.dealer_listings;
CREATE POLICY "Dealers can view their own listings"
  ON public.dealer_listings FOR SELECT TO authenticated
  USING (
    dealer_id IN (
      SELECT d.id FROM public.dealers d
      WHERE d.user_id = (SELECT auth.uid())
    )
  );

REVOKE ALL ON public.dealer_listings FROM PUBLIC, anon;
GRANT SELECT ON public.dealer_listings TO authenticated;

ALTER TABLE public.dealer_inventory
  ADD COLUMN IF NOT EXISTS dealer_listing_id uuid REFERENCES public.dealer_listings(id) ON DELETE CASCADE;

-- Reuse the inventory UUID for the one-to-one legacy parent. This preserves
-- all existing edit/archive URLs and avoids merging records with different
-- prices or descriptions during the migration.
INSERT INTO public.dealer_listings (
  id, dealer_id, listing_spec_id, agency_price, listing_description,
  listing_images, status, created_at, updated_at
)
SELECT
  di.id,
  di.dealer_id,
  cc.listing_spec_id,
  di.agency_price,
  di.listing_description,
  COALESCE(di.listing_images, '{}'),
  CASE WHEN di.status = 'hidden' THEN 'hidden' ELSE 'active' END,
  di.created_at,
  di.updated_at
FROM public.dealer_inventory di
JOIN public.car_configurations cc ON cc.id = di.car_configuration_id
WHERE di.dealer_listing_id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.dealer_inventory
SET dealer_listing_id = id
WHERE dealer_listing_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.dealer_inventory WHERE dealer_listing_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill dealer_inventory.dealer_listing_id';
  END IF;
END;
$$;

ALTER TABLE public.dealer_inventory ALTER COLUMN dealer_listing_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dealer_listings_owner_status
  ON public.dealer_listings(dealer_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dealer_listings_spec_status
  ON public.dealer_listings(listing_spec_id, status);
CREATE INDEX IF NOT EXISTS idx_dealer_inventory_listing_stock
  ON public.dealer_inventory(dealer_listing_id, status, quantity);

CREATE OR REPLACE FUNCTION public.save_dealer_listing(
  p_listing_id uuid,
  p_make text,
  p_model text,
  p_year integer,
  p_trim text,
  p_origin_locale text,
  p_variant text,
  p_agency_price numeric,
  p_colors jsonb,
  p_description text,
  p_images text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dealer_id uuid;
  v_listing public.dealer_listings%ROWTYPE;
  v_spec_id uuid;
  v_configuration_id uuid;
  v_color_row jsonb;
  v_color text;
  v_quantity integer;
  v_total integer := 0;
  v_seen_colors text[] := ARRAY[]::text[];
  v_saved_config_ids uuid[] := ARRAY[]::uuid[];
  v_images text[] := COALESCE(p_images, '{}');
  v_make text := NULLIF(btrim(p_make), '');
  v_model text := NULLIF(btrim(p_model), '');
  v_trim text := NULLIF(btrim(p_trim), '');
  v_origin text := NULLIF(btrim(p_origin_locale), '');
  v_variant text := NULLIF(btrim(p_variant), '');
  v_description text := NULLIF(btrim(p_description), '');
BEGIN
  SELECT d.id INTO v_dealer_id
  FROM public.dealers d
  WHERE d.user_id = (SELECT auth.uid()) AND d.verified = true
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'approved_dealer_required');
  END IF;

  IF v_make IS NULL OR v_model IS NULL OR p_year IS NULL OR p_year < 1900 OR p_year > 2100 OR
     v_trim IS NULL OR v_origin IS NULL OR v_variant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'required_identity_fields');
  END IF;
  IF p_agency_price IS NULL OR p_agency_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'agency_price_must_be_positive');
  END IF;
  IF jsonb_typeof(p_colors) IS DISTINCT FROM 'array' OR jsonb_array_length(p_colors) < 1 OR jsonb_array_length(p_colors) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_color_rows');
  END IF;
  IF cardinality(v_images) > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'maximum_five_images');
  END IF;

  FOR v_color_row IN SELECT value FROM jsonb_array_elements(p_colors)
  LOOP
    v_color := NULLIF(regexp_replace(btrim(v_color_row->>'color'), '\s+', ' ', 'g'), '');
    BEGIN
      v_quantity := (v_color_row->>'quantity')::integer;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'color_quantity_must_be_positive_integer');
    END;

    IF v_color IS NULL OR length(v_color) > 120 OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'color_quantity_must_be_positive_integer');
    END IF;
    IF lower(v_color) = ANY(v_seen_colors) THEN
      RETURN jsonb_build_object('success', false, 'error', 'duplicate_color_row');
    END IF;
    v_seen_colors := array_append(v_seen_colors, lower(v_color));
    v_total := v_total + v_quantity;
  END LOOP;

  IF v_total > 100000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'listing_quantity_too_large');
  END IF;

  INSERT INTO public.vehicle_listing_specs (make, model, year, trim, origin_locale, variant)
  VALUES (v_make, v_model, p_year, v_trim, v_origin, v_variant)
  ON CONFLICT (make, model, year, trim, origin_locale, variant)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_spec_id;

  IF p_listing_id IS NOT NULL THEN
    SELECT * INTO v_listing
    FROM public.dealer_listings
    WHERE id = p_listing_id AND dealer_id = v_dealer_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'inventory_not_found');
    END IF;

    UPDATE public.dealer_listings
    SET listing_spec_id = v_spec_id,
        agency_price = p_agency_price,
        listing_description = v_description,
        listing_images = v_images,
        updated_at = now()
    WHERE id = p_listing_id
    RETURNING * INTO v_listing;
  ELSE
    INSERT INTO public.dealer_listings (
      dealer_id, listing_spec_id, agency_price, listing_description, listing_images, status
    ) VALUES (
      v_dealer_id, v_spec_id, p_agency_price, v_description, v_images, 'active'
    ) RETURNING * INTO v_listing;
  END IF;

  FOR v_color_row IN SELECT value FROM jsonb_array_elements(p_colors)
  LOOP
    v_color := regexp_replace(btrim(v_color_row->>'color'), '\s+', ' ', 'g');
    v_quantity := (v_color_row->>'quantity')::integer;

    SELECT cc.id INTO v_configuration_id
    FROM public.car_configurations cc
    WHERE cc.listing_spec_id = v_spec_id AND lower(btrim(cc.color)) = lower(v_color)
    LIMIT 1;

    IF v_configuration_id IS NULL THEN
      INSERT INTO public.car_configurations (
        make, model, year, trim, color, origin_locale, variant,
        msrp, description, images, listing_spec_id
      ) VALUES (
        v_make, v_model, p_year, v_trim, v_color, v_origin, v_variant,
        p_agency_price, v_description, v_images, v_spec_id
      )
      ON CONFLICT (make, model, year, trim, color, variant, origin_locale)
      DO UPDATE SET listing_spec_id = EXCLUDED.listing_spec_id, updated_at = now()
      RETURNING id INTO v_configuration_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.dealer_inventory di
      WHERE di.dealer_id = v_dealer_id
        AND di.car_configuration_id = v_configuration_id
        AND di.dealer_listing_id <> v_listing.id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'duplicate_inventory_listing';
    END IF;

    INSERT INTO public.dealer_inventory (
      dealer_id, dealer_listing_id, car_configuration_id, agency_price,
      listing_description, listing_images, quantity, status
    ) VALUES (
      v_dealer_id, v_listing.id, v_configuration_id, p_agency_price,
      v_description, v_images, v_quantity, 'active'
    )
    ON CONFLICT (dealer_id, car_configuration_id)
    DO UPDATE SET dealer_listing_id = v_listing.id,
                  agency_price = EXCLUDED.agency_price,
                  listing_description = EXCLUDED.listing_description,
                  listing_images = EXCLUDED.listing_images,
                  quantity = EXCLUDED.quantity,
                  status = 'active',
                  updated_at = now();

    v_saved_config_ids := array_append(v_saved_config_ids, v_configuration_id);
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.dealer_inventory di
    WHERE di.dealer_listing_id = v_listing.id
      AND NOT (di.car_configuration_id = ANY(v_saved_config_ids))
      AND (
        EXISTS (
          SELECT 1 FROM public.bids b
          WHERE b.car_configuration_id = di.car_configuration_id
            AND b.status IN ('pending', 'accepted')
            AND b.commitment_fee_paid = true
        ) OR EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.dealer_id = v_dealer_id
            AND d.car_configuration_id = di.car_configuration_id
            AND d.status = 'pending_payment'
        )
      )
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'color_has_unresolved_commercial_workflow';
  END IF;

  UPDATE public.dealer_inventory
  SET quantity = 0, status = 'out_of_stock', updated_at = now()
  WHERE dealer_listing_id = v_listing.id
    AND NOT (car_configuration_id = ANY(v_saved_config_ids));

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', v_listing.id,
    'listing_spec_id', v_spec_id,
    'status', v_listing.status,
    'total_quantity', v_total
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'duplicate_inventory_listing');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.save_dealer_listing(uuid, text, text, integer, text, text, text, numeric, jsonb, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_dealer_listing(uuid, text, text, integer, text, text, text, numeric, jsonb, text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_dealer_listing(p_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dealer_id uuid;
BEGIN
  SELECT d.id INTO v_dealer_id
  FROM public.dealers d
  WHERE d.user_id = (SELECT auth.uid()) AND d.verified = true
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'approved_dealer_required');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dealer_listings
    WHERE id = p_listing_id AND dealer_id = v_dealer_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'inventory_not_found');
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.dealer_inventory di
    WHERE di.dealer_listing_id = p_listing_id
      AND (
        EXISTS (
          SELECT 1 FROM public.bids b
          WHERE b.car_configuration_id = di.car_configuration_id
            AND b.status IN ('pending', 'accepted')
            AND b.commitment_fee_paid = true
        ) OR EXISTS (
          SELECT 1 FROM public.deals d
          WHERE d.dealer_id = v_dealer_id
            AND d.car_configuration_id = di.car_configuration_id
            AND d.status = 'pending_payment'
        )
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unresolved_paid_offer_or_pending_deal');
  END IF;

  UPDATE public.dealer_listings SET status = 'hidden', updated_at = now()
  WHERE id = p_listing_id AND dealer_id = v_dealer_id;
  UPDATE public.dealer_inventory SET status = 'hidden', updated_at = now()
  WHERE dealer_listing_id = p_listing_id;

  RETURN jsonb_build_object('success', true, 'listing_id', p_listing_id, 'status', 'hidden');
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_dealer_listing(p_listing_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dealer_id uuid;
BEGIN
  SELECT d.id INTO v_dealer_id
  FROM public.dealers d
  WHERE d.user_id = (SELECT auth.uid()) AND d.verified = true
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'approved_dealer_required');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.dealer_listings
    WHERE id = p_listing_id AND dealer_id = v_dealer_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'inventory_not_found');
  END IF;

  UPDATE public.dealer_listings SET status = 'active', updated_at = now()
  WHERE id = p_listing_id AND dealer_id = v_dealer_id;
  UPDATE public.dealer_inventory
  SET status = CASE WHEN quantity > 0 THEN 'active' ELSE 'out_of_stock' END,
      updated_at = now()
  WHERE dealer_listing_id = p_listing_id;

  RETURN jsonb_build_object('success', true, 'listing_id', p_listing_id, 'status', 'active');
END;
$$;

REVOKE ALL ON FUNCTION public.archive_dealer_listing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_dealer_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_dealer_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_dealer_listing(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_available_vehicle_listings(
  p_make text DEFAULT NULL,
  p_origin_locale text DEFAULT NULL,
  p_year_from integer DEFAULT NULL,
  p_year_to integer DEFAULT NULL,
  p_price_from numeric DEFAULT NULL,
  p_price_to numeric DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_listing_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  make text,
  model text,
  year integer,
  variant text,
  "trim" text,
  origin_locale text,
  display_price numeric,
  available_quantity bigint,
  representative_images text[],
  description text,
  colors jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    spec.id,
    spec.make,
    spec.model,
    spec.year,
    spec.variant,
    spec.trim,
    spec.origin_locale,
    active.display_price,
    active.available_quantity,
    COALESCE(active.representative_images, '{}'),
    active.description,
    color_stock.colors,
    spec.created_at,
    spec.updated_at
  FROM public.vehicle_listing_specs spec
  JOIN LATERAL (
    SELECT
      MIN(dl.agency_price) AS display_price,
      SUM(di.quantity)::bigint AS available_quantity,
      (
        SELECT dl2.listing_images
        FROM public.dealer_listings dl2
        WHERE dl2.listing_spec_id = spec.id
          AND dl2.status = 'active'
          AND cardinality(dl2.listing_images) > 0
        ORDER BY dl2.updated_at DESC
        LIMIT 1
      ) AS representative_images,
      (
        SELECT dl2.listing_description
        FROM public.dealer_listings dl2
        WHERE dl2.listing_spec_id = spec.id
          AND dl2.status = 'active'
          AND dl2.listing_description IS NOT NULL
        ORDER BY dl2.updated_at DESC
        LIMIT 1
      ) AS description
    FROM public.dealer_listings dl
    JOIN public.dealer_inventory di ON di.dealer_listing_id = dl.id
    WHERE dl.listing_spec_id = spec.id
      AND dl.status = 'active'
      AND di.status = 'active'
      AND di.quantity > 0
  ) active ON active.available_quantity > 0
  JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'configuration_id', grouped.configuration_id,
        'color', grouped.color,
        'available_quantity', grouped.available_quantity
      ) ORDER BY grouped.color
    ) AS colors
    FROM (
      SELECT cc.id AS configuration_id, cc.color, SUM(di.quantity)::bigint AS available_quantity
      FROM public.car_configurations cc
      JOIN public.dealer_inventory di ON di.car_configuration_id = cc.id
      JOIN public.dealer_listings dl ON dl.id = di.dealer_listing_id
      WHERE cc.listing_spec_id = spec.id
        AND dl.status = 'active'
        AND di.status = 'active'
        AND di.quantity > 0
      GROUP BY cc.id, cc.color
    ) grouped
  ) color_stock ON color_stock.colors IS NOT NULL
  WHERE (p_listing_id IS NULL OR spec.id = p_listing_id)
    AND (NULLIF(btrim(p_make), '') IS NULL OR spec.make = btrim(p_make))
    AND (NULLIF(btrim(p_origin_locale), '') IS NULL OR spec.origin_locale = btrim(p_origin_locale))
    AND (p_year_from IS NULL OR spec.year >= p_year_from)
    AND (p_year_to IS NULL OR spec.year <= p_year_to)
    AND (p_price_from IS NULL OR active.display_price >= p_price_from)
    AND (p_price_to IS NULL OR active.display_price <= p_price_to)
    AND (
      NULLIF(btrim(p_search), '') IS NULL OR EXISTS (
        SELECT 1 FROM unnest(string_to_array(p_search, '|')) search_term
        WHERE lower(concat_ws(' ', spec.make, spec.model, spec.trim, spec.origin_locale, spec.variant))
          LIKE '%' || lower(btrim(search_term)) || '%'
      )
    )
  ORDER BY spec.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.search_available_vehicle_listings(text, text, integer, integer, numeric, numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_available_vehicle_listings(text, text, integer, integer, numeric, numeric, text, uuid) TO anon, authenticated;

-- Compatibility wrappers for the frontend that may remain live while the
-- additive database migration is applied during the release window.
CREATE OR REPLACE FUNCTION public.save_dealer_inventory_listing(
  p_inventory_id uuid,
  p_make text,
  p_model text,
  p_year integer,
  p_trim text,
  p_color text,
  p_origin_locale text,
  p_variant text,
  p_agency_price numeric,
  p_quantity integer,
  p_description text,
  p_images text[]
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.save_dealer_listing(
    (SELECT di.dealer_listing_id FROM public.dealer_inventory di WHERE di.id = p_inventory_id),
    p_make, p_model, p_year, p_trim, p_origin_locale, p_variant, p_agency_price,
    jsonb_build_array(jsonb_build_object('color', p_color, 'quantity', p_quantity)),
    p_description, p_images
  );
$$;

CREATE OR REPLACE FUNCTION public.archive_dealer_inventory_listing(p_inventory_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.archive_dealer_listing(
    COALESCE((SELECT di.dealer_listing_id FROM public.dealer_inventory di WHERE di.id = p_inventory_id), p_inventory_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.restore_dealer_inventory_listing(p_inventory_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.restore_dealer_listing(
    COALESCE((SELECT di.dealer_listing_id FROM public.dealer_inventory di WHERE di.id = p_inventory_id), p_inventory_id)
  );
$$;

REVOKE ALL ON FUNCTION public.save_dealer_inventory_listing(uuid, text, text, integer, text, text, text, text, numeric, integer, text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_dealer_inventory_listing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_dealer_inventory_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_dealer_inventory_listing(uuid, text, text, integer, text, text, text, text, numeric, integer, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_dealer_inventory_listing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_dealer_inventory_listing(uuid) TO authenticated;
