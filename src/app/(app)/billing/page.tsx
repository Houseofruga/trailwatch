import { redirect } from "next/navigation";

// Billing lives in Settings › Plan now (UX_SPEC.md §4.7). Kept as a redirect
// so old links (checkout return URLs, emails) still land somewhere useful.
export default function BillingPage() {
  redirect("/settings#plan");
}
