"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { cancelSubscription } from "./actions";

// Cancellation is deferred to the end of the current billing period (see
// cancelSubscription()), not immediate — so unlike a typical "cancel" action,
// the plan doesn't change right away. We still refresh once, so the page picks
// up the now-scheduled cancellation (its "Cancels on <date>" status) instead
// of continuing to show an active Cancel button that's already been used.
export function CancelButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    if (
      !confirm(
        "Cancel your Pro subscription? You'll keep Pro until the end of your current billing period, then move to Free. Unused time isn't refunded.",
      )
    )
      return;
    startTransition(async () => {
      const result = await cancelSubscription();
      setMessage(result.message);
      if (result.ok) router.refresh();
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
