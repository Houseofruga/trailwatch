"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { logIn, signInWithGoogle, signUp, type AuthState } from "./actions";
import styles from "@/app/(auth)/login/page.module.css";

const COPY = {
  signup: {
    title: "Create your account",
    sub: "Free plan, two competitors, no card.",
    cta: "Create account",
    switchText: "Already have an account?",
    switchCta: "Log in",
  },
  login: {
    title: "Welcome back",
    sub: "Sign in to see this week.",
    cta: "Log in",
    switchText: "New here?",
    switchCta: "Create one",
  },
} as const;

type Mode = keyof typeof COPY;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full disabled={pending} style={{ padding: "11px" }}>
      {pending ? "One moment…" : label}
    </Button>
  );
}

function GoogleLogo() {
  // Official Google "G" mark.
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.346l2.582-2.581C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" full disabled={pending} style={{ padding: "11px" }}>
      <GoogleLogo /> Continue with Google
    </Button>
  );
}

export function AuthForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get("mode") === "signup" ? "signup" : initialMode;
  const copy = COPY[mode];

  const action = mode === "signup" ? signUp : logIn;
  const [state, formAction] = useActionState<AuthState, FormData>(action, null);

  const errorCode = searchParams.get("error");
  const errorMessage =
    errorCode === "link"
      ? "That link is invalid or has expired. Request a new one."
      : errorCode
        ? "Google sign-in didn't complete. Try again."
        : null;
  const message = state?.error ?? errorMessage;

  function switchMode() {
    router.replace(mode === "signup" ? "/login" : "/login?mode=signup");
  }

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>{copy.title}</h1>
        {mode === "signup" ? (
          <div className={styles.planNote}>
            <span className={styles.planTick} aria-hidden="true">
              ✓
            </span>
            <span>
              Starting on the <strong>Free plan</strong> — no card required, upgrade anytime.
            </span>
          </div>
        ) : (
          <p className={styles.sub}>{copy.sub}</p>
        )}

        <form action={signInWithGoogle}>
          <GoogleButton />
        </form>

        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerWord}>or</span>
          <div className={styles.dividerLine} />
        </div>

        <form action={formAction}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            className={styles.input}
          />

          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            placeholder="••••••••"
            className={mode === "login" ? styles.input : styles.inputLast}
          />

          {mode === "login" ? (
            <div className={styles.forgotRow}>
              <Link href="/forgot-password" className={styles.switchCta}>
                Forgot password?
              </Link>
            </div>
          ) : null}

          {message ? <p className={styles.error}>{message}</p> : null}

          <SubmitButton label={copy.cta} />
        </form>
      </div>

      <div className={styles.switch}>
        <span>{copy.switchText} </span>
        <button type="button" onClick={switchMode} className={styles.switchCta}>
          {copy.switchCta}
        </button>
      </div>
    </>
  );
}
