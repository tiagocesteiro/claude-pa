import { randomBytes } from "crypto";
import type { WeddingInvite } from "@prisma/client";
import { prisma } from "./client";
import { addParticipant } from "./participants";

/**
 * Invites let the venue bring the couple and suppliers INTO a wedding via a
 * shareable link (token). Accepting (while logged in) creates a WeddingParticipant
 * linking that account to the wedding. For supplier invites the token also lives
 * on the Supplier slot so the venue's list can show status + re-copy the link.
 */

const INVITE_TTL_DAYS = 30;

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

function expiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000);
}

/** Issue (or re-issue) an invite for a supplier SLOT. Returns the token. */
export async function createSupplierInvite(
  weddingId: string,
  supplierId: string,
  opts: { email?: string | null; service?: string | null } = {}
): Promise<string> {
  const token = newToken();
  await prisma.$transaction([
    prisma.supplier.update({
      where: { id: supplierId },
      data: {
        inviteToken: token,
        invitedAt: new Date(),
        ...(opts.email !== undefined ? { email: opts.email } : {}),
        ...(opts.service !== undefined ? { service: opts.service } : {}),
      },
    }),
    prisma.weddingInvite.create({
      data: {
        weddingId,
        email: opts.email ?? "",
        token,
        role: "supplier",
        supplierId,
        service: opts.service ?? null,
        expiresAt: expiry(),
      },
    }),
  ]);
  return token;
}

/** Issue an invite for the COUPLE. Returns the token. */
export async function createCoupleInvite(weddingId: string, email?: string | null): Promise<string> {
  const token = newToken();
  await prisma.weddingInvite.create({
    data: { weddingId, email: email ?? "", token, role: "couple", expiresAt: expiry() },
  });
  return token;
}

/** Invite preview by token (for the accept landing page). Null if unknown/expired. */
export async function getInvitePreview(token: string) {
  const inv = await prisma.weddingInvite.findUnique({
    where: { token },
    select: {
      id: true,
      role: true,
      service: true,
      supplierId: true,
      acceptedById: true,
      expiresAt: true,
      wedding: { select: { id: true, couple: true, date: true } },
    },
  });
  if (!inv) return null;
  if (inv.expiresAt.getTime() < Date.now()) return null;
  return inv;
}

/**
 * Accept an invite as `profileId`: creates/updates the WeddingParticipant, marks
 * the invite accepted, and (for supplier invites) links the Supplier slot to the
 * account. Returns the invite, or null if the token is invalid/expired.
 */
export async function acceptInvite(token: string, profileId: string): Promise<WeddingInvite | null> {
  const inv = await prisma.weddingInvite.findUnique({ where: { token } });
  if (!inv) return null;
  if (inv.expiresAt.getTime() < Date.now()) return null;

  const role = inv.role === "supplier" ? "supplier" : inv.role === "venue" ? "venue" : "couple";
  await addParticipant(inv.weddingId, profileId, role, inv.supplierId ?? null);
  await prisma.weddingInvite.update({ where: { id: inv.id }, data: { acceptedById: profileId } });
  if (inv.role === "supplier" && inv.supplierId) {
    await prisma.supplier.update({
      where: { id: inv.supplierId },
      data: { profileId, acceptedAt: new Date() },
    });
  }
  return inv;
}
