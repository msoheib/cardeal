const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testAccounts = [
  {
    email: 'buyer@test.com',
    password: 'test123',
    fullName: '??????? ????????',
    userType: 'buyer',
  },
  {
    email: 'dealer@test.com',
    password: 'test123',
    fullName: '???? ???????? ????????',
    userType: 'dealer',
  },
  {
    email: 'admin@test.com',
    password: 'test123',
    fullName: '????? ?????? ????????',
    userType: 'admin',
  },
];

async function findExistingAuthUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error('Failed to list auth users:', error.message);
    return null;
  }

  return data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureDealerProfile(userId, email) {
  const now = new Date().toISOString();
  const { data: existing, error } = await supabase
    .from('dealers')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch dealer profile:', error.message);
    return;
  }

  const payload = {
    user_id: userId,
    company_name: '???? ???????? ?????????',
    commercial_registration: 'CR-1234567890',
    verified: true,
    city: '??????',
    contact_info: {
      phone: '+966500000000',
      email,
    },
    description: '???? ???? ?????? ?????????? ??????? ?????????.',
    rating: 4.8,
    total_sales: 120,
    updated_at: now,
  };

  if (existing) {
    await supabase
      .from('dealers')
      .update(payload)
      .eq('id', existing.id);
  } else {
    await supabase
      .from('dealers')
      .insert({ ...payload, created_at: now });
  }
}

async function upsertProfile(userId, account) {
  const now = new Date().toISOString();
  await supabase
    .from('users')
    .upsert({
      id: userId,
      email: account.email,
      full_name: account.fullName,
      user_type: account.userType,
      preferred_language: 'ar',
      updated_at: now,
    });
}

async function seed() {
  for (const account of testAccounts) {
    try {
      let user = await findExistingAuthUser(account.email);

      if (!user) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            full_name: account.fullName,
            user_type: account.userType,
          },
        });

        if (error) {
          console.error(`Failed to create ${account.email}:`, error.message);
          continue;
        }

        user = data.user;
        console.log(`Created user ${account.email}`);
      } else {
        await supabase.auth.admin.updateUserById(user.id, {
          password: account.password,
          user_metadata: {
            full_name: account.fullName,
            user_type: account.userType,
          },
        });
        console.log(`Updated user ${account.email}`);
      }

      if (!user) {
        continue;
      }

      await upsertProfile(user.id, account);

      if (account.userType === 'dealer') {
        await ensureDealerProfile(user.id, account.email);
      }
    } catch (error) {
      console.error(`Unexpected error handling ${account.email}:`, error.message);
    }
  }

  console.log('Test accounts seeded.');
}

seed().then(() => process.exit(0));
