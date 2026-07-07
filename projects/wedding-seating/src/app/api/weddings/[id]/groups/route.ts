import { NextResponse } from "next/server";
import { createGroup, listGroups } from "@/lib/db/groups";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listGroups(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json();
  if (!b?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  return NextResponse.json(await createGroup({ weddingId: id, name: b.name, color: b.color }), { status: 201 });
}
