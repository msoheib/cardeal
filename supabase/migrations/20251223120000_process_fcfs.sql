-- New RPC function for FCFS logic
CREATE OR REPLACE FUNCTION process_fcfs_deposit(p_bid_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bid RECORD;
    v_dealer_id UUID;
    v_deal_id UUID;
BEGIN
    -- 1. Get Bid Details
    SELECT * INTO v_bid FROM bids WHERE id = p_bid_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bid not found');
    END IF;

    -- 2. Check if already processed
    IF v_bid.status = 'accepted' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already processed');
    END IF;

    -- 3. Find a dealer with inventory for this configuration
    SELECT dealer_id INTO v_dealer_id
    FROM dealer_inventory
    WHERE car_configuration_id = v_bid.car_configuration_id
      AND status = 'active'
      AND quantity > 0
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_dealer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Out of stock');
    END IF;

    -- 4. Create Deal
    INSERT INTO deals (
        car_configuration_id,
        dealer_id,
        buyer_id,
        bid_id,
        final_price,
        status,
        created_at
    ) VALUES (
        v_bid.car_configuration_id,
        v_dealer_id,
        v_bid.buyer_id,
        p_bid_id,
        v_bid.bid_price,
        'pending_payment',
        now()
    ) RETURNING id INTO v_deal_id;

    -- 5. Update Bid
    UPDATE bids
    SET status = 'accepted',
        updated_at = now()
    WHERE id = p_bid_id;

    -- 6. Decrement Inventory
    UPDATE dealer_inventory
    SET quantity = quantity - 1,
        updated_at = now()
    WHERE dealer_id = v_dealer_id AND car_configuration_id = v_bid.car_configuration_id;

    RETURN jsonb_build_object('success', true, 'deal_id', v_deal_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
