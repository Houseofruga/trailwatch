import { Suspense } from "react";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";
import { AuthForm, type AuthPreview } from "@/features/auth/AuthForm";
import { AuthShell } from "@/features/auth/AuthShell";

const SIGNUP_STATES = ["default", "submitting", "field-errors", "sign-ups-full-today", "check-your-inbox"] as const;
const LOGIN_STATES = ["default", "submitting", "wrong-password"] as const;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ state?: string; mode?: string }> }) {
  const sp = await searchParams;
  const states = sp.mode === "signup" ? SIGNUP_STATES : LOGIN_STATES;
  const preview: AuthPreview = previewState(sp.state, states, "default");
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <AuthForm key={`${sp.mode}-${preview}`} initialMode="login" preview={preview} />
        <DevStateBar states={states} current={preview} />
      </Suspense>
    </AuthShell>
  );
}
