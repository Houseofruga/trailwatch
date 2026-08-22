"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { updatePassword, type AuthState } from "./actions";
import styles from "@/app/(auth)/login/page.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full disabled={pending} style={{ padding: "11px" }}>
      {pending ? "Saving…" : "Set new password"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(updatePassword, null);

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>Set a new password</h1>
      <p className={styles.sub}>Choose a new password for your account.</p>

      <form action={formAction}>
        <label className={styles.label} htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          className={styles.inputLast}
        />

        {state?.error ? <p className={styles.error}>{state.error}</p> : null}

        <SubmitButton />
      </form>
    </div>
  );
}
