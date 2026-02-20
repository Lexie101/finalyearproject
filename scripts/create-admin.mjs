// scripts/create-admin.mjs
import dotenv from 'dotenv';
// Load Next.js .env.local by default for local CLI scripts
dotenv.config({ path: '.env.local' });
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
  console.log('Usage: node scripts/create-admin.mjs --email email@example.com --password "Secret123!" --role driver|super_admin [--name "Full Name"]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) usage();

const argv = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith('--')) continue;
  const k = a.replace(/^--/, '');
  const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '';
  argv[k] = v;
}

const email = argv.email;
const password = argv.password;
const role = (argv.role || 'driver').toLowerCase() === 'super_admin' || (argv.role || 'driver').toLowerCase() === 'super-admin' ? 'super_admin' : 'driver';
const name = argv.name || null;

if (!email || !password) usage();

(async () => {
  try {
    const hash = await bcrypt.hash(password, 10);

    const insertObj = {
      email: email.toLowerCase().trim(),
      password_hash: hash,
      role,
      name,
      created_by: 'cli',
    };

    const { data, error } = await supabase
      .from('admins')
      .insert(insertObj)
      .select('*');

    if (error) {
      console.error('Supabase insert error:', error);
      process.exit(2);
    }

    console.log('Inserted admin:', data && data[0] ? { id: data[0].id, email: data[0].email, role: data[0].role, name: data[0].name } : 'ok');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
})();
