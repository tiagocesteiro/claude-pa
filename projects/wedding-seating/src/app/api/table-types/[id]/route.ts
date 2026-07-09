import { NextResponse } from "next/server";
import { updateTableType, deleteTableType } from "@/lib/db/tableTypes";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const { id } = await params;
  await deleteTableType(id);
  return NextResponse.json({ ok: true });
}
