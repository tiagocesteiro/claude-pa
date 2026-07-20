import { NextResponse } from "next/server";
import { deleteConstraint } from "@/lib/db/constraints";
import { assertConstraintAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertConstraintAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteConstraint(id);
  return NextResponse.json({ ok: true });
}
