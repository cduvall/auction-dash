import { useMemo } from "react";
import type { Lot, LotStats, BidderStats } from "../types";
import { fmt2 } from "../lib/format";

interface BidStatsGridProps {
  stats: LotStats;
  lots: Lot[];
  bidderStats: BidderStats | undefined;
}

export function BidStatsGrid({ stats, lots, bidderStats }: BidStatsGridProps) {
  const mostBids = useMemo(
    () => [...lots].sort((a, b) => b.bidCount - a.bidCount)[0] ?? null,
    [lots]
  );
  const highestPrice = useMemo(
    () => [...lots].sort((a, b) => b.highBid - a.highBid)[0] ?? null,
    [lots]
  );

  return (
    <div className="stats-grid" id="bid-stats-grid">
      <div className="stat-card">
        <div className="label">Total Bids</div>
        <div className="value val-accent">{stats.totalBids}</div>
        <div className="sub">Bids placed across all lots</div>
      </div>
      <div className="stat-card" id="stat-bidders">
        <div className="label">Unique Bidders</div>
        <div className="value val-accent">{bidderStats?.uniqueBidders ?? "-"}</div>
        <div className="sub" id="bidder-sub"></div>
      </div>
      <div className="stat-card">
        <div className="label">Active (24h)</div>
        <div className="value val-green">{bidderStats?.activeLast24h ?? "-"}</div>
        <div className="sub">Peak: {bidderStats?.maxActiveBidders ?? "-"}</div>
      </div>
      <div className="stat-card">
        <div className="label">Most Contested</div>
        <div className="value val-yellow">
          {mostBids ? `${mostBids.bidCount} bids` : "-"}
        </div>
        <div className="sub">
          {mostBids ? `${mostBids.lotNumber} - ${mostBids.name}` : ""}
        </div>
      </div>
      <div className="stat-card">
        <div className="label">Highest Priced</div>
        <div className="value val-yellow">
          {highestPrice ? fmt2(highestPrice.highBid) : "-"}
        </div>
        <div className="sub">
          {highestPrice ? `${highestPrice.lotNumber} - ${highestPrice.name}` : ""}
        </div>
      </div>
    </div>
  );
}
