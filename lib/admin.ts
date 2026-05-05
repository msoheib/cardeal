import { supabase } from './supabase'
import { toArabicError } from './arabic-errors'

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

    const { count: pendingDealerApplications } = await supabase
      .from('dealer_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: openSupportTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'under_review'])

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
        totalFeesCollected,
        pendingDealerApplications,
        openSupportTickets
      },
      error: null
    }
  } catch {
    return { data: null, error: 'تعذر تحميل إحصاءات الإدارة' }
  }
}

export const getAllBids = async () => {
  const { data, error } = await supabase
    .from('bids')
    .select(`
      *,
      configuration:car_configurations(make, model, year, msrp),
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
      configuration:car_configurations(make, model, year),
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
      configuration:car_configurations(make, model, msrp),
      dealer:dealers(company_name)
    `)
    .eq('status', 'completed')
    .gte('completed_at', startDate)
    .lte('completed_at', endDate)
    .order('completed_at', { ascending: false })

  if (data) {
    const totalRevenue = data.reduce((sum, deal) => sum + deal.final_price, 0)
    const totalSavings = data.reduce((sum, deal) => {
      const configuration = deal.configuration as any
      return sum + ((configuration?.msrp || 0) - deal.final_price)
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

export const getDealerApplications = async () => {
  const { data, error } = await supabase
    .from('dealer_applications')
    .select(`
      *,
      user:users(full_name, email, phone)
    `)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const approveDealerApplication = async (applicationId: string) => {
  const { data, error } = await supabase.rpc('approve_dealer_application', {
    p_application_id: applicationId
  })

  if (error) return { data: null, error: toArabicError(error, 'تعذر اعتماد طلب التاجر') }
  if (data?.error) return { data: null, error: toArabicError(data.error, 'تعذر اعتماد طلب التاجر') }

  return { data, error: null }
}

export const rejectDealerApplication = async (applicationId: string, reason = '') => {
  const { data, error } = await supabase.rpc('reject_dealer_application', {
    p_application_id: applicationId,
    p_rejection_reason: reason
  })

  if (error) return { data: null, error: toArabicError(error, 'تعذر رفض طلب التاجر') }
  if (data?.error) return { data: null, error: toArabicError(data.error, 'تعذر رفض طلب التاجر') }

  return { data, error: null }
}
