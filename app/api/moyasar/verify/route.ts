import { NextRequest, NextResponse } from 'next/server'
import { updateBidAggregates } from '@/lib/cars'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import {
  COMMITMENT_FEE_CURRENCY,
  COMMITMENT_FEE_HALALAS,
  validateMoyasarPayment
} from '@/lib/moyasar-validation.mjs'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const moyasarId = searchParams.get('id') // Moyasar payment id from hosted form
    const bidId = searchParams.get('bid_id')
    const configId = searchParams.get('car_id') // We use car_id param for legacy compatibility but it holds config_id

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
    const validation = validateMoyasarPayment(payment, { bidId, configId })
    if (!validation.valid) {
      return NextResponse.redirect(new URL(`/cars/${configId}?pay=failed`, req.url))
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc('process_moyasar_commitment_fee', {
      p_bid_id: bidId,
      p_config_id: configId,
      p_payment_reference: moyasarId,
      p_paid_amount_halalas: COMMITMENT_FEE_HALALAS,
      p_currency: COMMITMENT_FEE_CURRENCY,
      p_gateway_response: payment
    })

    if (error || !data?.success) {
      return NextResponse.redirect(new URL(`/cars/${configId}?pay=error`, req.url))
    }

    await updateBidAggregates(configId)

    return NextResponse.redirect(new URL(`/cars/${configId}?pay=success`, req.url))
  } catch {
    return NextResponse.redirect(new URL(`/cars?pay=error`, req.url))
  }
}
