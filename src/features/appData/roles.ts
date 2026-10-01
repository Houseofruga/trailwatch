// "What's your role?" in onboarding (optional). Values match the users.role
// check constraint (migration 0017).
export const ROLES = [
  { value: "founder", label: "Founder or owner" },
  { value: "marketer", label: "Marketing or growth" },
  { value: "agency", label: "Agency or consultant" },
  { value: "other", label: "Something else" },
] as const;

export type UserRole = (typeof ROLES)[number]["value"];

export const roleLabel = (role: string | null | undefined) => ROLES.find((r) => r.value === role)?.label ?? null;
