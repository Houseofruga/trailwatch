"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { changePassword, type SettingsState } from "./actions";
import styles from "@/app/(app)/settings/page.module.css";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Update"}
    </Button>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<SettingsState, FormData>(changePassword, null);

  return (
    <form action={action} className={styles.rowForm} key={state && "ok" in state ? "done" : "form"}>
      <input
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="New password"
        minLength={8}
        required
        className={styles.input}
        aria-label="New password"
      />
      <SaveButton />
      {state && "error" in state ? <p className={styles.err}>{state.error}</p> : null}
      {state && "ok" in state ? <p className={styles.ok}>Password updated.</p> : null}
    </form>
  );
}
