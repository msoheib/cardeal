import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enrichRows, formatDuration, handleAdminError, requireAdmin } from '@/lib/server/admin-console'
import { RESOURCES } from '@/lib/admin-console/resources'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STALE_HOURS = 48

async function count(db: SupabaseClient, table: string, filters: Record<string, string | boolean> = {}, olderThan?: string) {
  let query = db.from(table).select('id', { count: 'exact', head: true })
  for (const [key, value] of Object.entries(filters)) query = query.eq(key, value)
  if (olderThan) query = query.lt('created_at', olderThan)
  const { count: n, error } = await query
  if (error) throw error
  return n ?? 0
}

export async function GET(req: NextRequest) {
  try {
    const { db } = await requireAdmin(req)
    const staleBefore = new Date(Date.now() - STALE_HOURS * 3600_000).toISOString()

    const [
      buyers, dealersUsers, admins,
      dealersVerified, dealersUnverified, applicationsPending,
      listingsActive, listingsHidden,
      bidsTotal, bidsUnpaid, bidsAwaitingDealer, bidsStale, bidsAccepted, bidsCancelled,
      dealsPending, dealsCompleted, dealsCancelled, dealsRefunded,
      ticketsOpen, ticketsReview,
      feesRes, responseRes, recentBids, recentDeals, recentTickets,
    ] = await Promise.all([
      count(db, 'users', { user_type: 'buyer' }),
      count(db, 'users', { user_type: 'dealer' }),
      count(db, 'users', { user_type: 'admin' }),
      count(db, 'dealers', { verified: true }),
      count(db, 'dealers', { verified: false }),
      count(db, 'dealer_applications', { status: 'pending' }),
      count(db, 'dealer_listings', { status: 'active' }),
      count(db, 'dealer_listings', { status: 'hidden' }),
      count(db, 'bids'),
      count(db, 'bids', { status: 'pending', commitment_fee_paid: false }),
      count(db, 'bids', { status: 'pending', commitment_fee_paid: true }),
      count(db, 'bids', { status: 'pending', commitment_fee_paid: true }, staleBefore),
      count(db, 'bids', { status: 'accepted' }),
      count(db, 'bids', { status: 'cancelled' }),
      count(db, 'deals', { status: 'pending_payment' }),
      count(db, 'deals', { status: 'completed' }),
      count(db, 'deals', { status: 'cancelled' }),
      count(db, 'deals', { status: 'refunded' }),
      count(db, 'support_tickets', { status: 'open' }),
      count(db, 'support_tickets', { status: 'under_review' }),
      db.from('commitment_fees').select('amount, status').limit(5000),
      db.from('deals').select('created_at, bid_id').not('bid_id', 'is', null).order('created_at', { ascending: false }).limit(300),
      db.from('bids').select('*').order('created_at', { ascending: false }).limit(10),
      db.from('deals').select('*').order('created_at', { ascending: false }).limit(10),
      db.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(5),
    ])

    const fees = (feesRes.data || []) as { amount: number | null; status: string }[]
    const feesPaid = fees.filter((f) => f.status === 'paid' || f.status === 'applied_to_purchase')
    const feesRefunded = fees.filter((f) => f.status === 'refunded')

    // Dealer response time: bid created → deal created, over the latest accepted bids.
    const responseDeals = (responseRes.data || []) as { created_at: string; bid_id: string }[]
    let avgResponse: number | null = null
    if (responseDeals.length > 0) {
      const { data: bidTimes } = await db.from('bids').select('id, created_at').in('id', responseDeals.map((d) => d.bid_id))
      const createdById = new Map((bidTimes || []).map((b: { id: string; created_at: string }) => [b.id, b.created_at]))
      const minutes = responseDeals
        .map((d) => {
          const start = createdById.get(d.bid_id)
          return start ? (new Date(d.created_at).getTime() - new Date(start).getTime()) / 60000 : NaN
        })
        .filter((m) => Number.isFinite(m) && m >= 0)
      if (minutes.length > 0) avgResponse = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length)
    }

    const [bidsRows, dealsRows, ticketRows] = await Promise.all([
      enrichRows(db, RESOURCES.bids, recentBids.data || []),
      enrichRows(db, RESOURCES.deals, recentDeals.data || []),
      enrichRows(db, RESOURCES.support_tickets, recentTickets.data || []),
    ])

    const activity = [
      ...bidsRows.map((r: any) => ({ id: r.id, resource: 'bids', at: r.created_at, title: `عرض ${r._buyer || ''} على ${r._vehicle || 'سيارة'}`, amount: r.bid_price, status: r.status, note: r._response })),
      ...dealsRows.map((r: any) => ({ id: r.id, resource: 'deals', at: r.created_at, title: `صفقة ${r._dealer || ''} مع ${r._buyer || ''}`, amount: r.final_price, status: r.status, note: r._vehicle })),
      ...ticketRows.map((r: any) => ({ id: r.id, resource: 'support_tickets', at: r.created_at, title: `تذكرة من ${r._buyer || 'مشتري'}`, amount: r.requested_refund_amount, status: r.status, note: r._dealer })),
    ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 15)

    return NextResponse.json({
      users: { buyers, dealers: dealersUsers, admins },
      dealers: { verified: dealersVerified, unverified: dealersUnverified, applicationsPending },
      listings: { active: listingsActive, hidden: listingsHidden },
      bids: {
        total: bidsTotal,
        unpaid: bidsUnpaid,
        awaitingDealer: bidsAwaitingDealer,
        stale: bidsStale,
        accepted: bidsAccepted,
        cancelled: bidsCancelled,
      },
      deals: { awaitingBuyer: dealsPending, completed: dealsCompleted, cancelled: dealsCancelled, refunded: dealsRefunded },
      tickets: { open: ticketsOpen, underReview: ticketsReview },
      fees: {
        paidCount: feesPaid.length,
        paidAmount: feesPaid.reduce((sum, f) => sum + Number(f.amount || 0), 0),
        refundedAmount: feesRefunded.reduce((sum, f) => sum + Number(f.amount || 0), 0),
      },
      avgDealerResponse: formatDuration(avgResponse),
      staleHours: STALE_HOURS,
      activity,
    })
  } catch (err) {
    return handleAdminError(err)
  }
}
