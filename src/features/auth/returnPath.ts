// Where to send someone after they log in, when they were stopped on their way
// to a page in the app (an alert email's link, a bookmark). Pure and
// dependency-free, so the proxy, the auth form (client) and the auth actions
// (server) agree on what is allowed.

const RETURN_PATH = /^\/(dashboard|competitors|opportunities|settings)(?:[/?#][\w\-./?=&%#~:+]*)?$/;

/** An in-app path we'll return to, or null. Only our own app pages: never another site. */
export function returnPath(raw: unknown): string | null {
  return typeof raw === "string" && raw.length <= 500 && !raw.includes("//") && RETURN_PATH.test(raw) ? raw : null;
}
