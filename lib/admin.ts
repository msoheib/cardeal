import { supabase } from './supabase'

export const getAdminStats = async () => {
  try {
    // Get total users by type
    const { data: userStats } = await supabase
      .from('users')
      .select('user_type')

    const userCounts = userStats?.reduce((acc, user) => {
      acc[user.user_type] = (acc[user.user_type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Get total cars
    const { count: totalCars } = await supabase
      .from('cars')
      .select('*', { count: 'exact', head: true })

    // Get total active bids
    const { count: activeBids } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // Get total deals
    const { count: totalDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })

    // Get commitment fees stats
    const { data: feeStats } = await supabase
      .from('commitment_fees')
      .select('status, amount')

    const feesByStatus = feeStats?.reduce((acc, fee) => {
      acc[fee.status] = (acc[fee.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const totalFeesCollected = feeStats?.reduce((sum, fee) => sum + fee.amount, 0) || 0

    return {
      data: {
        users: userCounts,
        totalCars,
        activeBids,
        totalDeals,
        commitmentFees: feesByStatus,
        totalFeesCollected
      },
      error: null
    }
  } catch (error) {
    return { data: null, error: 'Failed to fetch admin stats' }
  }
}

export const getAllBids = async () => {
  const { data, error } = await supabase
    .from('bids')
    .select(`
      *,
      car:cars(make, model, year, wakala_price),
      buyer:users(full_name, email)
    `)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const getAllDeals = async () => {
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      car:cars(make, model, year),
      dealer:dealers(company_name),
      buyer:users(full_name, email)
    `)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const approveCar = async (carId: string) => {
  const { data, error } = await supabase
    .from('cars')
    .update({ status: 'active' })
    .eq('id', carId)
    .select()
    .single()

  return { data, error }
}

export const rejectCar = async (carId: string) => {
  const { data, error } = await supabase
    .from('cars')
    .update({ status: 'inactive' })
    .eq('id', carId)
    .select()
    .single()

  return { data, error }
}

export const getPendingCars = async () => {
  const { data, error } = await supabase
    .from('cars')
    .select(`
      *,
      dealer:dealers(company_name, verified)
    `)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })

  return { data, error }
}

export const generateSalesReport = async (startDate: string, endDate: string) => {
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      car:cars(make, model, wakala_price),
      dealer:dealers(company_name)
    `)
    .eq('status', 'completed')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .order('completed_at', { ascending: false })

  if (data) {
    const totalRevenue = data.reduce((sum, deal) => sum + deal.final_price, 0)
    const totalSavings = data.reduce((sum, deal) => {
      const car = deal.car as any
      return sum + (car.wakala_price - deal.final_price)
    }, 0)

    return {
      data: {
        deals: data,
        summary: {
          totalDeals: data.length,
          totalRevenue,
          totalSavings,
          averageDiscount: totalSavings / data.length || 0
        }
      },
      error: null
    }
  }

  return { data: null, error }
}