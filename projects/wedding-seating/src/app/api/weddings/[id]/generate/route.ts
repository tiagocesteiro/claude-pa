import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { listTables } from "@/lib/db/tables";
import { getFloorPlan } from "@/lib/db/floorplans";
import { saveAssignment } from "@/lib/db/assignment";
import { buildSeatingInput } from "@/lib/plan/buildSeatingInput";
import { solveSeating } from "@/lib/seating";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!b?.floorPlanId) return NextResponse.json({ error: "floorPlanId required" }, { status: 400 });

  const fp = await getFloorPlan(b.floorPlanId);
  if (!fp) return NextResponse.json({ error: "floor plan not found" }, { status: 404 });

  const [guests, constraints, tables] = await Promise.all([
    listGuests(id),
    listConstraints(id),
    listTables(b.floorPlanId),
  ]);

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
