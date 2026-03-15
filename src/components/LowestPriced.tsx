import { useState, useMemo } from "react";
import type { Lot, SortDir } from "../types";
import { LotCard } from "./LotCard";
import { ListControls } from "./ListControls";
import { fmt2 } from "../lib/format";
import { compareLots } from "../lib/sort";

interface Props {
  lots: Lot[];
  showHidden: boolean;
  hideFavorites: boolean;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

const sortOptions = [
  { key: "highBid", label: "High Bid" },
  { key: "bidCount", label: "Bids" },
  { key: "median", label: "Median" },
  { key: "lotNumber", label: "Lot #" },
];

const limits = [5, 10, 25];

export function LowestPriced({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const [sortCol, setSortCol] = useState("highBid");
  const [sortDir, setSortDir] = useState<SortDir>(1);
  const [limit, setLimit] = useState(5);

  const data = useMemo(() => {
    const pool = lots
      .filter((l) => {
        if (l.hidden && !showHidden) return false;
        if (l.favorited && hideFavorites) return false;
        return l.highBid > 0;
      })
      .sort((a, b) => a.highBid - b.highBid)
      .slice(0, limit);
    return pool.sort((a, b) => compareLots(a, b, sortCol, sortDir));
  }, [lots, showHidden, hideFavorites, sortCol, sortDir, limit]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold uppercase tracking-wider text-secondary">Lowest Priced Items</span>
        <span className="bg-elevated text-secondary text-[10px] px-2 py-0.5 rounded-full font-medium">Top {limit}</span>
        <div className="flex items-center gap-1 ml-auto">
          {limits.map((n) => (
            <button
              key={n}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                limit === n
                  ? "bg-olive/15 border-olive/50 text-olive-light"
                  : "bg-elevated/60 border-elevated text-secondary hover:text-primary hover:border-olive/30"
              }`}
              onClick={() => setLimit(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <ListControls
          sortOptions={sortOptions}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={setSortCol}
          onToggleDir={() => setSortDir((d) => (d === 1 ? -1 : 1))}
        />
      </div>
      <div className="flex flex-col gap-1">
        {data.map((l) => (
          <LotCard key={l.id} lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite}>
            <div className="flex items-center gap-4 text-[11px] text-secondary">
              <span>Median: <span className="text-primary">{l.median != null ? fmt2(l.median) : "-"}</span></span>
              <span>Bid: <span className="text-ochre">{fmt2(l.highBid)}</span></span>
              <span>Bids: <span className="text-primary">{l.bidCount}</span></span>
            </div>
          </LotCard>
        ))}
      </div>
    </div>
  );
}
