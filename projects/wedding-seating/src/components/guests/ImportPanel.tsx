"use client";

import { useState } from "react";

interface ImportResult {
  guests: number;
  groups: number;
}

export default function ImportPanel({
  weddingId,
  onImported,
}: {
  weddingId: string;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose an .xlsx file first");
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/weddings/${weddingId}/import`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("import failed");
      const data = (await res.json()) as ImportResult;
      setResult(data);
      setFile(null);
      onImported();
    } catch {
      setError("Failed to import guest list");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 24 }}>
      <h2>Import guest list</h2>
      <p style={{ fontSize: 13, color: "#666" }}>
        Template columns: <code>nome</code> and <code>grupo</code> (grupo optional).
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={importing} style={{ marginLeft: 8 }}>
          {importing ? "Importing..." : "Import"}
        </button>
      </form>
      {result && result.guests === 0 && (
        <p style={{ color: "#d97706" }}>
          Nenhum convidado importado — confirma que as colunas se chamam <code>nome</code> e{" "}
          <code>grupo</code>.
        </p>
      )}
      {result && result.guests > 0 && (
        <p style={{ color: "#16a34a" }}>
          Imported {result.guests} guest(s), {result.groups} new group(s).
        </p>
      )}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
