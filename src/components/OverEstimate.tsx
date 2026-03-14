import { useState, useMemo } from "react";
import type { Lot, SortDir } from "../types";
import { LotCard } from "./LotCard";
import { ListControls } from "./ListControls";
import { fmt, fmt2 } from "../lib/format";
import { compareLots } from "../lib/sort";

interface Props {
  lots: Lot[];
  showHidden: boolean;
  hideFavorites: boolean;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

const sortOptions = [
  { key: "overAmount", label: "Over By" },
  { key: "highBid", label: "High Bid" },
  { key: "median", label: "Median" },
  { key: "lotNumber", label: "Lot #" },
];

const limits = [5, 10, 25];

export function OverEstimate({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const [sortCol, setSortCol] = useState("overAmount");
  const [sortDir, setSortDir] = useState<SortDir>(-1);
  const [limit, setLimit] = useState(10);

  const data = useMemo(() => {
    const pool = lots
      .filter((l) => {
        if (l.hidden && !showHidden) return false;
        if (l.favorited && hideFavorites) return false;
        return l.highBid > 0 && l.median != null && l.highBid > l.median;
      })
      .sort((a, b) => (b.highBid - (b.median ?? 0)) - (a.highBid - (a.median ?? 0)))
      .slice(0, limit);
    return pool.sort((a, b) => {
      if (sortCol === "overAmount") {
        const overA = a.highBid - (a.median ?? 0);
        const overB = b.highBid - (b.median ?? 0);
        return (overB - overA) * sortDir;
      }
      return compareLots(a, b, sortCol, sortDir);
    });
  }, [lots, showHidden, hideFavorites, sortCol, sortDir, limit]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
          Most Over Estimate <span className="bg-elevated text-secondary text-[10px] px-2 py-0.5 rounded-full font-medium">Top {limit}</span>
        </div>
      </div>
      <div className="mb-3">
        <ListControls
          sortOptions={sortOptions}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={setSortCol}
          onToggleDir={() => setSortDir((d) => (d === 1 ? -1 : 1))}
          limits={limits}
          activeLimit={limit}
          onLimitChange={setLimit}
        />
      </div>
      {data.length === 0 ? (
        <div className="bg-surface border border-elevated rounded-lg p-5 text-secondary text-center text-sm">
          No items currently over estimate
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {data.map((l) => {
            const over = l.highBid - (l.median ?? 0);
            const overPct = l.median ? (over / l.median) * 100 : 0;
            return (
              <LotCard key={l.id} lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite}>
                <div className="flex items-center gap-4 text-[11px] text-secondary">
                  <span>Median: <span className="text-primary">{fmt2(l.median ?? 0)}</span></span>
                  <span>Bid: <span className="text-ochre">{fmt2(l.highBid)}</span></span>
                  <span>Bids: <span className="text-primary">{l.bidCount}</span></span>
                </div>
                <div className="mt-1">
                  <span className="inline-block text-[11px] font-semibold px-2 py-px rounded-full bg-terracotta/20 text-terracotta">
                    +{fmt(over)} (+{overPct.toFixed(0)}%) Over
                  </span>
                </div>
              </LotCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
