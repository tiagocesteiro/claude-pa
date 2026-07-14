import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { listWeddingTables } from "@/lib/db/weddingTables";
import { getWedding } from "@/lib/db/weddings";
import { getFloorPlan } from "@/lib/db/floorplans";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [wedding, guests, constraints, tables] = await Promise.all([
    getWedding(id),
    listGuests(id),
    listConstraints(id),
    listWeddingTables(id),
  ]);

  let layout = null;
  if (wedding?.floorPlanId) {
    const fp = await getFloorPlan(wedding.floorPlanId);
    if (fp) {
      layout = {
        floorPlanId: fp.id,
        image: fp.image,
        scale: fp.scale,
        width: fp.width,
        depth: fp.depth,
        zones: fp.zones,
      };
    }
  }

  return NextResponse.json({ guests, constraints, tables, layout });
}
