import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const sb = createClient(url, key);
const { data, error } = await sb.auth.signInWithPassword({
  email: 'accessnowbd01@gmail.com',
  password: process.env.ADMIN_TEST_PASSWORD,
});
if (error) { console.error('ERR', error.message); process.exit(1); }
console.log(JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at, user: { id: data.user.id, email: data.user.email } }));
