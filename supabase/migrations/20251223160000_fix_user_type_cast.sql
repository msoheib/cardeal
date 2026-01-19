-- Fix handle_new_user trigger to cast user_type to enum
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'user_type', 'buyer')::user_type
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
