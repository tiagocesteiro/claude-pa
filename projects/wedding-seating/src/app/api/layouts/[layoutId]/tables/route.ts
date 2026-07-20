import { NextResponse } from "next/server";
import { listLayoutTables, saveLayoutTables } from "@/lib/db/layouts";
import { assertLayoutAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The layout's own tables (couple-owned). */
export async function GET(_req: Request, { params }: { params: Promise<{ layoutId: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { layoutId } = await params;
  try {
    await assertLayoutAccess(actor, layoutId, "read");
  } catch (e) {
    return accessErrorResponse(e);
  }
  return NextResponse.json({ tables: await listLayoutTables(layoutId) });
}

/** Replace the layout's tables (id-diff; removed tables cascade-drop their seats). */
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
  if (!Array.isArray(b?.tables)) {
    return NextResponse.json({ error: "tables[] required" }, { status: 400 });
  }
  await saveLayoutTables(layoutId, b.tables);
  return NextResponse.json({ ok: true });
}
