import { NextResponse } from "next/server";
import { deleteVenue, getVenue } from "@/lib/db/venues";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await getVenue(id);
  if (!venue) return NextResponse.json({ error: "venue not found" }, { status: 404 });
  return NextResponse.json(venue);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getVenue(id);
  if (!existing) return NextResponse.json({ error: "venue not found" }, { status: 404 });
  await deleteVenue(id);
  return NextResponse.json({ ok: true });
}
