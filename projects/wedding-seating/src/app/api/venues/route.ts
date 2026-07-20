import { NextResponse } from "next/server";
import { createVenue, listVenues } from "@/lib/db/venues";
import { getActor } from "@/lib/auth/actor";

export async function GET() {
  // Fase D1: the proxy already blocks unauthenticated access. Owner-scoping of
  // this list lands in Fase D2 — for now it returns all venues.
  return NextResponse.json(await listVenues());
}

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (actor.role !== "venue") {
    return NextResponse.json({ error: "Só contas de quinta podem criar quintas." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const venue = await createVenue({
    name: body.name,
    location: body.location,
    ownerId: actor.userId,
  });
  return NextResponse.json(venue, { status: 201 });
}
