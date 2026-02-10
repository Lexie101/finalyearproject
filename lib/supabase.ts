import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export default supabase;
import { createClient } from '@supabase/supabase-js';

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || '';
const publicAnonKey = process.env.NEXT_PUBLIC_ANON_KEY || '';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);
