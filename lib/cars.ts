import { supabase, Car, Bid, BidAggregate } from './supabase'

export const getCars = async (filters: {
  make?: string
  model?: string
  yearFrom?: number
  yearTo?: number
  priceFrom?: number
  priceTo?: number
  city?: string
  featured?: boolean
  dealerId?: string
} = {}) => {
  let query = supabase
    .from('cars')
    .select(`
      *,
      dealer:dealers(*)
    `)
    .eq('status', 'active')

  if (filters.make) query = query.eq('make', filters.make)
  if (filters.model) query = query.eq('model', filters.model)
  if (filters.yearFrom) query = query.gte('year', filters.yearFrom)
  if (filters.yearTo) query = query.lte('year', filters.yearTo)
  if (filters.priceFrom) query = query.gte('wakala_price', filters.priceFrom)
  if (filters.priceTo) query = query.lte('wakala_price', filters.priceTo)
  if (filters.featured) query = query.eq('featured', true)
  if (filters.dealerId) query = query.eq('dealer_id', filters.dealerId)

  const { data, error } = await query.order('created_at', { ascending: false })

  return { data, error }
}

export const getCarById = async (id: string) => {
  const { data, error } = await supabase
    .from('cars')
    .select(`
      *,
      dealer:dealers(*)
    `)
    .eq('id', id)
    .single()

  return { data, error }
}

export const getCarBids = async (carId: string) => {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('car_id', carId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return { data, error }
}

export const getBidLeaderboard = async (carId: string) => {
  const { data, error } = await supabase
    .from('bid_aggregates')
    .select('*')
    .eq('car_id', carId)
    .order('bid_price', { ascending: false })
    .limit(5)

  return { data, error }
}

export const placeBid = async (carId: string, bidPrice: number, buyerId: string) => {
  // First check if car exists and get wakala price
  const { data: car, error: carError } = await getCarById(carId)
  if (carError || !car) {
    return { data: null, error: carError || 'Car not found' }
  }

  // Validate bid price
  if (bidPrice >= car.wakala_price) {
    return { data: null, error: 'Bid price must be less than Wakala price' }
  }

  if (car.min_bid_price && bidPrice < car.min_bid_price) {
    return { data: null, error: `Bid price must be at least ${car.min_bid_price} SAR` }
  }

  // Create or update bid
  const { data: existingBid } = await supabase
    .from('bids')
    .select('*')
    .eq('car_id', carId)
    .eq('buyer_id', buyerId)
    .single()

  let bidData, bidError

  if (existingBid) {
    // Update existing bid
    const { data, error } = await supabase
      .from('bids')
      .update({
        bid_price: bidPrice,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours from now
      })
      .eq('id', existingBid.id)
      .select()
      .single()
    
    bidData = data
    bidError = error
  } else {
    // Create new bid
    const { data, error } = await supabase
      .from('bids')
      .insert({
        car_id: carId,
        buyer_id: buyerId,
        bid_price: bidPrice
      })
      .select()
      .single()
    
    bidData = data
    bidError = error
  }

  // Update bid aggregates
  if (bidData && !bidError) {
    await updateBidAggregates(carId)
  }

  return { data: bidData, error: bidError }
}

export const updateBidAggregates = async (carId: string) => {
  // Get all pending bids for this car
  const { data: bids, error: bidsError } = await supabase
    .from('bids')
    .select('bid_price')
    .eq('car_id', carId)
    .eq('status', 'pending')

  if (bidsError || !bids) return

  // Aggregate by price
  const aggregates = bids.reduce((acc: any, bid) => {
    const price = bid.bid_price
    acc[price] = (acc[price] || 0) + 1
    return acc
  }, {})

  // Clear existing aggregates for this car
  await supabase
    .from('bid_aggregates')
    .delete()
    .eq('car_id', carId)

  // Insert new aggregates
  const aggregateRows = Object.entries(aggregates).map(([price, count]) => ({
    car_id: carId,
    bid_price: parseFloat(price),
    bid_count: count as number
  }))

  if (aggregateRows.length > 0) {
    await supabase
      .from('bid_aggregates')
      .insert(aggregateRows)
  }
}

export const getCarMakes = async () => {
  const { data, error } = await supabase
    .from('cars')
    .select('make')
    .eq('status', 'active')

  if (data) {
    const uniqueMakes = Array.from(new Set(data.map(item => item.make))).sort()
    return { data: uniqueMakes, error: null }
  }

  return { data: [], error }
}

export const getCarModels = async (make: string) => {
  const { data, error } = await supabase
    .from('cars')
    .select('model')
    .eq('make', make)
    .eq('status', 'active')

  if (data) {
    const uniqueModels = Array.from(new Set(data.map(item => item.model))).sort()
    return { data: uniqueModels, error: null }
  }

  return { data: [], error }
}