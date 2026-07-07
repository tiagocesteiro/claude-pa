import { NextResponse } from "next/server";
import { renameGroup, deleteGroup } from "@/lib/db/groups";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!b?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await renameGroup(id, b.name));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}
