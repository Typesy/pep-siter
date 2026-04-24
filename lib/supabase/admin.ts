import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Creates a server-only Supabase admin client for privileged writes.
 *
 * Returns:
 *   SupabaseClient: Service-role client.
 */
export function createSupabaseAdminClient() {
  const { supabaseUrl } = getSupabaseEnv();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    .trim()
    .replace(/^"|"$/g, "");

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
