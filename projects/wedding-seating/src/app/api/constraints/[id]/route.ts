import { NextResponse } from "next/server";
import { deleteConstraint } from "@/lib/db/constraints";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteConstraint(id);
  return NextResponse.json({ ok: true });
}
