// Preview states for design review (UI Step 5): `?state=loading` etc. shows
// any designed state of a screen. Honoured only in development, so production
// URLs can't be pushed into fake states.

export const previewEnabled = process.env.NODE_ENV === "development";

export function previewState<T extends string>(
  raw: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!previewEnabled || typeof raw !== "string") return fallback;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}
