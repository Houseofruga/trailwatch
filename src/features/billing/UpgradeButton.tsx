"use client";

import { useEffect, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Button } from "@/components/Button";

// Opens Paddle's checkout overlay in-app. We stamp `userId` into customData so
// the webhook can tie the resulting subscription back to this account, and
// prefill the email. Plan flips to paid only when the webhook lands — this
// button just starts checkout.
export function UpgradeButton({ email, userId }: { email: string; userId: string }) {
  const [paddle, setPaddle] = useState<Paddle>();

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
  const environment =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

  useEffect(() => {
    if (!token) return;
    initializePaddle({ environment, token }).then((instance) => {
      if (instance) setPaddle(instance);
    });
  }, [token, environment]);

  const configured = Boolean(token && priceId);

  function openCheckout() {
    if (!paddle || !priceId) return;
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email },
      customData: { userId },
      settings: { displayMode: "overlay", theme: "light" },
    });
  }

  return (
    <Button onClick={openCheckout} disabled={!configured || !paddle}>
      {configured ? "Upgrade to Pro" : "Upgrade unavailable — billing not configured"}
    </Button>
  );
}
