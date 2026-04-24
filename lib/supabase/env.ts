export function getSupabaseEnv() {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .trim()
    .replace(/^"|"$/g, "");
  const supabaseAnonKey = String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "")
    .trim()
    .replace(/^"|"$/g, "");

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { supabaseUrl, supabaseAnonKey };
}
