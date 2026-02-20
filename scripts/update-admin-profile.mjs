#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually (no extra dependency)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envRaw = fs.readFileSync(envPath, 'utf8');
  for (const line of envRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    // Remove optional surrounding quotes
    const cleaned = val.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (!process.env[key]) process.env[key] = cleaned;
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function usage() {
  console.log('Usage: node scripts/update-admin-profile.mjs --email email --password pass [--name "Full Name"] [--phone "+123"] [--role admin|super_admin]');
  process.exit(1);
}

const args = process.argv.slice(2);
const argv = {};
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith('--')) continue;
  const k = args[i].replace(/^--/, '');
  const v = args[i+1] && !args[i+1].startsWith('--') ? args[i+1] : '';
  argv[k] = v;
}

const email = (argv.email || '').toLowerCase().trim();
const password = argv.password || '';
const name = argv.name || 'Admin User';
const phone = argv.phone || null;
const role = argv.role || 'admin';

if (!email || !password) usage();

(async () => {
  try {
    const hash = await bcrypt.hash(password, 10);

    // Upsert profile by email
    const upsertObj = {
      email,
      role,
      full_name: name,
      phone,
      is_verified: true,
      password_hash: hash,
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(upsertObj, { onConflict: ['email'] })
      .select();

    if (error) {
      console.error('Supabase upsert error:', error);
      process.exit(2);
    }

    console.log('Upserted profile:', data && data[0] ? { id: data[0].id, email: data[0].email, role: data[0].role } : data);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(3);
  }
})();
