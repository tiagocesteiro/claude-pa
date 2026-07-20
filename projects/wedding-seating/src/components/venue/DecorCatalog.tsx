"use client";

import { useCallback, useEffect, useState } from "react";

export interface DecorItemRecord {
  id: string;
  venueId: string;
  name: string;
  category: string | null;
  price: number | null;
}

interface FormValues {
  name: string;
  category: string;
  price: string;
}

const emptyForm: FormValues = { name: "", category: "", price: "" };

export interface DecorCatalogProps {
  venueId: string;
  onChange?: (items: DecorItemRecord[]) => void;
}

/** The venue's decoration catalog — a dataset the couple picks from per moment.
 * Same shape/behaviour as the table-type catalog. */
export default function DecorCatalog({ venueId, onChange }: DecorCatalogProps) {
  const [items, setItems] = useState<DecorItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormValues>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/decor-items`);
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { items: DecorItemRecord[] };
      setItems(data.items ?? []);
      onChange?.(data.items ?? []);
    } catch {
      setError("Não foi possível carregar a decoração.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    load();
  }, [load]);

  function payload(v: FormValues) {
    return {
      name: v.name.trim(),
      category: v.category.trim() || null,
      price: v.price === "" ? null : Number(v.price),
    };
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/decor-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(form)),
      });
      if (!res.ok) throw new Error("failed");
      setForm(emptyForm);
      await load();
    } catch {
      setError("Não foi possível adicionar o item.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(it: DecorItemRecord) {
    setEditingId(it.id);
    setEditForm({ name: it.name, category: it.category ?? "", price: it.price == null ? "" : String(it.price) });
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/decor-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(editForm)),
      });
      if (!res.ok) throw new Error("failed");
      setEditingId(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/decor-items/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: 14 }}>
      <strong>Catálogo de decoração</strong>
      {loading && <p style={{ color: "var(--text-muted)" }}>A carregar...</p>}

      {!loading && (
        <>
          {items.length === 0 && <p style={{ color: "var(--text-muted)" }}>Ainda não há itens de decoração.</p>}
          {items.length > 0 && (
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Nome</th>
                    <th style={{ textAlign: "left" }}>Categoria</th>
                    <th style={{ textAlign: "left" }}>Preço</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) =>
                    editingId === it.id ? (
                      <tr key={it.id}>
                        <td>
                          <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} style={{ width: 120 }} />
                        </td>
                        <td>
                          <input value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} style={{ width: 100 }} />
                        </td>
                        <td>
                          <input type="number" step="0.01" min={0} value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} style={{ width: 70 }} />
                        </td>
                        <td>
                          <button type="button" onClick={() => saveEdit(it.id)} disabled={savingEdit}>
                            {savingEdit ? "..." : "Guardar"}
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} style={{ marginLeft: 4 }}>
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={it.id}>
                        <td>{it.name}</td>
                        <td>{it.category ?? "—"}</td>
                        <td>{it.price == null ? "—" : `${it.price} €`}</td>
                        <td>
                          <button type="button" onClick={() => startEdit(it)}>Editar</button>
                          <button type="button" onClick={() => remove(it.id)} style={{ marginLeft: 4, color: "#dc2626" }}>Apagar</button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <form onSubmit={handleCreate} style={{ marginTop: 16 }}>
        <strong>Adicionar item</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <label>
            Nome <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: 140 }} />
          </label>
          <label>
            Categoria <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={{ width: 120 }} placeholder="Flores, luz…" />
          </label>
          <label>
            Preço (€) <input type="number" step="0.01" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} style={{ width: 80 }} />
          </label>
        </div>
        <button type="submit" disabled={creating} style={{ marginTop: 8 }}>
          {creating ? "A adicionar..." : "Adicionar item"}
        </button>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      </form>
    </div>
  );
}
