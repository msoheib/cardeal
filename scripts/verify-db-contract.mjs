#!/usr/bin/env node

const enabled = process.env.VERIFY_REMOTE_DB_CONTRACT === '1'

if (!enabled) {
  console.log('Remote database contract check skipped (set VERIFY_REMOTE_DB_CONTRACT=1 to enforce).')
  process.exit(0)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceKey) {
  console.error('Remote database contract check requires the Supabase URL, anon key, and service-role key.')
  process.exit(1)
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  'Content-Type': 'application/json',
}
const serviceHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
}

async function request(path, body, privileged = false) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: privileged ? serviceHeaders : headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = { message: text } }
  return { response, payload }
}

function isMissingContract(result) {
  const code = result.payload?.code || ''
  const message = result.payload?.message || ''
  return code === 'PGRST202' || /schema cache|could not find the function|column .* does not exist/i.test(message)
}

const checks = [
  ['vehicle_listing_specs table', () => request('vehicle_listing_specs?select=id&limit=0', undefined, true)],
  ['dealer_listings table', () => request('dealer_listings?select=id&limit=0', undefined, true)],
  ['car_configurations.listing_spec_id', () => request('car_configurations?select=listing_spec_id&limit=0', undefined, true)],
  ['public listing search RPC', () => request('rpc/search_available_vehicle_listings', {})],
  ['dealer save RPC signature', () => request('rpc/save_dealer_listing', {
    p_listing_id: null,
    p_make: 'contract-check',
    p_model: 'contract-check',
    p_year: 2026,
    p_trim: 'contract-check',
    p_origin_locale: 'contract-check',
    p_variant: 'contract-check',
    p_agency_price: 1,
    p_colors: [{ color: 'contract-check', quantity: 1 }],
    p_description: null,
    p_images: [],
  }, true)],
  ['dealer archive RPC signature', () => request('rpc/archive_dealer_listing', { p_listing_id: '00000000-0000-0000-0000-000000000000' }, true)],
  ['dealer restore RPC signature', () => request('rpc/restore_dealer_listing', { p_listing_id: '00000000-0000-0000-0000-000000000000' }, true)],
]

let failed = false
for (const [name, run] of checks) {
  const result = await run()
  if (isMissingContract(result) || (name.includes('search') && !result.response.ok)) {
    failed = true
    console.error(`FAIL ${name}: ${result.response.status} ${result.payload?.code || ''} ${result.payload?.message || ''}`)
  } else {
    console.log(`PASS ${name}: HTTP ${result.response.status}`)
  }
}

if (failed) {
  console.error('Database contract verification failed. Do not promote this frontend build.')
  process.exit(1)
}

console.log('Database contract verification passed.')
