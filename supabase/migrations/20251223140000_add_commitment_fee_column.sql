-- Add missing column to bids table
ALTER TABLE bids ADD COLUMN IF NOT EXISTS commitment_fee_amount numeric DEFAULT 500;
