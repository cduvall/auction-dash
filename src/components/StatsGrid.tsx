import type { LotStats } from "../types";
import { fmt, pct } from "../lib/format";

interface StatsGridProps {
  stats: LotStats;
  onUntouchedClick: () => void;
}

export function StatsGrid({ stats, onUntouchedClick }: StatsGridProps) {
  return (
    <div className="stats-grid" id="stats-grid">
      <div className="stat-card">
        <div className="label">Total Lots</div>
        <div className="value val-accent">{stats.totalLots}</div>
        <div className="sub">{stats.withBids} with bids, {stats.withoutBids} without</div>
      </div>
      <div className="stat-card">
        <div className="label">Total Median Value</div>
        <div className="value">{fmt(stats.totalMedianValue)}</div>
        <div className="sub">Sum of all median estimates</div>
      </div>
      <div className="stat-card">
        <div className="label">Total High Bids</div>
        <div className="value val-yellow">{fmt(stats.totalHighBids)}</div>
        <div className="sub">Sum of all current bids</div>
      </div>
      <div className="stat-card">
        <div className="label">Value Gap</div>
        <div className="value val-green">{fmt(stats.gap)}</div>
        <div className="sub">Median value minus bids</div>
      </div>
      <div className="stat-card">
        <div className="label">Avg Discount</div>
        <div className="value val-orange">{pct(stats.avgDiscount)}</div>
        <div className="sub">Avg % below median (items w/ bids)</div>
      </div>
      <div className="stat-card clickable" onClick={onUntouchedClick}>
        <div className="label">Untouched</div>
        <div className="value val-red">{stats.withoutBids}</div>
        <div className="sub">Lots with zero bids</div>
      </div>
    </div>
  );
}
