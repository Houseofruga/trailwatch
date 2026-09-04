"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

const credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function readCredentials(formData: FormData) {
  return credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    // If email confirmation is on, the link lands on onboarding (not the
    // dashboard) so a fresh account goes straight into setup.
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/welcome` },
  });

  if (error) return { error: error.message };

  // With "Confirm email" enabled in Supabase, signUp returns no session — the
  // user has to click the emailed link before they can get in.
  if (!data.session) {
    return { error: "Check your email for a confirmation link, then log in." };
  }

  revalidatePath("/", "layout");
  // New account → onboarding. /welcome pre-seeds any competitors the visitor
  // picked on the homepage and bounces to /dashboard if they already have some.
  redirect("/welcome");
}

export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "That email and password don't match an account." };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";

  // Where to land after the OAuth round-trip: signups go to onboarding, logins
  // to the dashboard. /welcome bounces to /dashboard if the account already has
  // competitors, so it's safe even for a returning user.
  const nextRaw = formData.get("next");
  const next =
    typeof nextRaw === "string" && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      // Always show Google's account chooser instead of silently reusing the
      // one signed-in session — lets people pick a different Google account.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google");
  }

  redirect(data.url);
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export type ForgotState = { error: string } | { sent: true } | null;

// Emails a password-reset link. The link points at /auth/callback, which
// exchanges the recovery code for a session and forwards to /reset-password.
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = z
    .object({ email: z.email("Enter a valid email address.") })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Report failures only for real send errors (e.g. rate limits). We never
  // reveal whether an address is registered — success looks the same either way.
  if (error) return { error: "Couldn't send the reset email — try again shortly." };
  return { sent: true };
}

// Sets a new password for the user in the (recovery) session established by the
// callback. Requires that session — an expired/absent link surfaces as an error.
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password: z.string().min(8, "Password must be at least 8 characters.") })
    .safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: "Couldn't update your password — the reset link may have expired. Request a new one." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
