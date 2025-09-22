/*
  # Dealer Management System

  1. New Tables
    - `dealers`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `company_name` (text)
      - `commercial_registration` (text)
      - `verified` (boolean, default false)
      - `city` (text)
      - `contact_info` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `dealers` table
    - Dealers can read/update their own data
    - All users can view verified dealers
*/

CREATE TABLE IF NOT EXISTS dealers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  commercial_registration text UNIQUE NOT NULL,
  verified boolean DEFAULT false,
  city text NOT NULL,
  contact_info jsonb DEFAULT '{}',
  logo_url text,
  description text,
  rating decimal(3,2) DEFAULT 0.00,
  total_sales integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Dealers can view and update their own data"
  ON dealers
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view verified dealers"
  ON dealers
  FOR SELECT
  TO authenticated
  USING (verified = true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_dealers_user_id ON dealers(user_id);
CREATE INDEX IF NOT EXISTS idx_dealers_verified ON dealers(verified);
CREATE INDEX IF NOT EXISTS idx_dealers_city ON dealers(city);