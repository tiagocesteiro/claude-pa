import { NextResponse } from "next/server";
import { getLayout, listLayoutTables, getLayoutSeats, saveLayoutAssignment } from "@/lib/db/layouts";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { buildSeatingInput } from "@/lib/plan/buildSeatingInput";
import { solveSeating } from "@/lib/seating";
import { assertLayoutAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

// Node runtime (prisma/solver are Node-only); larger timeout for the solver.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Auto-seat this layout: run the seating engine over THIS layout's tables + the
 * wedding's shared guests/constraints, treating each guest's existing seat IN
 * THIS LAYOUT (and their locked flag / fixed tables) as pinned. Results are
 * persisted as LayoutSeat rows — independent of any other layout's seating.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ layoutId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }

  const layout = await getLayout(layoutId);
  if (!layout) return NextResponse.json({ error: "layout não encontrado" }, { status: 404 });

  const [guests, constraints, tables, seats] = await Promise.all([
    listGuests(layout.weddingId),
    listConstraints(layout.weddingId),
    listLayoutTables(layoutId),
    getLayoutSeats(layoutId),
  ]);

  if (tables.length === 0) {
    return NextResponse.json({ error: "adiciona mesas ao layout primeiro" }, { status: 400 });
  }

  // Feed the engine each guest's seat IN THIS LAYOUT as their assignedTableId, so
  // fixed-table occupants and locked guests stay put (per-layout, not the legacy
  // wedding-level Guest.assignedTableId).
  const seatByGuest = new Map(seats.map((s) => [s.guestId, s.tableId]));
  const guestRows = guests.map((g) => ({
    id: g.id,
    name: g.name,
    groupId: g.groupId,
    extraGroups: g.extraGroups,
    assignedTableId: seatByGuest.get(g.id) ?? null,
    locked: g.locked,
  }));

  const input = buildSeatingInput(guestRows, tables, constraints);
  const result = solveSeating(input);

  const movableIds = new Set(input.guests.map((g) => g.id));
  const updates = guests
    .filter((g) => movableIds.has(g.id))
    .map((g) => ({ guestId: g.id, tableId: result.assignment[g.id] ?? null }));
  await saveLayoutAssignment(layoutId, updates);

  return NextResponse.json(result);
}
