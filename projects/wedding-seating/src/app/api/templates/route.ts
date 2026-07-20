import { NextResponse } from "next/server";
import { listTemplatesFor } from "@/lib/auth/access";
import { requireActor } from "@/lib/auth/guard";

export async function GET() {
  // Fase D2a: venue → own; couple → their weddings' venues' templates; admin → all.
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json(await listTemplatesFor(actor));
}
