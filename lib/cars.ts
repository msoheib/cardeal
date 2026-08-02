import {
  supabase,
  AvailableCarConfiguration,
  DealerInventoryListing,
  DealerVehicleFormValue,
  VehicleMake,
  VehicleModel,
} from './supabase'
import { vehicleSearchTerms } from './arabic-display'

const searchableConfigFields = ['make', 'model', 'trim', 'color', 'origin_locale']

function sanitizeSearchTerm(term: string) {
  return term.replace(/[\\%,()|]/g, ' ').replace(/\s+/g, ' ').trim()
}

// BUYER: Get generic configurations that are available (have inventory)
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

  // The RPC aggregates dealer-owned price, stock, and images while keeping
  // dealer-specific rows out of the buyer response.
  const { data, error } = await supabase.rpc('search_available_configurations', {
    p_make: filters.make || null,
    p_origin_locale: filters.origin_locale || null,
    p_year_from: filters.yearFrom || null,
    p_year_to: filters.yearTo || null,
    p_price_from: filters.priceFrom || null,
    p_price_to: filters.priceTo || null,
    p_search: terms.join('|') || null,
  })

  if (!error) {
    return {
      data: ((data || []) as AvailableCarConfiguration[]).map((config) => ({
        ...config,
        images: config.representative_images?.length
          ? config.representative_images
          : config.images || [],
      })),
      error: null,
    }
  }

  // Migration-window fallback for environments where the RPC has not been
  // deployed yet. It still filters out hidden and out-of-stock inventory.
  const buildLegacyQuery = (inventoryFields: string) => supabase
    .from('car_configurations')
    .select(`*, inventory:dealer_inventory(${inventoryFields})`)

  let legacyQuery = buildLegacyQuery('agency_price, listing_images, quantity, status')

  if (filters.make) legacyQuery = legacyQuery.eq('make', filters.make)
  if (filters.model) legacyQuery = legacyQuery.eq('model', filters.model)
  if (filters.origin_locale) legacyQuery = legacyQuery.eq('origin_locale', filters.origin_locale)
  if (filters.yearFrom) legacyQuery = legacyQuery.gte('year', filters.yearFrom)
  if (filters.yearTo) legacyQuery = legacyQuery.lte('year', filters.yearTo)

  if (terms.length > 0) {
    legacyQuery = legacyQuery.or(
      terms
        .flatMap(term => searchableConfigFields.map(field => `${field}.ilike.%${term}%`))
        .join(','),
    )
  }

  let { data: legacyData, error: legacyError } = await legacyQuery.order('created_at', { ascending: false })
  if (legacyError && /agency_price|listing_images|column.*does not exist|schema cache/i.test(legacyError.message || '')) {
    legacyQuery = buildLegacyQuery('quantity, status')
    if (filters.make) legacyQuery = legacyQuery.eq('make', filters.make)
    if (filters.model) legacyQuery = legacyQuery.eq('model', filters.model)
    if (filters.origin_locale) legacyQuery = legacyQuery.eq('origin_locale', filters.origin_locale)
    if (filters.yearFrom) legacyQuery = legacyQuery.gte('year', filters.yearFrom)
    if (filters.yearTo) legacyQuery = legacyQuery.lte('year', filters.yearTo)
    if (terms.length > 0) {
      legacyQuery = legacyQuery.or(
        terms
          .flatMap(term => searchableConfigFields.map(field => `${field}.ilike.%${term}%`))
          .join(','),
      )
    }
    const fallback = await legacyQuery.order('created_at', { ascending: false })
    legacyData = fallback.data
    legacyError = fallback.error
  }
  if (legacyError) return { data: [], error }

  const availableConfigs = (legacyData || [])
    .map((config: any) => {
      const inventory = (config.inventory || []).filter(
        (item: any) => item.status === 'active' && item.quantity > 0,
      )
      const displayPrice = inventory.length
        ? Math.min(...inventory.map((item: any) => item.agency_price || config.msrp))
        : config.msrp
      const listingImages = inventory.find((item: any) => item.listing_images?.length)?.listing_images
      return {
        ...config,
        display_price: displayPrice,
        available_quantity: inventory.reduce((sum: number, item: any) => sum + item.quantity, 0),
        representative_images: listingImages || config.images || [],
        images: listingImages || config.images || [],
      }
    })
    .filter((config: any) => config.available_quantity > 0)
    .filter((config: any) => !filters.priceFrom || config.display_price >= filters.priceFrom)
    .filter((config: any) => !filters.priceTo || config.display_price <= filters.priceTo)

  return { data: availableConfigs as AvailableCarConfiguration[], error: null }
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

  return { data: (data || []) as DealerInventoryListing[], error }
}

export const getDealerInventoryItem = async (inventoryId: string) => {
  const { data, error } = await supabase
    .from('dealer_inventory')
    .select(`*, configuration:car_configurations(*)`)
    .eq('id', inventoryId)
    .single()

  return { data: data as DealerInventoryListing | null, error }
}

type DealerInventorySaveInput = DealerVehicleFormValue & { inventoryId?: string | null }

export const saveDealerInventoryListing = async (input: DealerInventorySaveInput) => {
  const { data, error } = await supabase.rpc('save_dealer_inventory_listing', {
    p_inventory_id: input.inventoryId || null,
    p_make: input.make,
    p_model: input.model,
    p_year: input.year,
    p_trim: input.trim,
    p_color: input.color,
    p_origin_locale: input.origin_locale,
    p_variant: input.variant,
    p_agency_price: input.agencyPrice,
    p_quantity: input.quantity,
    p_description: input.description || null,
    p_images: input.images || [],
  })

  if (error) return { data: null, error, status: 'error' as const }

  const result = (data || {}) as { success?: boolean; error?: string; status?: string; inventory_id?: string }
  if (!result.success) {
    return {
      data: null,
      error: { message: result.error || 'تعذر حفظ الإعلان.' },
      status: 'error' as const,
    }
  }

  return { data: result, error: null, status: input.inventoryId ? 'updated' as const : 'created' as const }
}

export const archiveDealerInventoryListing = async (inventoryId: string) => {
  const { data, error } = await supabase.rpc('archive_dealer_inventory_listing', {
    p_inventory_id: inventoryId,
  })
  if (error) return { data: null, error }
  const result = (data || {}) as { success?: boolean; error?: string }
  return result.success
    ? { data: result, error: null }
    : { data: null, error: { message: result.error || 'تعذر إخفاء الإعلان.' } }
}

export const restoreDealerInventoryListing = async (inventoryId: string) => {
  const { data, error } = await supabase.rpc('restore_dealer_inventory_listing', {
    p_inventory_id: inventoryId,
  })
  if (error) return { data: null, error }
  const result = (data || {}) as { success?: boolean; error?: string }
  return result.success
    ? { data: result, error: null }
    : { data: null, error: { message: result.error || 'تعذر استعادة الإعلان.' } }
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
    color: params.color || '',
    origin_locale: params.origin_locale || '',
    variant: params.variant || '',
    agencyPrice: params.msrp,
    description: params.description || '',
    images: params.images || [],
    quantity: params.quantity,
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
