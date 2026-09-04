import type { Metadata } from "next";
import { ErrorState, HomeLink } from "@/components/ErrorState";

export const metadata: Metadata = { title: "Page not found" };

// Branded 404 — replaces Next's default. Reached by `notFound()` (e.g. an
// unknown change id) and any unmatched route.
export default function NotFound() {
  return (
    <ErrorState
      title="We couldn't find that page"
      body="The link may be broken, or the page may have moved. Everything you're tracking is on your dashboard."
      action={<HomeLink>Back to dashboard</HomeLink>}
    />
  );
}
