// Shared date formatting for billing UI (next charge date, cancellation
// effective date) — one place so both the server component and the
// cancel action's confirmation message agree on the format.
export function formatBillingDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}
