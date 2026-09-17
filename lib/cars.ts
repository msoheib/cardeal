import {
  supabase,
  AvailableVehicleListing,
  DealerListing,
  DealerVehicleFormValue,
  VehicleMake,
  VehicleModel,
} from './supabase'
import { vehicleSearchTerms } from './arabic-display'

function sanitizeSearchTerm(term: string) {
  return term.replace(/[\\%,()|]/g, ' ').replace(/\s+/g, ' ').trim()
}

// BUYER: Get color-neutral vehicle listings that have available dealer stock.
export const getAvailableConfigurations = async (filters: {
  make?: string
  model?: string
  origin_locale?: string
  yearFrom?: number
  yearTo?: number
  priceFrom?: number
  priceTo?: number
  search?: string
} = {}) => {
  const terms = filters.search
    ? vehicleSearchTerms(filters.search)
        .map(sanitizeSearchTerm)
        .filter(Boolean)
        .slice(0, 12)
    : []

  const { data, error } = await supabase.rpc('search_available_vehicle_listings', {
    p_make: filters.make || null,
    p_origin_locale: filters.origin_locale || null,
    p_year_from: filters.yearFrom || null,
    p_year_to: filters.yearTo || null,
    p_price_from: filters.priceFrom || null,
    p_price_to: filters.priceTo || null,
    p_search: terms.join('|') || null,
    p_listing_id: null,
  })

  if (error) {
    console.error('vehicle_listing_search_failed', { code: error.code, message: error.message })
    return { data: [] as AvailableVehicleListing[], error }
  }

  return {
    data: ((data || []) as AvailableVehicleListing[]).map((listing) => ({
      ...listing,
      colors: listing.colors || [],
      images: listing.representative_images || [],
    })),
    error: null,
  }
}

// DEALER: Get logical listings with their per-color inventory rows.
export const getDealerInventory = async (dealerId: string) => {
  const { data, error } = await supabase
    .from('dealer_listings')
    .select(`
      *,
      specification:vehicle_listing_specs(*),
      inventory:dealer_inventory(*, configuration:car_configurations(*))
    `)
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })

  return { data: (data || []) as DealerListing[], error }
}

export const getDealerInventoryItem = async (listingId: string) => {
  const { data, error } = await supabase
    .from('dealer_listings')
    .select(`*, specification:vehicle_listing_specs(*), inventory:dealer_inventory(*, configuration:car_configurations(*))`)
    .eq('id', listingId)
    .single()

  return { data: data as DealerListing | null, error }
}

type DealerInventorySaveInput = DealerVehicleFormValue & { inventoryId?: string | null }

export const saveDealerInventoryListing = async (input: DealerInventorySaveInput) => {
  const { data, error } = await supabase.rpc('save_dealer_listing', {
    p_listing_id: input.inventoryId || null,
    p_make: input.make,
    p_model: input.model,
    p_year: input.year,
    p_trim: input.trim,
    p_origin_locale: input.origin_locale,
    p_variant: input.variant,
    p_agency_price: input.agencyPrice,
    p_colors: input.colors,
    p_description: input.description || null,
    p_images: input.images || [],
  })

  if (error) return { data: null, error, status: 'error' as const }

  const result = (data || {}) as { success?: boolean; error?: string; status?: string; listing_id?: string }
  if (!result.success) {
    return {
      data: null,
      error: { message: result.error || 'تعذر حفظ الإعلان.' },
      status: 'error' as const,
    }
  }

  return { data: result, error: null, status: input.inventoryId ? 'updated' as const : 'created' as const }
}

export const archiveDealerInventoryListing = async (listingId: string) => {
  const { data, error } = await supabase.rpc('archive_dealer_listing', {
    p_listing_id: listingId,
  })
  if (error) return { data: null, error }
  const result = (data || {}) as { success?: boolean; error?: string }
  return result.success
    ? { data: result, error: null }
    : { data: null, error: { message: result.error || 'تعذر إخفاء الإعلان.' } }
}

export const restoreDealerInventoryListing = async (listingId: string) => {
  const { data, error } = await supabase.rpc('restore_dealer_listing', {
    p_listing_id: listingId,
  })
  if (error) return { data: null, error }
  const result = (data || {}) as { success?: boolean; error?: string }
  return result.success
    ? { data: result, error: null }
    : { data: null, error: { message: result.error || 'تعذر استعادة الإعلان.' } }
}

export const getAvailableListingById = async (id: string) => {
  const searchById = async (listingSpecId: string) => {
    const { data, error } = await supabase.rpc('search_available_vehicle_listings', {
      p_listing_id: listingSpecId,
      p_make: null,
      p_origin_locale: null,
      p_year_from: null,
      p_year_to: null,
      p_price_from: null,
      p_price_to: null,
      p_search: null,
    })
    return { data: ((data || []) as AvailableVehicleListing[])[0] || null, error }
  }

  const direct = await searchById(id)
  if (direct.error) return { data: null, error: direct.error, canonicalId: null as string | null }
  if (direct.data) return { data: { ...direct.data, images: direct.data.representative_images || [], colors: direct.data.colors || [] }, error: null, canonicalId: direct.data.id }

  const { data: legacyConfiguration, error: legacyError } = await supabase
    .from('car_configurations')
    .select('listing_spec_id')
    .eq('id', id)
    .maybeSingle()
  if (legacyError) return { data: null, error: legacyError, canonicalId: null as string | null }

  const canonicalId = legacyConfiguration?.listing_spec_id || null
  if (!canonicalId) return { data: null, error: null, canonicalId: null }
  const canonical = await searchById(canonicalId)
  return { data: canonical.data ? { ...canonical.data, images: canonical.data.representative_images || [], colors: canonical.data.colors || [] } : null, error: canonical.error, canonicalId }
}

export const getListingBids = async (configurationIds: string[]) => {
  if (configurationIds.length === 0) return { data: [], error: null }
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .in('car_configuration_id', configurationIds)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
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
export const getBidLeaderboard = async (carId: string) => {
  const { data, error } = await supabase
    .from('bid_aggregates')
    .select('id, car_id, bid_price, bid_count, last_updated')
    .eq('car_id', carId)
    .order('bid_count', { ascending: false })
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
  origin_locale?: string
  msrp: number
  description?: string
  images?: string[]
  quantity: number
  price_slots?: number[]
}, confirmNew: boolean = false) => {
  void confirmNew
  return saveDealerInventoryListing({
    make: params.make,
    model: params.model,
    year: params.year,
    trim: params.trim || '',
    origin_locale: params.origin_locale || '',
    variant: params.variant || '',
    agencyPrice: params.msrp,
    description: params.description || '',
    images: params.images || [],
    colors: [{ color: params.color || '', quantity: params.quantity }],
  })
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

export const getCarOrigins = async () => {
    const { data, error } = await supabase
      .from('car_configurations')
      .select('*')

    if (error && (
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      /origin_locale|column/i.test(error.message)
    )) {
      return { data: [], error: null }
    }

    if (data) {
      const uniqueOrigins = Array.from(
        new Set(data.map(item => (item as any).origin_locale).filter(Boolean))
      ).sort()
      return { data: uniqueOrigins, error: null }
    }
    return { data: [], error }
}

export const getVehicleMakes = async () => {
  const { data, error } = await supabase
    .from('vehicle_makes')
    .select('id, slug, name_ar, name_en, origin_country, classification, notes, source_sheets, active, created_at, updated_at')
    .eq('active', true)
    .order('name_ar', { ascending: true })

  return { data: (data || []) as VehicleMake[], error }
}

export const getVehicleModels = async (makeId: string) => {
  if (!makeId) return { data: [] as VehicleModel[], error: null }

  const { data, error } = await supabase
    .from('vehicle_models')
    .select('id, make_id, slug, name_ar, name_en, source_sheets, active, created_at, updated_at')
    .eq('make_id', makeId)
    .eq('active', true)
    .order('name_ar', { ascending: true, nullsFirst: false })
    .order('name_en', { ascending: true })

  return { data: (data || []) as VehicleModel[], error }
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
    return { error: { message: 'يجب أن يكون مبلغ العرض أعلى من رسوم الالتزام' } }
  }

  // Reuse the buyer's unpaid pending bid for this configuration so retries
  // don't pile up orphan bids; the buyer just resumes payment on it.
  const { data: unpaidBid, error: lookupError } = await supabase
    .from('bids')
    .select('id')
    .eq('buyer_id', params.buyer_id)
    .eq('car_configuration_id', params.car_configuration_id)
    .eq('status', 'pending')
    .eq('commitment_fee_paid', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lookupError) return { data: null, error: lookupError }

  if (unpaidBid) {
    const { data, error } = await supabase
      .from('bids')
      .update({
        bid_price: params.amount,
        net_offer_amount: net_offer,
        updated_at: new Date().toISOString()
      })
      .eq('id', unpaidBid.id)
      .select()
      .single()

    return { data, error }
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

export const updateBidAggregates = async (_configId: string) => {
  void _configId
  return { success: true }
}

export const getDealerOpportunities = async (dealerId: string) => {
  // 1. Get dealer's active inventory config IDs
  const { data: inventory } = await getDealerInventory(dealerId)
  if (!inventory || inventory.length === 0) return { data: [], error: null }

  // Filter for active inventory only
  const activeConfigIds = Array.from(new Set(
    inventory
      .filter((listing) => listing.status === 'active')
      .flatMap((listing) => listing.inventory)
      .filter((item) => item.status === 'active' && item.quantity > 0)
      .map((item) => item.car_configuration_id),
  ))

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
