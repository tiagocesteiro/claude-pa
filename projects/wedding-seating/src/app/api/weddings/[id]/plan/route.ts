import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { listTables } from "@/lib/db/tables";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const floorPlanId = new URL(req.url).searchParams.get("floorPlanId");
  const [guests, constraints, tables] = await Promise.all([
    listGuests(id),
    listConstraints(id),
    floorPlanId ? listTables(floorPlanId) : Promise.resolve([]),
  ]);
  return NextResponse.json({ guests, constraints, tables });
}
