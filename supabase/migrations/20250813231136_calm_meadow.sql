/*
  # Car Inventory System

  1. New Tables
    - `cars`
      - `id` (uuid, primary key)
      - `dealer_id` (uuid, foreign key to dealers)
      - `make` (text)
      - `model` (text)
      - `year` (integer)
      - `variant` (text)
      - `wakala_price` (decimal)
      - `description` (text)
      - `specifications` (jsonb)
      - `images` (text array)
      - `status` (enum)
      - `available_quantity` (integer)
      - `original_quantity` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `cars` table
    - Dealers can manage their own cars
    - Buyers can view active cars
*/

-- Create car status enum
CREATE TYPE car_status AS ENUM ('active', 'sold_out', 'inactive', 'draft');

CREATE TABLE IF NOT EXISTS cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL CHECK (year >= 2015 AND year <= 2025),
  variant text,
  wakala_price decimal(12,2) NOT NULL CHECK (wakala_price > 0),
  description text,
  specifications jsonb DEFAULT '{}',
  images text[] DEFAULT '{}',
  status car_status DEFAULT 'draft',
  available_quantity integer DEFAULT 1 CHECK (available_quantity >= 0),
  original_quantity integer DEFAULT 1 CHECK (original_quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  featured boolean DEFAULT false,
  min_bid_price decimal(12,2),
  CONSTRAINT available_lte_original CHECK (available_quantity <= original_quantity)
);

-- Enable RLS
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Dealers can manage their own cars"
  ON cars
  FOR ALL
  TO authenticated
  USING (
    dealer_id IN (
      SELECT id FROM dealers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active cars"
  ON cars
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cars_dealer_id ON cars(dealer_id);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_wakala_price ON cars(wakala_price);
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at DESC);