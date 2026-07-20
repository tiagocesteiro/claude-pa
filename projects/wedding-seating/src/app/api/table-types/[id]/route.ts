import { NextResponse } from "next/server";
import { updateTableType, deleteTableType } from "@/lib/db/tableTypes";
import { assertTableTypeAccess } from "@/lib/auth/access";
import { requireActor, accessErrorResponse } from "@/lib/auth/guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTableTypeAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  const b = await req.json().catch(() => ({}));
  const patch = Object.fromEntries(
    Object.entries({
      name: b?.name,
      shape: b?.shape,
      minSeats: b?.minSeats,
      maxSeats: b?.maxSeats,
      width: b?.width,
      depth: b?.depth,
      quantity: b?.quantity,
    }).filter(([, v]) => v !== undefined)
  );
  return NextResponse.json(await updateTableType(id, patch));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  const { id } = await params;
  try {
    await assertTableTypeAccess(actor, id, "write");
  } catch (e) {
    return accessErrorResponse(e);
  }
  await deleteTableType(id);
  return NextResponse.json({ ok: true });
}
