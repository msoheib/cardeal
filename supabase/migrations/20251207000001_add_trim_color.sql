-- Migration: Add trim and color to cars (preset by dealer)
-- Date: 2025-12-07

-- Add single trim and color to cars table (preset by dealer when adding car)
ALTER TABLE cars ADD COLUMN IF NOT EXISTS trim text;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS color text;

-- Drop the old array columns if they exist
ALTER TABLE cars DROP COLUMN IF EXISTS available_trims;
ALTER TABLE cars DROP COLUMN IF EXISTS available_colors;

-- Drop the old bid columns if they exist (trim/color now defined per car, not per bid)
ALTER TABLE bids DROP COLUMN IF EXISTS selected_trim;
ALTER TABLE bids DROP COLUMN IF EXISTS selected_color;

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_bids_car_price_trim_color;
