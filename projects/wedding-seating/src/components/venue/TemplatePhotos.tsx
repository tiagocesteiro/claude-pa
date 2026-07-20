"use client";

import { useState } from "react";
import { imageUrlFor } from "@/lib/images";

/** Venue-side: upload / remove example photos for a template. Couples see these
 * (read-only) when picking a base template. */
export default function TemplatePhotos({
  templateId,
  initialPhotos,
}: {
  templateId: string;
  initialPhotos: string[];
}) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/templates/${templateId}/photos`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      setPhotos(((await res.json()) as { photos: string[] }).photos ?? []);
    } catch {
      setError("Não foi possível carregar a foto.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(path: string) {
    const res = await fetch(`/api/templates/${templateId}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (res.ok) setPhotos(((await res.json()) as { photos: string[] }).photos ?? []);
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Fotos de exemplo</span>
        <label style={{ fontSize: 13, cursor: "pointer", color: "var(--accent-strong, #54704c)" }}>
          {uploading ? "A carregar…" : "+ Adicionar foto"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 12 }}>{error}</p>}
      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {photos.map((p) => (
            <div key={p} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrlFor(p)}
                alt="Exemplo"
                style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
              />
              <button
                type="button"
                onClick={() => remove(p)}
                title="Remover"
                style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", border: "1px solid #dc2626", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
