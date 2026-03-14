import type { Auction } from "../types";

export async function fetchAuctions(): Promise<Auction[]> {
  const res = await fetch("/api/auctions");
  if (!res.ok) throw new Error("Failed to fetch auctions");
  return res.json();
}
