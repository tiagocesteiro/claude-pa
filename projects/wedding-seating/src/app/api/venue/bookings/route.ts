import { NextResponse } from "next/server";
import { requireActor } from "@/lib/auth/guard";
import { listVenueBookings } from "@/lib/auth/access";

/**
 * Fase E — the venue account's read-only PROGRESS view of the weddings booked at
 * its venue(s). This is the ONLY route that exposes any wedding data to a venue,
 * and it exposes ZERO PII: only couple name, date, guest estimate, aggregate
 * RSVP/seating counts, and two "what's-missing" booleans (see
 * {@link listVenueBookings}). Every other wedding route stays venue-denied.
 */
export async function GET() {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  if (actor.role !== "venue" && actor.role !== "admin") {
    // couple (or any non-venue) has no business here.
    return NextResponse.json(
      { error: "Só contas de quinta podem ver os casamentos marcados." },
      { status: 403 }
    );
  }
  return NextResponse.json(await listVenueBookings(actor));
}
