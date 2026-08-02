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
const testPassword = process.env.E2E_TEST_PASSWORD
const runId = (process.env.E2E_RUN_ID || new Date().toISOString().slice(0, 10).replace(/-/g, '')).replace(/[^0-9A-Za-z_-]/g, '')
const emailDomain = process.env.E2E_EMAIL_DOMAIN || 'cardeal.test'
const outputDir = process.env.E2E_OUTPUT_DIR || path.join('docs', 'e2e', `production-${new Date().toISOString().slice(0, 10)}`)

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!testPassword) {
  console.error('Missing E2E_TEST_PASSWORD. Set a temporary password for the E2E accounts before seeding.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const prefix = `E2E-${runId}`
const now = new Date().toISOString()
const phoneBase = (runId.replace(/\D/g, '').slice(-6) || '0').padStart(6, '0')

const accounts = {
  buyer: {
    email: `e2e-buyer-${runId}@${emailDomain}`,
    fullName: `${prefix} مشتري الاختبار`,
    userType: 'buyer',
    phone: `+9665${phoneBase}01`,
  },
  dealer: {
    email: `e2e-dealer-${runId}@${emailDomain}`,
    fullName: `${prefix} مورد الاختبار`,
    userType: 'dealer',
    phone: `+9665${phoneBase}02`,
  },
  admin: {
    email: `e2e-admin-${runId}@${emailDomain}`,
    fullName: `${prefix} مدير الاختبار`,
    userType: 'admin',
    phone: `+9665${phoneBase}03`,
  },
}

const dealerProfile = {
  company_name: `${prefix} مورد سيارات الرياض`,
  commercial_registration: `${prefix}-CR`,
  verified: true,
  city: 'الرياض',
  contact_info: {
    phone: accounts.dealer.phone,
    email: accounts.dealer.email,
  },
  description: `${prefix} ملف مورد مخصص لاختبارات الإنتاج الآلية.`,
  rating: 4.8,
  total_sales: 12,
}

const configuration = {
  make: 'Toyota',
  model: 'Camry',
  year: 2025,
  trim: 'GLE',
  color: 'White',
  origin_locale: 'Saudi',
  variant: `${prefix}-variant`,
  msrp: 120000,
  description: `${prefix} سيارة اختبار للإنتاج. لا تستخدم في عمليات بيع حقيقية.`,
  specifications: {
    engine: '2.5L',
    fuel_type: 'Gasoline',
    transmission: 'Automatic',
  },
  images: [],
}

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

async function cleanupExisting(userIds) {
  const { data: dealerRows } = await supabase
    .from('dealers')
    .select('id')
    .or(`commercial_registration.eq.${dealerProfile.commercial_registration},user_id.in.(${userIds.join(',') || '00000000-0000-0000-0000-000000000000'})`)

  const dealerIds = (dealerRows || []).map((row) => row.id)

  const { data: configRows } = await supabase
    .from('car_configurations')
    .select('id')
    .eq('variant', configuration.variant)

  const configIds = (configRows || []).map((row) => row.id)

  const { data: bidRows } = await supabase
    .from('bids')
    .select('id')
    .or([
      `payment_reference.like.${prefix}%`,
      userIds.length ? `buyer_id.in.(${userIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
      configIds.length ? `car_configuration_id.in.(${configIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
    ].join(','))

  const bidIds = (bidRows || []).map((row) => row.id)

  const dealFilters = [
    userIds.length ? `buyer_id.in.(${userIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
    dealerIds.length ? `dealer_id.in.(${dealerIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
    bidIds.length ? `bid_id.in.(${bidIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
    configIds.length ? `car_configuration_id.in.(${configIds.join(',')})` : 'id.eq.00000000-0000-0000-0000-000000000000',
  ]

  const { data: dealRows } = await supabase
    .from('deals')
    .select('id')
    .or(dealFilters.join(','))

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
}

async function ensureAuthUser(account) {
  const authUsers = await listAllAuthUsers()
  const existing = authUsers.find((user) => user.email?.toLowerCase() === account.email.toLowerCase())

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: account.fullName,
        phone: account.phone,
        e2e_run_id: runId,
      },
    })
    if (error) throw new Error(`update auth user ${account.email}: ${error.message}`)
    return data?.user || data || existing
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      phone: account.phone,
      e2e_run_id: runId,
    },
  })

  if (error) throw new Error(`create auth user ${account.email}: ${error.message}`)
  return data?.user || data
}

async function insertUserProfile(user, account) {
  await assertOk(supabase.from('users').delete().eq('id', user.id), `clear public profile ${account.email}`)
  await assertOk(
    supabase.from('users').insert({
      id: user.id,
      email: account.email,
      phone: account.phone,
      full_name: account.fullName,
      user_type: account.userType,
      preferred_language: 'ar',
      created_at: now,
      updated_at: now,
    }),
    `insert public profile ${account.email}`
  )
}

async function seed() {
  const initialAuthUsers = await listAllAuthUsers()
  const knownUserIds = Object.values(accounts)
    .map((account) => initialAuthUsers.find((user) => user.email?.toLowerCase() === account.email.toLowerCase())?.id)
    .filter(Boolean)

  await cleanupExisting(knownUserIds)

  const authByRole = {}
  for (const [role, account] of Object.entries(accounts)) {
    const user = await ensureAuthUser(account)
    authByRole[role] = user
    await insertUserProfile(user, account)
  }

  const dealer = await assertOk(
    supabase
      .from('dealers')
      .insert({
        user_id: authByRole.dealer.id,
        ...dealerProfile,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single(),
    'insert dealer'
  )

  const config = await assertOk(
    supabase
      .from('car_configurations')
      .insert({
        ...configuration,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single(),
    'insert car configuration'
  )

  const inventory = await assertOk(
    supabase
      .from('dealer_inventory')
      .insert({
        dealer_id: dealer.id,
        car_configuration_id: config.id,
        quantity: 3,
        status: 'active',
        agency_price: 120000,
        listing_description: configuration.description,
        listing_images: [],
        created_at: now,
        updated_at: now,
      })
      .select()
      .single(),
    'insert dealer inventory'
  )

  const acceptedBid = await assertOk(
    supabase
      .from('bids')
      .insert({
        buyer_id: authByRole.buyer.id,
        car_configuration_id: config.id,
        bid_price: 120000,
        net_offer_amount: 119500,
        status: 'accepted',
        commitment_fee_paid: true,
        commitment_fee_amount: 500,
        payment_reference: `${prefix}-accepted-payment`,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        created_at: now,
        updated_at: now,
      })
      .select()
      .single(),
    'insert accepted bid'
  )

  const pendingBid = await assertOk(
    supabase
      .from('bids')
      .insert({
        buyer_id: authByRole.buyer.id,
        car_configuration_id: config.id,
        bid_price: 119000,
        net_offer_amount: 118500,
        status: 'pending',
        commitment_fee_paid: true,
        commitment_fee_amount: 500,
        payment_reference: `${prefix}-pending-payment`,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        created_at: now,
        updated_at: now,
      })
      .select()
      .single(),
    'insert pending bid'
  )

  await assertOk(
    supabase.from('commitment_fees').insert([
      {
        bid_id: acceptedBid.id,
        buyer_id: authByRole.buyer.id,
        amount: 500,
        status: 'paid',
        payment_method: 'e2e_seed',
        transaction_reference: `${prefix}-accepted-fee`,
        gateway_response: { e2e: true, run_id: runId },
        processed_at: now,
      },
      {
        bid_id: pendingBid.id,
        buyer_id: authByRole.buyer.id,
        amount: 500,
        status: 'paid',
        payment_method: 'e2e_seed',
        transaction_reference: `${prefix}-pending-fee`,
        gateway_response: { e2e: true, run_id: runId },
        processed_at: now,
      },
    ]),
    'insert commitment fees'
  )

  const deal = await assertOk(
    supabase
      .from('deals')
      .insert({
        car_configuration_id: config.id,
        dealer_id: dealer.id,
        buyer_id: authByRole.buyer.id,
        bid_id: acceptedBid.id,
        final_price: 120000,
        quantity: 1,
        status: 'pending_payment',
        payment_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: now,
      })
      .select()
      .single(),
    'insert pending buyer approval deal'
  )

  const output = {
    runId,
    prefix,
    seededAt: now,
    accounts: Object.fromEntries(
      Object.entries(accounts).map(([role, account]) => [
        role,
        {
          email: account.email,
          userId: authByRole[role].id,
          userType: account.userType,
        },
      ])
    ),
    dealer: {
      id: dealer.id,
      companyName: dealer.company_name,
    },
    configuration: {
      id: config.id,
      make: config.make,
      model: config.model,
      year: config.year,
      trim: config.trim,
      color: config.color,
      origin_locale: config.origin_locale,
      msrp: Number(config.msrp),
    },
    inventory: {
      id: inventory.id,
      quantity: inventory.quantity,
    },
    acceptedBid: {
      id: acceptedBid.id,
      payment_reference: acceptedBid.payment_reference,
    },
    pendingBid: {
      id: pendingBid.id,
      payment_reference: pendingBid.payment_reference,
    },
    pendingApprovalDeal: {
      id: deal.id,
      status: deal.status,
      final_price: Number(deal.final_price),
    },
  }

  const absoluteOutputDir = path.resolve(cwd, outputDir)
  fs.mkdirSync(absoluteOutputDir, { recursive: true })
  fs.writeFileSync(path.join(absoluteOutputDir, 'seed-result.json'), `${JSON.stringify(output, null, 2)}\n`)

  console.log(JSON.stringify(output, null, 2))
}

seed().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
