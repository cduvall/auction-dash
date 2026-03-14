import type { LotStats } from "../types";
import { fmt, pct } from "../lib/format";
import { StatCard, Icons } from "./StatCard";

interface StatsGridProps {
  stats: LotStats;
  onUntouchedClick: () => void;
}

export function StatsGrid({ stats, onUntouchedClick }: StatsGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 mb-6">
      <StatCard label="Total Lots" value={stats.totalLots} sub={<>{stats.withBids} with bids, {stats.withoutBids} without</>} icon={Icons.grid} color="#d9a05b" />
      <StatCard label="Total Median Value" value={fmt(stats.totalMedianValue)} sub="Sum of all median estimates" icon={Icons.dollar} color="#909194" />
      <StatCard label="Total High Bids" value={fmt(stats.totalHighBids)} sub="Sum of all current bids" icon={Icons.trendUp} color="#cc7722" />
      <StatCard label="Value Gap" value={stats.totalMedianValue > 0 ? fmt(stats.gap) : "N/A"} sub="Median value minus bids" icon={Icons.gap} color="#6b705c" />
      <StatCard label="Avg Discount" value={pct(stats.avgDiscount)} sub="Avg % below median (items w/ bids)" icon={Icons.percent} color="#b35d43" />
      <StatCard label="Untouched" value={stats.withoutBids} sub="Lots with zero bids" icon={Icons.empty} color="#b35d43" onClick={onUntouchedClick} />
    </div>
  );
}
