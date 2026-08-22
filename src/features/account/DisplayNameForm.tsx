"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/Button";
import { updateDisplayName, type SettingsState } from "./actions";
import styles from "@/app/(app)/settings/page.module.css";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function DisplayNameForm({ initial }: { initial: string }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateDisplayName, null);

  return (
    <form action={action} className={styles.rowForm}>
      <input
        name="name"
        defaultValue={initial}
        maxLength={80}
        required
        className={styles.input}
        aria-label="Display name"
      />
      <SaveButton />
      {state && "error" in state ? <p className={styles.err}>{state.error}</p> : null}
      {state && "ok" in state ? <p className={styles.ok}>Saved.</p> : null}
    </form>
  );
}
