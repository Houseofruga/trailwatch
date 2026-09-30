"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { requestPasswordReset, type ForgotState } from "./actions";
import { AuthCard, AuthHeading } from "./AuthShell";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" type="submit" full tall loading={pending}>
      Send reset link
    </Button>
  );
}

export function ForgotPasswordForm({ preview = "default" }: { preview?: "default" | "link-sent" }) {
  const [state, formAction] = useActionState<ForgotState, FormData>(
    requestPasswordReset,
    preview === "link-sent" ? { sent: true } : null,
  );
  const [email, setEmail] = useState(preview === "link-sent" ? "jo@glowfield.com" : "");
  const sent = !!state && "sent" in state;

  return (
    <AuthCard footer={<Link href="/login">Back to log in</Link>}>
      <AuthHeading title="Reset your password" sub="Enter your email and we'll send you a link." />
      {sent ? (
        <Banner tone="success">If there&rsquo;s an account for {email || "that address"}, a reset link is on its way.</Banner>
      ) : null}
      <form action={formAction} noValidate>
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          placeholder="you@yourstore.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={state && "error" in state ? state.error : undefined}
        />
        <Submit />
      </form>
    </AuthCard>
  );
}
