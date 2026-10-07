import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv, serviceRoleKey } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Service-role client. It bypasses row-level security, so it is used only for the few
 * operations a student must not be able to perform themselves: reading quiz answer keys,
 * recording graded attempts, and storing contact messages. Always authorise the caller first.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv().supabaseUrl, serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
