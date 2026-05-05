import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  COMMITMENT_FEE_HALALAS,
  validateMoyasarPayment
} from '../../lib/moyasar-validation.mjs'

const BID_ID = '11111111-1111-1111-1111-111111111111'
const CONFIG_ID = '22222222-2222-2222-2222-222222222222'

function paidPayment(overrides = {}) {
  return {
    id: 'pay_123',
    status: 'paid',
    amount: COMMITMENT_FEE_HALALAS,
    currency: 'SAR',
    metadata: {
      bid_id: BID_ID,
      car_configuration_id: CONFIG_ID,
      fee: 'commitment_fee'
    },
    ...overrides
  }
}

test('accepts a valid paid 500 SAR commitment-fee payment', () => {
  const result = validateMoyasarPayment(paidPayment(), {
    bidId: BID_ID,
    configId: CONFIG_ID
  })

  assert.equal(result.valid, true)
})

test('rejects client-chosen or wrong payment amounts', () => {
  const result = validateMoyasarPayment(paidPayment({ amount: 100 }), {
    bidId: BID_ID,
    configId: CONFIG_ID
  })

  assert.deepEqual(result, { valid: false, error: 'invalid_amount' })
})

test('rejects missing Moyasar metadata', () => {
  const result = validateMoyasarPayment(paidPayment({ metadata: {} }), {
    bidId: BID_ID,
    configId: CONFIG_ID
  })

  assert.deepEqual(result, { valid: false, error: 'missing_metadata' })
})

test('rejects mismatched bid metadata', () => {
  const result = validateMoyasarPayment(
    paidPayment({
      metadata: {
        bid_id: '33333333-3333-3333-3333-333333333333',
        car_configuration_id: CONFIG_ID,
        fee: 'commitment_fee'
      }
    }),
    { bidId: BID_ID, configId: CONFIG_ID }
  )

  assert.deepEqual(result, { valid: false, error: 'bid_metadata_mismatch' })
})

test('rejects mismatched car configuration metadata', () => {
  const result = validateMoyasarPayment(
    paidPayment({
      metadata: {
        bid_id: BID_ID,
        car_configuration_id: '44444444-4444-4444-4444-444444444444',
        fee: 'commitment_fee'
      }
    }),
    { bidId: BID_ID, configId: CONFIG_ID }
  )

  assert.deepEqual(result, { valid: false, error: 'config_metadata_mismatch' })
})

test('payment RPC guards reused payment references idempotently', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/20260505120000_security_hardening.sql', import.meta.url),
    'utf8'
  )

  assert.match(sql, /WHERE transaction_reference = p_payment_reference\s+FOR UPDATE/s)
  assert.match(sql, /payment_reference_used/)
  assert.match(sql, /already_processed/)
  assert.match(sql, /bid_already_paid/)
})
