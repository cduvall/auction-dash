import type { BidderStats } from "../types";

function url(path: string, auctionId: number): string {
  return `${path}${path.includes("?") ? "&" : "?"}auction=${auctionId}`;
}

export async function fetchBiddersCached(auctionId: number): Promise<BidderStats> {
  const res = await fetch(url("/api/bidders/cached", auctionId));
  if (!res.ok) throw new Error("Failed to fetch bidder stats");
  return res.json();
}

export async function refreshBidders(auctionId: number): Promise<BidderStats> {
  const res = await fetch(url("/api/bidders", auctionId));
  if (!res.ok) throw new Error("Failed to refresh bidders");
  return res.json();
}
