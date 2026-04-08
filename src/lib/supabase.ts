import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/** True when Supabase credentials are configured */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Use a placeholder URL when env vars are missing so the app can still load.
// Features that require Supabase will check `supabaseConfigured` before calling.
const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabaseAnonKey || "placeholder-anon-key";

export const supabase = createClient(url, key);

export const publicSupabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    storageKey: "sb-public-anon-client",
  },
});
