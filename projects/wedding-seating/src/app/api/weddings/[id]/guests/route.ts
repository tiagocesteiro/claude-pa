import { NextResponse } from "next/server";
import { listGuests, createGuest } from "@/lib/db/guests";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listGuests(id));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if (!b?.name || typeof b.name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const guest = await createGuest({
    weddingId: id,
    name: b.name,
    groupId: b.groupId ?? null,
    ageGroup: b.ageGroup ?? null,
    gender: b.gender ?? null,
    dietary: b.dietary ?? null,
  });
  return NextResponse.json(guest, { status: 201 });
}
