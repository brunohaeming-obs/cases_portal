export function formatDate(value) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(parseLocalDate(value));
}

export function formatFullDate(value) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR").format(parseLocalDate(value));
}

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n.d.";
  return `${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n.d.";
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n.d.";
  return `US$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
}

export function formatUnit(value, unit, digits = 1) {
  if (unit === "%") return formatPercent(value, digits);
  if (unit === "US$" || unit === "US$ bi") return formatCurrency(value);
  if (unit === "meses") return `${formatNumber(value, 1)} meses`;
  return `${formatNumber(value, 0)} ${unit || ""}`.trim();
}

export function formatDelta(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "variacao interanual n.d.";
  const signal = Number(value) > 0 ? "+" : "";
  return `${signal}${formatPercent(value, 1)} em 12 meses`;
}

function parseLocalDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(`${value.slice(0, 10)}T12:00:00`);
  }
  return new Date(value);
}
