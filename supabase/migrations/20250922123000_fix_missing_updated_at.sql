/* Ensure updated_at columns exist and have sane defaults */

DO $$ BEGIN
  -- bids.updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bids' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.bids ADD COLUMN updated_at timestamptz;
    UPDATE public.bids SET updated_at = now() WHERE updated_at IS NULL;
  END IF;
  ALTER TABLE public.bids ALTER COLUMN updated_at SET DEFAULT now();

  -- cars.updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cars' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.cars ADD COLUMN updated_at timestamptz;
    UPDATE public.cars SET updated_at = now() WHERE updated_at IS NULL;
  END IF;
  ALTER TABLE public.cars ALTER COLUMN updated_at SET DEFAULT now();
END $$;


