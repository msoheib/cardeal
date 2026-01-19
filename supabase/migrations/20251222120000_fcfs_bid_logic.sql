-- Function to accept a bid (FCFS)
CREATE OR REPLACE FUNCTION accept_bid(
  p_bid_id uuid,
  p_dealer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bid RECORD;
  v_config_id uuid;
  v_qty integer;
  v_deal_id uuid;
BEGIN
  -- 1. Get Bid Details & Lock ROW
  SELECT * INTO v_bid
  FROM bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid not found');
  END IF;

  -- 2. Validate Bid Status
  IF v_bid.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid is not pending');
  END IF;

  IF NOT v_bid.commitment_fee_paid THEN
     RETURN jsonb_build_object('success', false, 'error', 'Commitment fee not paid');
  END IF;

  v_config_id := v_bid.car_configuration_id;
  
  -- 3. Check Inventory
  SELECT quantity INTO v_qty
  FROM dealer_inventory
  WHERE dealer_id = p_dealer_id AND car_configuration_id = v_config_id
  FOR UPDATE;

  IF v_qty IS NULL OR v_qty <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No inventory available');
  END IF;

  -- 4. Create Deal (Make car_id nullable if needed, but for now assuming we use config_id mostly)
  -- Note: We might need to ensure deals table accommodates null car_id
  -- We'll try to insert using car_configuration_id. 
  
  INSERT INTO deals (
    car_configuration_id,
    dealer_id,
    buyer_id,
    bid_id,
    final_price,
    status,
    created_at
  ) VALUES (
    v_config_id,
    p_dealer_id,
    v_bid.buyer_id,
    p_bid_id,
    v_bid.bid_price,
    'pending_payment',
    now()
  ) RETURNING id INTO v_deal_id;

  -- 5. Update Bid Status
  UPDATE bids
  SET status = 'accepted',
      updated_at = now()
  WHERE id = p_bid_id;

  -- 6. Decrement Inventory
  UPDATE dealer_inventory
  SET quantity = quantity - 1,
      updated_at = now()
  WHERE dealer_id = p_dealer_id AND car_configuration_id = v_config_id;

  RETURN jsonb_build_object('success', true, 'deal_id', v_deal_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Ensure deals.car_id is nullable if it isn't already (safe to run)
ALTER TABLE deals ALTER COLUMN car_id DROP NOT NULL;
