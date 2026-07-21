"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MomentLayouts from "@/components/wedding/MomentLayouts";
import { imageUrlFor } from "@/lib/images";
import { Button, Card, Input, Badge } from "@/components/ui";

interface MomentMeta {
  id: string;
  title: string | null;
  kind: string | null;
  hasSeating: boolean;
  startTime: string | null;
}
interface Task {
  id: string;
  text: string;
  note: string | null;
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
  decorItem: { name: string; category: string | null; price: number | null; image: string | null } | null;
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
  image: string | null;
  quantity: number | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [taskText, setTaskText] = useState("");
  // Combined responsible value: "couple" | "venue" | "s:<supplierId>".
  const [taskAssignee, setTaskAssignee] = useState("couple");
  const [taskNote, setTaskNote] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [catalogPick, setCatalogPick] = useState("");
  const [catalogCat, setCatalogCat] = useState("");
  const [catalogError, setCatalogError] = useState<string | null>(null);
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
      const wRes = await fetch(`/api/weddings/${weddingId}`);
      if (!cancelled && wRes.ok) {
        const w = (await wRes.json()) as { venueId: string | null };
        if (w.venueId) {
          const cRes = await fetch(`/api/venues/${w.venueId}/decor-items`);
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
    if (!window.confirm("Remover este momento? Os layouts, tarefas e decoração deste momento perdem-se.")) return;
    const res = await fetch(`/api/moments/${momentId}`, { method: "DELETE" });
    if (res.ok) router.push(`/admin/wedding/${weddingId}/details`);
  }

  async function saveStartTime(startTime: string) {
    setMoment((m) => (m ? { ...m, startTime: startTime || null } : m)); // optimistic
    await fetch(`/api/moments/${momentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: startTime || null }),
    });
    await loadMoment();
  }

  async function toggleSeating(hasSeating: boolean) {
    setMoment((m) => (m ? { ...m, hasSeating } : m)); // optimistic
    await fetch(`/api/moments/${momentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasSeating }),
    });
    await loadMoment();
  }

  // ── Tasks ──
  async function addTask() {
    if (!taskText.trim()) return;
    const body: Record<string, unknown> = { text: taskText.trim() };
    if (taskAssignee.startsWith("s:")) {
      body.assignee = "supplier";
      body.supplierId = taskAssignee.slice(2);
    } else {
      body.assignee = taskAssignee; // "couple" | "venue"
    }
    if (taskNote.trim()) body.note = taskNote.trim();
    if (taskDue) body.dueDate = taskDue;
    const res = await fetch(`/api/moments/${momentId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setTaskText("");
      setTaskNote("");
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
    setCatalogError(null);
    const res = await fetch(`/api/moments/${momentId}/decor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decorItemId: catalogPick, quantity: Number(catalogQty) || 1 }),
    });
    if (res.ok) {
      setCatalogPick("");
      setCatalogQty("1");
      await loadMoment();
    } else {
      const b = (await res.json().catch(() => null)) as { error?: string } | null;
      setCatalogError(b?.error ?? "Não foi possível adicionar a decoração.");
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
    if (d.decorItem) {
      return d.decorItem.category ? `${d.decorItem.category} - ${d.decorItem.name}` : d.decorItem.name;
    }
    return d.name ?? "Item";
  }

  if (loading) return <p>A carregar...</p>;
  if (!moment) return <p style={{ color: "#dc2626" }}>{error ?? "Momento não encontrado."}</p>;

  const catalogCategories = Array.from(
    new Set(catalog.map((c) => c.category).filter((c): c is string => Boolean(c)))
  ).sort();
  const filteredCatalog = catalog
    .filter((c) => !catalogCat || c.category === catalogCat)
    .sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));
  const selectedCatalogItem = catalog.find((c) => c.id === catalogPick) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 820 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{momentTitle(moment)}</h2>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          Início{" "}
          <Input
            type="time"
            value={moment.startTime ?? ""}
            onChange={(e) => saveStartTime(e.target.value)}
            style={{ width: 120 }}
          />
        </label>
        <Button variant="ghost" onClick={rename}>Renomear</Button>
        <Button variant="ghost" onClick={removeMoment}>Remover momento</Button>
      </div>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {/* Layout(s) */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Layout da sala</h3>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={moment.hasSeating} onChange={(e) => toggleSeating(e.target.checked)} />
            Tem plano de mesas (lugares marcados)
          </label>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>
          {moment.hasSeating
            ? "Desenha o layout e senta os convidados. Podes ter vários layouts e marcar um como final."
            : "Desenha a disposição da sala (mesas + elementos como bar/pista). Sem lugares marcados."}
        </p>
        <MomentLayouts weddingId={weddingId} momentId={momentId} hasSeating={moment.hasSeating} />
      </Card>

      {/* Decoration */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Decoração</h3>
        {decor.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem decoração ainda.</p>}
        {decor.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {decor.map((d) => (
              <li key={d.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {d.decorItem?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrlFor(d.decorItem.image)} alt={decorName(d)} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 40, height: 40, borderRadius: 6, border: "1px solid var(--border)", flexShrink: 0, background: "var(--surface-2)" }} />
                )}
                <span style={{ flex: 1 }}>
                  {decorName(d)} {d.quantity > 1 && <span style={{ color: "var(--text-muted)" }}>×{d.quantity}</span>}{" "}
                  {d.decorItem ? <Badge tone="neutral">Quinta</Badge> : <Badge tone="accent">Próprio</Badge>}
                  {d.decorItem?.price != null && (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}> · {d.decorItem.price} €</span>
                  )}
                </span>
                <Button variant="ghost" onClick={() => removeDecor(d.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}

        {/* Catalog picker — image gallery + optional category filter */}
        <h4 style={{ margin: "4px 0 6px", fontSize: 13, color: "var(--text-muted)" }}>Do catálogo da quinta</h4>
        {catalog.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>A tua quinta ainda não tem catálogo de decoração.</p>
        ) : (
          <>
            {catalogCategories.length > 0 && (
              <select
                className="input"
                value={catalogCat}
                onChange={(e) => setCatalogCat(e.target.value)}
                style={{ maxWidth: 220, marginBottom: 8 }}
              >
                <option value="">Todas as categorias</option>
                {catalogCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 8,
                maxHeight: 300,
                overflowY: "auto",
                padding: 4,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              {filteredCatalog.map((c) => {
                const selected = c.id === catalogPick;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCatalogPick(c.id)}
                    title={c.name}
                    style={{
                      textAlign: "left",
                      padding: 6,
                      borderRadius: 8,
                      border: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
                      background: selected ? "var(--accent-soft)" : "var(--surface)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrlFor(c.image)} alt={c.name} style={{ width: "100%", height: 84, objectFit: "cover", borderRadius: 4 }} />
                    ) : (
                      <span style={{ width: "100%", height: 84, borderRadius: 4, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 11 }}>sem foto</span>
                    )}
                    <span style={{ fontSize: 12, lineHeight: 1.2, color: "var(--heading)" }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {c.quantity != null ? `disp. ${c.quantity}` : ""}
                      {c.price != null ? `${c.quantity != null ? " · " : ""}${c.price} €` : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginTop: 8 }}>
              <span style={{ fontSize: 13, flex: "1 1 auto" }}>
                {selectedCatalogItem ? (
                  <>
                    Selecionado: <strong>{selectedCatalogItem.name}</strong>
                    {selectedCatalogItem.quantity != null && (
                      <span style={{ color: "var(--text-muted)" }}> (disponível: {selectedCatalogItem.quantity})</span>
                    )}
                  </>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>Escolhe um item acima.</span>
                )}
              </span>
              <label style={{ fontSize: 13 }}>
                Qtd{" "}
                <Input
                  type="number"
                  min="1"
                  max={selectedCatalogItem?.quantity ?? undefined}
                  value={catalogQty}
                  onChange={(e) => setCatalogQty(e.target.value)}
                  style={{ width: 64 }}
                />
              </label>
              <Button variant="secondary" onClick={addFromCatalog} disabled={!catalogPick}>Adicionar</Button>
            </div>
            {catalogError && (
              <p style={{ color: "#dc2626", fontSize: 13, margin: "6px 0 0" }}>{catalogError}</p>
            )}
          </>
        )}

        <h4 style={{ margin: "14px 0 6px", fontSize: 13, color: "var(--text-muted)" }}>Ou item próprio</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <label style={{ fontSize: 13 }}>
            Nome{" "}
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="ex.: Velas" style={{ width: 180 }} />
          </label>
          <label style={{ fontSize: 13 }}>
            Qtd <Input type="number" min="1" value={customQty} onChange={(e) => setCustomQty(e.target.value)} style={{ width: 64 }} />
          </label>
          <Button variant="secondary" onClick={addCustom} disabled={!customName.trim()}>Adicionar</Button>
        </div>
      </Card>

      {/* Tasks */}
      <Card>
        <h3 style={{ marginTop: 0 }}>Tarefas</h3>
        {tasks.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem tarefas ainda.</p>}
        {tasks.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {tasks.map((t) => (
              <li key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} style={{ marginTop: 3 }} />
                <span style={{ flex: 1 }}>
                  <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--text-muted)" : "inherit" }}>
                    {t.text}
                  </span>
                  {t.note && <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{t.note}</span>}
                </span>
                <Badge tone="neutral">{assigneeLabel(t)}</Badge>
                {t.dueDate && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.dueDate.slice(0, 10)}</span>}
                <Button variant="ghost" onClick={() => removeTask(t.id)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <label style={{ fontSize: 13, flex: "1 1 180px" }}>
            Nova tarefa{" "}
            <Input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="ex.: Confirmar flores" />
          </label>
          <label style={{ fontSize: 13 }}>
            Responsável{" "}
            <select className="input" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
              <option value="couple">Noivos</option>
              <option value="venue">Quinta</option>
              {suppliers.map((s) => (
                <option key={s.id} value={`s:${s.id}`}>{s.name}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13, flex: "1 1 160px" }}>
            Nota{" "}
            <Input value={taskNote} onChange={(e) => setTaskNote(e.target.value)} placeholder="opcional" />
          </label>
          <label style={{ fontSize: 13 }}>
            Data{" "}
            <Input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} style={{ width: 150 }} />
          </label>
          <Button variant="primary" onClick={addTask} disabled={!taskText.trim()}>
            Adicionar
          </Button>
        </div>
        {suppliers.length === 0 && (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Adiciona fornecedores em Detalhes para os poderes atribuir.</p>
        )}
      </Card>
    </div>
  );
}
