import type { Lot, SortDir } from "@/shared/types";
import { lotSortKey } from "@/shared/lib/format";

export function compareLots(a: Lot, b: Lot, col: string, dir: SortDir): number {
  if (col === "lotNumber") {
    const ka = lotSortKey(a.lotNumber);
    const kb = lotSortKey(b.lotNumber);
    return (ka[0] - kb[0] || ka[1].localeCompare(kb[1])) * dir;
  }
  if (col === "name") {
    return a.name.localeCompare(b.name) * dir;
  }
  if (col === "closeTime") {
    return ((a.closeTime || "").localeCompare(b.closeTime || "")) * dir;
  }
  const aVal = (a as unknown as Record<string, number>)[col] ?? 0;
  const bVal = (b as unknown as Record<string, number>)[col] ?? 0;
  return (aVal - bVal) * dir;
}
