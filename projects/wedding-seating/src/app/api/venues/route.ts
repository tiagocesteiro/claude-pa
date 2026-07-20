import { NextResponse } from "next/server";
import { createVenue } from "@/lib/db/venues";
import { getActor } from "@/lib/auth/actor";
import { listVenuesFor } from "@/lib/auth/access";
import { requireActor } from "@/lib/auth/guard";

export async function GET() {
  // Fase D2a: owner-scoped — venue sees its own, couple sees venues it booked, admin all.
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json(await listVenuesFor(actor));
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
