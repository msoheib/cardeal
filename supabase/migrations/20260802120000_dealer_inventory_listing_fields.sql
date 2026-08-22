-- Dealer-owned listing data and transactional inventory lifecycle operations.
-- The shared car_configurations row remains a catalog identity only.

ALTER TABLE public.dealer_inventory
  ADD COLUMN IF NOT EXISTS agency_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS listing_description text,
  ADD COLUMN IF NOT EXISTS listing_images text[] NOT NULL DEFAULT '{}';

UPDATE public.dealer_inventory di
SET agency_price = cc.msrp,
    listing_description = COALESCE(di.listing_description, cc.description),
    listing_images = CASE
      WHEN COALESCE(cardinality(di.listing_images), 0) = 0 THEN COALESCE(cc.images, '{}')
      ELSE di.listing_images
    END
FROM public.car_configurations cc
WHERE cc.id = di.car_configuration_id
  AND di.agency_price IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.dealer_inventory
    WHERE agency_price IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot backfill dealer_inventory.agency_price for orphaned inventory rows';
  END IF;
END;
$$;

ALTER TABLE public.dealer_inventory
  ALTER COLUMN agency_price SET NOT NULL;

ALTER TABLE public.dealer_inventory
  DROP CONSTRAINT IF EXISTS dealer_inventory_agency_price_positive;

ALTER TABLE public.dealer_inventory
  ADD CONSTRAINT dealer_inventory_agency_price_positive CHECK (agency_price > 0);

COMMENT ON COLUMN public.dealer_inventory.price_slots IS
  'Deprecated compatibility column. New listing writes must use agency_price and must not update price_slots.';

CREATE INDEX IF NOT EXISTS idx_dealer_inventory_available_listing
  ON public.dealer_inventory(car_configuration_id, status, quantity);

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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dealer_id uuid;
  v_inventory public.dealer_inventory%ROWTYPE;
  v_configuration_id uuid;
  v_created_configuration boolean := false;
  v_status text;
  v_make text := NULLIF(btrim(p_make), '');
  v_model text := NULLIF(btrim(p_model), '');
  v_trim text := NULLIF(btrim(p_trim), '');
  v_color text := NULLIF(btrim(p_color), '');
  v_origin text := NULLIF(btrim(p_origin_locale), '');
  v_variant text := NULLIF(btrim(p_variant), '');
  v_description text := NULLIF(btrim(p_description), '');
  v_images text[] := COALESCE(p_images, '{}');
BEGIN
  SELECT d.id
  INTO v_dealer_id
  FROM public.dealers d
  WHERE d.user_id = (SELECT auth.uid())
    AND d.verified = true
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'approved_dealer_required');
  END IF;

  IF v_make IS NULL OR v_model IS NULL OR p_year IS NULL OR p_year < 1900 OR
     v_trim IS NULL OR v_color IS NULL OR v_origin IS NULL OR v_variant IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'required_identity_fields');
  END IF;

  IF p_agency_price IS NULL OR p_agency_price <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'agency_price_must_be_positive');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'quantity_must_not_be_negative');
  END IF;

  IF COALESCE(cardinality(v_images), 0) > 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'maximum_five_images');
  END IF;

  IF p_inventory_id IS NOT NULL THEN
    SELECT di.*
    INTO v_inventory
    FROM public.dealer_inventory di
    WHERE di.id = p_inventory_id
      AND di.dealer_id = v_dealer_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'inventory_not_found');
    END IF;
  END IF;

  -- Find the target shared identity without changing its catalog-owned fields.
  SELECT cc.id
  INTO v_configuration_id
  FROM public.car_configurations cc
  WHERE cc.make = v_make
    AND cc.model = v_model
    AND cc.year = p_year
    AND cc.trim IS NOT DISTINCT FROM v_trim
    AND cc.color IS NOT DISTINCT FROM v_color
    AND cc.variant IS NOT DISTINCT FROM v_variant
    AND cc.origin_locale IS NOT DISTINCT FROM v_origin
  LIMIT 1;

  IF v_configuration_id IS NULL THEN
    INSERT INTO public.car_configurations (
      make, model, year, trim, color, origin_locale, variant,
      msrp, description, images
    )
    VALUES (
      v_make, v_model, p_year, v_trim, v_color, v_origin, v_variant,
      p_agency_price, v_description, v_images
    )
    ON CONFLICT (make, model, year, trim, color, variant, origin_locale)
    DO NOTHING
    RETURNING id INTO v_configuration_id;

    IF v_configuration_id IS NULL THEN
      SELECT cc.id
      INTO v_configuration_id
      FROM public.car_configurations cc
      WHERE cc.make = v_make
        AND cc.model = v_model
        AND cc.year = p_year
        AND cc.trim IS NOT DISTINCT FROM v_trim
        AND cc.color IS NOT DISTINCT FROM v_color
        AND cc.variant IS NOT DISTINCT FROM v_variant
        AND cc.origin_locale IS NOT DISTINCT FROM v_origin
      LIMIT 1;
    ELSE
      v_created_configuration := true;
    END IF;
  END IF;

  IF v_configuration_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'configuration_save_failed');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.dealer_inventory di
    WHERE di.dealer_id = v_dealer_id
      AND di.car_configuration_id = v_configuration_id
      AND (p_inventory_id IS NULL OR di.id <> p_inventory_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'duplicate_inventory_listing');
  END IF;

  IF p_inventory_id IS NULL THEN
    v_status := CASE WHEN p_quantity > 0 THEN 'active' ELSE 'out_of_stock' END;

    INSERT INTO public.dealer_inventory (
      dealer_id,
      car_configuration_id,
      agency_price,
      listing_description,
      listing_images,
      quantity,
      status
    )
    VALUES (
      v_dealer_id,
      v_configuration_id,
      p_agency_price,
      v_description,
      v_images,
      p_quantity,
      v_status
    )
    RETURNING * INTO v_inventory;
  ELSE
    v_status := CASE
      WHEN v_inventory.status = 'hidden' THEN 'hidden'
      WHEN p_quantity > 0 THEN 'active'
      ELSE 'out_of_stock'
    END;

    UPDATE public.dealer_inventory
    SET car_configuration_id = v_configuration_id,
        agency_price = p_agency_price,
        listing_description = v_description,
        listing_images = v_images,
        quantity = p_quantity,
        status = v_status,
        updated_at = now()
    WHERE id = p_inventory_id
      AND dealer_id = v_dealer_id
    RETURNING * INTO v_inventory;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'inventory_id', v_inventory.id,
    'configuration_id', v_inventory.car_configuration_id,
    'status', v_inventory.status,
    'created_configuration', v_created_configuration
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'duplicate_inventory_listing');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.save_dealer_inventory_listing(uuid, text, text, integer, text, text, text, text, numeric, integer, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_dealer_inventory_listing(uuid, text, text, integer, text, text, text, text, numeric, integer, text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.archive_dealer_inventory_listing(p_inventory_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dealer_id uuid;
  v_inventory public.dealer_inventory%ROWTYPE;
BEGIN
  SELECT d.id
  INTO v_dealer_id
  FROM public.dealers d
  WHERE d.user_id = (SELECT auth.uid())
    AND d.verified = true
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'approved_dealer_required');
  END IF;

  SELECT di.*
  INTO v_inventory
  FROM public.dealer_inventory di
  WHERE di.id = p_inventory_id
    AND di.dealer_id = v_dealer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'inventory_not_found');
  END IF;

  -- A paid, unresolved offer or an in-flight deal keeps the listing available
  -- until the commercial workflow reaches a terminal state.
  IF EXISTS (
    SELECT 1
    FROM public.deals d
    WHERE d.dealer_id = v_dealer_id
      AND d.car_configuration_id = v_inventory.car_configuration_id
      AND d.status = 'pending_payment'
  ) OR EXISTS (
    SELECT 1
    FROM public.bids b
    WHERE b.car_configuration_id = v_inventory.car_configuration_id
      AND b.status IN ('pending', 'accepted')
      AND b.commitment_fee_paid = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unresolved_paid_offer_or_pending_deal');
  END IF;

  UPDATE public.dealer_inventory
  SET status = 'hidden', updated_at = now()
  WHERE id = v_inventory.id;

  RETURN jsonb_build_object('success', true, 'inventory_id', v_inventory.id, 'status', 'hidden');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_dealer_inventory_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_dealer_inventory_listing(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_dealer_inventory_listing(p_inventory_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dealer_id uuid;
  v_inventory public.dealer_inventory%ROWTYPE;
  v_status text;
BEGIN
  SELECT d.id
  INTO v_dealer_id
  FROM public.dealers d
  WHERE d.user_id = (SELECT auth.uid())
    AND d.verified = true
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'approved_dealer_required');
  END IF;

  SELECT di.*
  INTO v_inventory
  FROM public.dealer_inventory di
  WHERE di.id = p_inventory_id
    AND di.dealer_id = v_dealer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'inventory_not_found');
  END IF;

  v_status := CASE WHEN v_inventory.quantity > 0 THEN 'active' ELSE 'out_of_stock' END;

  UPDATE public.dealer_inventory
  SET status = v_status, updated_at = now()
  WHERE id = v_inventory.id;

  RETURN jsonb_build_object('success', true, 'inventory_id', v_inventory.id, 'status', v_status);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.restore_dealer_inventory_listing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_dealer_inventory_listing(uuid) TO authenticated;

-- Buyer-safe aggregate: it intentionally returns only configuration identity and
-- public listing values, never dealer IDs or dealer-owned listing rows.
CREATE OR REPLACE FUNCTION public.search_available_configurations(
  p_make text DEFAULT NULL,
  p_origin_locale text DEFAULT NULL,
  p_year_from integer DEFAULT NULL,
  p_year_to integer DEFAULT NULL,
  p_price_from numeric DEFAULT NULL,
  p_price_to numeric DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  make text,
  model text,
  year integer,
  variant text,
  "trim" text,
  color text,
  origin_locale text,
  msrp numeric,
  description text,
  specifications jsonb,
  images text[],
  created_at timestamptz,
  updated_at timestamptz,
  display_price numeric,
  available_quantity bigint,
  representative_images text[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    cc.id,
    cc.make,
    cc.model,
    cc.year,
    cc.variant,
    cc.trim,
    cc.color,
    cc.origin_locale,
    cc.msrp,
    cc.description,
    cc.specifications,
    cc.images,
    cc.created_at,
    cc.updated_at,
    active.display_price,
    active.available_quantity,
    COALESCE(listing_images.images, cc.images, '{}') AS representative_images
  FROM public.car_configurations cc
  JOIN LATERAL (
    SELECT
      MIN(di.agency_price) AS display_price,
      SUM(di.quantity)::bigint AS available_quantity
    FROM public.dealer_inventory di
    WHERE di.car_configuration_id = cc.id
      AND di.status = 'active'
      AND di.quantity > 0
  ) active ON active.available_quantity > 0
  LEFT JOIN LATERAL (
    SELECT di.listing_images AS images
    FROM public.dealer_inventory di
    WHERE di.car_configuration_id = cc.id
      AND di.status = 'active'
      AND di.quantity > 0
      AND COALESCE(cardinality(di.listing_images), 0) > 0
    ORDER BY di.updated_at DESC
    LIMIT 1
  ) listing_images ON true
  WHERE (NULLIF(btrim(p_make), '') IS NULL OR cc.make = btrim(p_make))
    AND (NULLIF(btrim(p_origin_locale), '') IS NULL OR cc.origin_locale = btrim(p_origin_locale))
    AND (p_year_from IS NULL OR cc.year >= p_year_from)
    AND (p_year_to IS NULL OR cc.year <= p_year_to)
    AND (p_price_from IS NULL OR active.display_price >= p_price_from)
    AND (p_price_to IS NULL OR active.display_price <= p_price_to)
    AND (
      NULLIF(btrim(p_search), '') IS NULL
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(p_search, '|')) AS search_term
        WHERE lower(concat_ws(' ', cc.make, cc.model, cc.trim, cc.color, cc.origin_locale, cc.variant))
          LIKE '%' || lower(btrim(search_term)) || '%'
      )
    )
  ORDER BY cc.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.search_available_configurations(text, text, integer, integer, numeric, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_available_configurations(text, text, integer, integer, numeric, numeric, text) TO anon, authenticated;

COMMENT ON FUNCTION public.search_available_configurations(text, text, integer, integer, numeric, numeric, text) IS
  'Buyer-safe active inventory aggregation. Dealer-specific prices and images are aggregated without exposing dealer rows.';
