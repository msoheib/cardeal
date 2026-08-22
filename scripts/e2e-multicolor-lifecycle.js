#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

for (const file of ['.env', '.env.local', '.env.vercel.local']) loadEnv(path.join(process.cwd(), file))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.E2E_TEST_PASSWORD
const runId = (process.env.E2E_RUN_ID || 'AUGFIX').replace(/[^0-9A-Za-z_-]/g, '')
const domain = process.env.E2E_EMAIL_DOMAIN || 'cardeal.test'
const email = `e2e-dealer-${runId}@${domain}`

if (!url || !anonKey || !serviceKey || !password) {
  console.error('Missing Supabase credentials or E2E_TEST_PASSWORD.')
  process.exit(1)
}

const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const identity = {
  make: 'Toyota',
  model: `AUGFIX-${runId}`,
  year: 2026,
  trim: 'GLE',
  origin: 'سعودي',
  variant: `E2E-${runId}-multicolor`,
}

async function rpc(name, args) {
  const { data, error } = await client.rpc(name, args)
  if (error) throw new Error(`${name}: ${error.code || ''} ${error.message}`)
  if (!data?.success) throw new Error(`${name}: ${data?.error || 'unknown failure'}`)
  return data
}

async function search(listingId) {
  const { data, error } = await client.rpc('search_available_vehicle_listings', {
    p_listing_id: listingId,
    p_make: null,
    p_origin_locale: null,
    p_year_from: null,
    p_year_to: null,
    p_price_from: null,
    p_price_to: null,
    p_search: null,
  })
  if (error) throw error
  return data || []
}

async function main() {
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`dealer sign-in: ${signInError.message}`)

  let listingId = null
  let specId = null
  let configIds = []
  try {
    const created = await rpc('save_dealer_listing', {
      p_listing_id: null,
      p_make: identity.make,
      p_model: identity.model,
      p_year: identity.year,
      p_trim: identity.trim,
      p_origin_locale: identity.origin,
      p_variant: identity.variant,
      p_agency_price: 125000,
      p_colors: [
        { color: 'أبيض لؤلؤي', quantity: 2 },
        { color: 'أسود', quantity: 3 },
        { color: 'أبيض / أسود', quantity: 1 },
      ],
      p_description: `E2E-${runId} multi-color lifecycle`,
      p_images: [],
    })
    listingId = created.listing_id
    specId = created.listing_spec_id
    if (!specId) {
      const { data: parent, error: parentError } = await admin.from('dealer_listings').select('listing_spec_id').eq('id', listingId).single()
      if (parentError) throw parentError
      specId = parent.listing_spec_id
    }

    const afterCreate = await search(specId)
    if (afterCreate.length !== 1 || afterCreate[0].available_quantity !== 6 || afterCreate[0].colors.length !== 3) {
      throw new Error(`public aggregate after create is incorrect: ${JSON.stringify(afterCreate)}`)
    }

    const updated = await rpc('save_dealer_listing', {
      p_listing_id: listingId,
      p_make: identity.make,
      p_model: identity.model,
      p_year: identity.year,
      p_trim: identity.trim,
      p_origin_locale: identity.origin,
      p_variant: identity.variant,
      p_agency_price: 126000,
      p_colors: [
        { color: 'أبيض لؤلؤي', quantity: 2 },
        { color: 'أسود', quantity: 4 },
        { color: 'أبيض / أسود', quantity: 1 },
      ],
      p_description: `E2E-${runId} updated`,
      p_images: [],
    })
    if (updated.total_quantity !== 7) throw new Error('edit total did not persist')

    const afterEdit = await search(specId)
    if (afterEdit[0]?.available_quantity !== 7 || afterEdit[0]?.display_price !== 126000) {
      throw new Error('public aggregate after edit is incorrect')
    }

    await rpc('archive_dealer_listing', { p_listing_id: listingId })
    if ((await search(specId)).length !== 0) throw new Error('archived listing remains public')

    await rpc('restore_dealer_listing', { p_listing_id: listingId })
    if ((await search(specId))[0]?.available_quantity !== 7) throw new Error('restored listing is not public')

    const { data: listing } = await admin.from('dealer_listings').select('listing_spec_id').eq('id', listingId).single()
    specId = listing?.listing_spec_id || null
    const { data: rows } = await admin.from('dealer_inventory').select('car_configuration_id').eq('dealer_listing_id', listingId)
    configIds = (rows || []).map((row) => row.car_configuration_id)

    console.log(JSON.stringify({ success: true, listingId, total: 7, colors: 3, archivedHidden: true, restored: true }, null, 2))
  } finally {
    if (listingId) {
      const { data: rows } = await admin.from('dealer_inventory').select('car_configuration_id').eq('dealer_listing_id', listingId)
      configIds = configIds.length ? configIds : (rows || []).map((row) => row.car_configuration_id)
      if (!specId) {
        const { data: listing } = await admin.from('dealer_listings').select('listing_spec_id').eq('id', listingId).maybeSingle()
        specId = listing?.listing_spec_id || null
      }
      await admin.from('dealer_inventory').delete().eq('dealer_listing_id', listingId)
      await admin.from('dealer_listings').delete().eq('id', listingId)
      if (configIds.length) await admin.from('car_configurations').delete().in('id', configIds)
      if (specId) await admin.from('vehicle_listing_specs').delete().eq('id', specId)
    }
    await client.auth.signOut()
  }
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
