import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

let adminClient: SupabaseClient<Database> | undefined;

// Server-only admin client: uses the service role key and BYPASSES Row Level Security.
// Never import this from src/ or send its key to the browser.
export function getSupabaseAdmin(): SupabaseClient<Database> {
  adminClient ??= createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return adminClient;
}

// Per-request client acting as the calling user (RLS applies), for routes that
// receive a user's access token in the Authorization header.
export function getSupabaseForUser(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
