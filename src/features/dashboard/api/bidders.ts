import type { BidderStats } from "@/shared/types";

function url(path: string, auctionId: number): string {
  return `${path}${path.includes("?") ? "&" : "?"}auction=${auctionId}`;
}

export async function fetchBiddersCached(auctionId: number): Promise<BidderStats> {
  const res = await fetch(url("/api/bidders/cached", auctionId));
  if (!res.ok) throw new Error("Failed to fetch bidder stats");
  return res.json();
}

export async function refreshBidders(auctionId: number): Promise<BidderStats> {
  let cursor: number | null = 0;
  let lastStats: BidderStats | null = null;

  while (cursor !== null) {
    const cursorParam = cursor > 0 ? `&cursor=${cursor}` : "";
    const res = await fetch(url("/api/bidders", auctionId) + cursorParam);
    if (!res.ok) throw new Error("Failed to refresh bidders");
    const data = await res.json();
    cursor = data.nextCursor ?? null;
    lastStats = {
      uniqueBidders: data.uniqueBidders,
      activeLast24h: data.activeLast24h,
      maxActiveBidders: data.maxActiveBidders,
      lotsRefreshed: data.lotsRefreshed,
      totalLots: data.totalLots,
    };
  }

  return lastStats!;
}
