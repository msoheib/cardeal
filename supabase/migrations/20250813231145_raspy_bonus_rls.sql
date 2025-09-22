/*
  # Bidding and Fee Management System (RLS & Policies)

  Enables row level security and recreates the policies that depend on the
  deals/bids schema defined in the previous migration.
*/

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE commitment_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers can manage their own bids" ON bids;
CREATE POLICY "Buyers can manage their own bids"
  ON bids
  FOR ALL
  TO authenticated
  USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Dealers can view bids on their cars" ON bids;
CREATE POLICY "Dealers can view bids on their cars"
  ON bids
  FOR SELECT
  TO authenticated
  USING (
    car_id IN (
      SELECT c.id FROM cars c
      JOIN dealers d ON c.dealer_id = d.id
      WHERE d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their own fees" ON commitment_fees;
CREATE POLICY "Users can view their own fees"
  ON commitment_fees
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view bid aggregates" ON bid_aggregates;
CREATE POLICY "Anyone can view bid aggregates"
  ON bid_aggregates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Buyers can view their deals" ON deals;
CREATE POLICY "Buyers can view their deals"
  ON deals
  FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Dealers can view their deals" ON deals;
CREATE POLICY "Dealers can view their deals"
  ON deals
  FOR SELECT
  TO authenticated
  USING (dealer_id IN (
    SELECT id FROM dealers WHERE user_id = auth.uid()
  ));
