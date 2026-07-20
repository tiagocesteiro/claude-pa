import "server-only";

import { NextResponse } from "next/server";
import { getActor, type Actor } from "./actor";
import { AccessError } from "./access";

/**
 * Route glue for the Fase D2 access layer. Kept separate from `access.ts` so the
 * pure authorization logic stays free of `next/server` (and easy to unit-test).
 */

/** Resolves the current actor, or a ready-to-return 401 response when logged out.
 * Usage: `const actor = await requireActor(); if (actor instanceof NextResponse) return actor;` */
export async function requireActor(): Promise<Actor | NextResponse> {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  return actor;
}

/** Maps an {@link AccessError} to its HTTP response; rethrows anything else. */
export function accessErrorResponse(err: unknown): NextResponse {
  if (err instanceof AccessError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  throw err;
}
