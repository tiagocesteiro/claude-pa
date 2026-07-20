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
      setError("Escolhe primeiro um ficheiro .xlsx.");
      return;
    }
    setImporting(true);
    // Safety timeout: without this, a genuinely hung request would leave the
    // spinner spinning forever with no feedback. (The first import in `next dev`
    // is also slower because the route compiles on demand — well under this cap.)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/weddings/${weddingId}/import`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("import failed");
      const data = (await res.json()) as ImportResult;
      setResult(data);
      setFile(null);
      onImported();
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "A importação demorou demasiado. Verifica a ligação e tenta novamente."
          : "Não foi possível importar a lista de convidados."
      );
    } finally {
      clearTimeout(timeout);
      setImporting(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: 14, marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Importar lista de convidados</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
        Colunas do modelo: <code>nome</code> e <code>grupo</code> (grupo opcional).
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" className="btn btn-secondary btn-sm" disabled={importing}>
          {importing ? "A importar..." : "Importar"}
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
          Importados {result.guests} convidado(s), {result.groups} grupo(s) novo(s).
        </p>
      )}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
