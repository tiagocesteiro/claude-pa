import "server-only";

import { getCurrentUser } from "@/lib/supabase/serverClient";
import { getOrCreateProfile, setProfileRole, type Role } from "@/lib/db/profiles";
import { isAdminEmail } from "./adminEmails";

/**
 * The authenticated caller for the current request: the Supabase user joined
 * with their app Profile (role). This is the single server-side source of "who
 * is acting" — route handlers and server components use it to set ownership on
 * create and to gate by role.
 *
 * Fase D1 uses the actor for: ownership-on-create (Venue/Wedding.ownerId) and
 * role routing. The full data-tenancy scoping of READ/list/leaf-mutation
 * queries lands in D2 — do NOT assume queries are owner-filtered yet.
 */
export interface Actor {
  userId: string;
  email: string | null;
  role: Role;
}

/** Signals an unauthenticated request. Route handlers translate this into a 401. */
export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Returns the actor for the current request, or null when logged out.
 * `getOrCreateProfile` guarantees a Profile row exists for any authenticated
 * user (so `role` is always present).
 */
export async function getActor(): Promise<Actor | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  let profile = await getOrCreateProfile(user);
  // Platform-admin promotion is driven ONLY by the server `ADMIN_EMAILS` env var
  // (never by request input). An allowlisted user's effective role becomes
  // "admin" and is persisted so it stays consistent across requests. Emails not
  // on the list keep their real role — getOrCreateProfile never changes it.
  if (isAdminEmail(user.email) && profile.role !== "admin") {
    profile = await setProfileRole(profile.id, "admin");
  }
  return { userId: user.id, email: user.email ?? null, role: profile.role as Role };
}

/** Like {@link getActor} but throws {@link UnauthorizedError} when logged out. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new UnauthorizedError();
  return actor;
}
