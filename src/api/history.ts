import type { HistorySnapshot } from "../types";

export async function fetchHistory(auctionId: number): Promise<HistorySnapshot[]> {
  const res = await fetch(`/api/history?auction=${auctionId}`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}
