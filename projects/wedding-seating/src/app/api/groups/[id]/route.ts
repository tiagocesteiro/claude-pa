import { NextResponse } from "next/server";
import { renameGroup, deleteGroup } from "@/lib/db/groups";
import { assertGroupAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertGroupAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  if (!b?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await renameGroup(id, b.name));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertGroupAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}
