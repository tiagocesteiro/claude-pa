import { NextResponse } from "next/server";
import { saveLayoutElements } from "@/lib/db/layouts";
import { parseElements, serializeElements } from "@/lib/floorplan/elements";
import { assertLayoutAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Persist the layout's generic decorative elements (bar, dance floor, ...).
 * Body: { elements: RoomElement[] }. Validated/normalized via parseElements. */
export async function PUT(req: Request, { params }: { params: Promise<{ layoutId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (!Array.isArray(b?.elements)) {
    return NextResponse.json({ error: "elements[] required" }, { status: 400 });
  }
  // Round-trip through the shared parser so only well-formed elements are stored.
  const clean = parseElements(JSON.stringify(b.elements));
  await saveLayoutElements(layoutId, serializeElements(clean));
  return NextResponse.json({ ok: true });
}
