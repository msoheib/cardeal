-- Migration: Fix RLS policy for car INSERT operations
-- Date: 2025-12-07
-- Issue: Original policy used USING which doesn't apply to INSERT operations

-- Drop existing policy
DROP POLICY IF EXISTS "Dealers can manage their own cars" ON cars;

-- Recreate with proper USING and WITH CHECK clauses
CREATE POLICY "Dealers can manage their own cars"
  ON cars
  FOR ALL
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );
