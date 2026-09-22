import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../types/supabase";

// Browser client: uses the public anon key and is subject to Row Level Security.
// NEXT_PUBLIC_* vars are exposed to the client via `envPrefix` in vite.config.ts.
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
