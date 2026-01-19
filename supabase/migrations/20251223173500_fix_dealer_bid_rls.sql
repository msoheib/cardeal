-- Fix RLS policy for dealers to view bids
-- The old policy checked car_id, but new bids use car_configuration_id

DROP POLICY IF EXISTS "Dealers can view bids on their cars" ON bids;

CREATE POLICY "Dealers can view bids for their inventory"
  ON bids
  FOR SELECT
  TO authenticated
  USING (
    car_configuration_id IN (
      SELECT car_configuration_id FROM dealer_inventory di
      JOIN dealers d ON di.dealer_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );
