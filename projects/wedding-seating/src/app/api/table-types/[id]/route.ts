import { NextResponse } from "next/server";
import { updateTableType, deleteTableType } from "@/lib/db/tableTypes";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  return NextResponse.json(await updateTableType(id, b));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteTableType(id);
  return NextResponse.json({ ok: true });
}
