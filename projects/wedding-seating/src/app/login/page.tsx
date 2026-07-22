"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Button, Wordmark } from "@/components/ui";

/** Safe internal redirect target from `?next=` (must be an in-app path). */
function useNextParam(): string {
  const [next, setNext] = useState("");
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once on mount
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
  }, []);
  return next;
}

export default function LoginPage() {
  const router = useRouter();
  const next = useNextParam();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Não foi possível entrar.");
        return;
      }
      router.push(next || "/admin");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <Card className="auth-card">
        <div className="auth-brand">
          <Wordmark style={{ fontSize: "1.35rem" }} />
        </div>
        <h1 className="auth-title">Bem-vindo de volta</h1>
        <p className="auth-subtitle">Entra para organizar o teu seating.</p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}
        >
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
          <Field label="Palavra-passe">
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>

          {error && <p className="form-error">{error}</p>}

          <Button type="submit" variant="primary" block loading={submitting}>
            {submitting ? "A entrar..." : "Entrar"}
          </Button>
        </form>

        <p style={{ marginTop: 20, textAlign: "center", color: "var(--text-muted)" }}>
          Ainda não tens conta?{" "}
          <Link href={next ? `/registar?next=${encodeURIComponent(next)}` : "/registar"}>Regista-te</Link>
        </p>
      </Card>
    </main>
  );
}
