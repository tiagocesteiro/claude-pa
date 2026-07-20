import "server-only";

/**
 * Platform-admin allowlist — the ONLY way to become an admin.
 *
 * The set of admin emails is read from the server-side `ADMIN_EMAILS` env var
 * (comma-separated). It is NEVER derived from request input, signup, or a PATCH
 * body — only from this env var — so a client can never self-assign `admin`.
 * Matching is case-insensitive and whitespace-trimmed.
 */
export function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0)
  );
}

/** True when `email` is in the `ADMIN_EMAILS` allowlist. Empty/unset → nobody. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailSet().has(email.trim().toLowerCase());
}
