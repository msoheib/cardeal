/*
  # accept_bids_group RPC

  Creates a stored procedure to accept up to p_qty bids for a car at a given
  bid price, mark those bids as accepted, insert corresponding deals, and
  decrement the car's available_quantity. No dependency on any `picked` table.
*/

DO $$
BEGIN
  -- If function exists with old signature, drop it
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'accept_bids_group'
  ) THEN
    DROP FUNCTION IF EXISTS accept_bids_group(p_car_id uuid, p_bid_price numeric, p_qty integer);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION accept_bids_group(p_car_id uuid, p_bid_price numeric, p_qty integer)
RETURNS SETOF deals
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_remaining integer := p_qty;
  v_bid RECORD;
  v_deal deals%ROWTYPE;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'p_qty must be > 0';
  END IF;

  -- Lock the car row to ensure consistent quantity updates
  PERFORM 1 FROM cars WHERE id = p_car_id FOR UPDATE;

  -- Check available quantity
  IF (SELECT available_quantity FROM cars WHERE id = p_car_id) <= 0 THEN
    RAISE EXCEPTION 'No available quantity for this car';
  END IF;

  FOR v_bid IN
    SELECT b.*
    FROM bids b
    WHERE b.car_id = p_car_id
      AND b.bid_price = p_bid_price
      AND b.status = 'pending'
    ORDER BY b.created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- Ensure we still have available cars
    IF (SELECT available_quantity FROM cars WHERE id = p_car_id) <= 0 THEN
      EXIT; -- no more inventory
    END IF;

    -- Mark bid as accepted
    UPDATE bids
    SET status = 'accepted', updated_at = now()
    WHERE id = v_bid.id;

    -- Insert deal
    INSERT INTO deals (
      car_id,
      dealer_id,
      buyer_id,
      bid_id,
      final_price,
      quantity,
      status,
      payment_due_date
    )
    SELECT
      v_bid.car_id,
      c.dealer_id,
      v_bid.buyer_id,
      v_bid.id,
      v_bid.bid_price,
      1,
      'pending_payment',
      now() + interval '7 days'
    FROM cars c
    WHERE c.id = v_bid.car_id
    RETURNING * INTO v_deal;

    -- Decrement available quantity
    UPDATE cars
    SET available_quantity = GREATEST(available_quantity - 1, 0), updated_at = now(),
        status = CASE WHEN available_quantity - 1 <= 0 THEN 'sold_out' ELSE status END
    WHERE id = p_car_id;

    v_remaining := v_remaining - 1;

    RETURN NEXT v_deal;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_bids_group(uuid, numeric, integer) TO authenticated;


