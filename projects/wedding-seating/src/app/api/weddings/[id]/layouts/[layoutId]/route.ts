import { NextResponse } from "next/server";
import { renameLayout, setFinalLayout, deleteLayout, getLayout } from "@/lib/db/layouts";
import { assertLayoutAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** Rename a layout and/or mark it as the wedding's final choice. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; layoutId: string }> }
) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id, layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  // The layout must belong to the wedding in the path (defence in depth).
  const layout = await getLayout(layoutId);
  if (!layout || layout.weddingId !== id) {
    return NextResponse.json({ error: "layout não encontrado" }, { status: 404 });
  }

  const b = await req.json().catch(() => ({}));
  if (typeof b?.name === "string" && b.name.trim()) {
    await renameLayout(layoutId, b.name.trim());
  }
  if (b?.isFinal === true) {
    await setFinalLayout(id, layoutId);
  }
  return NextResponse.json({ ok: true });
}

/** Delete a layout (its tables + seats cascade; the final flag is re-assigned). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; layoutId: string }> }
) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id, layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const layout = await getLayout(layoutId);
  if (!layout || layout.weddingId !== id) {
    return NextResponse.json({ error: "layout não encontrado" }, { status: 404 });
  }
  await deleteLayout(layoutId);
  return NextResponse.json({ ok: true });
}
