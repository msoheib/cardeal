-- Migration: Add price_slots column to cars table
-- Allows dealers to define specific price levels for buyers to choose from

ALTER TABLE cars ADD COLUMN IF NOT EXISTS price_slots numeric[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN cars.price_slots IS 'Array of predefined price levels set by dealer for buyers to select from';
