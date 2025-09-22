const { createClient } = require('@supabase/supabase-js');

// Requires:
// - NEXT_PUBLIC_SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (never expose publicly)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateDealer() {
  // Try to find dealer by the seeded dealer account (dealer@test.com)
  const { data: dealerUser, error: userErr } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'dealer@test.com')
    .maybeSingle();

  if (userErr) {
    console.error('Failed to lookup dealer user:', userErr.message);
  }

  if (dealerUser) {
    const { data: existingDealer } = await supabase
      .from('dealers')
      .select('id, user_id')
      .eq('user_id', dealerUser.id)
      .maybeSingle();
    if (existingDealer) return existingDealer;
  }

  // If not found, create a placeholder dealer row
  const now = new Date().toISOString();
  const payload = {
    user_id: dealerUser ? dealerUser.id : crypto.randomUUID(),
    company_name: 'Test Dealer Co.',
    commercial_registration: 'CR-TEST-0001',
    verified: true,
    city: 'Riyadh',
    contact_info: { phone: '+966500000000', email: 'dealer@test.com' },
    description: 'Temporary dealer for local development seeding.',
    rating: 4.7,
    total_sales: 0,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from('dealers').insert(payload).select().single();
  if (error) {
    console.error('Failed to create placeholder dealer:', error.message);
    process.exit(1);
  }
  return data;
}

function buildMockCars(dealerId) {
  const now = new Date().toISOString();
  const cars = [
    { make: 'Toyota', model: 'Camry', year: 2021, variant: 'SE', wakala_price: 98000 },
    { make: 'Toyota', model: 'Corolla', year: 2022, variant: 'XLI', wakala_price: 76000 },
    { make: 'Honda', model: 'Civic', year: 2020, variant: 'EX', wakala_price: 92000 },
    { make: 'Honda', model: 'Accord', year: 2019, variant: 'Sport', wakala_price: 105000 },
    { make: 'Nissan', model: 'Altima', year: 2021, variant: 'SV', wakala_price: 99000 },
    { make: 'Hyundai', model: 'Elantra', year: 2023, variant: 'Smart', wakala_price: 83000 },
    { make: 'Kia', model: 'Sportage', year: 2022, variant: 'EX', wakala_price: 115000 },
    { make: 'Mazda', model: 'CX-5', year: 2021, variant: 'Touring', wakala_price: 118000 },
    { make: 'Chevrolet', model: 'Tahoe', year: 2018, variant: 'LT', wakala_price: 165000 },
    { make: 'Ford', model: 'Explorer', year: 2020, variant: 'XLT', wakala_price: 150000 },
  ];

  const stockImages = [
    'https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1549923746-c502d488b3ea?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1550353127-b0da3aeaa0ca?q=80&w=1200&auto=format&fit=crop',
  ];

  return cars.map((c, idx) => ({
    dealer_id: dealerId,
    make: c.make,
    model: c.model,
    year: c.year,
    variant: c.variant,
    wakala_price: c.wakala_price,
    description: `${c.year} ${c.make} ${c.model} ${c.variant} in excellent condition.`,
    specifications: {
      transmission: idx % 2 === 0 ? 'Automatic' : 'Manual',
      fuel: idx % 3 === 0 ? 'Hybrid' : 'Gasoline',
      color: ['White', 'Black', 'Silver', 'Gray'][idx % 4],
      mileage_km: 10000 + idx * 5000,
      warranty: idx % 2 === 0 ? 'Yes' : 'No',
    },
    images: stockImages.slice(0, (idx % stockImages.length) + 1),
    status: 'active',
    available_quantity: 5 - (idx % 3),
    original_quantity: 5,
    featured: idx % 4 === 0,
    min_bid_price: Math.floor(c.wakala_price * 0.8),
    created_at: now,
    updated_at: now,
  }));
}

async function seedCars() {
  try {
    const dealer = await getOrCreateDealer();

    const cars = buildMockCars(dealer.id);

    // Upsert by a natural key to avoid duplicates on repeated runs
    // If you have a unique constraint, adjust the onConflict target accordingly
    const { data, error } = await supabase
      .from('cars')
      .upsert(cars, { onConflict: 'dealer_id,make,model,year,variant' })
      .select('id, make, model, year');

    if (error) {
      console.error('Failed to upsert cars:', error.message);
      process.exit(1);
    }

    console.log(`Seeded ${data?.length ?? 0} cars.`);
  } catch (e) {
    console.error('Unexpected error:', e.message || e);
    process.exit(1);
  }
}

seedCars().then(() => process.exit(0));


