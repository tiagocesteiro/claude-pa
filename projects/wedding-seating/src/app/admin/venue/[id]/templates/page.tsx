"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface TableTypeRecord {
  id: string;
  name: string;
  shape: string;
  minSeats: number;
  maxSeats: number;
}

interface TemplateLine {
  tableTypeId: string;
  quantity: number;
}

interface TemplateRecord {
  id: string;
  venueId: string;
  name: string;
  minGuests: number;
  maxGuests: number;
  lines: string;
}

interface LineRow {
  tableTypeId: string;
  quantity: string;
}

interface FormValues {
  name: string;
  minGuests: string;
  maxGuests: string;
  lines: LineRow[];
}

function emptyLine(): LineRow {
  return { tableTypeId: "", quantity: "1" };
}

function emptyForm(): FormValues {
  return { name: "", minGuests: "", maxGuests: "", lines: [emptyLine()] };
}

function parseLines(lines: string): TemplateLine[] {
  try {
    const parsed = JSON.parse(lines);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export default function VenueTemplatesPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
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
      const [templatesRes, tableTypesRes] = await Promise.all([
        fetch(`/api/venues/${venueId}/templates`),
        fetch(`/api/venues/${venueId}/table-types`),
      ]);
      if (!templatesRes.ok) throw new Error("failed to load templates");
      if (!tableTypesRes.ok) throw new Error("failed to load table types");
      const templatesData = (await templatesRes.json()) as TemplateRecord[];
      const tableTypesData = (await tableTypesRes.json()) as TableTypeRecord[];
      setTemplates(templatesData);
      setTableTypes(tableTypesData);
    } catch {
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    load();
  }, [load]);

  function tableTypeName(id: string): string {
    return tableTypes.find((t) => t.id === id)?.name ?? "(tipo removido)";
  }

  function validate(values: FormValues): string | null {
    if (!values.name.trim()) return "Name is required";
    const minGuests = Number(values.minGuests);
    const maxGuests = Number(values.maxGuests);
    if (!Number.isFinite(minGuests) || minGuests <= 0) return "Min guests must be greater than 0";
    if (!Number.isFinite(maxGuests) || maxGuests < minGuests) return "Max guests must be ≥ min guests";
    return null;
  }

  function buildPayload(values: FormValues) {
    const lines = values.lines
      .filter((r) => r.tableTypeId && Number(r.quantity) > 0)
      .map((r) => ({ tableTypeId: r.tableTypeId, quantity: Number(r.quantity) }));
    return {
      name: values.name.trim(),
      minGuests: Number(values.minGuests),
      maxGuests: Number(values.maxGuests),
      lines: JSON.stringify(lines),
    };
  }

  function addLine(setter: React.Dispatch<React.SetStateAction<FormValues>>) {
    setter((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  }

  function removeLine(setter: React.Dispatch<React.SetStateAction<FormValues>>, index: number) {
    setter((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));
  }

  function updateLine(
    setter: React.Dispatch<React.SetStateAction<FormValues>>,
    index: number,
    patch: Partial<LineRow>
  ) {
    setter((f) => ({
      ...f,
      lines: f.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
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
      const res = await fetch(`/api/venues/${venueId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) throw new Error("failed to create template");
      setForm(emptyForm());
      await load();
    } catch {
      setError("Failed to create template");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(t: TemplateRecord) {
    setEditingId(t.id);
    setRowError(null);
    const lines = parseLines(t.lines);
    setEditForm({
      name: t.name,
      minGuests: String(t.minGuests),
      maxGuests: String(t.maxGuests),
      lines:
        lines.length > 0
          ? lines.map((l) => ({ tableTypeId: l.tableTypeId, quantity: String(l.quantity) }))
          : [emptyLine()],
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
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editForm)),
      });
      if (!res.ok) throw new Error("failed to update template");
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
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed to delete template");
      await load();
    } catch {
      setError("Failed to delete template");
    }
  }

  const hasTableTypes = tableTypes.length > 0;

  function renderLineRows(
    values: FormValues,
    setter: React.Dispatch<React.SetStateAction<FormValues>>
  ) {
    return (
      <div style={{ marginTop: 8 }}>
        {values.lines.map((line, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <select
              value={line.tableTypeId}
              onChange={(e) => updateLine(setter, i, { tableTypeId: e.target.value })}
              disabled={!hasTableTypes}
              style={{ width: 160 }}
            >
              <option value="">Selecionar tipo de mesa</option>
              {tableTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={line.quantity}
              onChange={(e) => updateLine(setter, i, { quantity: e.target.value })}
              style={{ width: 60 }}
            />
            <button
              type="button"
              onClick={() => removeLine(setter, i)}
              disabled={values.lines.length <= 1}
              style={{ color: "#dc2626" }}
            >
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addLine(setter)}
          disabled={!hasTableTypes}
          style={{ marginTop: 4 }}
        >
          + Adicionar linha
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Templates</h2>

      {!loading && !hasTableTypes && (
        <p style={{ color: "#dc2626" }}>Cria tipos de mesa primeiro</p>
      )}

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          {templates.length === 0 && <p style={{ color: "#6b7280" }}>Sem templates ainda</p>}
          {templates.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {templates.map((t) =>
                editingId === t.id ? (
                  <div
                    key={t.id}
                    style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
                  >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <label>
                        Name{" "}
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          style={{ width: 120 }}
                        />
                      </label>
                      <label>
                        Min guests{" "}
                        <input
                          type="number"
                          min={0}
                          value={editForm.minGuests}
                          onChange={(e) => setEditForm((f) => ({ ...f, minGuests: e.target.value }))}
                          style={{ width: 70 }}
                        />
                      </label>
                      <label>
                        Max guests{" "}
                        <input
                          type="number"
                          min={0}
                          value={editForm.maxGuests}
                          onChange={(e) => setEditForm((f) => ({ ...f, maxGuests: e.target.value }))}
                          style={{ width: 70 }}
                        />
                      </label>
                    </div>
                    {renderLineRows(editForm, setEditForm)}
                    <div style={{ marginTop: 8 }}>
                      <button type="button" onClick={() => handleSaveEdit(t.id)} disabled={savingEdit}>
                        {savingEdit ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={cancelEdit} style={{ marginLeft: 4 }}>
                        Cancel
                      </button>
                    </div>
                    {rowError && <p style={{ color: "#dc2626" }}>{rowError}</p>}
                  </div>
                ) : (
                  <div
                    key={t.id}
                    style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}
                  >
                    <strong>{t.name}</strong>
                    <span style={{ color: "#6b7280", marginLeft: 8 }}>
                      {t.minGuests}-{t.maxGuests} convidados
                    </span>
                    <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                      {parseLines(t.lines).map((line, i) => (
                        <li key={i}>
                          {line.quantity}× {tableTypeName(line.tableTypeId)}
                        </li>
                      ))}
                    </ul>
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
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}

      <form onSubmit={handleCreate} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <strong>Novo template</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <label>
            Name{" "}
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ width: 120 }}
            />
          </label>
          <label>
            Min guests{" "}
            <input
              type="number"
              min={0}
              value={form.minGuests}
              onChange={(e) => setForm((f) => ({ ...f, minGuests: e.target.value }))}
              style={{ width: 70 }}
            />
          </label>
          <label>
            Max guests{" "}
            <input
              type="number"
              min={0}
              value={form.maxGuests}
              onChange={(e) => setForm((f) => ({ ...f, maxGuests: e.target.value }))}
              style={{ width: 70 }}
            />
          </label>
        </div>
        {renderLineRows(form, setForm)}
        <button type="submit" disabled={creating} style={{ marginTop: 8 }}>
          {creating ? "Adding..." : "Add template"}
        </button>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      </form>
    </div>
  );
}
