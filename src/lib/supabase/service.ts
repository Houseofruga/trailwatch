import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/env";

/**
 * Bypasses RLS — only ever call this from server-side code (a `"use server"`
 * file). `snapshots` and `changes` only have SELECT policies for regular
 * users; writing them is a privileged, server-only operation by design.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from Supabase's API settings (Secret keys) into .env.local.",
    );
  }

  return createSupabaseClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}
