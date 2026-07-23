/** Shared Portuguese display labels used by both server routes (audit summaries)
 * and client components, so the vocabulary stays consistent in one place. */

export const SERVICE_KIND_LABELS: Record<string, string> = {
  catering: "Catering",
  dj: "DJ",
  band: "Banda",
  photo: "Fotografia",
  video: "Vídeo",
  decor: "Decoração",
  flowers: "Flores",
  cake: "Bolo",
  transport: "Transporte",
  other: "Outro",
};

export const MOMENT_KIND_LABELS: Record<string, string> = {
  ceremony: "Cerimónia",
  cocktail: "Cocktail",
  dinner: "Jantar",
  dance: "Dança",
};

export const PROVIDER_LABELS: Record<string, string> = {
  venue: "Quinta",
  supplier: "Fornecedor externo",
  couple: "Noivos",
};

export const ROLE_LABELS: Record<string, string> = {
  venue: "Quinta",
  couple: "Noivos",
  supplier: "Fornecedor",
  admin: "Admin",
};

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  planned: "Previsto",
  confirmed: "Confirmado",
  done: "Concluído",
};

export const REQUIREMENT_STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  agreed: "Acordado",
  done: "Feito",
};

export function serviceKindLabel(kind: string): string {
  return SERVICE_KIND_LABELS[kind] ?? kind;
}

/** Canonical dietary options — used as `<datalist>` suggestions so guests' diets
 * cluster on consistent terms (which keeps the catering per-table aggregate from
 * fragmenting), while still allowing a free-typed value for anything bespoke. */
export const DIETARY_OPTIONS = [
  "Vegetariano",
  "Vegan",
  "Sem glúten",
  "Sem lactose",
  "Sem marisco",
  "Sem frutos secos",
  "Diabético",
  "Halal",
  "Kosher",
] as const;

/** Shared datalist id for dietary inputs. */
export const DIETARY_DATALIST_ID = "dietary-options";
