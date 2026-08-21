"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { cancelSubscription } from "./actions";

export function CancelButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    if (!confirm("Cancel your Pro subscription? You'll move back to the Free plan.")) return;
    startTransition(async () => {
      const result = await cancelSubscription();
      setMessage(result.message);
      // The webhook does the actual plan flip; nudge the page to pick it up
      // once it lands so the user doesn't have to refresh by hand.
      if (result.ok) {
        setTimeout(() => router.refresh(), 1500);
      }
    });
  }

  return (
    <div>
      <Button variant="secondary" full onClick={onClick} disabled={pending}>
        {pending ? "Cancelling…" : "Cancel Pro"}
      </Button>
      {message ? (
        <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-3)" }}>{message}</p>
      ) : null}
    </div>
  );
}
