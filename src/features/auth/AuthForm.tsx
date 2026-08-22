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
    sub: "Free plan, one competitor, no card.",
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

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" full disabled={pending} style={{ padding: "11px" }}>
      <span className={styles.googleMark}>G</span> Continue with Google
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

  const oauthFailed = searchParams.get("error");
  const message =
    state?.error ??
    (oauthFailed ? "Google sign-in didn't complete. Try again." : null);

  function switchMode() {
    router.replace(mode === "signup" ? "/login" : "/login?mode=signup");
  }

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.sub}>{copy.sub}</p>

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
