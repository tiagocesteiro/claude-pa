"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Button } from "@/components/ui";

type Role = "venue" | "couple";

const ROLE_OPTIONS: { value: Role; title: string; desc: string; icon: string }[] = [
  { value: "couple", title: "Sou um Casal", desc: "Organizo o seating do meu casamento.", icon: "💍" },
  { value: "venue", title: "Sou uma Quinta", desc: "Recebo casamentos no meu espaço.", icon: "🏛️" },
];

export default function RegistarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("couple");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Não foi possível criar a conta.");
        return;
      }
      if (data.needsConfirmation) {
        setNeedsConfirmation(true);
        return;
      }
      // Email confirmation disabled → signUp already returned a session.
      router.push("/admin");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <Card className="auth-card">
        <div className="auth-brand">
          <span className="wordmark" style={{ fontSize: "1.35rem" }}>
            Wedding<span className="wordmark-accent">Seating</span>
          </span>
        </div>
        <h1 className="auth-title">Criar conta</h1>
        <p className="auth-subtitle">Começa a organizar em minutos.</p>

        {needsConfirmation ? (
          <p style={{ marginTop: 24 }}>
            Confirma o teu email para entrar. Enviámos um link de confirmação para{" "}
            <strong>{email}</strong>.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}
          >
            <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
              <legend className="field-label" style={{ marginBottom: 8 }}>
                Eu sou...
              </legend>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {ROLE_OPTIONS.map((opt) => {
                  const selected = role === opt.value;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                        background: selected ? "var(--accent-soft)" : "var(--surface)",
                        borderRadius: "var(--radius)",
                        cursor: "pointer",
                        boxShadow: selected ? "0 0 0 3px var(--ring)" : "none",
                        transition: "border-color .12s ease, background .12s ease, box-shadow .12s ease",
                      }}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={selected}
                        onChange={() => setRole(opt.value)}
                        style={{ width: "auto" }}
                      />
                      <span style={{ fontSize: "1.3rem", lineHeight: 1 }} aria-hidden>
                        {opt.icon}
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <strong style={{ fontWeight: 600 }}>{opt.title}</strong>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {opt.desc}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="tu@exemplo.pt"
              />
            </Field>
            <Field label="Palavra-passe" hint="Mínimo 6 caracteres.">
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </Field>

            {error && <p className="form-error">{error}</p>}

            <Button type="submit" variant="primary" block loading={submitting}>
              {submitting ? "A criar conta..." : "Criar conta"}
            </Button>
          </form>
        )}

        <p style={{ marginTop: 20, textAlign: "center", color: "var(--text-muted)" }}>
          Já tens conta? <Link href="/login">Entrar</Link>
        </p>
      </Card>
    </main>
  );
}
