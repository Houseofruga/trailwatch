"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAccount } from "@/features/account/queries";
import { isAdminEmail } from "@/features/usage/report";
import { createServiceClient } from "@/lib/supabase/service";

// Admin-only controls for the beta (the /admin Beta section): grant or remove
// founding status, and count the feedback calls a founding member has done.

async function requireAdmin(): Promise<boolean> {
  const account = await getAccount();
  return !!account && isAdminEmail(account.email);
}

const userId = z.string().uuid();

export async function setFoundingMember(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const id = userId.safeParse(formData.get("userId"));
  if (!id.success) return;
  await createServiceClient().from("users").update({ is_founding_member: formData.get("founding") === "true" }).eq("id", id.data);
  revalidatePath("/admin");
}

export async function changeFounderCalls(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;
  const id = userId.safeParse(formData.get("userId"));
  const delta = formData.get("delta") === "-1" ? -1 : 1;
  if (!id.success) return;
  const service = createServiceClient();
  const { data } = await service.from("users").select("founder_calls").eq("id", id.data).single();
  const next = Math.max(0, ((data?.founder_calls as number | null) ?? 0) + delta);
  await service.from("users").update({ founder_calls: next }).eq("id", id.data);
  revalidatePath("/admin");
}
