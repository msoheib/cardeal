/*
  # Bidding and Fee Management System (tables)

  This migration now creates the enums, tables, and indexes required for the
  bidding / deals workflow. Row Level Security enabling and policies were moved
  to a follow-up migration so the schema can be created even if policies fail.
*/

DO $$
BEGIN
  CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE fee_status AS ENUM ('pending', 'paid', 'refunded', 'applied_to_purchase');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE deal_status AS ENUM ('pending_payment', 'completed', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid REFERENCES cars(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  bid_price decimal(12,2) NOT NULL CHECK (bid_price > 0),
  status bid_status DEFAULT 'pending',
  commitment_fee_paid boolean DEFAULT false,
  payment_reference text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '48 hours'),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(car_id, buyer_id)
);

-- Commitment fees table
CREATE TABLE IF NOT EXISTS commitment_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id uuid REFERENCES bids(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  amount decimal(8,2) DEFAULT 500.00 CHECK (amount > 0),
  status fee_status DEFAULT 'pending',
  payment_method text,
  transaction_reference text UNIQUE,
  gateway_response jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Bid aggregates for leaderboard performance
CREATE TABLE IF NOT EXISTS bid_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid REFERENCES cars(id) ON DELETE CASCADE,
  bid_price decimal(12,2) NOT NULL,
  bid_count integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(car_id, bid_price)
);

-- Deals table for accepted bids
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid REFERENCES cars(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  bid_id uuid REFERENCES bids(id) ON DELETE CASCADE,
  final_price decimal(12,2) NOT NULL,
  quantity integer DEFAULT 1,
  status deal_status DEFAULT 'pending_payment',
  payment_due_date timestamptz DEFAULT (now() + interval '7 days'),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bids_car_id ON bids(car_id);
CREATE INDEX IF NOT EXISTS idx_bids_buyer_id ON bids(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_expires_at ON bids(expires_at);
CREATE INDEX IF NOT EXISTS idx_bid_aggregates_car_id ON bid_aggregates(car_id);
CREATE INDEX IF NOT EXISTS idx_commitment_fees_buyer_id ON commitment_fees(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_buyer_id ON deals(buyer_id);
CREATE INDEX IF NOT EXISTS idx_deals_dealer_id ON deals(dealer_id);
