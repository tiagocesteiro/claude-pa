"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Input, Badge } from "@/components/ui";

interface Service {
  id: string;
  kind: string;
  name: string | null;
  providerType: string; // "venue" | "supplier" | "couple"
  supplierId: string | null;
  status: string; // "planned" | "confirmed" | "done"
  note: string | null;
}
interface SupplierRow {
  id: string;
  name: string;
  service: string | null;
}

const KINDS: { value: string; label: string }[] = [
  { value: "catering", label: "Catering" },
  { value: "dj", label: "DJ" },
  { value: "band", label: "Banda" },
  { value: "photo", label: "Fotografia" },
  { value: "video", label: "Vídeo" },
  { value: "decor", label: "Decoração" },
  { value: "flowers", label: "Flores" },
  { value: "cake", label: "Bolo" },
  { value: "transport", label: "Transporte" },
  { value: "other", label: "Outro" },
];
function kindLabel(v: string): string {
  return KINDS.find((k) => k.value === v)?.label ?? v;
}

const PROVIDERS: { value: string; label: string }[] = [
  { value: "venue", label: "Quinta (interno)" },
  { value: "supplier", label: "Fornecedor externo" },
  { value: "couple", label: "Noivos" },
];

const STATUSES: { value: string; label: string; tone: "neutral" | "warning" | "success" }[] = [
  { value: "planned", label: "Previsto", tone: "neutral" },
  { value: "confirmed", label: "Confirmado", tone: "warning" },
  { value: "done", label: "Concluído", tone: "success" },
];
function statusMeta(v: string) {
  return STATUSES.find((s) => s.value === v) ?? STATUSES[0];
}

/** Venue-side: the wedding's responsibility matrix — declare each service the
 * wedding needs and who provides it (quinta in-house / external supplier /
 * noivos), plus its status. External-supplier services point at a supplier slot
 * (managed in the participants card). */
export default function WeddingServicesCard({ weddingId }: { weddingId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [kind, setKind] = useState("catering");
  const [providerType, setProviderType] = useState("venue");
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sr, supr] = await Promise.all([
      fetch(`/api/weddings/${weddingId}/services`),
      fetch(`/api/weddings/${weddingId}/suppliers`),
    ]);
    if (sr.ok) setServices(((await sr.json()) as { services: Service[] }).services ?? []);
    if (supr.ok) setSuppliers(((await supr.json()) as { suppliers: SupplierRow[] }).suppliers ?? []);
  }, [weddingId]);

  useEffect(() => {
    load();
  }, [load]);

  function supplierName(id: string | null): string {
    return suppliers.find((s) => s.id === id)?.name ?? "Fornecedor";
  }

  async function addService() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          providerType,
          supplierId: providerType === "supplier" && supplierId ? supplierId : null,
        }),
      });
      if (!res.ok) throw new Error();
      setProviderType("venue");
      setSupplierId("");
      await load();
    } catch {
      setError("Não foi possível adicionar o serviço.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError("Não foi possível atualizar o serviço.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>Serviços & responsabilidades</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Declara os serviços do casamento e quem os fornece — a quinta, um fornecedor externo, ou os noivos.
      </p>

      {services.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map((s) => {
            const st = statusMeta(s.status);
            return (
              <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ flex: "1 1 160px", minWidth: 120 }}>
                  <strong>{kindLabel(s.kind)}</strong>
                  {s.providerType === "supplier" && (
                    <span style={{ color: "var(--text-muted)" }}> · {supplierName(s.supplierId)}</span>
                  )}
                </span>

                {/* Provider assignment */}
                <select
                  className="input"
                  value={s.providerType}
                  onChange={(e) => patch(s.id, { providerType: e.target.value })}
                  disabled={busy}
                  style={{ width: 150 }}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>

                {s.providerType === "supplier" && (
                  <select
                    className="input"
                    value={s.supplierId ?? ""}
                    onChange={(e) => patch(s.id, { providerType: "supplier", supplierId: e.target.value || null })}
                    disabled={busy}
                    style={{ width: 150 }}
                  >
                    <option value="">— fornecedor —</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </select>
                )}

                {/* Status */}
                <select
                  className="input"
                  value={s.status}
                  onChange={(e) => patch(s.id, { status: e.target.value })}
                  disabled={busy}
                  style={{ width: 130 }}
                >
                  {STATUSES.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
                <Badge tone={st.tone}>{st.label}</Badge>

                <Button variant="ghost" onClick={() => remove(s.id)} disabled={busy}>Remover</Button>
              </li>
            );
          })}
        </ul>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <label style={{ fontSize: 13 }}>
          Serviço{" "}
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Fornecido por{" "}
          <select className="input" value={providerType} onChange={(e) => setProviderType(e.target.value)}>
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        {providerType === "supplier" && (
          <label style={{ fontSize: 13 }}>
            Qual{" "}
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— escolher —</option>
              {suppliers.map((sup) => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
            </select>
          </label>
        )}
        <Button variant="primary" onClick={addService} disabled={busy}>Adicionar serviço</Button>
      </div>
      {providerType === "supplier" && suppliers.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 6 }}>
          Ainda não há fornecedores. Adiciona-os no cartão &ldquo;Participantes &amp; convites&rdquo; acima.
        </p>
      )}
      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </Card>
  );
}
