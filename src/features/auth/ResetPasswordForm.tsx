"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { updatePassword, type AuthState } from "./actions";
import { AuthCard, AuthHeading } from "./AuthShell";

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" type="submit" full tall loading={pending} disabled={disabled}>
      Save password
    </Button>
  );
}

export function ResetPasswordForm({ preview = "default" }: { preview?: "default" | "link-expired" }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    updatePassword,
    preview === "link-expired" ? { expired: true } : null,
  );
  const expired = !!state?.expired;

  return (
    <AuthCard>
      <AuthHeading title="Set a new password" />
      {expired ? (
        <Banner tone="warning" title="This link has expired" actions={<Button href="/forgot-password">Send a new link</Button>}>
          Reset links work for one hour. Get a new one below.
        </Banner>
      ) : null}
      <form action={formAction} noValidate>
        <TextField
          id="password"
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          help="At least 8 characters"
          disabled={expired}
          error={state?.fieldErrors?.password}
        />
        {!expired ? (
          <TextField id="confirm" name="confirm" type="password" label="Confirm password" autoComplete="new-password" />
        ) : null}
        <Submit disabled={expired} />
      </form>
    </AuthCard>
  );
}
