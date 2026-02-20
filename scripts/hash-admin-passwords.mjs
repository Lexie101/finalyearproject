import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in your env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function usage() {
  console.log('Usage: node scripts/change-admin-password.mjs --email email@example.com --password "NewPass123!"');
  process.exit(1);
}

const argv = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => {
  if (!a.startsWith('--')) return [];
  const key = a.replace(/^--/, '');
  const val = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '';
  return [key, val];
}).filter(Boolean));

const email = argv.email;
const newPassword = argv.password;

if (!email || !newPassword) usage();

(async () => {
  try {
    const hash = await bcrypt.hash(newPassword, 10);

    const { data, error } = await supabase
      .from('admins')
      .update({ password_hash: hash })
      .ilike('email', email);

    if (error) {
      console.error('Supabase update error:', error);
      process.exit(2);
    }

    if (!data || data.length === 0) {
      console.warn('No admin row matched that email. Check the email address.');
    } else {
      console.log(`Password updated for ${email}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
})();
