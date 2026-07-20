"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface CalendarBooking {
  id: string;
  couple: string;
  date: string | null;
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday on/before `d` (weeks start Monday). */
function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Venue calendar of weddings — month or current-week view. */
export default function VenueCalendar({ bookings }: { bookings: CalendarBooking[] }) {
  const [view, setView] = useState<"month" | "week">("month");
  const [ref, setRef] = useState(() => new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      if (!b.date) continue;
      const key = dateKey(new Date(b.date));
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  const todayKey = dateKey(new Date());

  // Days to render.
  const days: Date[] = useMemo(() => {
    if (view === "week") {
      const start = mondayOf(ref);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    // month: 6 weeks starting from the Monday on/before the 1st.
    const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const start = mondayOf(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, ref]);

  function shift(dir: number) {
    if (view === "week") setRef((r) => addDays(r, dir * 7));
    else setRef((r) => new Date(r.getFullYear(), r.getMonth() + dir, 1));
  }

  const heading =
    view === "week"
      ? `Semana de ${days[0].getDate()} ${MONTHS[days[0].getMonth()].slice(0, 3)}`
      : `${MONTHS[ref.getMonth()]} ${ref.getFullYear()}`;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: 14, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => shift(-1)} style={navBtn}>‹</button>
          <strong style={{ minWidth: 160, textAlign: "center" }}>{heading}</strong>
          <button type="button" onClick={() => shift(1)} style={navBtn}>›</button>
          <button type="button" onClick={() => setRef(new Date())} style={{ ...navBtn, width: "auto", padding: "0 10px" }}>Hoje</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setView("week")} style={view === "week" ? tabActive : tab}>Semana</button>
          <button type="button" onClick={() => setView("month")} style={view === "month" ? tabActive : tab}>Mês</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)", textAlign: "center", padding: "2px 0" }}>
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = dateKey(d);
          const inMonth = view === "week" || d.getMonth() === ref.getMonth();
          const isToday = key === todayKey;
          const items = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              style={{
                minHeight: view === "week" ? 110 : 78,
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: 4,
                background: isToday ? "var(--accent-soft, #eef2ea)" : "transparent",
                opacity: inMonth ? 1 : 0.4,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? "var(--accent-strong, #54704c)" : "var(--heading)" }}>
                {d.getDate()}
              </span>
              {items.map((b) => (
                <Link
                  key={b.id}
                  href={`/admin/venue-wedding/${b.id}`}
                  title={b.couple}
                  style={{ fontSize: 11, background: "var(--accent, #6e8c66)", color: "#fff", borderRadius: 4, padding: "2px 5px", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {b.couple}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--heading)",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
};
const tab: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 13,
};
const tabActive: React.CSSProperties = { ...tab, background: "var(--accent, #6e8c66)", color: "#fff", borderColor: "var(--accent, #6e8c66)" };
