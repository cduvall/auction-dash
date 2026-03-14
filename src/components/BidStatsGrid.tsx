import { useMemo } from "react";
import type { Lot, LotStats, BidderStats } from "../types";
import { fmt } from "../lib/format";
import { StatCard, Icons } from "./StatCard";

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
      <StatCard
        label="Total Bids"
        value={stats.totalBids}
        sub="Bids placed across all lots"
        icon={Icons.hammer}
        color="#d9a05b"
      />
      <StatCard
        label="Unique Bidders"
        value={bidderStats?.uniqueBidders ?? "-"}
        sub=""
        icon={Icons.users}
        color="#d9a05b"
      />
      <StatCard
        label="Active (24h)"
        value={bidderStats?.activeLast24h ?? "-"}
        sub={<>Peak: {bidderStats?.maxActiveBidders ?? "-"}</>}
        icon={Icons.activity}
        color="#6b705c"
      />
      <StatCard
        label="Most Contested"
        value={mostBids ? `${mostBids.bidCount} bids` : "-"}
        sub={mostBids ? `${mostBids.lotNumber} - ${mostBids.name}` : ""}
        icon={Icons.flame}
        color="#cc7722"
      />
      <StatCard
        label="Highest Priced"
        value={highestPrice ? fmt(highestPrice.highBid) : "-"}
        sub={highestPrice ? `${highestPrice.lotNumber} - ${highestPrice.name}` : ""}
        icon={Icons.crown}
        color="#6b705c"
      />
    </div>
  );
}
