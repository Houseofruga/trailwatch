"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { cancelSubscription } from "./actions";

export function CancelButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    if (!confirm("Cancel your Pro subscription? You'll move back to the Free plan.")) return;
    startTransition(async () => {
      const result = await cancelSubscription();
      setMessage(result.message);
    });
  }

  return (
    <div>
      <Button variant="secondary" onClick={onClick} disabled={pending}>
        {pending ? "Cancelling…" : "Cancel subscription"}
      </Button>
      {message ? <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-3)" }}>{message}</p> : null}
    </div>
  );
}
