"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Button } from "@/components/Button";

// Opens Paddle's checkout overlay in-app. We stamp `userId` into customData so
// the webhook can tie the resulting subscription back to this account, and
// prefill the email. The plan flips to paid when the webhook lands — so on
// checkout.completed we close the overlay and poll the server until this page
// re-renders as Pro (this component unmounts at that point), rather than making
// the user close and refresh by hand.
export function UpgradeButton({ email, userId }: { email: string; userId: string }) {
  const router = useRouter();
  const [paddle, setPaddle] = useState<Paddle>();
  const [finalizing, setFinalizing] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
  const environment =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

  useEffect(() => {
    if (!token) return;
    initializePaddle({
      environment,
      token,
      eventCallback: (event) => {
        if (event?.name === "checkout.completed") setFinalizing(true);
      },
    }).then((instance) => {
      if (instance) setPaddle(instance);
    });
  }, [token, environment]);

  // Payment done: close the overlay, then refresh on a short interval. The
  // webhook usually lands in a second or two; once it does, the server renders
  // the Pro state and swaps this component out, clearing the interval. If it
  // hasn't landed after the cap, fall back to a gentle "refresh in a moment".
  useEffect(() => {
    if (!finalizing) return;
    paddle?.Checkout.close();
    router.refresh();
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      if (tries >= 8) {
        clearInterval(id);
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, 2000);
    return () => clearInterval(id);
  }, [finalizing, paddle, router]);

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

  if (finalizing) {
    return (
      <div>
        <Button full disabled>
          Finalizing your upgrade…
        </Button>
        {timedOut ? (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--ink-3)" }}>
            Payment received. If this doesn&rsquo;t update in a moment, refresh the page.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Button full onClick={openCheckout} disabled={!configured || !paddle}>
      {configured ? "Continue to checkout" : "Upgrade unavailable — billing not configured"}
    </Button>
  );
}
