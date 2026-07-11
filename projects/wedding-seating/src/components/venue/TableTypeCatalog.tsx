"use client";

import { useCallback, useEffect, useState } from "react";

export interface TableTypeRecord {
  id: string;
  venueId: string;
  name: string;
  shape: string;
  minSeats: number;
  maxSeats: number;
  width: number;
  depth: number;
  quantity: number;
}

type Shape = "round" | "oval" | "rect";

interface FormValues {
  name: string;
  shape: Shape;
  minSeats: string;
  maxSeats: string;
  width: string;
  depth: string;
  quantity: string;
}

const emptyForm: FormValues = {
  name: "",
  shape: "round",
  minSeats: "",
  maxSeats: "",
  width: "",
  depth: "",
  quantity: "1",
};

function normalizeShape(shape: string): Shape {
  return shape === "oval" || shape === "rect" ? shape : "round";
}

function shapeLabel(shape: string): string {
  if (shape === "oval") return "Oval";
  if (shape === "rect") return "Retangular";
  return "Redonda";
}

function dimensionsLabel(t: TableTypeRecord): string {
  if (t.shape === "round") return `⌀ ${t.width} m`;
  return `${t.width} × ${t.depth} m`;
}

export interface TableTypeCatalogProps {
  venueId: string;
  /** Called after any create/update/delete so parents can refresh their own copy of the list. */
  onChange?: (tableTypes: TableTypeRecord[]) => void;
}

export default function TableTypeCatalog({ venueId, onChange }: TableTypeCatalogProps) {
  const [tableTypes, setTableTypes] = useState<TableTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormValues>(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/table-types`);
      if (!res.ok) throw new Error("failed to load table types");
      const data = (await res.json()) as TableTypeRecord[];
      setTableTypes(data);
      onChange?.(data);
    } catch {
      setError("Failed to load table types");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    load();
  }, [load]);

  function parsedPayload(values: FormValues) {
    return {
      name: values.name.trim(),
      shape: values.shape,
      minSeats: Number(values.minSeats),
      maxSeats: Number(values.maxSeats),
      width: Number(values.width),
      depth: Number(values.depth),
      quantity: Number(values.quantity) || 1,
    };
  }

  function validate(values: FormValues): string | null {
    if (!values.name.trim()) return "Name is required";
    const { minSeats, maxSeats, width, depth } = parsedPayload(values);
    if (!Number.isFinite(minSeats) || minSeats <= 0) return "Min seats must be greater than 0";
    if (!Number.isFinite(maxSeats) || maxSeats < minSeats) return "Max seats must be ≥ min seats";
    if (!Number.isFinite(width) || width <= 0) return "Width must be greater than 0";
    if (!Number.isFinite(depth) || depth <= 0) return "Depth must be greater than 0";
    return null;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/table-types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPayload(form)),
      });
      if (!res.ok) throw new Error("failed to create table type");
      setForm(emptyForm);
      await load();
    } catch {
      setError("Failed to create table type");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(t: TableTypeRecord) {
    setEditingId(t.id);
    setRowError(null);
    setEditForm({
      name: t.name,
      shape: normalizeShape(t.shape),
      minSeats: String(t.minSeats),
      maxSeats: String(t.maxSeats),
      width: String(t.width),
      depth: String(t.depth),
      quantity: String(t.quantity),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setRowError(null);
  }

  async function handleSaveEdit(id: string) {
    setRowError(null);
    const validationError = validate(editForm);
    if (validationError) {
      setRowError(validationError);
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/table-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPayload(editForm)),
      });
      if (!res.ok) throw new Error("failed to update table type");
      setEditingId(null);
      await load();
    } catch {
      setRowError("Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    setRowError(null);
    try {
      const res = await fetch(`/api/table-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed to delete table type");
      await load();
    } catch {
      setError("Failed to delete table type");
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <strong>Table type catalog</strong>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          {tableTypes.length === 0 && <p>No table types yet.</p>}
          {tableTypes.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Name</th>
                  <th style={{ textAlign: "left" }}>Shape</th>
                  <th style={{ textAlign: "left" }}>Min</th>
                  <th style={{ textAlign: "left" }}>Max</th>
                  <th style={{ textAlign: "left" }} colSpan={2}>Dimensions</th>
                  <th style={{ textAlign: "left" }}>Qty</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tableTypes.map((t) =>
                  editingId === t.id ? (
                    <tr key={t.id}>
                      <td>
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          style={{ width: 90 }}
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.shape}
                          onChange={(e) => {
                            const shape = e.target.value as Shape;
                            setEditForm((f) =>
                              shape === "round" ? { ...f, shape, depth: f.width } : { ...f, shape }
                            );
                          }}
                        >
                          <option value="round">Redonda</option>
                          <option value="oval">Oval</option>
                          <option value="rect">Retangular</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={editForm.minSeats}
                          onChange={(e) => setEditForm((f) => ({ ...f, minSeats: e.target.value }))}
                          style={{ width: 50 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={editForm.maxSeats}
                          onChange={(e) => setEditForm((f) => ({ ...f, maxSeats: e.target.value }))}
                          style={{ width: 50 }}
                        />
                      </td>
                      {editForm.shape === "round" ? (
                        <td colSpan={2}>
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            value={editForm.width}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, width: e.target.value, depth: e.target.value }))
                            }
                            style={{ width: 60 }}
                            aria-label="Diâmetro (m)"
                          />
                        </td>
                      ) : (
                        <>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={editForm.width}
                              onChange={(e) => setEditForm((f) => ({ ...f, width: e.target.value }))}
                              style={{ width: 60 }}
                              aria-label={
                                editForm.shape === "oval" ? "Diâmetro maior (m)" : "Comprimento (m)"
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={editForm.depth}
                              onChange={(e) => setEditForm((f) => ({ ...f, depth: e.target.value }))}
                              style={{ width: 60 }}
                              aria-label={
                                editForm.shape === "oval" ? "Diâmetro menor (m)" : "Largura (m)"
                              }
                            />
                          </td>
                        </>
                      )}
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={editForm.quantity}
                          onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                          style={{ width: 50 }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(t.id)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={cancelEdit} style={{ marginLeft: 4 }}>
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td>{shapeLabel(t.shape)}</td>
                      <td>{t.minSeats}</td>
                      <td>{t.maxSeats}</td>
                      <td colSpan={2}>{dimensionsLabel(t)}</td>
                      <td>{t.quantity}</td>
                      <td>
                        <button type="button" onClick={() => startEdit(t)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          style={{ marginLeft: 4, color: "#dc2626" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
          {rowError && <p style={{ color: "#dc2626" }}>{rowError}</p>}
        </>
      )}

      <form onSubmit={handleCreate} style={{ marginTop: 16 }}>
        <strong>Add table type</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <label>
            Name{" "}
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ width: 110 }}
            />
          </label>
          <label>
            Shape{" "}
            <select
              value={form.shape}
              onChange={(e) => {
                const shape = e.target.value as Shape;
                setForm((f) => (shape === "round" ? { ...f, shape, depth: f.width } : { ...f, shape }));
              }}
            >
              <option value="round">Redonda</option>
              <option value="oval">Oval</option>
              <option value="rect">Retangular</option>
            </select>
          </label>
          <label>
            Min seats{" "}
            <input
              type="number"
              min={1}
              value={form.minSeats}
              onChange={(e) => setForm((f) => ({ ...f, minSeats: e.target.value }))}
              style={{ width: 60 }}
            />
          </label>
          <label>
            Max seats{" "}
            <input
              type="number"
              min={1}
              value={form.maxSeats}
              onChange={(e) => setForm((f) => ({ ...f, maxSeats: e.target.value }))}
              style={{ width: 60 }}
            />
          </label>
          {form.shape === "round" ? (
            <label>
              Diâmetro (m){" "}
              <input
                type="number"
                step="0.1"
                min={0}
                value={form.width}
                onChange={(e) => setForm((f) => ({ ...f, width: e.target.value, depth: e.target.value }))}
                style={{ width: 70 }}
              />
            </label>
          ) : (
            <>
              <label>
                {form.shape === "oval" ? "Diâmetro maior (m)" : "Comprimento (m)"}{" "}
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.width}
                  onChange={(e) => setForm((f) => ({ ...f, width: e.target.value }))}
                  style={{ width: 70 }}
                />
              </label>
              <label>
                {form.shape === "oval" ? "Diâmetro menor (m)" : "Largura (m)"}{" "}
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.depth}
                  onChange={(e) => setForm((f) => ({ ...f, depth: e.target.value }))}
                  style={{ width: 70 }}
                />
              </label>
            </>
          )}
          <label>
            Quantity{" "}
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              style={{ width: 60 }}
            />
          </label>
        </div>
        <button type="submit" disabled={creating} style={{ marginTop: 8 }}>
          {creating ? "Adding..." : "Add table type"}
        </button>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      </form>
    </div>
  );
}
