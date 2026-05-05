import { supabase } from './supabase'
import { toArabicError } from './arabic-errors'

export const acceptBid = async (bidId: string) => {
  const { data, error } = await supabase.rpc('accept_bid', {
    p_bid_id: bidId
  })
  
  if (error) return { data: null, error: toArabicError(error, 'تعذر قبول العرض') }
  if (data?.error) return { data: null, error: toArabicError(data.error, 'تعذر قبول العرض') }
  
  return { data, error: null }
}

export const approveReceivedOffer = async (dealId: string) => {
  const { data, error } = await supabase.rpc('approve_received_offer', {
    p_deal_id: dealId
  })

  if (error) return { data: null, error: toArabicError(error, 'تعذر تأكيد العرض') }
  if (data?.error) return { data: null, error: toArabicError(data.error, 'تعذر تأكيد العرض') }

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

  if (error || !data?.length) {
    return { data, error }
  }

  const dealerIds = Array.from(new Set(data.map((deal: any) => deal.dealer_id).filter(Boolean)))
  const { data: publicDealers } = dealerIds.length
    ? await supabase
        .from('dealer_public_profiles')
        .select('*')
        .in('id', dealerIds)
    : { data: [] }

  const dealerById = new Map((publicDealers || []).map((dealer: any) => [dealer.id, dealer]))
  const dealsWithPublicProfiles = data.map((deal: any) => ({
    ...deal,
    dealer_public: dealerById.get(deal.dealer_id) || null
  }))

  return { data: dealsWithPublicProfiles, error: null }
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
  return approveReceivedOffer(dealId)
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
