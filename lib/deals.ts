import { supabase } from './supabase'

export const acceptBid = async (bidId: string) => {
  const { data, error } = await supabase.rpc('accept_bid', {
    p_bid_id: bidId
  })
  
  if (error) return { data: null, error: error.message }
  if (data?.error) return { data: null, error: data.error }
  
  return { data, error: null }
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
