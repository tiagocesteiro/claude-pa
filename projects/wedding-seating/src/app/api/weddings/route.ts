import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
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
  if (actor.role !== "couple" && actor.role !== "venue" && actor.role !== "admin") {
    return NextResponse.json({ error: "Sem permissão para criar casamentos." }, { status: 403 });
  }

  const b = await req.json().catch(() => ({}));
  if (!b?.couple || typeof b.couple !== "string") {
    return NextResponse.json({ error: "couple is required" }, { status: 400 });
  }

  // A couple owns the wedding it creates. A venue creates a wedding AT one of its
  // own venues (ownerId stays null — the couple joins later via invite).
  let ownerId: string | null = actor.role === "couple" ? actor.userId : null;
  let venueId: string | null = b.venueId ?? null;
  if (actor.role === "venue") {
    if (!venueId) return NextResponse.json({ error: "Escolhe a tua quinta." }, { status: 400 });
    const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { ownerId: true } });
    if (!venue || venue.ownerId !== actor.userId) {
      return NextResponse.json({ error: "quinta inválida" }, { status: 400 });
    }
    ownerId = null;
  }

  const wedding = await createWedding({
    couple: b.couple,
    ownerId: ownerId ?? undefined,
    date: b.date ? new Date(b.date) : undefined,
    venueId,
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
