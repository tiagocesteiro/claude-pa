"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, Button, Input } from "@/components/ui";
import { imageUrlFor } from "@/lib/images";

interface Item {
  id: string;
  name: string;
  category: string | null;
  image: string | null;
  price: number | null;
  quantity: number | null;
}

/** Supplier-side (rental company): manage a decoration catalog offered to the
 * weddings where this account is the decor supplier. */
export default function SupplierDecorCatalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/supplier/decor-items");
    if (res.ok) setItems(((await res.json()) as { items: Item[] }).items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supplier/decor-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || null,
          price: price.trim() || null,
          quantity: quantity.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      setName(""); setCategory(""); setPrice(""); setQuantity("");
      await load();
    } catch {
      setError("Não foi possível adicionar o item.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(itemId: string, file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await fetch(`/api/decor-items/${itemId}/image`, { method: "POST", body: fd });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/decor-items/${id}`, { method: "DELETE" });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ marginTop: 20 }}>
      <h2 style={{ marginTop: 0, marginBottom: 4 }}>O meu catálogo de decoração</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
        Para empresas de aluguer de decoração. Nos casamentos onde fores o fornecedor de decoração, os noivos escolhem daqui.
      </p>

      {items.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 12px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {items.map((it) => (
            <li key={it.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}>
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrlFor(it.image)} alt={it.name} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6, marginBottom: 6 }} />
              ) : (
                <div style={{ height: 90, borderRadius: 6, background: "var(--surface-2, rgba(0,0,0,0.04))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12, marginBottom: 6 }}>
                  sem imagem
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {it.category ? `${it.category} · ` : ""}{it.price != null ? `${it.price}€` : ""}{it.quantity != null ? ` · ${it.quantity} un` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input
                  ref={(el) => { fileInputs.current[it.id] = el; }}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(it.id, f); }}
                />
                <Button variant="ghost" size="sm" onClick={() => fileInputs.current[it.id]?.click()} disabled={busy}>Imagem</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(it.id)} disabled={busy}>Remover</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <label style={{ fontSize: 13, flex: "1 1 160px" }}>Nome <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex.: Arco floral" style={{ width: "100%" }} /></label>
        <label style={{ fontSize: 13 }}>Categoria <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ex.: Flores" style={{ width: 120 }} /></label>
        <label style={{ fontSize: 13 }}>Preço € <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: 80 }} /></label>
        <label style={{ fontSize: 13 }}>Stock <Input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ width: 70 }} /></label>
        <Button variant="primary" onClick={add} disabled={busy || !name.trim()}>Adicionar</Button>
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 6 }}>{error}</p>}
    </Card>
  );
}
