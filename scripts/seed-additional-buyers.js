const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  {
    email: 'buyer2@test.com',
    password: 'test123',
    fullName: '??????? ???????? 2',
    userType: 'buyer',
  },
  {
    email: 'buyer3@test.com',
    password: 'test123',
    fullName: '??????? ???????? 3',
    userType: 'buyer',
  },
];

async function findUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }
  return data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function upsertProfile(userId, account) {
  await supabase
    .from('users')
    .upsert({
      id: userId,
      email: account.email,
      full_name: account.fullName,
      user_type: account.userType,
      preferred_language: 'ar',
      updated_at: new Date().toISOString(),
    });
}

(async () => {
  for (const account of accounts) {
    try {
      let user = await findUser(account.email);

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
        const { error } = await supabase.auth.admin.updateUserById(user.id, {
          password: account.password,
          user_metadata: {
            full_name: account.fullName,
            user_type: account.userType,
          },
        });
        if (error) {
          console.error(`Failed to update ${account.email}:`, error.message);
        } else {
          console.log(`Updated user ${account.email}`);
        }
      }

      if (user) {
        await upsertProfile(user.id, account);
      }
    } catch (err) {
      console.error(`Unexpected error for ${account.email}:`, err.message);
    }
  }

  console.log('Additional buyer accounts processed.');
})();
