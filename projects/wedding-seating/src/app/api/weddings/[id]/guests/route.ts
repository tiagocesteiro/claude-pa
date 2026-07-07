import { NextResponse } from "next/server";
import { listGuests } from "@/lib/db/guests";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json(await listGuests(id));
}
