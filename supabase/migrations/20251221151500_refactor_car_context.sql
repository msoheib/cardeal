/*
  # Refactor Car Context to Generic Configurations
  
  1. New Tables
    - `car_configurations`: Stores generic car details (make, model, year, trim, color, etc.)
    - `dealer_inventory`: Links dealers to configurations with quantity and status
  
  2. Changes
    - `bids`: Add `car_configuration_id`, add `net_offer_amount`
    - `deals`: Add `car_configuration_id`
  
  3. Migration
    - Migrate existing "distinct" cars to `car_configurations`
    - Create inventory records for existing cars
*/

BEGIN;

-- 1. Create car_configurations table
CREATE TABLE IF NOT EXISTS car_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  variant text,
  trim text,
  color text,
  msrp decimal(12,2) NOT NULL CHECK (msrp > 0), -- Was wakala_price
  description text,
  specifications jsonb DEFAULT '{}',
  images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure uniqueness of configuration
  UNIQUE NULLS NOT DISTINCT (make, model, year, trim, color, variant)
);

-- Enable RLS
ALTER TABLE car_configurations ENABLE ROW LEVEL SECURITY;

-- 2. Create dealer_inventory table
CREATE TABLE IF NOT EXISTS dealer_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  car_configuration_id uuid REFERENCES car_configurations(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0 CHECK (quantity >= 0),
  status text DEFAULT 'active' CHECK (status IN ('active', 'out_of_stock', 'hidden')),
  price_slots numeric[] DEFAULT '{}', -- Dealer specific price slots
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(dealer_id, car_configuration_id)
);

-- Enable RLS
ALTER TABLE dealer_inventory ENABLE ROW LEVEL SECURITY;

-- 3. Update Bids table
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS car_configuration_id uuid REFERENCES car_configurations(id) ON DELETE CASCADE;

-- Add net_offer_amount (virtual or real, let's make it real for indexing)
ALTER TABLE bids
ADD COLUMN IF NOT EXISTS net_offer_amount decimal(12,2);

-- Update Deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS car_configuration_id uuid REFERENCES car_configurations(id) ON DELETE SET NULL;


-- 4. Data Migration: Move distinct cars to configurations
DO $$
DECLARE
  r_car RECORD;
  v_config_id uuid;
BEGIN
  -- Loop through all existing active cars
  FOR r_car IN SELECT * FROM cars WHERE status != 'draft' LOOP
    
    -- Try to find existing config or insert new one
    INSERT INTO car_configurations (make, model, year, variant, trim, color, msrp, description, specifications, images)
    VALUES (
      r_car.make,
      r_car.model,
      r_car.year,
      r_car.variant,
      r_car.trim,
      r_car.color,
      r_car.wakala_price,
      r_car.description,
      r_car.specifications,
      r_car.images
    )
    ON CONFLICT (make, model, year, trim, color, variant) 
    DO UPDATE SET updated_at = now() -- No-op just to get ID
    RETURNING id INTO v_config_id;
    
    -- If we didn't get an ID (because it existed and DO UPDATE didn't fire exactly?), select it manually
    IF v_config_id IS NULL THEN
        SELECT id INTO v_config_id 
        FROM car_configurations 
        WHERE make = r_car.make 
          AND model = r_car.model
          AND year = r_car.year
          AND (trim IS NOT DISTINCT FROM r_car.trim)
          AND (color IS NOT DISTINCT FROM r_car.color)
          AND (variant IS NOT DISTINCT FROM r_car.variant);
    END IF;

    -- Insert into dealer_inventory
    INSERT INTO dealer_inventory (dealer_id, car_configuration_id, quantity, status)
    VALUES (
      r_car.dealer_id,
      v_config_id,
      r_car.available_quantity,
      CASE WHEN r_car.status = 'active' THEN 'active' ELSE 'hidden' END
    )
    ON CONFLICT (dealer_id, car_configuration_id) 
    DO UPDATE SET quantity = dealer_inventory.quantity + r_car.available_quantity;

    -- Update linked Bids
    UPDATE bids 
    SET car_configuration_id = v_config_id,
        net_offer_amount = bid_price - (CASE WHEN commitment_fee_paid THEN 500 ELSE 0 END)
    WHERE car_id = r_car.id;
    
    -- Update linked Deals
    UPDATE deals
    SET car_configuration_id = v_config_id
    WHERE car_id = r_car.id;

  END LOOP;
END $$;


-- 5. RLS Policies

-- Car Configurations: Readable by everyone (authenticated)
CREATE POLICY "Car configurations are viewable by everyone" 
ON car_configurations FOR SELECT TO authenticated USING (true);

-- Dealer Inventory: 
-- Dealers can manage their own
CREATE POLICY "Dealers manage their own inventory" 
ON dealer_inventory FOR ALL TO authenticated 
USING (dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid()));

-- Buyers can see inventory count aggregates (handled via function likely, but raw select allowed for now)
CREATE POLICY "Anyone can see active inventory"
ON dealer_inventory FOR SELECT TO authenticated
USING (status = 'active');


COMMIT;
