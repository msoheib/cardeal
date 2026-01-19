-- Allow dealers to view buyer info for deals they're part of
-- This enables showing buyer contact info after deal acceptance

CREATE POLICY "Dealers can view buyers from their deals"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT d.buyer_id 
      FROM deals d
      JOIN dealers dl ON dl.id = d.dealer_id
      WHERE dl.user_id = auth.uid()
    )
  );

-- Also allow buyers to view dealer users from their deals (if needed)
CREATE POLICY "Buyers can view dealer users from their deals"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT dl.user_id 
      FROM deals d
      JOIN dealers dl ON dl.id = d.dealer_id
      WHERE d.buyer_id = auth.uid()
    )
  );
