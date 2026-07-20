"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ArrangementThumbnail from "@/components/wedding/ArrangementThumbnail";
import { Button, Card, Input, Badge } from "@/components/ui";

interface MomentMeta {
  id: string;
  title: string | null;
  kind: string | null;
  templateId: string | null;
  template: { id: string; floorPlan: { image: string | null; scale: number; width: number; depth: number } | null } | null;
}
interface Task {
  id: string;
  text: string;
  done: boolean;
  assignee: string;
  supplierId: string | null;
  dueDate: string | null;
}
interface DecorLine {
  id: string;
  decorItemId: string | null;
  name: string | null;
  note: string | null;
  quantity: number;
  decorItem: { name: string; category: string | null; price: number | null } | null;
}
interface Supplier {
  id: string;
  name: string;
}
interface CatalogItem {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
}
interface Template {
  id: string;
  name: string;
  venueId: string;
  minGuests: number;
  maxGuests: number;
}

const KIND_LABELS: Record<string, string> = {
  ceremony: "Cerimónia",
  cocktail: "Cocktail",
  dinner: "Jantar",
  dance: "Dança",
};

function momentTitle(m: MomentMeta): string {
  return m.title ?? (m.kind ? KIND_LABELS[m.kind] ?? m.kind : "Momento");
}

export default function MomentDetail({ weddingId, momentId }: { weddingId: string; momentId: string }) {
  const router = useRouter();
  const [moment, setMoment] = useState<MomentMeta | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [decor, setDecor] = useState<DecorLine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-forms
  const [taskText, setTaskText] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("couple");
  const [taskSupplier, setTaskSupplier] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [catalogPick, setCatalogPick] = useState("");
  const [catalogQty, setCatalogQty] = useState("1");
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("1");

  const loadMoment = useCallback(async () => {
    const res = await fetch(`/api/moments/${momentId}`);
    if (!res.ok) {
      setError("Não foi possível carregar o momento.");
      return;
    }
    const data = (await res.json()) as { moment: MomentMeta; tasks: Task[]; decor: DecorLine[] };
    setMoment(data.moment);
    setTasks(data.tasks ?? []);
    setDecor(data.decor ?? []);
  }, [momentId]);

  const loadSuppliers = useCallback(async () => {
    const res = await fetch(`/api/weddings/${weddingId}/suppliers`);
    if (res.ok) setSuppliers(((await res.json()) as { suppliers: Supplier[] }).suppliers ?? []);
  }, [weddingId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([loadMoment(), loadSuppliers()]);
      // wedding venueId → templates + decor catalog
      const wRes = await fetch(`/api/weddings/${weddingId}`);
      if (!cancelled && wRes.ok) {
        const w = (await wRes.json()) as { venueId: string | null };
        setVenueId(w.venueId);
        if (w.venueId) {
          const [tRes, cRes] = await Promise.all([
            fetch(`/api/templates`),
            fetch(`/api/venues/${w.venueId}/decor-items`),
          ]);
          if (tRes.ok) setTemplates(((await tRes.json()) as Template[]) ?? []);
          if (cRes.ok) setCatalog(((await cRes.json()) as { items: CatalogItem[] }).items ?? []);
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [weddingId, loadMoment, loadSuppliers]);

  const venueTemplates = templates.filter((t) => venueId && t.venueId === venueId);

  async function setTemplate(templateId: string | null) {
    const res = await fetch(`/api/moments/${momentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    if (!res.ok) {
      setError("Não foi possível guardar o arranjo.");
      return;
    }
    await loadMoment();
  }

  async function rename() {
    if (!moment) return;
    const name = window.prompt("Nome do momento:", momentTitle(moment));
    if (name == null || !name.trim()) return;
    await fetch(`/api/moments/${momentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name.trim() }),
    });
    await loadMoment();
  }

  async function removeMoment() {
    if (!window.confirm("Remover este momento? As tarefas e decoração deste momento perdem-se.")) return;
    const res = await fetch(`/api/moments/${momentId}`, { method: "DELETE" });
    if (res.ok) router.push(`/admin/wedding/${weddingId}/details`);
  }

  // ── Tasks ──
  async function addTask() {
    if (!taskText.trim()) return;
    const body: Record<string, unknown> = { text: taskText.trim(), assignee: taskAssignee };
    if (taskAssignee === "supplier") body.supplierId = taskSupplier || null;
    if (taskDue) body.dueDate = taskDue;
    const res = await fetch(`/api/moments/${momentId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setTaskText("");
      setTaskDue("");
      await loadMoment();
    }
  }
  async function toggleTask(t: Task) {
    await fetch(`/api/tasks/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !t.done }),
    });
    await loadMoment();
  }
  async function removeTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await loadMoment();
  }

  function assigneeLabel(t: Task): string {
    if (t.assignee === "couple") return "Noivos";
    if (t.assignee === "venue") return "Quinta";
    return suppliers.find((s) => s.id === t.supplierId)?.name ?? "Fornecedor";
  }

  // ── Decor ──
  async function addFromCatalog() {
    if (!catalogPick) return;
    const res = await fetch(`/api/moments/${momentId}/decor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decorItemId: catalogPick, quantity: Number(catalogQty) || 1 }),
    });
    if (res.ok) {
      setCatalogPick("");
      setCatalogQty("1");
      await loadMoment();
    }
  }
  async function addCustom() {
    if (!customName.trim()) return;
    const res = await fetch(`/api/moments/${momentId}/decor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: customName.trim(), quantity: Number(customQty) || 1 }),
    });
    if (res.ok) {
      setCustomName("");
      setCustomQty("1");
      await loadMoment();
    }
  }
  async function removeDecor(id: string) {
    await fetch(`/api/decor/${id}`, { method: "DELETE" });
    await loadMoment();
  }

  function decorName(d: DecorLine): string {
    return d.decorItem?.name ?? d.name ?? "Item";
  }

  if (loading) return <p>A carregar...</p>;
  if (!moment) return <p style={{ color: "#dc2626" }}>{error ?? "Momento não encontrado."}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{momentTitle(moment)}</h2>
        <Button variant="ghost" onClick={rename}>Renomear</Button>
        <Button variant="ghost" onClick={removeMoment}>Remover momento</Button>
      </div>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {/* Arrangement */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Arranjo da sala</h3>
        {!venueId ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Escolhe primeiro a quinta em Detalhes.</p>
        ) : (
          <>
            <select
              className="input"
              value={moment.templateId ?? ""}
              onChange={(e) => setTemplate(e.target.value || null)}
              style={{ maxWidth: 320 }}
            >
              <option value="">— (nenhum)</option>
              {venueTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.minGuests}-{t.maxGuests}
                </option>
              ))}
            </select>
            {moment.template && (
              <div style={{ marginTop: 10 }}>
                <ArrangementThumbnail template={moment.template} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Decoration */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Decoração</h3>
        {decor.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem decoração ainda.</p>}
        {decor.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {decor.map((d) => (
              <li key={d.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1 }}>
                  {decorName(d)} {d.quantity > 1 && <span style={{ color: "var(--text-muted)" }}>×{d.quantity}</span>}
                  {d.decorItem ? (
                    <Badge tone="neutral" className="app-header-role">Quinta</Badge>
                  ) : (
                    <Badge tone="accent" className="app-header-role">Próprio</Badge>
                  )}
                  {d.decorItem?.price != null && (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}> · {d.decorItem.price} €</span>
                  )}
                </span>
                <Button variant="ghost" onClick={() => removeDecor(d.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <label style={{ fontSize: 13 }}>
            Do catálogo da quinta{" "}
            <select className="input" value={catalogPick} onChange={(e) => setCatalogPick(e.target.value)} style={{ minWidth: 160 }}>
              <option value="">Escolhe…</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.category ? ` (${c.category})` : ""}
                </option>
              ))}
            </select>
          </label>
          <Input type="number" min="1" value={catalogQty} onChange={(e) => setCatalogQty(e.target.value)} style={{ width: 64 }} />
          <Button variant="secondary" onClick={addFromCatalog} disabled={!catalogPick}>Adicionar</Button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginTop: 8 }}>
          <label style={{ fontSize: 13 }}>
            Item próprio{" "}
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="ex.: Velas" style={{ width: 180 }} />
          </label>
          <Input type="number" min="1" value={customQty} onChange={(e) => setCustomQty(e.target.value)} style={{ width: 64 }} />
          <Button variant="secondary" onClick={addCustom} disabled={!customName.trim()}>Adicionar</Button>
        </div>
      </Card>

      {/* Tasks */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Tarefas</h3>
        {tasks.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem tarefas ainda.</p>}
        {tasks.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            {tasks.map((t) => (
              <li key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} />
                <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-muted)" : "inherit" }}>
                  {t.text}
                </span>
                <Badge tone="neutral" className="app-header-role">{assigneeLabel(t)}</Badge>
                {t.dueDate && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.dueDate.slice(0, 10)}</span>}
                <Button variant="ghost" onClick={() => removeTask(t.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <label style={{ fontSize: 13, flex: "1 1 200px" }}>
            Nova tarefa{" "}
            <Input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="ex.: Confirmar flores" />
          </label>
          <label style={{ fontSize: 13 }}>
            Responsável{" "}
            <select className="input" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
              <option value="couple">Noivos</option>
              <option value="venue">Quinta</option>
              <option value="supplier">Fornecedor</option>
            </select>
          </label>
          {taskAssignee === "supplier" && (
            <select className="input" value={taskSupplier} onChange={(e) => setTaskSupplier(e.target.value)}>
              <option value="">Escolhe…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <label style={{ fontSize: 13 }}>
            Data{" "}
            <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} style={{ width: 150 }} />
          </label>
          <Button variant="primary" onClick={addTask} disabled={!taskText.trim() || (taskAssignee === "supplier" && !taskSupplier)}>
            Adicionar
          </Button>
        </div>
        {suppliers.length === 0 && taskAssignee === "supplier" && (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Adiciona fornecedores em Detalhes primeiro.</p>
        )}
      </Card>
    </div>
  );
}
