-- Fix handle_new_user trigger to properly handle user creation
-- The trigger was failing because full_name was NOT NULL but could be empty string

-- Drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to handle edge cases and errors gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Use UPSERT to avoid duplicate key errors
  -- Also ensure full_name has a default if not provided
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), 'New User'),
    COALESCE((new.raw_user_meta_data->>'user_type')::user_type, 'buyer'::user_type)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
    updated_at = now();
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'handle_new_user trigger failed: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
