import { supabase, Deal, Bid } from './supabase'

export const acceptBid = async (bidId: string, dealerId: string) => {
  const { data, error } = await supabase.rpc('accept_bid', {
    p_bid_id: bidId,
    p_dealer_id: dealerId
  })
  
  if (error) return { data: null, error: error.message }
  if (data?.error) return { data: null, error: data.error }
  
  return { data, error: null }
}

export const acceptBids = async (carId: string, bidPrice: number, quantity: number, dealerId: string) => {
  try {
    const { data, error } = await supabase.rpc('accept_bids_group', {
      p_car_id: carId,
      p_bid_price: bidPrice,
      p_qty: quantity
    })
    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error?.message || 'Failed to accept bids' }
  }
}

export const getDealsByBuyer = async (buyerId: string) => {
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      configuration:car_configurations(*),
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
      configuration:car_configurations(*),
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
