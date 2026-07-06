import { NextResponse } from "next/server";
import { createVenue, listVenues } from "@/lib/db/venues";

export async function GET() {
  return NextResponse.json(await listVenues());
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const venue = await createVenue({ name: body.name, location: body.location });
  return NextResponse.json(venue, { status: 201 });
}
