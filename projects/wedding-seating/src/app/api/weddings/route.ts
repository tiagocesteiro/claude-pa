import { NextResponse } from "next/server";
import { createWedding } from "@/lib/db/weddings";
import { getActor } from "@/lib/auth/actor";
import { listWeddingsFor } from "@/lib/auth/access";
import { requireActor } from "@/lib/auth/guard";

export async function GET() {
  // Fase D2b: owner-scoped — couple sees only its own weddings, venue sees none,
  // admin sees all (see listWeddingsFor).
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json(await listWeddingsFor(actor));
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
