import { Suspense } from "react";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";
import { AuthShell } from "@/features/auth/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";

const STATES = ["default", "link-sent"] as const;

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const preview = previewState((await searchParams).state, STATES, "default");
  return (
    <AuthShell>
      <ForgotPasswordForm key={preview} preview={preview} />
      <Suspense fallback={null}>
        <DevStateBar states={STATES} current={preview} />
      </Suspense>
    </AuthShell>
  );
}
