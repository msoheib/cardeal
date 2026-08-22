const fs = require('node:fs')
const path = require('node:path')
const { createClient } = require('@supabase/supabase-js')

const cwd = process.cwd()

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]) continue

    let value = rawValue.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

for (const file of ['.env', '.env.local', '.env.vercel.local']) {
  loadEnvFile(path.join(cwd, file))
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const runId = (process.env.E2E_RUN_ID || new Date().toISOString().slice(0, 10).replace(/-/g, '')).replace(/[^0-9A-Za-z_-]/g, '')
const emailDomain = process.env.E2E_EMAIL_DOMAIN || 'cardeal.test'
const includeAuth = process.argv.includes('--include-auth')

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const prefix = `E2E-${runId}`
const phoneBase = (runId.replace(/\D/g, '').slice(-6) || '0').padStart(6, '0')
const emails = [
  `e2e-buyer-${runId}@${emailDomain}`,
  `e2e-dealer-${runId}@${emailDomain}`,
  `e2e-admin-${runId}@${emailDomain}`,
]
const phones = [`+9665${phoneBase}01`, `+9665${phoneBase}02`, `+9665${phoneBase}03`]

async function assertOk(result, label) {
  const resolved = await result
  if (resolved.error) {
    throw new Error(`${label}: ${resolved.error.message || JSON.stringify(resolved.error)}`)
  }
  return resolved.data
}

async function listAllAuthUsers() {
  const users = []
  for (let page = 1; page < 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`list auth users: ${error.message}`)
    users.push(...(data?.users || []))
    if (!data?.users || data.users.length < 1000) break
  }
  return users
}

async function deleteByIds(table, ids) {
  if (!ids.length) return
  await assertOk(supabase.from(table).delete().in('id', ids), `delete ${table}`)
}

async function cleanup() {
  const authUsers = await listAllAuthUsers()
  const e2eUsers = authUsers.filter((user) => emails.includes(user.email?.toLowerCase() || ''))
  const userIds = e2eUsers.map((user) => user.id)

  const { data: profileRows } = await supabase
    .from('users')
    .select('id')
    .or([
      `email.in.(${emails.join(',')})`,
      `phone.in.(${phones.join(',')})`,
    ].join(','))

  for (const row of profileRows || []) {
    if (!userIds.includes(row.id)) userIds.push(row.id)
  }

  const { data: dealerRows } = await supabase
    .from('dealers')
    .select('id')
    .or([
      `commercial_registration.eq.${prefix}-CR`,
      userIds.length ? `user_id.in.(${userIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
    ].join(','))

  const dealerIds = (dealerRows || []).map((row) => row.id)

  const { data: configRows } = await supabase
    .from('car_configurations')
    .select('id, listing_spec_id')
    .eq('variant', `${prefix}-variant`)

  const configIds = (configRows || []).map((row) => row.id)
  const listingSpecIds = (configRows || []).map((row) => row.listing_spec_id).filter(Boolean)

  const { data: bidRows } = await supabase
    .from('bids')
    .select('id')
    .or([
      `payment_reference.like.${prefix}%`,
      userIds.length ? `buyer_id.in.(${userIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
      configIds.length ? `car_configuration_id.in.(${configIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
    ].join(','))

  const bidIds = (bidRows || []).map((row) => row.id)

  const { data: dealRows } = await supabase
    .from('deals')
    .select('id')
    .or([
      userIds.length ? `buyer_id.in.(${userIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
      dealerIds.length ? `dealer_id.in.(${dealerIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
      bidIds.length ? `bid_id.in.(${bidIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
      configIds.length ? `car_configuration_id.in.(${configIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
    ].join(','))

  const dealIds = (dealRows || []).map((row) => row.id)

  if (dealIds.length) {
    await assertOk(supabase.from('support_tickets').delete().in('deal_id', dealIds), 'delete support tickets')
  }
  if (bidIds.length) {
    await assertOk(supabase.from('commitment_fees').delete().in('bid_id', bidIds), 'delete commitment fees')
  }

  await deleteByIds('deals', dealIds)
  await deleteByIds('bids', bidIds)

  if (dealerIds.length && configIds.length) {
    await assertOk(
      supabase
        .from('dealer_inventory')
        .delete()
        .in('dealer_id', dealerIds)
        .in('car_configuration_id', configIds),
      'delete dealer inventory'
    )
  }

  await deleteByIds('dealer_public_profiles', dealerIds)
  await deleteByIds('dealers', dealerIds)

  if (userIds.length) {
    await assertOk(supabase.from('dealer_applications').delete().in('user_id', userIds), 'delete dealer applications')
    await assertOk(supabase.from('users').delete().in('id', userIds), 'delete public users')
  }

  await deleteByIds('car_configurations', configIds)
  await deleteByIds('vehicle_listing_specs', listingSpecIds)

  if (includeAuth) {
    for (const user of e2eUsers) {
      const { error } = await supabase.auth.admin.deleteUser(user.id)
      if (error) throw new Error(`delete auth user ${user.email}: ${error.message}`)
    }
  }

  console.log(JSON.stringify({
    runId,
    removed: {
      authUsers: includeAuth ? e2eUsers.length : 0,
      publicUsers: userIds.length,
      dealers: dealerIds.length,
      configurations: configIds.length,
      bids: bidIds.length,
      deals: dealIds.length,
    },
    authUsersRetained: includeAuth ? 0 : e2eUsers.length,
  }, null, 2))
}

cleanup().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
