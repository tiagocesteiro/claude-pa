import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { listWeddingTables } from "@/lib/db/weddingTables";
import { saveAssignment } from "@/lib/db/assignment";
import { buildSeatingInput } from "@/lib/plan/buildSeatingInput";
import { solveSeating } from "@/lib/seating";

// Node runtime (prisma/solver are Node-only); larger serverless timeout for the
// compute-heavy seating solver (Fase 0 — deploy readiness).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [guests, constraints, tables] = await Promise.all([
    listGuests(id),
    listConstraints(id),
    listWeddingTables(id),
  ]);

  if (tables.length === 0) {
    return NextResponse.json({ error: "aplica um template primeiro" }, { status: 400 });
  }

  const input = buildSeatingInput(guests, tables, constraints);
  const result = solveSeating(input);

  // Persist: movable guests get their solver table; fixed occupants keep their assignment.
  const movableIds = new Set(input.guests.map((g) => g.id));
  const updates = guests
    .filter((g) => movableIds.has(g.id))
    .map((g) => ({ guestId: g.id, tableId: result.assignment[g.id] ?? null }));
  await saveAssignment(updates);

  return NextResponse.json(result);
}
