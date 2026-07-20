import type { Profile } from "@prisma/client";
import { prisma } from "./client";

export type Role = "venue" | "couple" | "admin";

export function getProfile(id: string): Promise<Profile | null> {
  return prisma.profile.findUnique({ where: { id } });
}

/** Persists a role change on an existing Profile. Used only server-side to
 * promote an allowlisted user to "admin" (see `isAdminEmail`) — never driven by
 * request input. */
export function setProfileRole(id: string, role: Role): Promise<Profile> {
  return prisma.profile.update({ where: { id }, data: { role } });
}

/** Creates the Profile on first login, or returns/refreshes it if it already exists. */
export function upsertProfile(input: { id: string; email: string; role: Role }): Promise<Profile> {
  return prisma.profile.upsert({
    where: { id: input.id },
    create: { id: input.id, email: input.email, role: input.role },
    update: { email: input.email },
  });
}

/**
 * Ensures a Profile row exists for an authenticated Supabase user. Used right
 * after signup/login so the app always knows the user's role, even if the
 * Profile-creation step of signup was interrupted (e.g. email-confirmation
 * flow) or the user was created directly in Supabase.
 */
export function getOrCreateProfile(
  user: { id: string; email?: string | null },
  fallbackRole: Role = "couple"
): Promise<Profile> {
  return prisma.profile.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email ?? "", role: fallbackRole },
    update: {},
  });
}
