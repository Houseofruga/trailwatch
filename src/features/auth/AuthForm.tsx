"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { DividerWithLabel } from "@/components/ui/Feedback";
import { TextField } from "@/components/ui/TextField";
import { SIGNUP_CAP_MESSAGE } from "@/features/usage/signupCap";
import { logIn, resendConfirmation, signInWithGoogle, signUp, type AuthState } from "./actions";
import { AuthCard, AuthHeading } from "./AuthShell";
import styles from "./AuthShell.module.css";

type Mode = "signup" | "login";

/** Design-review states (development only; see src/features/appData/devState.ts). */
export type AuthPreview =
  | "default"
  | "submitting"
  | "field-errors"
  | "sign-ups-full-today"
  | "check-your-inbox"
  | "wrong-password";

const PREVIEW_STATE: Partial<Record<AuthPreview, AuthState>> = {
  "field-errors": { fieldErrors: { email: "Enter an email like jo@glowfield.com.", password: "Use at least 8 characters." } },
  "sign-ups-full-today": { error: SIGNUP_CAP_MESSAGE, capacity: true },
  "check-your-inbox": { checkEmail: "jo@glowfield.com" },
  "wrong-password": { error: "That email and password don't match." },
};

function GoogleLogo() {
  // Official Google "G" mark.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.346l2.582-2.581C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function GoogleButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full tall className={styles.google} disabled={disabled || pending} icon={<GoogleLogo />}>
      Continue with Google
    </Button>
  );
}

function Fields({ mode, state, forcePending, disabled }: { mode: Mode; state: AuthState; forcePending: boolean; disabled: boolean }) {
  const { pending: actionPending } = useFormStatus();
  const pending = forcePending || actionPending;
  const preview = forcePending ? { email: "jo@glowfield.com", password: "••••••••" } : null;
  return (
    <>
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        placeholder="you@yourstore.com"
        defaultValue={preview?.email}
        disabled={disabled}
        readOnly={pending && !disabled}
        error={state?.fieldErrors?.email}
      />
      <div>
        <TextField
          id="password"
          name="password"
          type="password"
          label="Password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          defaultValue={preview?.password}
          disabled={disabled}
          readOnly={pending && !disabled}
          help={mode === "signup" ? "At least 8 characters" : undefined}
          error={state?.fieldErrors?.password}
        />
        {mode === "login" ? (
          <p style={{ margin: "8px 0 0 0", textAlign: "right", fontSize: 13 }}>
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
        ) : null}
      </div>
      <Button variant="primary" type="submit" full tall loading={pending} disabled={disabled}>
        {mode === "signup" ? "Create account" : "Log in"}
      </Button>
    </>
  );
}

function CheckInbox({ email, onUseDifferent }: { email: string; onUseDifferent: () => void }) {
  const [sending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <AuthCard>
      <AuthHeading
        title="Check your inbox"
        sub={
          <>
            We sent a link to <strong>{email}</strong>. Open it to confirm your email and get started.
          </>
        }
      />
      {sent ? <Banner tone="success">Sent again. It can take a minute to arrive.</Banner> : null}
      <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)" }}>Didn&rsquo;t get it? Check spam, or send it again.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button loading={sending} onClick={() => start(async () => setSent((await resendConfirmation(email)).ok))}>
          Resend email
        </Button>
        <Button variant="plain" onClick={onUseDifferent}>
          Use a different email
        </Button>
      </div>
    </AuthCard>
  );
}

export function AuthForm({ initialMode, preview = "default" }: { initialMode: Mode; preview?: AuthPreview }) {
  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get("mode") === "signup" ? "signup" : initialMode;
  const [state, formAction] = useActionState<AuthState, FormData>(mode === "signup" ? signUp : logIn, PREVIEW_STATE[preview] ?? null);
  const [dismissedInbox, setDismissedInbox] = useState(false);

  const errorCode = searchParams.get("error");
  const linkError =
    errorCode === "link"
      ? "That link is invalid or has expired. Request a new one."
      : errorCode === "capacity"
        ? SIGNUP_CAP_MESSAGE
        : errorCode
          ? "Google sign-in didn't complete. Try again."
          : null;
  const capacity = !!state?.capacity || errorCode === "capacity";
  const message = state?.error ?? linkError;

  if (mode === "signup" && state?.checkEmail && !dismissedInbox) {
    return <CheckInbox email={state.checkEmail} onUseDifferent={() => setDismissedInbox(true)} />;
  }

  const switchLink =
    mode === "signup" ? (
      <>
        Already have an account? <Link href="/login">Log in</Link>
      </>
    ) : (
      <>
        New here? <Link href="/login?mode=signup">Create an account</Link>
      </>
    );

  return (
    <AuthCard footer={switchLink}>
      <AuthHeading
        title={mode === "signup" ? "Create your account" : "Log in to TrailWatch"}
        sub={mode === "signup" ? "Know what your competitors change, as soon as they change it." : undefined}
      />
      {message ? (
        <Banner tone={capacity ? "info" : "critical"}>{message}</Banner>
      ) : null}
      <form action={signInWithGoogle}>
        {/* Sign-ups land on onboarding; log-ins on Home. */}
        <input type="hidden" name="next" value={mode === "signup" ? "/welcome" : "/dashboard"} />
        <GoogleButton disabled={capacity} />
      </form>
      <DividerWithLabel>or</DividerWithLabel>
      <form action={formAction} noValidate>
        <Fields mode={mode} state={state} forcePending={preview === "submitting"} disabled={capacity} />
      </form>
    </AuthCard>
  );
}
