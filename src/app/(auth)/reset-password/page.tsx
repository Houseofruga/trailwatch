import { Suspense } from "react";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";
import { AuthShell } from "@/features/auth/AuthShell";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

const STATES = ["default", "link-expired"] as const;

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const preview = previewState((await searchParams).state, STATES, "default");
  return (
    <AuthShell>
      <ResetPasswordForm key={preview} preview={preview} />
      <Suspense fallback={null}>
        <DevStateBar states={STATES} current={preview} />
      </Suspense>
    </AuthShell>
  );
}
