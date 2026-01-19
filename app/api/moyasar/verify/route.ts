import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateBidAggregates } from '@/lib/cars'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const moyasarId = searchParams.get('id') // Moyasar payment id from hosted form
    const bidId = searchParams.get('bid_id')
    const configId = searchParams.get('car_id') // We use car_id param for legacy compatibility but it holds config_id
    const amount = searchParams.get('amount')

    // Basic guards
    if (!bidId || !configId) {
      return NextResponse.redirect(new URL(`/cars/${configId || ''}?pay=error`, req.url))
    }

    // Must have a Moyasar payment id
    if (!moyasarId) {
      return NextResponse.redirect(new URL(`/cars/${configId}?pay=failed`, req.url))
    }

    // Verify with Moyasar server-to-server using Secret Key
    const secretKey = process.env.MOYASAR_SECRET_KEY
    if (!secretKey) {
      return NextResponse.redirect(new URL(`/cars/${configId}?pay=error`, req.url))
    }

    const verifyRes = await fetch(`https://api.moyasar.com/v1/payments/${encodeURIComponent(moyasarId)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Accept': 'application/json'
      }
    })

    if (!verifyRes.ok) {
      return NextResponse.redirect(new URL(`/cars/${configId}?pay=failed`, req.url))
    }

    const payment = await verifyRes.json() as any
    const status = payment?.status
    const paidAmount = payment?.amount
    const currency = payment?.currency

    const expectedAmount = Number(amount) || 50000 // 500.00 SAR
    const isValid = status === 'paid' && currency === 'SAR' && paidAmount === expectedAmount
    if (!isValid) {
      return NextResponse.redirect(new URL(`/cars/${configId}?pay=failed`, req.url))
    }

    // Mark bid as paid and insert fee record
    const paymentReference = moyasarId

    // Update Bid: Status -> 'pending' (Waiting for dealer acceptance), Fee Paid -> true
    const { error: bidError } = await supabase
      .from('bids')
      .update({ 
        commitment_fee_paid: true, 
        status: 'pending', 
        payment_reference: paymentReference, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', bidId)

    if (bidError) {
      return NextResponse.redirect(new URL(`/cars/${configId}?pay=error`, req.url))
    }

    const paidAmountSar = paidAmount / 100

    const { data: bidRow } = await supabase.from('bids').select('buyer_id').eq('id', bidId).single()

    const { error: feeError } = await supabase
      .from('commitment_fees')
      .insert({
        bid_id: bidId,
        buyer_id: bidRow?.buyer_id,
        amount: paidAmountSar,
        status: 'paid',
        transaction_reference: paymentReference,
        processed_at: new Date().toISOString(),
        gateway_response: payment
      })

    // Update aggregates (but NOT auto-accept - FCFS means dealers race to accept)
    if (!feeError && configId) {
      await updateBidAggregates(configId)
      // NOTE: process_fcfs_deposit removed - dealers must manually accept bids
    }

    return NextResponse.redirect(new URL(`/cars/${configId}?pay=success`, req.url))
  } catch (e) {
    return NextResponse.redirect(new URL(`/cars?pay=error`, req.url))
  }
}




