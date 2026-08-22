"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type SettingsState = { error: string } | { ok: true } | null;

// Display name lives in the auth user's metadata (full_name), which getAccount
// already reads — so no users-table write and no plan-tampering surface.
export async function updateDisplayName(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = z
    .object({ name: z.string().trim().min(1, "Enter a name.").max(80, "That name is too long.") })
    .safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: parsed.data.name } });
  if (error) return { error: "Couldn't save your name — try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

// Works for email users (change) and Google-only users (set a password so they
// can also sign in with email). Operates on the current session's user.
export async function changePassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = z
    .object({ password: z.string().min(8, "Password must be at least 8 characters.") })
    .safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "Couldn't update your password — try again." };

  return { ok: true };
}

// Pause/resume the weekly digest. Written with the service client for the
// authenticated user's own row only — never trusting a client-supplied plan or id.
export async function setDigestEnabled(enabled: boolean): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const service = createServiceClient();
  await service.from("users").update({ digest_enabled: enabled }).eq("id", user.id);
  revalidatePath("/settings");
}

// Deletes the auth user; public.users and all competitors/pages/changes cascade
// via their on-delete-cascade foreign keys. Requires the service (admin) client.
// Returns an error on failure; on success it redirects (so it never returns).
export async function deleteAccount(): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);
  if (error) return { error: "Couldn't delete the account — try again or contact support." };

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
