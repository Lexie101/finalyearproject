// scripts/find-admin.mjs
import dotenv from 'dotenv';
// Load Next.js .env.local by default for local CLI scripts
dotenv.config({ path: '.env.local' });
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
  console.log('Usage: node scripts/find-admin.mjs --email email@example.com');
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args.length) usage();

const argv = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith('--')) continue;
  const k = a.replace(/^--/, '');
  const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '';
  argv[k] = v;
}

const email = argv.email;
if (!email) usage();

(async () => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id, email, role, name, password_hash, password')
      .ilike('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      process.exit(2);
    }

    if (!data) {
      console.log('No admin found for', email);
      process.exit(0);
    }

    console.log('Admin record:');
    console.log({ id: data.id, email: data.email, role: data.role, name: data.name });
    console.log('password_hash startsWith $2:', typeof data.password_hash === 'string' && data.password_hash.startsWith('$2'));
    // Do not print full hash in logs unless explicitly requested
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
})();
