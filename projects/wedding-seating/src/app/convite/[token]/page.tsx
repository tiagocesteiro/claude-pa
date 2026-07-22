"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Wordmark, Badge } from "@/components/ui";

interface Preview {
  role: string;
  service: string | null;
  alreadyAccepted: boolean;
  wedding: { id: string; couple: string; date: string | null };
}

const ROLE_LABEL: Record<string, string> = { couple: "Noivos", supplier: "Fornecedor", venue: "Quinta" };

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<"loading" | "needsAuth" | "invalid" | "ready" | "accepting" | "error">("loading");
  const [preview, setPreview] = useState<Preview | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/invites/${token}`);
    if (res.status === 401) {
      setState("needsAuth");
      return;
    }
    if (!res.ok) {
      setState("invalid");
      return;
    }
    setPreview((await res.json()) as Preview);
    setState("ready");
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function accept() {
    setState("accepting");
    const res = await fetch(`/api/invites/${token}`, { method: "POST" });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      setState("error");
    }
  }

  const nextParam = `?next=${encodeURIComponent(`/convite/${token}`)}`;

  return (
    <main className="auth-shell">
      <Card className="auth-card">
        <div className="auth-brand">
          <Wordmark style={{ fontSize: "1.35rem" }} />
        </div>

        {state === "loading" && <p style={{ textAlign: "center", color: "var(--text-muted)" }}>A carregar…</p>}

        {state === "needsAuth" && (
          <>
            <h1 className="auth-title">Foste convidado 🎉</h1>
            <p className="auth-subtitle">Entra ou cria conta para aceder ao casamento.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
              <Link href={`/registar${nextParam}`}>
                <Button variant="primary" block>Criar conta</Button>
              </Link>
              <Link href={`/login${nextParam}`}>
                <Button variant="secondary" block>Já tenho conta</Button>
              </Link>
            </div>
          </>
        )}

        {state === "invalid" && (
          <>
            <h1 className="auth-title">Convite inválido</h1>
            <p className="auth-subtitle">Este convite não existe ou expirou. Pede um novo link à quinta.</p>
          </>
        )}

        {(state === "ready" || state === "accepting" || state === "error") && preview && (
          <>
            <h1 className="auth-title">Convite para um casamento</h1>
            <p className="auth-subtitle">Vais entrar como {ROLE_LABEL[preview.role] ?? preview.role}.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "20px 0", padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface-2)" }}>
              <strong style={{ fontSize: "1.05rem" }}>{preview.wedding.couple}</strong>
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
                {preview.wedding.date ? new Date(preview.wedding.date).toLocaleDateString("pt-PT") : "sem data"}
              </span>
              <span>
                <Badge tone="accent">{ROLE_LABEL[preview.role] ?? preview.role}</Badge>
                {preview.service && <Badge tone="neutral"> {preview.service}</Badge>}
              </span>
            </div>
            {preview.alreadyAccepted && (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Este convite já tinha sido aceite — podes aceitar de novo sem problema.</p>
            )}
            {state === "error" && <p className="form-error">Não foi possível aceitar. Tenta novamente.</p>}
            <Button variant="primary" block loading={state === "accepting"} onClick={accept}>
              {state === "accepting" ? "A aceitar…" : "Aceitar convite"}
            </Button>
          </>
        )}
      </Card>
    </main>
  );
}
