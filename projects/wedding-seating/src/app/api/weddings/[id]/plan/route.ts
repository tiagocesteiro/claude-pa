import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { listWeddingTables } from "@/lib/db/weddingTables";
import { getWedding } from "@/lib/db/weddings";
import { getFloorPlan } from "@/lib/db/floorplans";
import { assertWeddingAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

// Node runtime (prisma is Node-only); headroom for building the plan payload (Fase 0).
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertWeddingAccess(actor, id, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
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
        elements: fp.elements,
      };
    }
  }

  return NextResponse.json({ guests, constraints, tables, layout });
}
