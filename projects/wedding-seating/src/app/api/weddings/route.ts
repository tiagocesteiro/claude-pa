import { NextResponse } from "next/server";
import { createWedding, listWeddings } from "@/lib/db/weddings";
import { getActor } from "@/lib/auth/actor";

export async function GET() {
  // Fase D1: the proxy already blocks unauthenticated access. Owner-scoping of
  // this list lands in Fase D2 — for now it returns all weddings.
  return NextResponse.json(await listWeddings());
}

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (actor.role !== "couple") {
    return NextResponse.json({ error: "Só contas de casal podem criar casamentos." }, { status: 403 });
  }

  const b = await req.json().catch(() => ({}));
  if (!b?.couple || typeof b.couple !== "string") {
    return NextResponse.json({ error: "couple is required" }, { status: 400 });
  }
  const wedding = await createWedding({
    couple: b.couple,
    ownerId: actor.userId,
    date: b.date ? new Date(b.date) : undefined,
    venueId: b.venueId ?? null,
    partner1: b.partner1 ?? null,
    partner1Email: b.partner1Email ?? null,
    partner1Phone: b.partner1Phone ?? null,
    partner2: b.partner2 ?? null,
    partner2Email: b.partner2Email ?? null,
    partner2Phone: b.partner2Phone ?? null,
    guestEstimate: typeof b.guestEstimate === "number" ? b.guestEstimate : null,
    notes: b.notes ?? null,
  });
  return NextResponse.json(wedding, { status: 201 });
}
