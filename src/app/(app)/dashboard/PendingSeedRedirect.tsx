"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rendered only in the dashboard's zero-competitor state. If the visitor picked
 * competitors on /try before signing up (stashed in localStorage), send them to
 * the /welcome onboarding to confirm and create them. Returning users with real
 * competitors never hit this branch, so it can't loop them.
 */
export function PendingSeedRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tw_pending_competitors");
      if (!raw) return;
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) router.replace("/welcome");
    } catch {
      /* storage disabled — nothing to pre-seed */
    }
  }, [router]);
  return null;
}
