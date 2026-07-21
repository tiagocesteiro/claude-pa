"use client";

import { useCallback, useEffect, useState } from "react";
import { imageUrlFor } from "@/lib/images";

export interface DecorItemRecord {
  id: string;
  venueId: string;
  name: string;
  category: string | null;
  price: number | null;
  quantity: number | null;
  image: string | null;
}

interface FormValues {
  name: string;
  category: string;
  price: string;
  quantity: string;
}

const emptyForm: FormValues = { name: "", category: "", price: "", quantity: "" };

const thumbStyle: React.CSSProperties = {
  width: 48,
  height: 36,
  objectFit: "cover",
  borderRadius: 4,
  border: "1px solid var(--border)",
};

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
      quantity: v.quantity === "" ? null : Number(v.quantity),
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
    setEditForm({
      name: it.name,
      category: it.category ?? "",
      price: it.price == null ? "" : String(it.price),
      quantity: it.quantity == null ? "" : String(it.quantity),
    });
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

  const [importing, setImporting] = useState(false);

  /** Bulk import: one item per image. `names` (parallel to `files`) overrides the
   * per-file name — used by the folder import ("<folder> <n>"). */
  async function importImages(files: File[], names?: string[]) {
    if (files.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f, i) => {
        fd.append("files", f);
        fd.append("names", names?.[i] ?? "");
      });
      const res = await fetch(`/api/venues/${venueId}/decor-items/import`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("import failed");
      await load();
    } catch {
      setError("Não foi possível importar as imagens.");
    } finally {
      setImporting(false);
    }
  }

  /** Folder import: each image is named after its immediate (sub)folder + a
   * running sequential number, e.g. "Arcos florais 1", "Arcos florais 2". */
  function importFolder(fileList: FileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    const counters: Record<string, number> = {};
    const names = files.map((f) => {
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      const parts = rel.split("/");
      const folder = parts.length >= 2 ? parts[parts.length - 2] : "Item";
      counters[folder] = (counters[folder] ?? 0) + 1;
      return `${folder} ${counters[folder]}`;
    });
    void importImages(files, names);
  }

  /** Import from an .xlsx with columns: image (embedded) + name + quantity. */
  async function importExcel(file: File) {
    setImporting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/venues/${venueId}/decor-items/import-excel`, { method: "POST", body: fd });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(b?.error ?? "erro");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error && e.message ? `Excel: ${e.message}` : "Não foi possível importar o Excel.");
    } finally {
      setImporting(false);
    }
  }

  /** Set/replace one item's image. */
  async function setItemImage(id: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/decor-items/${id}/image`, { method: "POST", body: fd });
    if (res.ok) await load();
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong>Catálogo de decoração</strong>
        <label style={{ fontSize: 13, cursor: "pointer", color: "var(--accent-strong, #54704c)" }}>
          {importing ? "A importar…" : "Importar imagens (nome = ficheiro)"}
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            disabled={importing}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
              if (files.length) void importImages(files);
              e.target.value = "";
            }}
          />
        </label>
        <label style={{ fontSize: 13, cursor: "pointer", color: "var(--accent-strong, #54704c)" }}>
          {importing ? "" : "Importar pasta (nome = pasta + nº)"}
          <input
            type="file"
            style={{ display: "none" }}
            disabled={importing}
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => {
              if (e.target.files?.length) importFolder(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label style={{ fontSize: 13, cursor: "pointer", color: "var(--accent-strong, #54704c)" }}>
          {importing ? "" : "Importar de Excel (imagem + nome + qtd)"}
          <input
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            disabled={importing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importExcel(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {loading && <p style={{ color: "var(--text-muted)" }}>A carregar...</p>}

      {!loading && (
        <>
          {items.length === 0 && <p style={{ color: "var(--text-muted)" }}>Ainda não há itens de decoração.</p>}
          {items.length > 0 && (
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Foto</th>
                    <th style={{ textAlign: "left" }}>Nome</th>
                    <th style={{ textAlign: "left" }}>Categoria</th>
                    <th style={{ textAlign: "left" }}>Preço</th>
                    <th style={{ textAlign: "left" }}>Qtd</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) =>
                    editingId === it.id ? (
                      <tr key={it.id}>
                        <td>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {it.image ? <img src={imageUrlFor(it.image)} alt={it.name} style={thumbStyle} /> : "—"}
                        </td>
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
                          <input type="number" min={0} value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} style={{ width: 56 }} />
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
                        <td>
                          <label style={{ cursor: "pointer", display: "inline-block" }} title={it.image ? "Trocar foto" : "Adicionar foto"}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {it.image ? (
                              <img src={imageUrlFor(it.image)} alt={it.name} style={thumbStyle} />
                            ) : (
                              <span style={{ ...thumbStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 11 }}>+ foto</span>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void setItemImage(it.id, f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </td>
                        <td>{it.name}</td>
                        <td>{it.category ?? "—"}</td>
                        <td>{it.price == null ? "—" : `${it.price} €`}</td>
                        <td>{it.quantity ?? "—"}</td>
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
          <label>
            Qtd <input type="number" min={0} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} style={{ width: 64 }} />
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
