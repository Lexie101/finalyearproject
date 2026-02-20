/**
 * Server-Only Supabase Client
 * 
 * CRITICAL: This file should ONLY be imported on the server side
 * Use "import type" on the client to prevent bundle leaking
 * 
 * Uses SUPABASE_SERVICE_KEY for elevated privileges
 * Should only be used for admin operations and sensitive queries
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL environment variable"
  );
}

if (!SUPABASE_SERVICE_KEY) {
  throw new Error(
    "Missing SUPABASE_SERVICE_KEY environment variable. This is required for server-side operations."
  );
}

/**
 * Server-side Supabase client using service role key
 * This client has elevated privileges and should ONLY be used server-side
 * for operations like:
 * - Hashing and storing passwords
 * - Admin operations
 * - Database migrations
 * - RLS bypassing when necessary
 */
export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type { User, Session } from "@supabase/supabase-js";
