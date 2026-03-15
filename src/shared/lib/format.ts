export function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function fmt2(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function pct(n: number): string {
  return n.toFixed(1) + "%";
}

export function fmtClose(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export function barWidth(d: number): number {
  return Math.min(Math.max(d, 0), 100);
}

export function lotSortKey(lotNumber: string): [number, string] {
  const m = lotNumber.match(/^(\d+)(.*)/);
  if (m) return [parseInt(m[1]), m[2]];
  return [0, lotNumber];
}
