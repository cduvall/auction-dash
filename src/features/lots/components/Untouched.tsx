import { useState, useMemo } from "react";
import type { Lot, SortDir } from "@/shared/types";
import { LotCard } from "@/features/lots/components/LotCard";
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
  { key: "lotNumber", label: "Lot #" },
  { key: "median", label: "Median" },
  { key: "closeTime", label: "Closes" },
];

export function Untouched({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const [sortCol, setSortCol] = useState("lotNumber");
  const [sortDir, setSortDir] = useState<SortDir>(1);

  const untouched = useMemo(() => {
    return lots
      .filter((l) => {
        if (l.hidden && !showHidden) return false;
        if (l.favorited && hideFavorites) return false;
        return l.highBid <= 0;
      })
      .sort((a, b) => compareLots(a, b, sortCol, sortDir));
  }, [lots, showHidden, hideFavorites, sortCol, sortDir]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
          Untouched Lots <span className="bg-elevated text-secondary text-[10px] px-2 py-0.5 rounded-full font-medium">{untouched.length}</span>
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
        {untouched.map((l) => (
          <LotCard key={l.id} lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite}>
            <div className="flex items-center gap-4 text-[11px] text-secondary">
              <span>Median: <span className="text-primary">{l.median != null ? fmt2(l.median) : "-"}</span></span>
              <span>Closes: <span className="text-primary">{fmtClose(l.closeTime)}</span></span>
            </div>
          </LotCard>
        ))}
      </div>
    </div>
  );
}
