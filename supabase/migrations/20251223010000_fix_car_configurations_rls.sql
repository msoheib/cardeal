/*
  # Fix car_configurations RLS policies for dealer insert
  
  The car_configurations table was missing INSERT/UPDATE policies for dealers.
  This migration adds the necessary policies so dealers can create new car configurations
  when adding inventory.
*/

BEGIN;

-- Allow dealers to INSERT new car configurations
CREATE POLICY "Dealers can create car configurations" 
ON car_configurations FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM dealers WHERE user_id = auth.uid())
);

-- Allow dealers to UPDATE car configurations (for ones they have in inventory)
CREATE POLICY "Dealers can update car configurations they sell" 
ON car_configurations FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM dealer_inventory di
    JOIN dealers d ON d.id = di.dealer_id
    WHERE di.car_configuration_id = car_configurations.id
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dealers WHERE user_id = auth.uid()
  )
);

COMMIT;
