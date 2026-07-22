"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, Badge } from "@/components/ui";

interface SupplierRow {
  id: string;
  name: string;
  service: string | null;
  email: string | null;
  profileId: string | null;
  inviteToken: string | null;
}

const SERVICES: { value: string; label: string }[] = [
  { value: "catering", label: "Catering" },
  { value: "dj", label: "DJ" },
  { value: "band", label: "Banda" },
  { value: "photo", label: "Fotografia" },
  { value: "decor", label: "Decoração" },
  { value: "flowers", label: "Flores" },
  { value: "other", label: "Outro" },
];

function serviceLabel(v: string | null): string {
  return SERVICES.find((s) => s.value === v)?.label ?? (v ?? "—");
}

function inviteUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/convite/${token}`;
}

/** Venue-side: manage the wedding's participants — add supplier slots, generate
 * shareable invite links for suppliers and the couple, see who has accepted. */
export default function WeddingParticipantsCard({ weddingId }: { weddingId: string }) {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [name, setName] = useState("");
  const [service, setService] = useState("catering");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/suppliers`);
    if (res.ok) setSuppliers(((await res.json()) as { suppliers: SupplierRow[] }).suppliers ?? []);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSupplier() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), service }),
      });
      if (!res.ok) throw new Error();
      setName("");
      await load();
    } catch {
      setError("Não foi possível adicionar o fornecedor.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(token: string) {
    const url = inviteUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2500);
    } catch {
      window.prompt("Copia o link do convite:", url);
    }
  }

  async function inviteSupplier(s: SupplierRow) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "supplier", supplierId: s.id, service: s.service }),
      });
      if (!res.ok) throw new Error();
      const { token } = (await res.json()) as { token: string };
      await load();
      await copy(token);
    } catch {
      setError("Não foi possível gerar o convite.");
    } finally {
      setBusy(false);
    }
  }

  async function inviteCouple() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "couple" }),
      });
      if (!res.ok) throw new Error();
      const { token } = (await res.json()) as { token: string };
      await copy(token);
    } catch {
      setError("Não foi possível gerar o convite dos noivos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Participantes & convites</h2>
        <Button variant="secondary" size="sm" onClick={inviteCouple} disabled={busy}>
          Convidar noivos (link)
        </Button>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
        Adiciona os fornecedores e gera um link de convite para cada um. Ao gerar, o link é copiado — partilha-o com o fornecedor.
      </p>

      {suppliers.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {suppliers.map((s) => (
            <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ flex: "1 1 200px" }}>
                <strong>{s.name}</strong>{" "}
                <Badge tone="neutral">{serviceLabel(s.service)}</Badge>{" "}
                {s.profileId ? (
                  <Badge tone="success">Aceite</Badge>
                ) : s.inviteToken ? (
                  <Badge tone="warning">Convidado</Badge>
                ) : (
                  <Badge tone="neutral">Por convidar</Badge>
                )}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {s.inviteToken && (
                  <Button variant="ghost" onClick={() => copy(s.inviteToken!)}>
                    {copied === s.inviteToken ? "Copiado!" : "Copiar link"}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => inviteSupplier(s)} disabled={busy}>
                  {s.inviteToken ? "Novo link" : "Gerar convite"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <label style={{ fontSize: 13 }}>
          Fornecedor <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Catering Sabores" style={{ width: 200 }} />
        </label>
        <label style={{ fontSize: 13 }}>
          Serviço{" "}
          <select className="input" value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <Button variant="primary" onClick={addSupplier} disabled={busy || !name.trim()}>Adicionar</Button>
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </Card>
  );
}
