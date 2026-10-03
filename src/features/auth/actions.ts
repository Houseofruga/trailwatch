"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { claimNext } from "@/features/preview/claimPath";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SIGNUP_CAP_MESSAGE, signupsLeftToday } from "@/features/usage/signupCap";
import { isDisposableEmail } from "./trust";

export type AuthState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  /** Sign-up succeeded; the confirmation link went to this address. */
  checkEmail?: string;
  /** Daily sign-up cap reached (the form disables itself). */
  capacity?: boolean;
  /** The reset link's session is gone or expired. */
  expired?: boolean;
} | null;

const credentials = z.object({
  email: z.email("Enter an email like you@yourstore.com."),
  password: z.string().min(8, "Use at least 8 characters."),
});

function fieldErrors(issues: z.core.$ZodIssue[]): NonNullable<AuthState>["fieldErrors"] {
  const out: { email?: string; password?: string } = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if ((key === "email" || key === "password") && !out[key]) out[key] = issue.message;
  }
  return out;
}

function readCredentials(formData: FormData) {
  return credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error.issues) };
  }

  if (isDisposableEmail(parsed.data.email)) {
    return { fieldErrors: { email: "Use an email you'll keep. Your alerts and Monday briefing go here." } };
  }

  // Daily signup cap (Phase 7): say so plainly instead of the generic
  // database error the backstop trigger would produce.
  if ((await signupsLeftToday(createServiceClient())) <= 0) {
    return { error: SIGNUP_CAP_MESSAGE, capacity: true };
  }

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";
  // From the homepage widget, sign-up ends by claiming that competitor.
  const next = claimNext(formData.get("next")) ?? "/welcome";
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    // If email confirmation is on, the link lands on onboarding (not the
    // dashboard) so a fresh account goes straight into setup.
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });

  if (error) return { error: error.message };

  // An email that's already registered: Supabase sends nothing but still
  // "succeeds" (a user with no identities), so say so instead of "check your inbox".
  if (data.user && data.user.identities?.length === 0) {
    return { fieldErrors: { email: "You already have an account with this email. Log in instead." } };
  }

  // With "Confirm email" enabled in Supabase, signUp returns no session — the
  // user has to click the emailed link before they can get in.
  if (!data.session) {
    return { checkEmail: parsed.data.email };
  }

  revalidatePath("/", "layout");
  // New account → onboarding (or the widget's claim). /welcome pre-seeds any
  // competitors the visitor picked on the homepage.
  redirect(next);
}

export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = readCredentials(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "That email and password don't match." };

  revalidatePath("/", "layout");
  redirect(claimNext(formData.get("next")) ?? "/dashboard");
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

/** Sends the sign-up confirmation email again ("Check your inbox" → Resend). */
export async function resendConfirmation(email: string, nextPath?: string): Promise<{ ok: boolean }> {
  const parsed = z.email().safeParse(email);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(claimNext(nextPath) ?? "/welcome")}` },
  });
  return { ok: !error };
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
    .object({ password: z.string().min(8, "Use at least 8 characters.") })
    .safeParse({ password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };
  if (formData.get("confirm") !== null && formData.get("confirm") !== parsed.data.password) {
    return { fieldErrors: { password: "The two passwords don't match." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { expired: true };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
