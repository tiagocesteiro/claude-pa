import type { LayoutSeat, Table, WeddingLayout } from "@prisma/client";
import { prisma } from "./client";
import type { WeddingTableInput } from "./weddingTables";

/**
 * Couple-owned room LAYOUTS (the multi-layout model). A wedding can hold several;
 * each layout owns its own tables (`Table.weddingLayoutId`) and its own seating
 * (`LayoutSeat`). Exactly one layout per wedding is `isFinal` — that one drives
 * the venue progress view, the Visão geral, and the PDF.
 *
 * A layout's background is EITHER a venue template's floor plan (read-only
 * render source, via `floorPlanId`) OR a blank room the couple defined by
 * dimensions (`width`/`depth`/`scale`, no floorPlanId).
 *
 * Tenancy is NOT enforced here — routes gate every call through
 * `assertLayoutAccess` / `assertWeddingAccess` (see `src/lib/auth/access.ts`).
 * The template↔venue match on creation-from-template is enforced by the route
 * (mirrors the apply-template H1 fix).
 */

/** A layout in a list, with the two progress counts the UI needs. */
export interface LayoutSummary {
  id: string;
  weddingId: string;
  name: string;
  isFinal: boolean;
  floorPlanId: string | null;
  templateId: string | null;
  width: number | null;
  depth: number | null;
  scale: number | null;
  createdAt: Date;
  tableCount: number;
  seatedCount: number;
}

/** Layouts of ONE moment (moment-scoped now, was wedding-scoped). */
export async function listLayouts(momentId: string): Promise<LayoutSummary[]> {
  const rows = await prisma.weddingLayout.findMany({
    where: { momentId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { tables: true, seats: true } } },
  });
  return rows.map((l) => ({
    id: l.id,
    weddingId: l.weddingId,
    name: l.name,
    isFinal: l.isFinal,
    floorPlanId: l.floorPlanId,
    templateId: l.templateId,
    width: l.width,
    depth: l.depth,
    scale: l.scale,
    createdAt: l.createdAt,
    tableCount: l._count.tables,
    seatedCount: l._count.seats,
  }));
}

export function getLayout(layoutId: string): Promise<WeddingLayout | null> {
  return prisma.weddingLayout.findUnique({ where: { id: layoutId } });
}

/** The moment's chosen layout (`isFinal`), or null if none marked yet. */
export function getFinalLayout(momentId: string): Promise<WeddingLayout | null> {
  return prisma.weddingLayout.findFirst({ where: { momentId, isFinal: true } });
}

/** True when the moment has no layouts yet — the first created becomes final. */
async function isFirstLayout(momentId: string): Promise<boolean> {
  const n = await prisma.weddingLayout.count({ where: { momentId } });
  return n === 0;
}

/**
 * New couple layout seeded from a venue TEMPLATE: copies the template's tables
 * into the layout (fresh ids, couple-owned) and adopts the template's floor plan
 * as the read-only background. The route must have verified the template belongs
 * to the wedding's venue.
 */
export async function createLayoutFromTemplate(
  momentId: string,
  templateId: string,
  name: string
): Promise<WeddingLayout> {
  const moment = await prisma.weddingMoment.findUniqueOrThrow({
    where: { id: momentId },
    select: { weddingId: true },
  });
  const template = await prisma.layoutTemplate.findUniqueOrThrow({
    where: { id: templateId },
    select: { floorPlanId: true, floorPlan: { select: { elements: true } } },
  });
  const templateTables = await prisma.table.findMany({ where: { templateId } });
  const isFinal = await isFirstLayout(momentId);

  return prisma.weddingLayout.create({
    data: {
      weddingId: moment.weddingId,
      momentId,
      name,
      isFinal,
      templateId,
      floorPlanId: template.floorPlanId,
      // Seed the couple's editable elements from the template's floor plan.
      elements: template.floorPlan?.elements ?? null,
      tables: {
        create: templateTables.map((t) => ({
          shape: t.shape,
          capacity: t.capacity,
          minCapacity: t.minCapacity,
          width: t.width,
          depth: t.depth,
          x: t.x,
          y: t.y,
          fixed: t.fixed,
          name: t.name,
          heads: t.heads,
        })),
      },
    },
  });
}

/** New couple layout as a BLANK room defined by dimensions (no floor plan, no
 * tables — the couple adds them in the editor). */
export async function createBlankLayout(
  momentId: string,
  input: { name: string; width: number; depth: number; scale: number }
): Promise<WeddingLayout> {
  const moment = await prisma.weddingMoment.findUniqueOrThrow({
    where: { id: momentId },
    select: { weddingId: true },
  });
  const isFinal = await isFirstLayout(momentId);
  return prisma.weddingLayout.create({
    data: {
      weddingId: moment.weddingId,
      momentId,
      name: input.name,
      isFinal,
      width: input.width,
      depth: input.depth,
      scale: input.scale,
    },
  });
}

export function renameLayout(layoutId: string, name: string): Promise<WeddingLayout> {
  return prisma.weddingLayout.update({ where: { id: layoutId }, data: { name } });
}

/** Persist the layout's generic decorative elements (bar, dance floor, ...) as a
 * JSON string (or null when empty). */
export function saveLayoutElements(layoutId: string, elements: string | null): Promise<WeddingLayout> {
  return prisma.weddingLayout.update({ where: { id: layoutId }, data: { elements } });
}

/**
 * Mark one layout as the wedding's final choice — atomically clears the flag on
 * every OTHER layout of the wedding and sets it on this one. Both writes are
 * scoped by `weddingId` so a layout id from another wedding is a no-op.
 */
export async function setFinalLayout(momentId: string, layoutId: string): Promise<void> {
  // Guard membership first: without this, a layoutId from another moment would
  // clear this moment's flag (first updateMany) without setting a new one.
  const belongs = await prisma.weddingLayout.findFirst({
    where: { id: layoutId, momentId },
    select: { id: true },
  });
  if (!belongs) return;
  await prisma.$transaction([
    prisma.weddingLayout.updateMany({
      where: { momentId, id: { not: layoutId } },
      data: { isFinal: false },
    }),
    prisma.weddingLayout.updateMany({
      where: { momentId, id: layoutId },
      data: { isFinal: true },
    }),
  ]);
}

/**
 * Delete a layout (its tables + seats cascade). If the deleted layout was the
 * final one and other layouts remain in the MOMENT, promote the oldest remaining
 * to final so a moment with ≥1 layout always has exactly one final.
 */
export async function deleteLayout(layoutId: string): Promise<void> {
  const layout = await prisma.weddingLayout.findUnique({
    where: { id: layoutId },
    select: { momentId: true, isFinal: true },
  });
  if (!layout) return;

  await prisma.weddingLayout.delete({ where: { id: layoutId } });

  if (layout.isFinal && layout.momentId) {
    const next = await prisma.weddingLayout.findFirst({
      where: { momentId: layout.momentId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (next) {
      await prisma.weddingLayout.update({ where: { id: next.id }, data: { isFinal: true } });
    }
  }
}

// ── Per-layout tables ────────────────────────────────────────────────────────

export function listLayoutTables(layoutId: string): Promise<Table[]> {
  return prisma.table.findMany({ where: { weddingLayoutId: layoutId } });
}

/**
 * Save a layout's tables with the id-diff strategy (like `saveWeddingTables`):
 * matched ids are updated in place, new ones created, removed ones deleted.
 * Preserving ids matters because `LayoutSeat.tableId` FKs them — removed tables
 * cascade-drop their seats automatically (no manual unseat needed).
 */
export async function saveLayoutTables(
  layoutId: string,
  tables: WeddingTableInput[]
): Promise<void> {
  const existing = await prisma.table.findMany({
    where: { weddingLayoutId: layoutId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((t) => t.id));

  const toUpdate = tables.filter(
    (t): t is WeddingTableInput & { id: string } => !!t.id && existingIds.has(t.id)
  );
  const toCreate = tables.filter((t) => !t.id || !existingIds.has(t.id));
  const keepIds = new Set(toUpdate.map((t) => t.id));
  const removedIds = existing.map((t) => t.id).filter((id) => !keepIds.has(id));

  await prisma.$transaction([
    ...toUpdate.map((t) =>
      prisma.table.update({
        where: { id: t.id },
        data: {
          shape: t.shape,
          capacity: t.capacity,
          x: t.x,
          y: t.y,
          fixed: t.fixed,
          width: t.width ?? null,
          depth: t.depth ?? null,
          minCapacity: t.minCapacity ?? null,
          name: t.name ?? null,
          heads: t.heads ?? null,
        },
      })
    ),
    ...(toCreate.length
      ? [
          prisma.table.createMany({
            data: toCreate.map(({ id, ...rest }) => {
              void id;
              return { ...rest, weddingLayoutId: layoutId };
            }),
          }),
        ]
      : []),
    // Seats at a removed table cascade away via the LayoutSeat.tableId FK.
    ...(removedIds.length
      ? [prisma.table.deleteMany({ where: { id: { in: removedIds } } })]
      : []),
  ]);
}

// ── Per-layout seating ───────────────────────────────────────────────────────

export function getLayoutSeats(layoutId: string): Promise<LayoutSeat[]> {
  return prisma.layoutSeat.findMany({ where: { weddingLayoutId: layoutId } });
}

/**
 * Persist seat assignments for ONE layout. Each entry is validated against this
 * layout's own guests (via the wedding) and tables before it touches the DB, so
 * a foreign guest/table id from the request body is ignored rather than trusted
 * (tenancy — mirrors the assignment C1 fix). `tableId: null` unseats the guest
 * (drops the row); a value upserts the single seat for that guest in this layout.
 */
export async function saveLayoutAssignment(
  layoutId: string,
  assignments: { guestId: string; tableId: string | null }[]
): Promise<void> {
  const layout = await prisma.weddingLayout.findUniqueOrThrow({
    where: { id: layoutId },
    select: { weddingId: true },
  });
  const [guests, tables] = await Promise.all([
    prisma.guest.findMany({ where: { weddingId: layout.weddingId }, select: { id: true } }),
    prisma.table.findMany({ where: { weddingLayoutId: layoutId }, select: { id: true } }),
  ]);
  const validGuest = new Set(guests.map((g) => g.id));
  const validTable = new Set(tables.map((t) => t.id));

  const ops = [];
  for (const a of assignments) {
    if (!validGuest.has(a.guestId)) continue; // foreign guest — ignore
    if (a.tableId === null) {
      ops.push(
        prisma.layoutSeat.deleteMany({ where: { weddingLayoutId: layoutId, guestId: a.guestId } })
      );
    } else {
      if (!validTable.has(a.tableId)) continue; // table not in this layout — ignore
      ops.push(
        prisma.layoutSeat.upsert({
          where: { weddingLayoutId_guestId: { weddingLayoutId: layoutId, guestId: a.guestId } },
          create: { weddingLayoutId: layoutId, guestId: a.guestId, tableId: a.tableId },
          update: { tableId: a.tableId },
        })
      );
    }
  }
  if (ops.length) await prisma.$transaction(ops);
}

export async function clearLayoutSeats(layoutId: string): Promise<void> {
  await prisma.layoutSeat.deleteMany({ where: { weddingLayoutId: layoutId } });
}
