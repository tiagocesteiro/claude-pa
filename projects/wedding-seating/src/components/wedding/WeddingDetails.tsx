"use client";

import { useEffect, useState } from "react";
import ArrangementThumbnail from "@/components/wedding/ArrangementThumbnail";

// Mirrors MOMENT_KINDS in src/lib/db/moments.ts — duplicated (not imported) so this
// client component doesn't pull the server-only Prisma module into the browser bundle.
const MOMENT_KINDS = ["ceremony", "cocktail", "dinner", "dance"] as const;
type MomentKind = (typeof MOMENT_KINDS)[number];

const MOMENT_LABELS: Record<MomentKind, string> = {
  ceremony: "Cerimónia",
  cocktail: "Cocktail",
  dinner: "Jantar",
  dance: "Dança",
};

interface Venue {
  id: string;
  name: string;
  location: string | null;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  minGuests: number;
  maxGuests: number;
  venueId: string;
}

interface MomentTemplate {
  id: string;
  floorPlan: { image: string | null; scale: number; width: number; depth: number } | null;
}

interface Moment {
  id: string;
  kind: MomentKind;
  floorPlanId: string | null;
  templateId: string | null;
  template: MomentTemplate | null;
  notes: string | null;
}

interface WeddingDetail {
  id: string;
  couple: string;
  date: string | null;
  venueId: string | null;
  partner1: string | null;
  partner1Email: string | null;
  partner1Phone: string | null;
  partner2: string | null;
  partner2Email: string | null;
  partner2Phone: string | null;
  guestEstimate: number | null;
  notes: string | null;
  moments: Moment[];
}

const label: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  color: "var(--text-muted)",
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function WeddingDetails({ weddingId }: { weddingId: string }) {
  const [wedding, setWedding] = useState<WeddingDetail | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [couple, setCouple] = useState("");
  const [date, setDate] = useState("");
  const [venueId, setVenueId] = useState("");
  const [partner1, setPartner1] = useState("");
  const [partner1Email, setPartner1Email] = useState("");
  const [partner1Phone, setPartner1Phone] = useState("");
  const [partner2, setPartner2] = useState("");
  const [partner2Email, setPartner2Email] = useState("");
  const [partner2Phone, setPartner2Phone] = useState("");
  const [guestEstimate, setGuestEstimate] = useState("");
  const [notes, setNotes] = useState("");

  // Per-moment notes drafts (Task 6) — one controlled textarea per moment, saved
  // independently on blur via PUT .../moments/[kind] { notes }.
  const [momentNotesDraft, setMomentNotesDraft] = useState<Record<MomentKind, string>>({
    ceremony: "",
    cocktail: "",
    dinner: "",
    dance: "",
  });
  const [notesSavedKind, setNotesSavedKind] = useState<MomentKind | null>(null);

  // Number of tables already copied onto the wedding's dinner arrangement — used to
  // decide whether picking a new dinner template needs a destructive-replace confirm
  // (mirrors the old Seating-plan template picker's behavior, now triggered from here).
  const [dinnerTableCount, setDinnerTableCount] = useState(0);
  const [applyingDinnerTemplate, setApplyingDinnerTemplate] = useState(false);

  async function loadWedding() {
    const res = await fetch(`/api/weddings/${weddingId}`);
    if (!res.ok) {
      setError("Não foi possível carregar o casamento.");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as WeddingDetail;
    setWedding(data);
    setCouple(data.couple ?? "");
    setDate(toDateInputValue(data.date));
    setVenueId(data.venueId ?? "");
    setPartner1(data.partner1 ?? "");
    setPartner1Email(data.partner1Email ?? "");
    setPartner1Phone(data.partner1Phone ?? "");
    setPartner2(data.partner2 ?? "");
    setPartner2Email(data.partner2Email ?? "");
    setPartner2Phone(data.partner2Phone ?? "");
    setGuestEstimate(data.guestEstimate === null || data.guestEstimate === undefined ? "" : String(data.guestEstimate));
    setNotes(data.notes ?? "");
    setMomentNotesDraft({
      ceremony: data.moments.find((m) => m.kind === "ceremony")?.notes ?? "",
      cocktail: data.moments.find((m) => m.kind === "cocktail")?.notes ?? "",
      dinner: data.moments.find((m) => m.kind === "dinner")?.notes ?? "",
      dance: data.moments.find((m) => m.kind === "dance")?.notes ?? "",
    });
    setLoading(false);
  }

  async function loadVenues() {
    const res = await fetch("/api/venues");
    if (!res.ok) return;
    setVenues((await res.json()) as Venue[]);
  }

  async function loadTemplates() {
    const res = await fetch("/api/templates");
    if (!res.ok) return;
    setTemplates((await res.json()) as Template[]);
  }

  async function loadDinnerTableCount() {
    const res = await fetch(`/api/weddings/${weddingId}/plan`);
    if (!res.ok) return;
    const data = (await res.json()) as { tables?: unknown[] };
    setDinnerTableCount(data.tables?.length ?? 0);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadWedding();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadVenues();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadTemplates();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    loadDinnerTableCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- weddingId is stable per mount
  }, [weddingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couple,
          date: date || null,
          venueId: venueId || null,
          partner1: partner1 || null,
          partner1Email: partner1Email || null,
          partner1Phone: partner1Phone || null,
          partner2: partner2 || null,
          partner2Email: partner2Email || null,
          partner2Phone: partner2Phone || null,
          guestEstimate: guestEstimate === "" ? null : Number(guestEstimate),
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        setError("Falha ao guardar. Tenta novamente.");
        return;
      }
      await loadWedding();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function setMomentTemplateChoice(kind: MomentKind, templateId: string | null) {
    const res = await fetch(`/api/weddings/${weddingId}/moments/${kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId }),
    });
    if (!res.ok) {
      setError("Falha ao guardar o arranjo do momento.");
      return;
    }
    await loadWedding();
  }

  // Dinner is the one moment whose template choice also seats real guests: picking a
  // template here must (1) copy that template's tables onto the wedding (the same
  // apply-template flow the Seating plan used to trigger itself) and (2) record the
  // choice on the dinner moment so the couple overview/thumbnail render it like any
  // other moment. Clearing the choice (back to "— (nenhum)") only clears the moment
  // record — it does not delete the copied tables, same as the other moments.
  async function handleDinnerTemplateChoice(templateId: string | null) {
    setError(null);
    if (templateId && dinnerTableCount > 0) {
      const confirmed = window.confirm(
        "Aplicar este arranjo substitui as mesas do jantar atuais e limpa os lugares já atribuídos. Continuar?"
      );
      if (!confirmed) return;
    }
    setApplyingDinnerTemplate(true);
    try {
      if (templateId) {
        const applyRes = await fetch(`/api/weddings/${weddingId}/apply-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId }),
        });
        if (!applyRes.ok) {
          setError("Não foi possível aplicar o arranjo ao jantar.");
          return;
        }
      }
      await setMomentTemplateChoice("dinner", templateId);
      await loadDinnerTableCount();
    } finally {
      setApplyingDinnerTemplate(false);
    }
  }

  function handleMomentNotesChange(kind: MomentKind, value: string) {
    setMomentNotesDraft((prev) => ({ ...prev, [kind]: value }));
  }

  async function handleMomentNotesBlur(kind: MomentKind) {
    const value = momentNotesDraft[kind] ?? "";
    const original = wedding?.moments.find((m) => m.kind === kind)?.notes ?? "";
    if (value === original) return;
    const res = await fetch(`/api/weddings/${weddingId}/moments/${kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value === "" ? null : value }),
    });
    if (!res.ok) {
      setError("Falha ao guardar as notas do momento.");
      return;
    }
    await loadWedding();
    setNotesSavedKind(kind);
    setTimeout(() => setNotesSavedKind((k) => (k === kind ? null : k)), 2000);
  }

  if (loading) return <p>A carregar...</p>;
  if (!wedding) return <p style={{ color: "#dc2626" }}>{error ?? "Casamento não encontrado."}</p>;

  const venueTemplates = venueId ? templates.filter((t) => t.venueId === venueId) : [];

  const moments = MOMENT_KINDS.map(
    (kind) =>
      wedding.moments.find((m) => m.kind === kind) ?? {
        id: kind,
        kind,
        floorPlanId: null,
        templateId: null,
        template: null,
        notes: null,
      }
  );

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <label style={label}>
            Casal
            <input value={couple} onChange={(e) => setCouple(e.target.value)} required />
          </label>
          <label style={label}>
            Data
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label style={label}>
            Quinta
            <select value={venueId} onChange={(e) => setVenueId(e.target.value)}>
              <option value="">Sem quinta</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label style={label}>
            Nº estimado de convidados
            <input
              type="number"
              min={0}
              value={guestEstimate}
              onChange={(e) => setGuestEstimate(e.target.value)}
            />
          </label>

          <label style={label}>
            Parceiro 1 — nome
            <input value={partner1} onChange={(e) => setPartner1(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 2 — nome
            <input value={partner2} onChange={(e) => setPartner2(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 1 — email
            <input
              type="email"
              value={partner1Email}
              onChange={(e) => setPartner1Email(e.target.value)}
            />
          </label>
          <label style={label}>
            Parceiro 2 — email
            <input
              type="email"
              value={partner2Email}
              onChange={(e) => setPartner2Email(e.target.value)}
            />
          </label>
          <label style={label}>
            Parceiro 1 — telefone
            <input value={partner1Phone} onChange={(e) => setPartner1Phone(e.target.value)} />
          </label>
          <label style={label}>
            Parceiro 2 — telefone
            <input value={partner2Phone} onChange={(e) => setPartner2Phone(e.target.value)} />
          </label>
        </div>

        <label style={{ ...label, marginBottom: 16 }}>
          Notas
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" disabled={saving}>
            {saving ? "A guardar..." : "Guardar"}
          </button>
          {saved && <span style={{ color: "var(--accent)" }}>Guardado.</span>}
          {error && <span style={{ color: "#dc2626" }}>{error}</span>}
        </div>
      </form>

      <h2>Momentos &amp; arranjos</h2>
      {!venueId && (
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Escolhe primeiro a quinta.</p>
      )}
      <ul style={{ listStyle: "none", padding: 0, maxWidth: 640 }}>
        {moments.map((moment) => (
          <li
            key={moment.kind}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "10px 14px",
              marginBottom: 8,
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <strong style={{ color: "var(--heading)" }}>{MOMENT_LABELS[moment.kind]}</strong>
              <select
                value={moment.templateId ?? ""}
                disabled={!venueId || (moment.kind === "dinner" && applyingDinnerTemplate)}
                onChange={(e) => {
                  const value = e.target.value || null;
                  if (moment.kind === "dinner") {
                    void handleDinnerTemplateChoice(value);
                  } else {
                    void setMomentTemplateChoice(moment.kind, value);
                  }
                }}
                aria-label={`Arranjo de ${MOMENT_LABELS[moment.kind]}`}
              >
                <option value="">— (nenhum)</option>
                {venueTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.minGuests}-{t.maxGuests}
                  </option>
                ))}
              </select>
            </div>

            {moment.kind === "dinner" && applyingDinnerTemplate && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>A aplicar arranjo...</span>
            )}

            {moment.template && <ArrangementThumbnail template={moment.template} />}

            <label style={{ ...label, gap: 4 }}>
              Notas
              <textarea
                rows={2}
                value={momentNotesDraft[moment.kind] ?? ""}
                onChange={(e) => handleMomentNotesChange(moment.kind, e.target.value)}
                onBlur={() => handleMomentNotesBlur(moment.kind)}
                style={{ resize: "vertical" }}
                aria-label={`Notas de ${MOMENT_LABELS[moment.kind]}`}
              />
            </label>
            {notesSavedKind === moment.kind && (
              <span style={{ color: "var(--accent)", fontSize: 12 }}>Guardado.</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
