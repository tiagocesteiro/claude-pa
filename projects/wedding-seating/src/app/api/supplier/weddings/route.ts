import { NextResponse } from "next/server";
import { listSupplierWeddings } from "@/lib/auth/access";
import { requireActor } from "@/lib/auth/guard";

export const runtime = "nodejs";

/** The weddings the current supplier account takes part in. */
export async function GET() {
  const actor = await requireActor();
  if (actor instanceof NextResponse) return actor;
  return NextResponse.json({ weddings: await listSupplierWeddings(actor.userId) });
}
