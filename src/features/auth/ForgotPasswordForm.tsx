"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/Button";
import { requestPasswordReset, type ForgotState } from "./actions";
import styles from "@/app/(auth)/login/page.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full disabled={pending} style={{ padding: "11px" }}>
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotState, FormData>(requestPasswordReset, null);

  if (state && "sent" in state) {
    return (
      <>
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.sub}>
            If an account exists for that address, we&rsquo;ve sent a link to reset your password.
            It expires in an hour.
          </p>
        </div>
        <div className={styles.switch}>
          <Link href="/login" className={styles.switchCta}>
            Back to log in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.sub}>Enter your email and we&rsquo;ll send you a reset link.</p>

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
            className={styles.inputLast}
          />

          {state?.error ? <p className={styles.error}>{state.error}</p> : null}

          <SubmitButton />
        </form>
      </div>

      <div className={styles.switch}>
        <Link href="/login" className={styles.switchCta}>
          Back to log in
        </Link>
      </div>
    </>
  );
}
