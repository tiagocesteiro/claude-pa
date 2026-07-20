import { NextResponse } from "next/server";
import { listPickableVenues } from "@/lib/db/venues";

/**
 * Venue picker for the couple's "create wedding" form: returns {id,name,location}
 * of ALL venues so a couple can pick where their wedding is. Auth is enforced by
 * the proxy (any logged-in user may list venues to pick one). Kept separate from
 * `/api/venues` so Fase D2 can owner-scope that list without breaking the picker.
 */
export async function GET() {
  return NextResponse.json(await listPickableVenues());
}
