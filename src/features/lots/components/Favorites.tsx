import { useState, useMemo } from "react";
import type { Lot, SortDir } from "@/shared/types";
import { LotCard } from "@/features/lots/components/LotCard";
import { DiscountBadge } from "@/shared/components/DiscountBadge";
import { ListControls } from "@/shared/components/ListControls";
import { fmt2, fmtClose } from "@/shared/lib/format";
import { compareLots } from "@/shared/lib/sort";

interface Props {
  lots: Lot[];
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

const sortOptions = [
  { key: "discount", label: "Discount" },
  { key: "highBid", label: "High Bid" },
  { key: "bidCount", label: "Bids" },
  { key: "lotNumber", label: "Lot #" },
  { key: "closeTime", label: "Closes" },
];

export function Favorites({ lots, onToggleHide, onToggleFavorite }: Props) {
  const [sortCol, setSortCol] = useState("discount");
  const [sortDir, setSortDir] = useState<SortDir>(-1);

  const favs = useMemo(
    () => lots.filter((l) => l.favorited).sort((a, b) => compareLots(a, b, sortCol, sortDir)),
    [lots, sortCol, sortDir]
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
          Favorites <span className="bg-elevated text-secondary text-[10px] px-2 py-0.5 rounded-full font-medium">{favs.length}</span>
        </div>
      </div>
      {favs.length === 0 ? (
        <div className="text-secondary text-center py-10">No favorites yet. Star a lot from any table to add it here.</div>
      ) : (
        <>
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
            {favs.map((l) => (
              <LotCard key={l.id} lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite}>
                <div className="flex items-center gap-4 text-[11px] text-secondary">
                  <span>Median: <span className="text-primary">{l.median != null ? fmt2(l.median) : "-"}</span></span>
                  <span>Bid: <span className={l.highBid > 0 ? "text-primary" : "text-secondary"}>{fmt2(l.highBid)}</span></span>
                  <span>Bids: <span className="text-primary">{l.bidCount}</span></span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <DiscountBadge discount={l.discount} />
                  <span className="text-[11px] text-secondary">{fmtClose(l.closeTime)}</span>
                </div>
              </LotCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
