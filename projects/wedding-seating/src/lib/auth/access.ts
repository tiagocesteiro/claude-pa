import "server-only";

import { prisma } from "@/lib/db/client";
import type { Actor } from "./actor";

/**
 * Fase D2 authorization layer — the single, testable place that answers
 * "may THIS actor read/write THIS entity?". Route handlers thread `getActor()`
 * (401 when null) and then call these helpers; a failed check throws an
 * {@link AccessError} the route maps to an HTTP status.
 *
 * ── Access matrix ──────────────────────────────────────────────────────────
 * Venue-owned (Venue.ownerId; FloorPlan/TableType/LayoutTemplate resolve their
 * owner through venueId → Venue.ownerId):
 *   • venue actor  → read+write on venues they own.
 *   • couple actor → READ-ONLY, and only on a venue referenced by one of their
 *     own weddings (∃ Wedding ownerId=actor AND venueId=thatVenue). Never write.
 *   • admin        → everything.
 * Wedding-owned (Wedding.ownerId; Guest/Group/Constraint/Table resolve through
 * weddingId → Wedding.ownerId):
 *   • couple actor → read+write on weddings they own.
 *   • venue actor  → DENIED (venue↔couple sharing is Fase E).
 *   • admin        → everything.
 *
 * ── Status-code convention ─────────────────────────────────────────────────
 * We prefer **404** whenever the answer is "not found OR not yours" so we never
 * leak the existence of another tenant's row (id enumeration). We use **403**
 * only for a role that *fundamentally* cannot perform the operation regardless
 * of ownership — a couple trying to WRITE venue-owned data, or a venue touching
 * any wedding-owned data. Concretely:
 *   • entity missing                              → 404
 *   • venue actor on a venue/plan/… they don't own → 404 (hide existence)
 *   • couple actor on an unrelated venue (read)    → 404 (hide existence)
 *   • couple actor WRITING venue-owned            → 403 (role can never write)
 *   • venue actor on any wedding-owned            → 403 (role has no access yet)
 */

export type AccessMode = "read" | "write";

/** Thrown when an actor may not perform the requested access. `status` is the
 * HTTP code the route should return (see the convention above). */
export class AccessError extends Error {
  constructor(
    public readonly status: 403 | 404,
    message: string
  ) {
    super(message);
    this.name = "AccessError";
  }
}

const notFound = (what: string) => new AccessError(404, `${what} not found.`);

// ── Venue side ──────────────────────────────────────────────────────────────

/** Venues visible to the actor: venue→own; couple→venues booked by one of their
 * weddings; admin→all. Ordered newest-first to match the legacy `listVenues`. */
export function listVenuesFor(actor: Actor) {
  if (actor.role === "admin") {
    return prisma.venue.findMany({ orderBy: { createdAt: "desc" } });
  }
  if (actor.role === "venue") {
    return prisma.venue.findMany({
      where: { ownerId: actor.userId },
      orderBy: { createdAt: "desc" },
    });
  }
  // couple: only venues referenced by a wedding they own.
  return prisma.venue.findMany({
    where: { weddings: { some: { ownerId: actor.userId } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Core venue gate. All venue-owned resolvers funnel here after resolving venueId. */
export async function assertVenueAccess(
  actor: Actor,
  venueId: string,
  mode: AccessMode
): Promise<void> {
  if (actor.role === "admin") {
    const exists = await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true } });
    if (!exists) throw notFound("Venue");
    return;
  }

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { ownerId: true },
  });
  if (!venue) throw notFound("Venue");

  if (actor.role === "venue") {
    if (venue.ownerId === actor.userId) return;
    throw notFound("Venue"); // exists but not yours — don't leak it
  }

  // couple: read-only, and only for a venue they've booked.
  if (mode === "write") {
    throw new AccessError(403, "Couples cannot modify venue data.");
  }
  const booked = await prisma.wedding.findFirst({
    where: { ownerId: actor.userId, venueId },
    select: { id: true },
  });
  if (booked) return;
  throw notFound("Venue"); // unrelated venue — hide it
}

/** Floor plans scoped to the actor: venue→own venues' plans; couple→plans of
 * their weddings' venues; admin→all. */
export function listFloorPlansFor(actor: Actor) {
  if (actor.role === "admin") {
    return prisma.floorPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: { venue: { select: { name: true } } },
    });
  }
  const venueWhere =
    actor.role === "venue"
      ? { ownerId: actor.userId }
      : { weddings: { some: { ownerId: actor.userId } } };
  return prisma.floorPlan.findMany({
    where: { venue: venueWhere },
    orderBy: { createdAt: "desc" },
    include: { venue: { select: { name: true } } },
  });
}

/** Templates scoped like floor plans: venue→own; couple→their weddings' venues'
 * templates; admin→all. Shape matches the legacy `GET /api/templates` select. */
export function listTemplatesFor(actor: Actor) {
  const select = {
    id: true,
    name: true,
    minGuests: true,
    maxGuests: true,
    venueId: true,
    venue: { select: { name: true } },
    floorPlanId: true,
    floorPlan: { select: { image: true } },
  } as const;
  if (actor.role === "admin") {
    return prisma.layoutTemplate.findMany({ select, orderBy: { createdAt: "asc" } });
  }
  const venueWhere =
    actor.role === "venue"
      ? { ownerId: actor.userId }
      : { weddings: { some: { ownerId: actor.userId } } };
  return prisma.layoutTemplate.findMany({
    where: { venue: venueWhere },
    select,
    orderBy: { createdAt: "asc" },
  });
}

export async function assertFloorPlanAccess(
  actor: Actor,
  floorPlanId: string,
  mode: AccessMode
): Promise<void> {
  const fp = await prisma.floorPlan.findUnique({
    where: { id: floorPlanId },
    select: { venueId: true },
  });
  if (!fp) throw notFound("Floor plan");
  await assertVenueAccess(actor, fp.venueId, mode);
}

export async function assertTemplateAccess(
  actor: Actor,
  templateId: string,
  mode: AccessMode
): Promise<void> {
  const tpl = await prisma.layoutTemplate.findUnique({
    where: { id: templateId },
    select: { venueId: true },
  });
  if (!tpl) throw notFound("Template");
  await assertVenueAccess(actor, tpl.venueId, mode);
}

export async function assertTableTypeAccess(
  actor: Actor,
  tableTypeId: string,
  mode: AccessMode
): Promise<void> {
  const tt = await prisma.tableType.findUnique({
    where: { id: tableTypeId },
    select: { venueId: true },
  });
  if (!tt) throw notFound("Table type");
  await assertVenueAccess(actor, tt.venueId, mode);
}

// ── Wedding side (built now; applied to routes in D2b) ───────────────────────

/** Weddings visible to the actor: couple→own; venue→none (Fase E); admin→all. */
export function listWeddingsFor(actor: Actor) {
  if (actor.role === "admin") {
    return prisma.wedding.findMany({ orderBy: { createdAt: "desc" } });
  }
  if (actor.role === "couple") {
    return prisma.wedding.findMany({
      where: { ownerId: actor.userId },
      orderBy: { createdAt: "desc" },
    });
  }
  // venue: no wedding access until Fase E.
  return Promise.resolve([]);
}

/** Core wedding gate. All wedding-owned resolvers funnel here. */
export async function assertWeddingAccess(
  actor: Actor,
  weddingId: string,
  _mode: AccessMode = "read"
): Promise<void> {
  void _mode; // couple owners get read+write; there is no couple read-only case here.
  if (actor.role === "admin") {
    const w = await prisma.wedding.findUnique({ where: { id: weddingId }, select: { id: true } });
    if (!w) throw notFound("Wedding");
    return;
  }
  if (actor.role === "venue") {
    // Venues have no access to wedding-owned data until cross-tenant sharing (Fase E).
    throw new AccessError(403, "Venues cannot access weddings yet.");
  }
  // couple: owner-only.
  const w = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { ownerId: true },
  });
  if (!w) throw notFound("Wedding");
  if (w.ownerId === actor.userId) return;
  throw notFound("Wedding"); // exists but not yours
}

/**
 * Fase E — the venue's ONLY window into weddings booked at its venue(s), and a
 * strictly PII-free one (RGPD). A venue account may see, per wedding, only the
 * couple's name, the date, the guest estimate, aggregate RSVP/seating COUNTS,
 * and two "what's-missing" booleans. It NEVER sees guest names, dietary/allergy
 * data, or the seating/plan layout — those columns are never selected here, so
 * they cannot leak through this channel. All existing wedding routes stay
 * venue-denied (see {@link assertWeddingAccess}); this is the sole exception.
 */
export interface VenueBookingSummary {
  id: string;
  couple: string;
  date: Date | null;
  venueId: string | null;
  venueName: string | null;
  guestEstimate: number | null;
  /** Counts only — never any guest identity. */
  guests: { total: number; confirmed: number; pending: number; declined: number; seated: number };
  /** Wedding has dinner tables OR a picked template. */
  arrangementPicked: boolean;
  /** Every guest is seated (and there is at least one). */
  seatingDone: boolean;
}

/**
 * Progress summaries for the weddings booked at the actor's venue(s):
 *   • venue  → weddings whose `venue.ownerId === actor.userId`.
 *   • admin  → all weddings.
 *   • couple → not applicable (empty).
 * Returns ONLY the PII-free fields in {@link VenueBookingSummary}. The guest
 * select is deliberately limited to `rsvp` + `assignedTableId` — `name`,
 * `dietary`, and every other identifying column are never read.
 */
export async function listVenueBookings(actor: Actor): Promise<VenueBookingSummary[]> {
  if (actor.role === "couple") return [];

  const where = actor.role === "admin" ? {} : { venue: { ownerId: actor.userId } };

  const weddings = await prisma.wedding.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      id: true,
      couple: true,
      date: true,
      venueId: true,
      guestEstimate: true,
      templateId: true,
      venue: { select: { name: true } },
      // PII-free: only RSVP status + whether the guest is seated. NEVER name/dietary.
      guests: { select: { rsvp: true, assignedTableId: true } },
      _count: { select: { tables: true } },
      // The couple's FINAL layout drives progress now (counts only, no PII);
      // falls back to the legacy arrangement below when none is marked final.
      layouts: { where: { isFinal: true }, select: { _count: { select: { tables: true, seats: true } } } },
    },
  });

  return weddings.map((w) => {
    const total = w.guests.length;
    let confirmed = 0;
    let pending = 0;
    let declined = 0;
    let legacySeated = 0;
    for (const g of w.guests) {
      if (g.rsvp === "confirmed") confirmed++;
      else if (g.rsvp === "declined") declined++;
      else pending++; // "pending" or null → pending
      if (g.assignedTableId) legacySeated++;
    }
    const final = w.layouts[0];
    const hasFinal = w.layouts.length > 0;
    const seated = hasFinal ? final._count.seats : legacySeated;
    const arrangementPicked = hasFinal
      ? final._count.tables > 0
      : w._count.tables > 0 || w.templateId != null;
    return {
      id: w.id,
      couple: w.couple,
      date: w.date,
      venueId: w.venueId,
      venueName: w.venue?.name ?? null,
      guestEstimate: w.guestEstimate,
      guests: { total, confirmed, pending, declined, seated },
      arrangementPicked,
      seatingDone: total > 0 && seated === total,
    };
  });
}

// ── Platform-admin overview (admin role only) ────────────────────────────────

/** One venue row in the admin overview: identity + owner + child counts. */
export interface AdminVenueRow {
  id: string;
  name: string;
  location: string | null;
  ownerEmail: string | null;
  floorPlanCount: number;
  templateCount: number;
  weddingCount: number;
}

/** One wedding row in the admin overview: identity + owner + aggregate progress.
 * (Full guest/seating detail lives on the wedding page, which admin can open.) */
export interface AdminWeddingRow {
  id: string;
  couple: string;
  date: Date | null;
  venueName: string | null;
  ownerEmail: string | null;
  guests: { total: number; confirmed: number; pending: number; declined: number; seated: number };
  arrangementPicked: boolean;
  seatingDone: boolean;
}

export interface AdminOverview {
  venues: AdminVenueRow[];
  weddings: AdminWeddingRow[];
}

/**
 * The platform operator's cross-tenant view of EVERY venue and wedding. Only an
 * `admin` actor may reach this (the route enforces the 403); the admin role
 * already bypasses tenancy everywhere else, so this is just the aggregation.
 * `ownerEmail` is resolved by joining Venue/Wedding.ownerId → Profile.email
 * (there is no Prisma relation, so we build the map ourselves); null if unowned.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const [venues, weddings, profiles] = await Promise.all([
    prisma.venue.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        location: true,
        ownerId: true,
        _count: { select: { floorPlans: true, layoutTemplates: true, weddings: true } },
      },
    }),
    prisma.wedding.findMany({
      orderBy: { date: "asc" },
      select: {
        id: true,
        couple: true,
        date: true,
        ownerId: true,
        templateId: true,
        venue: { select: { name: true } },
        guests: { select: { rsvp: true, assignedTableId: true } },
        _count: { select: { tables: true } },
        layouts: { where: { isFinal: true }, select: { _count: { select: { tables: true, seats: true } } } },
      },
    }),
    prisma.profile.findMany({ select: { id: true, email: true } }),
  ]);

  const emailById = new Map(profiles.map((p) => [p.id, p.email]));
  const ownerEmail = (ownerId: string | null) => (ownerId ? emailById.get(ownerId) ?? null : null);

  return {
    venues: venues.map((v) => ({
      id: v.id,
      name: v.name,
      location: v.location,
      ownerEmail: ownerEmail(v.ownerId),
      floorPlanCount: v._count.floorPlans,
      templateCount: v._count.layoutTemplates,
      weddingCount: v._count.weddings,
    })),
    weddings: weddings.map((w) => {
      let confirmed = 0;
      let pending = 0;
      let declined = 0;
      let legacySeated = 0;
      for (const g of w.guests) {
        if (g.rsvp === "confirmed") confirmed++;
        else if (g.rsvp === "declined") declined++;
        else pending++; // "pending" or null → pending
        if (g.assignedTableId) legacySeated++;
      }
      const total = w.guests.length;
      const final = w.layouts[0];
      const hasFinal = w.layouts.length > 0;
      const seated = hasFinal ? final._count.seats : legacySeated;
      const arrangementPicked = hasFinal
        ? final._count.tables > 0
        : w._count.tables > 0 || w.templateId != null;
      return {
        id: w.id,
        couple: w.couple,
        date: w.date,
        venueName: w.venue?.name ?? null,
        ownerEmail: ownerEmail(w.ownerId),
        guests: { total, confirmed, pending, declined, seated },
        arrangementPicked,
        seatingDone: total > 0 && seated === total,
      };
    }),
  };
}

export async function assertGuestAccess(
  actor: Actor,
  guestId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const g = await prisma.guest.findUnique({ where: { id: guestId }, select: { weddingId: true } });
  if (!g) throw notFound("Guest");
  await assertWeddingAccess(actor, g.weddingId, mode);
}

export async function assertGroupAccess(
  actor: Actor,
  groupId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const g = await prisma.group.findUnique({ where: { id: groupId }, select: { weddingId: true } });
  if (!g) throw notFound("Group");
  await assertWeddingAccess(actor, g.weddingId, mode);
}

export async function assertConstraintAccess(
  actor: Actor,
  constraintId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const c = await prisma.constraint.findUnique({
    where: { id: constraintId },
    select: { weddingId: true },
  });
  if (!c) throw notFound("Constraint");
  await assertWeddingAccess(actor, c.weddingId, mode);
}

// ── Moments · tasks · decoration · suppliers (wedding-owned) ─────────────────

/** A WeddingMoment (and its tasks + decor) is owned by the couple who owns the
 * parent wedding — resolve through weddingId → the wedding gate. */
export async function assertMomentAccess(
  actor: Actor,
  momentId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const m = await prisma.weddingMoment.findUnique({
    where: { id: momentId },
    select: { weddingId: true },
  });
  if (!m) throw notFound("Moment");
  await assertWeddingAccess(actor, m.weddingId, mode);
}

/** A task belongs to a moment → wedding. */
export async function assertTaskAccess(
  actor: Actor,
  taskId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const t = await prisma.momentTask.findUnique({
    where: { id: taskId },
    select: { moment: { select: { weddingId: true } } },
  });
  if (!t) throw notFound("Task");
  await assertWeddingAccess(actor, t.moment.weddingId, mode);
}

/** A decoration line belongs to a moment → wedding. */
export async function assertMomentDecorAccess(
  actor: Actor,
  decorId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const d = await prisma.momentDecor.findUnique({
    where: { id: decorId },
    select: { moment: { select: { weddingId: true } } },
  });
  if (!d) throw notFound("Decor");
  await assertWeddingAccess(actor, d.moment.weddingId, mode);
}

/** A supplier is wedding-owned. */
export async function assertSupplierAccess(
  actor: Actor,
  supplierId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const s = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { weddingId: true },
  });
  if (!s) throw notFound("Supplier");
  await assertWeddingAccess(actor, s.weddingId, mode);
}

/** A DecorItem is venue-owned (the venue's catalog) — venue writes; couple reads
 * a venue it has booked (same rule as floor plans / templates). */
export async function assertDecorItemAccess(
  actor: Actor,
  decorItemId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const item = await prisma.decorItem.findUnique({
    where: { id: decorItemId },
    select: { venueId: true },
  });
  if (!item) throw notFound("Decor item");
  await assertVenueAccess(actor, item.venueId, mode);
}

/**
 * A couple-owned WeddingLayout (and its tables + seats) is owned by the couple
 * who owns the parent wedding — resolve through weddingId and defer to the
 * wedding gate. Venues have no access to layouts (their only window is the
 * PII-free progress of the FINAL layout via {@link listVenueBookings}); admin
 * bypasses as everywhere.
 */
export async function assertLayoutAccess(
  actor: Actor,
  layoutId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const l = await prisma.weddingLayout.findUnique({
    where: { id: layoutId },
    select: { weddingId: true },
  });
  if (!l) throw notFound("Layout");
  await assertWeddingAccess(actor, l.weddingId, mode);
}

/**
 * Table is polymorphic — it belongs to a wedding, a floor plan, or a template
 * (exactly one FK set). Resolve through whichever is present, then defer to that
 * owner's gate (weddings via {@link assertWeddingAccess}, plan/template via the
 * venue gate).
 */
export async function assertTableAccess(
  actor: Actor,
  tableId: string,
  mode: AccessMode = "read"
): Promise<void> {
  const t = await prisma.table.findUnique({
    where: { id: tableId },
    select: { weddingId: true, floorPlanId: true, templateId: true, weddingLayoutId: true },
  });
  if (!t) throw notFound("Table");
  if (t.weddingLayoutId) return assertLayoutAccess(actor, t.weddingLayoutId, mode);
  if (t.weddingId) return assertWeddingAccess(actor, t.weddingId, mode);
  if (t.floorPlanId) return assertFloorPlanAccess(actor, t.floorPlanId, mode);
  if (t.templateId) return assertTemplateAccess(actor, t.templateId, mode);
  throw notFound("Table"); // orphan row with no owner FK — deny
}
