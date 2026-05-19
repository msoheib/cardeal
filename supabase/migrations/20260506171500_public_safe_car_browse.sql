BEGIN;

-- The app's browse and details pages are intentionally public. These policies
-- expose only buyer-safe listing data and do not expose full dealer contact
-- records, buyer identities, payment references, bids, or deal ownership.

DROP POLICY IF EXISTS "Car configurations are viewable by everyone" ON public.car_configurations;
CREATE POLICY "Car configurations are viewable by everyone"
  ON public.car_configurations
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can see active inventory" ON public.dealer_inventory;
CREATE POLICY "Anyone can see active inventory"
  ON public.dealer_inventory
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND quantity > 0);

DROP POLICY IF EXISTS "Anyone can view public verified dealer profiles" ON public.dealer_public_profiles;
CREATE POLICY "Anyone can view public verified dealer profiles"
  ON public.dealer_public_profiles
  FOR SELECT
  TO anon, authenticated
  USING (verified = true);

DROP POLICY IF EXISTS "Anyone can view active cars" ON public.cars;
CREATE POLICY "Anyone can view active cars"
  ON public.cars
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

COMMENT ON POLICY "Car configurations are viewable by everyone" ON public.car_configurations IS
  'Public browse pages can read non-contact vehicle configuration data.';

COMMENT ON POLICY "Anyone can see active inventory" ON public.dealer_inventory IS
  'Public browse pages can read active stock counts without dealer contact details.';

COMMENT ON POLICY "Anyone can view public verified dealer profiles" ON public.dealer_public_profiles IS
  'Public safe dealer projection; excludes contact_info and commercial registration.';

COMMIT;
