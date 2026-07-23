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
