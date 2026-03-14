import type { LotsResponse } from "../types";

function url(path: string, auctionId: number): string {
  return `${path}${path.includes("?") ? "&" : "?"}auction=${auctionId}`;
}

export async function fetchLots(auctionId: number): Promise<LotsResponse> {
  const res = await fetch(url("/api/lots", auctionId));
  if (!res.ok) throw new Error("Failed to fetch lots");
  return res.json();
}

export async function fetchLotsCached(auctionId: number): Promise<LotsResponse> {
  const res = await fetch(url("/api/lots/cached", auctionId));
  if (!res.ok) throw new Error("No cached data");
  return res.json();
}

export async function toggleHide(auctionId: number, lotNumber: string, hidden: boolean): Promise<void> {
  await fetch(url("/api/hide", auctionId), {
    method: hidden ? "DELETE" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lotNumber }),
  });
}

export async function toggleFavorite(auctionId: number, lotNumber: string, favorited: boolean): Promise<void> {
  await fetch(url("/api/favorite", auctionId), {
    method: favorited ? "DELETE" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lotNumber }),
  });
}
