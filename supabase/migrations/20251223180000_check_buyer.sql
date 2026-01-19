-- Check current status (this will show in migration log as NOTICE)
DO $$
DECLARE
  buyer_rec RECORD;
BEGIN
  SELECT id, full_name, phone, email INTO buyer_rec FROM users WHERE id = '22222222-2222-2222-2222-222222222222';
  IF FOUND THEN
    RAISE NOTICE 'BUYER: id=%, name=%, phone=%, email=%', buyer_rec.id, buyer_rec.full_name, buyer_rec.phone, buyer_rec.email;
  ELSE
    RAISE NOTICE 'BUYER: Not found';
  END IF;
END $$;
