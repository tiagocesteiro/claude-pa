"use client";

import { useState } from "react";
import type { Group, Guest } from "./useGuestBoard";
import GuestGroupsEditor from "./GuestGroupsEditor";
import DietaryDatalist from "./DietaryDatalist";
import { DIETARY_DATALIST_ID } from "@/lib/labels";

// Same "adult"/"child"/"senior" values used by AddGuestForm + import normalization.
const AGE_OPTIONS: { label: string; value: string }[] = [
  { label: "—", value: "" },
  { label: "Adulto", value: "adult" },
  { label: "Criança", value: "child" },
  { label: "Idoso", value: "senior" },
];
const AGE_LABELS: Record<string, string> = { adult: "Adulto", child: "Criança", senior: "Idoso" };

const RSVP_OPTIONS: { label: string; value: string }[] = [
  { label: "Pendente", value: "pending" },
  { label: "Confirmado", value: "confirmed" },
  { label: "Recusado", value: "declined" },
];

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid var(--border)",
  fontSize: 13,
  color: "var(--text-muted)",
  fontWeight: 600,
  whiteSpace: "nowrap",
};
const thSortable: React.CSSProperties = {
  ...th,
  cursor: "pointer",
  userSelect: "none",
};
const td: React.CSSProperties = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle",
};

type SortKey = "name" | "rsvp" | "group" | "age" | "gender";
type SortDir = "asc" | "desc";

const RSVP_ORDER: Record<string, number> = { pending: 0, confirmed: 1, declined: 2 };
const AGE_ORDER: Record<string, number> = { adult: 0, child: 1, senior: 2 };

export default function GuestTable({
  guests,
  groups,
  error,
  assign,
  addGroup,
  renameGroup,
  removeGroup,
  setGuestGroups,
  updateGuestAttrs,
  setPlusOne,
}: {
  guests: Guest[];
  groups: Group[];
  error?: string | null;
  assign: (guestId: string, groupId: string | null) => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  renameGroup: (id: string, name: string) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  setGuestGroups: (
    guestId: string,
    primaryGroupId: string | null,
    extraGroupIds: string[]
  ) => Promise<void>;
  updateGuestAttrs: (
    guestId: string,
    attrs: {
      ageGroup?: string | null;
      gender?: string | null;
      dietary?: string | null;
      rsvp?: string | null;
    }
  ) => Promise<void>;
  setPlusOne: (guestId: string, partnerId: string | null) => Promise<void>;
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [filterRsvp, setFilterRsvp] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? null;
  const guestName = (id: string | null) => guests.find((g) => g.id === id)?.name ?? null;

  function extraGroupNames(guest: Guest): string[] {
    if (!guest.extraGroups) return [];
    try {
      const ids = JSON.parse(guest.extraGroups) as string[];
      return ids.map((id) => groupName(id)).filter((n): n is string => !!n);
    } catch {
      return [];
    }
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addGroup(newGroupName.trim());
    setNewGroupName("");
  }

  async function commitRename(id: string) {
    if (renameValue.trim()) await renameGroup(id, renameValue.trim());
    setRenamingId(null);
  }

  async function handleRemoveGroup(id: string) {
    if (removingId) return;
    setRemovingId(id);
    try {
      await removeGroup(id);
    } finally {
      setRemovingId(null);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span style={{ fontSize: 10 }}>{sortDir === "asc" ? " ▲" : " ▼"}</span>;
  }

  const filtered = guests.filter((g) => {
    if (filterGroup === "__none__" && g.groupId !== null) return false;
    if (filterGroup && filterGroup !== "__none__" && g.groupId !== filterGroup) return false;
    if (filterRsvp && (g.rsvp ?? "pending") !== filterRsvp) return false;
    if (filterName.trim() && !g.name.toLowerCase().includes(filterName.trim().toLowerCase()))
      return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name, "pt");
        break;
      case "rsvp":
        cmp =
          (RSVP_ORDER[a.rsvp ?? "pending"] ?? 0) - (RSVP_ORDER[b.rsvp ?? "pending"] ?? 0);
        break;
      case "group": {
        const an = groupName(a.groupId) ?? "";
        const bn = groupName(b.groupId) ?? "";
        cmp = an.localeCompare(bn, "pt");
        break;
      }
      case "age":
        cmp = (AGE_ORDER[a.ageGroup ?? ""] ?? 99) - (AGE_ORDER[b.ageGroup ?? ""] ?? 99);
        break;
      case "gender":
        cmp = (a.gender ?? "").localeCompare(b.gender ?? "", "pt");
        break;
    }
    if (cmp === 0) cmp = a.name.localeCompare(b.name, "pt");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const confirmedCount = guests.filter((g) => (g.rsvp ?? "pending") === "confirmed").length;
  const declinedCount = guests.filter((g) => (g.rsvp ?? "pending") === "declined").length;
  const pendingCount = guests.length - confirmedCount - declinedCount;

  return (
    <div>
      <DietaryDatalist />
      {/* Groups management --------------------------------------------------- */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 9,
          padding: 12,
          marginBottom: 16,
          background: "var(--surface-2)",
        }}
      >
        <form onSubmit={handleAddGroup} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <strong style={{ color: "var(--heading)" }}>Grupos</strong>
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Novo grupo"
          />
          <button type="submit">Adicionar grupo</button>
        </form>
        {groups.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {groups.map((g) => (
              <span
                key={g.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  padding: "3px 10px",
                  background: "var(--surface)",
                }}
              >
                {renamingId === g.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => commitRename(g.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(g.id);
                    }}
                    style={{ width: 120 }}
                  />
                ) : (
                  <span
                    onClick={() => {
                      setRenamingId(g.id);
                      setRenameValue(g.name);
                    }}
                    style={{ cursor: "pointer" }}
                    title="Clica para renomear"
                  >
                    {g.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(g.id)}
                  disabled={removingId !== null}
                  title="Remover grupo"
                  style={{ padding: "0 6px", fontSize: 12, color: "#dc2626" }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {guests.length > 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>
          {confirmedCount} confirmados · {pendingCount} pendentes · {declinedCount} recusados ·{" "}
          {guests.length} total
        </p>
      )}

      {guests.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Sem convidados ainda.</p>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
              Grupo
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                aria-label="Filtrar por grupo"
              >
                <option value="">— todos —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
                <option value="__none__">Sem grupo</option>
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
              Confirmação
              <select
                value={filterRsvp}
                onChange={(e) => setFilterRsvp(e.target.value)}
                aria-label="Filtrar por confirmação"
              >
                <option value="">— todas —</option>
                {RSVP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 2 }}>
              Nome
              <input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Procurar por nome"
                aria-label="Procurar por nome"
              />
            </label>
            <span style={{ color: "var(--text-muted)", fontSize: 13, alignSelf: "flex-end" }}>
              a mostrar {sorted.length} de {guests.length}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 9,
            }}
          >
            <thead>
              <tr>
                <th style={thSortable} onClick={() => toggleSort("name")}>
                  Nome{sortIndicator("name")}
                </th>
                <th style={thSortable} onClick={() => toggleSort("rsvp")}>
                  Confirmação{sortIndicator("rsvp")}
                </th>
                <th style={thSortable} onClick={() => toggleSort("group")}>
                  Grupo{sortIndicator("group")}
                </th>
                <th style={th}>Grupos extra</th>
                <th style={th}>Plus one</th>
                <th style={thSortable} onClick={() => toggleSort("age")}>
                  Idade{sortIndicator("age")}
                </th>
                <th style={thSortable} onClick={() => toggleSort("gender")}>
                  Género{sortIndicator("gender")}
                </th>
                <th style={th}>Dieta</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((guest) => {
                const extras = extraGroupNames(guest);
                const isEditing = editingGuestId === guest.id;
                const rsvp = guest.rsvp ?? "pending";
                const rowStyle: React.CSSProperties =
                  rsvp === "confirmed"
                    ? { background: "rgba(34,197,94,0.08)" }
                    : rsvp === "declined"
                      ? { opacity: 0.65 }
                      : {};
                return (
                  <tr key={guest.id} data-testid={`guest-row-${guest.id}`} style={rowStyle}>
                    <td
                      style={{
                        ...td,
                        textDecoration: rsvp === "declined" ? "line-through" : "none",
                        color: rsvp === "declined" ? "var(--text-muted)" : undefined,
                      }}
                    >
                      {guest.name}
                    </td>
                    <td style={td}>
                      <select
                        value={rsvp}
                        onChange={(e) => updateGuestAttrs(guest.id, { rsvp: e.target.value })}
                        aria-label={`Confirmação de ${guest.name}`}
                      >
                        {RSVP_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <select
                        value={guest.groupId ?? ""}
                        onChange={(e) => assign(guest.id, e.target.value || null)}
                        aria-label={`Grupo de ${guest.name}`}
                      >
                        <option value="">Sem grupo</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...td, minWidth: 160 }}>
                      <span style={{ color: extras.length ? "var(--text)" : "var(--text-muted)" }}>
                        {extras.length ? extras.join(", ") : "—"}
                      </span>{" "}
                      <button
                        type="button"
                        onClick={() => setEditingGuestId(isEditing ? null : guest.id)}
                        style={{ fontSize: 11, padding: "2px 8px" }}
                      >
                        {isEditing ? "Fechar" : "Editar"}
                      </button>
                      {isEditing && (
                        <GuestGroupsEditor
                          guest={guest}
                          groups={groups}
                          setGuestGroups={setGuestGroups}
                          onClose={() => setEditingGuestId(null)}
                        />
                      )}
                    </td>
                    <td style={{ ...td, minWidth: 170 }}>
                      {guest.plusOneId ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <span>{guestName(guest.plusOneId) ?? "—"}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            (cross reference)
                          </span>
                          <button
                            type="button"
                            onClick={() => setPlusOne(guest.id, null)}
                            title="Remover acompanhante"
                            style={{ padding: "0 6px", fontSize: 12, color: "#dc2626" }}
                          >
                            ×
                          </button>
                        </span>
                      ) : (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) setPlusOne(guest.id, e.target.value);
                          }}
                          aria-label={`Plus one de ${guest.name}`}
                        >
                          <option value="">— (nenhum)</option>
                          {guests
                            .filter((g) => g.id !== guest.id && g.plusOneId === null)
                            .sort((a, b) => a.name.localeCompare(b.name, "pt"))
                            .map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </td>
                    <td style={td}>
                      <select
                        value={guest.ageGroup ?? ""}
                        onChange={(e) =>
                          updateGuestAttrs(guest.id, { ageGroup: e.target.value || null })
                        }
                        aria-label={`Idade de ${guest.name}`}
                        title={guest.ageGroup ? AGE_LABELS[guest.ageGroup] ?? guest.ageGroup : ""}
                      >
                        {AGE_OPTIONS.map((o) => (
                          <option key={o.label} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        defaultValue={guest.gender ?? ""}
                        placeholder="—"
                        style={{ width: 80 }}
                        aria-label={`Género de ${guest.name}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (guest.gender ?? null)) updateGuestAttrs(guest.id, { gender: v });
                        }}
                      />
                    </td>
                    <td style={td}>
                      <input
                        list={DIETARY_DATALIST_ID}
                        defaultValue={guest.dietary ?? ""}
                        placeholder="—"
                        style={{ width: 140 }}
                        aria-label={`Dieta de ${guest.name}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim() || null;
                          if (v !== (guest.dietary ?? null))
                            updateGuestAttrs(guest.id, { dietary: v });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
