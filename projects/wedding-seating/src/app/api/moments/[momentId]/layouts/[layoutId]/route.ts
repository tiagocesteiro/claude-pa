import { NextResponse } from "next/server";
import { renameLayout, setFinalLayout, deleteLayout, getLayout } from "@/lib/db/layouts";
import { assertLayoutAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";
import { recordEvent } from "@/lib/db/audit";

export const runtime = "nodejs";

/** Rename a layout and/or mark it as this moment's final choice. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ momentId: string; layoutId: string }> }
) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId, layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const layout = await getLayout(layoutId);
  if (!layout || layout.momentId !== momentId) {
    return NextResponse.json({ error: "layout não encontrado" }, { status: 404 });
  }

  const b = await req.json().catch(() => ({}));
  if (typeof b?.name === "string" && b.name.trim()) await renameLayout(layoutId, b.name.trim());
  if (b?.isFinal === true && !layout.isFinal) {
    await setFinalLayout(momentId, layoutId);
    await recordEvent({
      weddingId: layout.weddingId,
      actor,
      action: "layout.final_set",
      entityType: "layout",
      entityId: layoutId,
      summary: `Marcou o layout «${layout.name}» como final`,
    });
  }
  return NextResponse.json({ ok: true });
}

/** Delete a layout (tables + seats cascade; final flag re-assigned within moment). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ momentId: string; layoutId: string }> }
) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { momentId, layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const layout = await getLayout(layoutId);
  if (!layout || layout.momentId !== momentId) {
    return NextResponse.json({ error: "layout não encontrado" }, { status: 404 });
  }
  await deleteLayout(layoutId);
  return NextResponse.json({ ok: true });
}
