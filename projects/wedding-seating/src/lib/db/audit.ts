import type { AuditEvent, Prisma } from "@prisma/client";
import { prisma } from "./client";

/**
 * The append-only activity/audit log. `recordEvent` is the single writer — call
 * it from a route AFTER a mutation succeeds, threading the actor. It must NEVER
 * throw into the request path: a logging failure can't be allowed to break the
 * actual operation, so everything is wrapped and swallowed (logged to stderr).
 * Reads are scoped in `listAuditEvents`.
 */

export type AuditActor = { userId: string; role: string; email: string | null };

const ROLE_LABELS: Record<string, string> = { venue: "Quinta", couple: "Noivos", supplier: "Fornecedor", admin: "Admin" };

/** A field-level diff map: { field: { from, to } }. Only changed fields belong here. */
export type Changes = Record<string, { from: unknown; to: unknown }>;

/** Build a diff of the fields that actually changed between two shallow objects. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>): Changes {
  const out: Changes = {};
  for (const key of Object.keys(after)) {
    const from = before[key];
    const to = (after as Record<string, unknown>)[key];
    if (from !== to) out[key] = { from, to };
  }
  return out;
}

export async function recordEvent(input: {
  weddingId: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  actorLabel?: string | null;
  supplierId?: string | null;
  changes?: Changes | null;
}): Promise<void> {
  try {
    const actorLabel = input.actorLabel?.trim() || input.actor.email || ROLE_LABELS[input.actor.role] || input.actor.role;
    await prisma.auditEvent.create({
      data: {
        weddingId: input.weddingId,
        actorProfileId: input.actor.userId,
        actorRole: input.actor.role,
        actorLabel,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        supplierId: input.supplierId ?? null,
        changes: (input.changes && Object.keys(input.changes).length > 0
          ? (input.changes as unknown as Prisma.InputJsonValue)
          : undefined),
      },
    });
  } catch (e) {
    // Never break the request over an audit-write failure.
    console.error("[audit] recordEvent failed:", e);
  }
}

/** How to scope an activity listing (mirrors the requirements ledger scoping). */
export type AuditScope =
  | { kind: "all" }
  | { kind: "supplier"; supplierId: string | null; profileId: string };

export function listAuditEvents(weddingId: string, scope: AuditScope, take = 200): Promise<AuditEvent[]> {
  const where: Prisma.AuditEventWhereInput =
    scope.kind === "all"
      ? { weddingId }
      : {
          weddingId,
          OR: [
            { actorProfileId: scope.profileId },
            ...(scope.supplierId ? [{ supplierId: scope.supplierId }] : []),
          ],
        };
  return prisma.auditEvent.findMany({ where, orderBy: { createdAt: "desc" }, take });
}

/**
 * "Novidades" (awareness): how many events a participant hasn't seen yet, per
 * wedding they take part in. Unseen = created after their `lastSeenActivityAt`
 * AND not authored by themselves (you're never notified about your own actions),
 * within their scope (venue/couple = all; supplier = their slot only). Returns a
 * { weddingId: count } map for the given profile.
 */
export async function unseenCountsForProfile(profileId: string): Promise<Record<string, number>> {
  const parts = await prisma.weddingParticipant.findMany({
    where: { profileId },
    select: { weddingId: true, role: true, supplierId: true, lastSeenActivityAt: true },
  });
  const entries = await Promise.all(
    parts.map(async (p) => {
      const since = p.lastSeenActivityAt ?? new Date(0);
      const where: Prisma.AuditEventWhereInput = {
        weddingId: p.weddingId,
        createdAt: { gt: since },
        actorProfileId: { not: profileId },
      };
      // A supplier only "hears about" events that concern their slot.
      if (p.role === "supplier") where.supplierId = p.supplierId ?? "__none__";
      const count = await prisma.auditEvent.count({ where });
      return [p.weddingId, count] as const;
    })
  );
  return Object.fromEntries(entries.filter(([, c]) => c > 0));
}
