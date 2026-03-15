import { useState, useMemo, useEffect, useRef } from "react";
import type { Lot, BidFilter, SortDir } from "@/shared/types";
import { LotCard } from "@/features/lots/components/LotCard";
import { DiscountBadge } from "@/shared/components/DiscountBadge";
import { ListControls } from "@/shared/components/ListControls";
import { fmt2, fmtClose } from "@/shared/lib/format";
import { compareLots } from "@/shared/lib/sort";

interface Props {
  lots: Lot[];
  showHidden: boolean;
  hideFavorites: boolean;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

const sortOptions = [
  { key: "discount", label: "Discount" },
  { key: "highBid", label: "High Bid" },
  { key: "bidCount", label: "Bids" },
  { key: "median", label: "Median" },
  { key: "lotNumber", label: "Lot #" },
  { key: "closeTime", label: "Closes" },
];

export function AllLots({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<BidFilter>(null);
  const [sortCol, setSortCol] = useState("discount");
  const [sortDir, setSortDir] = useState<SortDir>(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (search === debouncedSearch) return;
    setIsSearching(true);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [search, debouncedSearch]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return lots
      .filter((l) => {
        if (l.hidden && !showHidden) return false;
        if (l.favorited && hideFavorites) return false;
        if (q && !l.name.toLowerCase().includes(q) && !l.lotNumber.toLowerCase().includes(q)) return false;
        if (filter === "bids" && l.highBid <= 0) return false;
        if (filter === "nobids" && l.highBid > 0) return false;
        return true;
      })
      .sort((a, b) => compareLots(a, b, sortCol, sortDir));
  }, [lots, debouncedSearch, filter, sortCol, sortDir, showHidden, hideFavorites]);

  function toggleFilter(f: "bids" | "nobids") {
    setFilter((prev) => (prev === f ? null : f));
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
          All Lots <span className="bg-elevated text-secondary text-[10px] px-2 py-0.5 rounded-full font-medium">{lots.length} lots</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative w-full sm:w-56">
          <input
            className="bg-elevated border border-elevated text-primary rounded-md px-3 py-1.5 text-sm outline-none focus:border-ochre transition-colors w-full"
            placeholder="Search lots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isSearching && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-block w-3.5 h-3.5 border-2 border-transparent border-t-ochre rounded-full animate-spin" />
          )}
        </div>
        <button
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${filter === "bids" ? "bg-ochre/20 border-ochre text-ochre" : "bg-elevated border-elevated text-secondary hover:text-primary"}`}
          onClick={() => toggleFilter("bids")}
        >
          Has Bids
        </button>
        <button
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${filter === "nobids" ? "bg-ochre/20 border-ochre text-ochre" : "bg-elevated border-elevated text-secondary hover:text-primary"}`}
          onClick={() => toggleFilter("nobids")}
        >
          No Bids
        </button>
        <span className="text-secondary text-xs">
          {isSearching ? "Searching..." : `${filtered.length} shown`}
        </span>
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
        {filtered.map((l) => (
          <LotCard key={l.id} lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-secondary">
              <span>Median: <span className="text-primary">{l.median != null ? fmt2(l.median) : "-"}</span></span>
              <span>Bid: <span className={l.highBid > 0 ? "text-primary" : "text-secondary"}>{fmt2(l.highBid)}</span></span>
              <span>Bids: <span className="text-primary">{l.bidCount}</span></span>
              <span>{fmtClose(l.closeTime)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <DiscountBadge discount={l.discount} />
              {l.estimateLow != null && (
                <span className="text-[11px] text-secondary">Est: {fmt2(l.estimateLow)} - {fmt2(l.estimateHigh!)}</span>
              )}
            </div>
          </LotCard>
        ))}
      </div>
    </div>
  );
}
