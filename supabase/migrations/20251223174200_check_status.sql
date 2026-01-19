-- Check current status (this will show in migration log as NOTICE)
DO $$
DECLARE
  bid_rec RECORD;
  deal_rec RECORD;
BEGIN
  SELECT id, status, commitment_fee_paid INTO bid_rec FROM bids WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  RAISE NOTICE 'BID: id=%, status=%, fee_paid=%', bid_rec.id, bid_rec.status, bid_rec.commitment_fee_paid;
  
  SELECT id, status, final_price INTO deal_rec FROM deals WHERE bid_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  IF FOUND THEN
    RAISE NOTICE 'DEAL: id=%, status=%, price=%', deal_rec.id, deal_rec.status, deal_rec.final_price;
  ELSE
    RAISE NOTICE 'DEAL: Not found';
  END IF;
END $$;
