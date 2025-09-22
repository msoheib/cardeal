import { supabase, Deal, Bid } from './supabase'

export const acceptBids = async (carId: string, bidPrice: number, quantity: number, dealerId: string) => {
  try {
    // Get all pending bids at this price level
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select('*')
      .eq('car_id', carId)
      .eq('bid_price', bidPrice)
      .eq('status', 'pending')
      .eq('commitment_fee_paid', true)
      .limit(quantity)
      .order('created_at', { ascending: true })

    if (bidsError || !bids) {
      return { data: null, error: bidsError || 'No bids found' }
    }

    if (bids.length === 0) {
      return { data: null, error: 'No eligible bids found at this price level' }
    }

    const acceptedBids = bids.slice(0, quantity)
    
    // Create deals for accepted bids
    const deals = acceptedBids.map(bid => ({
      car_id: carId,
      dealer_id: dealerId,
      buyer_id: bid.buyer_id,
      bid_id: bid.id,
      final_price: bid.bid_price,
      quantity: 1,
      status: 'pending_payment' as const
    }))

    const { data: createdDeals, error: dealsError } = await supabase
      .from('deals')
      .insert(deals)
      .select()

    if (dealsError) {
      return { data: null, error: dealsError }
    }

    // Update bid statuses to accepted
    const { error: updateError } = await supabase
      .from('bids')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .in('id', acceptedBids.map(bid => bid.id))

    if (updateError) {
      return { data: null, error: updateError }
    }

    // Update car available quantity
    const { data: carData, error: carFetchError } = await supabase
      .from('cars')
      .select('available_quantity')
      .eq('id', carId)
      .single()

    if (carFetchError || !carData) {
      return { data: null, error: carFetchError || 'Car not found' }
    }

    const newAvailableQuantity = Math.max(
      0,
      (carData.available_quantity ?? 0) - acceptedBids.length
    )

    const { error: carUpdateError } = await supabase
      .from('cars')
      .update({
        available_quantity: newAvailableQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', carId)

    if (carUpdateError) {
      return { data: null, error: carUpdateError }
    }

    return { data: createdDeals, error: null }
  } catch (error) {
    return { data: null, error: 'Failed to accept bids' }
  }
}

export const getDealsByBuyer = async (buyerId: string) => {
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      car:cars(*),
      dealer:dealers(*)
    `)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const getDealsByDealer = async (dealerId: string) => {
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      car:cars(*),
      buyer:users(*)
    `)
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const completeDeal = async (dealId: string) => {
  const { data, error } = await supabase
    .from('deals')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', dealId)
    .select()
    .single()

  return { data, error }
}

export const refundCommitmentFee = async (bidId: string) => {
  const { data, error } = await supabase
    .from('commitment_fees')
    .update({ 
      status: 'refunded',
      processed_at: new Date().toISOString()
    })
    .eq('bid_id', bidId)
    .select()
    .single()

  return { data, error }
}

export const processCommitmentFee = async (bidId: string, paymentReference: string) => {
  // Update bid to mark commitment fee as paid
  const { error: bidError } = await supabase
    .from('bids')
    .update({ 
      commitment_fee_paid: true,
      payment_reference: paymentReference,
      updated_at: new Date().toISOString()
    })
    .eq('id', bidId)

  if (bidError) {
    return { data: null, error: bidError }
  }

  // Create commitment fee record
  const { data, error } = await supabase
    .from('commitment_fees')
    .insert({
      bid_id: bidId,
      buyer_id: (await supabase.from('bids').select('buyer_id').eq('id', bidId).single()).data?.buyer_id,
      amount: 500,
      status: 'paid',
      transaction_reference: paymentReference,
      processed_at: new Date().toISOString()
    })
    .select()
    .single()

  return { data, error }
}
