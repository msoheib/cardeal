-- One unpaid pending bid per buyer per car configuration.
-- The client reuses that bid (placeBid) instead of inserting a new one on retry;
-- this index enforces it. Paid, accepted, cancelled and expired bids are unaffected.

-- Cancel superseded duplicates first (keeps the newest), so the index can build.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY buyer_id, car_configuration_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM public.bids
  WHERE status = 'pending'
    AND commitment_fee_paid = false
)
UPDATE public.bids b
SET status = 'cancelled',
    updated_at = now()
FROM ranked r
WHERE b.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS bids_one_unpaid_pending_per_buyer_config
  ON public.bids (buyer_id, car_configuration_id)
  WHERE status = 'pending' AND commitment_fee_paid = false;
