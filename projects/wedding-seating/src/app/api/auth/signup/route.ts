import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/serverClient";
import { upsertProfile, type Role } from "@/lib/db/profiles";

const VALID_ROLES: Role[] = ["venue", "couple"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = VALID_ROLES.includes(body?.role) ? (body.role as Role) : null;

  if (!email || !password) {
    return NextResponse.json({ error: "Email e password são obrigatórios." }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: "Escolhe se és quinta ou casal." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data.user) {
    return NextResponse.json({ error: "Não foi possível criar a conta." }, { status: 500 });
  }

  // Create the Profile now regardless of whether a session came back — the auth
  // user already exists, and Fase C intentionally has no route enforcement yet.
  await upsertProfile({ id: data.user.id, email: data.user.email ?? email, role });

  // If Supabase's "Confirm email" is enabled, signUp() returns a user but no
  // session — the caller must confirm their email before they can log in.
  const needsConfirmation = !data.session;

  return NextResponse.json({ needsConfirmation }, { status: 201 });
}
