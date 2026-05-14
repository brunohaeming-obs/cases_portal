export function formatDate(value) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(value));
}

export function formatFullDate(value) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n.d.";
  return `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n.d.";
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

export function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n.d.";
  const absolute = Math.abs(Number(value));
  if (absolute >= 1000) {
    return `US$ ${(Number(value) / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} tri`;
  }
  return `US$ ${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`;
}

export function formatUnit(value, unit, digits = 1) {
  if (unit === "%") return formatPercent(value, digits);
  if (unit === "US$") return formatCurrency(value);
  if (unit === "meses") return `${formatNumber(value, 1)} meses`;
  return `${formatNumber(value, 0)} ${unit || ""}`.trim();
}

export function formatDelta(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "variação interanual n.d.";
  const signal = Number(value) > 0 ? "+" : "";
  return `${signal}${formatPercent(value, 1)} em 12 meses`;
}
