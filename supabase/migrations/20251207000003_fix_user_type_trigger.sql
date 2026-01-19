-- Migration: Fix handle_new_user trigger to include user_type from metadata
-- Date: 2025-12-07
-- Issue: When users sign up as 'dealer', the user_type was not being saved

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'user_type', 'buyer')
  );
  RETURN new;
END;
$$;
