import { NextResponse } from "next/server";
import { createWedding, listWeddings } from "@/lib/db/weddings";

export async function GET() {
  return NextResponse.json(await listWeddings());
}

export async function POST(req: Request) {
  const b = await req.json();
  if (!b?.couple || typeof b.couple !== "string") {
    return NextResponse.json({ error: "couple is required" }, { status: 400 });
  }
  const wedding = await createWedding({
    couple: b.couple,
    date: b.date ? new Date(b.date) : undefined,
  });
  return NextResponse.json(wedding, { status: 201 });
}
