export const COMMITMENT_FEE_HALALAS = 50000
export const COMMITMENT_FEE_CURRENCY = 'SAR'

const readMetadata = (metadata, keys) => {
  if (!metadata || typeof metadata !== 'object') return ''

  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return ''
}

export function validateMoyasarPayment(payment, expected) {
  if (!payment || typeof payment !== 'object') {
    return { valid: false, error: 'missing_payment' }
  }

  if (payment.status !== 'paid') {
    return { valid: false, error: 'payment_not_paid' }
  }

  if (payment.currency !== COMMITMENT_FEE_CURRENCY) {
    return { valid: false, error: 'invalid_currency' }
  }

  if (payment.amount !== COMMITMENT_FEE_HALALAS) {
    return { valid: false, error: 'invalid_amount' }
  }

  const metadata = payment.metadata
  const metadataBidId = readMetadata(metadata, ['bid_id', 'bidId'])
  const metadataConfigId = readMetadata(metadata, ['car_configuration_id', 'config_id', 'car_id', 'carId'])
  const metadataFee = readMetadata(metadata, ['fee', 'payment_type', 'type'])

  if (!metadataBidId || !metadataConfigId) {
    return { valid: false, error: 'missing_metadata' }
  }

  if (metadataBidId !== expected.bidId) {
    return { valid: false, error: 'bid_metadata_mismatch' }
  }

  if (metadataConfigId !== expected.configId) {
    return { valid: false, error: 'config_metadata_mismatch' }
  }

  if (metadataFee && metadataFee !== 'commitment_fee') {
    return { valid: false, error: 'invalid_fee_metadata' }
  }

  return { valid: true, error: null }
}
