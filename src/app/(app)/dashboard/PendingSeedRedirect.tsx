"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rendered only in the dashboard's zero-competitor state — i.e. for users who
 * haven't set up a watchlist yet. Sends them to the /welcome onboarding unless
 * they've already been through it (the `tw_onboarded` flag, set when they finish
 * or skip). This covers both paths in: visitors who picked competitors on the homepage (/)
 * (stashed in localStorage, confirmed on /welcome) and those who just tapped
 * "Start free" (onboarding seeds blank rows for them). Users with real
 * competitors never hit this branch, so it can't loop them.
 */
export function PendingSeedRedirect() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (localStorage.getItem("tw_onboarded") === "1") return;
      router.replace("/welcome");
    } catch {
      /* storage disabled — skip onboarding rather than risk a loop */
    }
  }, [router]);
  return null;
}
