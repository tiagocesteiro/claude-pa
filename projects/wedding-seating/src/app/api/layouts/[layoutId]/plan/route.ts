import { NextResponse } from "next/server";
import { getLayout, listLayoutTables, getLayoutSeats } from "@/lib/db/layouts";
import { listGuests } from "@/lib/db/guests";
import { listConstraints } from "@/lib/db/constraints";
import { getFloorPlan } from "@/lib/db/floorplans";
import { assertLayoutAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Everything the couple's per-layout editor needs: the shared guest list +
 * constraints, THIS layout's tables + seats, and the background (a venue
 * template's floor plan when seeded from a template, else the blank room the
 * couple defined by dimensions).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ layoutId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "read");
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

  // Background: a template's floor plan (image + zones) OR a blank room. The
  // decorative ELEMENTS come from the layout itself (couple-editable; seeded from
  // the template on creation), not from the floor plan.
  let background;
  if (layout.floorPlanId) {
    const fp = await getFloorPlan(layout.floorPlanId);
    background = fp
      ? {
          floorPlanId: fp.id,
          image: fp.image,
          scale: fp.scale,
          width: fp.width,
          depth: fp.depth,
          zones: fp.zones,
          elements: layout.elements,
        }
      : null;
  } else {
    background = {
      floorPlanId: null,
      image: null as string | null,
      scale: layout.scale,
      width: layout.width,
      depth: layout.depth,
      zones: null as string | null,
      elements: layout.elements,
    };
  }

  return NextResponse.json({
    layout: { id: layout.id, name: layout.name, isFinal: layout.isFinal, weddingId: layout.weddingId },
    background,
    tables,
    seats, // [{ id, weddingLayoutId, guestId, tableId }]
    guests,
    constraints,
  });
}
