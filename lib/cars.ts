import { supabase, CarConfiguration, DealerInventory, Bid, BidAggregate } from './supabase'

// BUYER: Get generic configurations that are available (have inventory)
export const getAvailableConfigurations = async (filters: {
  make?: string
  model?: string
  yearFrom?: number
  yearTo?: number
  priceFrom?: number
  priceTo?: number
  search?: string
} = {}) => {
  // First find configs that have active inventory
  // Note: This is an optimization; ideally we'd join, but Supabase JS syntax for deep filtering on joins can be tricky.
  // Let's rely on the fact we want to show configs.
  
  let query = supabase
    .from('car_configurations')
    .select(`
      *,
      inventory:dealer_inventory(quantity, status)
    `)
    // Note: Filtering for configs with inventory is done client-side below 

  if (filters.make) query = query.eq('make', filters.make)
  if (filters.model) query = query.eq('model', filters.model)
  if (filters.yearFrom) query = query.gte('year', filters.yearFrom)
  if (filters.yearTo) query = query.lte('year', filters.yearTo)
  if (filters.priceFrom) query = query.gte('msrp', filters.priceFrom)
  if (filters.priceTo) query = query.lte('msrp', filters.priceTo)
  
  if (filters.search) {
     query = query.or(`make.ilike.%${filters.search}%,model.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return { data: [], error }

  // Client-side filter to ensure at least one inventory item is available/active
  // (Supabase "not is null" check above is basic existence)
  const availableConfigs = data?.filter((config: any) => {
    const validInventory = config.inventory?.some((inv: any) => inv.status === 'active' && inv.quantity > 0)
    return validInventory
  }) || []

  return { data: availableConfigs, error: null }
}

// DEALER: Get their specific inventory
export const getDealerInventory = async (dealerId: string) => {
  const { data, error } = await supabase
    .from('dealer_inventory')
    .select(`
      *,
      configuration:car_configurations(*)
    `)
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })

  return { data, error }
}

// SHARED: Get single config details
export const getConfigById = async (id: string) => {
  const { data, error } = await supabase
    .from('car_configurations')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

// SHARED: Get Bids for a config (Buyer history / Leaderboard)
export const getConfigBids = async (configId: string) => {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('car_configuration_id', configId)
    .order('created_at', { ascending: false })

  return { data, error }
}

// SHARED: Get Leaderboard
export const getBidLeaderboard = async (configId: string) => {
  // Can reuse existing logic or fetch raw bids
  const { data, error } = await supabase
    .from('bids')
    .select('bid_price, created_at')
    .eq('car_configuration_id', configId)
    .eq('status', 'accepted') // Only accepted deals usually show on "Sold" leaderboards, or all offers?
    .order('bid_price', { ascending: true }) // Best offers usually lowest if buyer wants cheap, but here auction is usually highest?
    // Wait, typical auction = Highest wins. But car sales might be "Low offer accepted"?
    // User said: "lowest ones, and also the most recent offers"
    // So assume Buyer wants lowest price.
    .limit(5)

  return { data, error }
}

// DEALER: Add to Inventory (Check Config -> Insert/Link)
export const addToInventory = async (params: {
  dealer_id: string
  make: string
  model: string
  year: number
  variant?: string
  trim?: string
  color?: string
  msrp: number
  description?: string
  images?: string[]
  quantity: number
  price_slots?: number[]
}, confirmNew: boolean = false) => {
  
  // 1. Check if config exists
  const { data: existingConfigs } = await supabase
    .from('car_configurations')
    .select('id')
    .eq('make', params.make)
    .eq('model', params.model)
    .eq('year', params.year)
    .eq('trim', params.trim || '')
    .eq('color', params.color || '') // Strict match on empty string if null
    .limit(1)

  const existingId = existingConfigs?.[0]?.id

  if (existingId) {
    // Config exists. Link it.
    const { data, error } = await supabase
      .from('dealer_inventory')
      .insert({
        dealer_id: params.dealer_id,
        car_configuration_id: existingId,
        quantity: params.quantity,
        status: 'active',
        price_slots: params.price_slots
      })
      .select()
      .single()
      
    if (error?.code === '23505') { // Unique violation
       return { status: 'exists_in_inventory', message: 'This car is already in your inventory.' }
    }
    return { data, error, status: 'linked' }
  }

  // 2. Config does not exist
  if (!confirmNew) {
    return { status: 'requires_confirmation', message: 'New configuration detected.' }
  }

  // 3. Create new config and link
  // Use a transaction-like flow (RPC would be better, but doing client-side for now)
  const { data: newConfig, error: configError } = await supabase
    .from('car_configurations')
    .insert({
      make: params.make,
      model: params.model,
      year: params.year,
      variant: params.variant,
      trim: params.trim,
      color: params.color,
      msrp: params.msrp,
      description: params.description,
      images: params.images || []
    })
    .select()
    .single()

  if (configError) return { data: null, error: configError }

  const { data: invData, error: invError } = await supabase
    .from('dealer_inventory')
    .insert({
      dealer_id: params.dealer_id,
      car_configuration_id: newConfig.id,
      quantity: params.quantity,
      status: 'active',
      price_slots: params.price_slots
    })
    .select()
    .single()

  return { data: invData, error: invError, status: 'created' }
}

// Helper to get unique makes (for dropdown)
export const getCarMakes = async () => {
    // This should ideally come from a separate 'makes' table or cached list
    // For now, distinct from configurations
    const { data, error } = await supabase
      .from('car_configurations')
      .select('make')
    
    if (data) {
      const uniqueMakes = Array.from(new Set(data.map(item => item.make))).sort()
      return { data: uniqueMakes, error: null }
    }
    return { data: [], error }
}

// SHARED: Place a Bid (Offer)
export const placeBid = async (params: {
  car_configuration_id: string
  buyer_id: string
  amount: number // Gross offer amount
}) => {
  const RESERVATION_FEE = 500
  const net_offer = params.amount - RESERVATION_FEE

  if (net_offer <= 0) {
    return { error: { message: 'Offer amount must be greater than reservation fee' } }
  }

  const { data, error } = await supabase
    .from('bids')
    .insert({
      car_configuration_id: params.car_configuration_id,
      buyer_id: params.buyer_id,
      bid_price: params.amount,         // Store gross amount
      net_offer_amount: net_offer,      // Store net amount for dealers
      status: 'pending',
      commitment_fee_paid: false,
      commitment_fee_amount: RESERVATION_FEE
    })
    .select()
    .single()

  return { data, error }
}

export const updateBidAggregates = async (configId: string) => {
  return { success: true }
}

export const getDealerOpportunities = async (dealerId: string) => {
  // 1. Get dealer's active inventory config IDs
  const { data: inventory } = await getDealerInventory(dealerId)
  if (!inventory || inventory.length === 0) return { data: [], error: null }

  // Filter for active inventory only
  const activeConfigIds = inventory
    .filter((item: any) => item.status === 'active' && item.quantity > 0)
    .map((item: any) => item.car_configuration_id)

  if (activeConfigIds.length === 0) return { data: [], error: null }

  // 2. Fetch pending bids for these configs
  // Note: Using !inner ensuring we only get bids for valid configs
  const { data, error } = await supabase
    .from('bids')
    .select(`
        *,
        configuration:car_configurations!inner(*)
    `)
    .in('car_configuration_id', activeConfigIds)
    .eq('status', 'pending')
    .eq('commitment_fee_paid', true)
    .order('bid_price', { ascending: false })

  return { data, error }
}