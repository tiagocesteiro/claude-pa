"use client";

import { imageUrlFor } from "@/lib/images";

export interface DecorPiece {
  name: string;
  image: string | null;
  quantity?: number;
}

/** A pretty gallery of decoration/material pieces for the overview. Images use
 * `object-fit: contain` on a soft tile so cut-out (transparent-background) PNGs
 * read as floating objects. Pieces without an image fall back to a small tag. */
export default function DecorGallery({ items }: { items: DecorPiece[] }) {
  if (items.length === 0) return <span style={{ color: "var(--text-muted)", fontSize: 13 }}>—</span>;

  const withImage = items.filter((i) => i.image);
  const withoutImage = items.filter((i) => !i.image);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {withImage.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
          {withImage.map((it, i) => (
            <figure key={i} style={{ margin: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: 12,
                  background: "linear-gradient(160deg, var(--surface-2, rgba(120,110,90,0.07)), rgba(120,110,90,0.02))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 8,
                  position: "relative",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrlFor(it.image!)}
                  alt={it.name}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.12))" }}
                />
                {it.quantity != null && it.quantity > 1 && (
                  <span
                    style={{
                      position: "absolute", top: 4, right: 4, fontSize: 11, fontWeight: 700,
                      background: "var(--accent)", color: "#fff", borderRadius: 999, padding: "0 6px",
                    }}
                  >
                    ×{it.quantity}
                  </span>
                )}
              </div>
              <figcaption style={{ fontSize: 12, textAlign: "center", color: "var(--heading)", lineHeight: 1.2 }}>{it.name}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {withoutImage.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {withoutImage.map((it, i) => (
            <span
              key={i}
              style={{ fontSize: 12, background: "var(--surface-2, rgba(0,0,0,0.04))", borderRadius: 999, padding: "3px 10px", color: "var(--text)" }}
            >
              {it.name}{it.quantity != null && it.quantity > 1 ? ` ×${it.quantity}` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
