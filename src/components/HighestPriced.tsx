import { useMemo } from "react";
import type { Lot } from "../types";
import { SortableTable } from "./SortableTable";
import { LotActions } from "./LotActions";
import { LotName } from "./LotName";
import { fmt2 } from "../lib/format";

interface Props {
  lots: Lot[];
  showHidden: boolean;
  hideFavorites: boolean;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

export function HighestPriced({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const data = useMemo(() => {
    return lots
      .filter((l) => {
        if (l.hidden && !showHidden) return false;
        if (l.favorited && hideFavorites) return false;
        return l.highBid > 0;
      })
      .sort((a, b) => a.highBid - b.highBid)
      .slice(0, 10);
  }, [lots, showHidden, hideFavorites]);

  const columns = [
    { key: "lotNumber", label: "Item", render: (l: Lot) => <LotName lot={l} /> },
    { key: "highBid", label: "High Bid", numeric: true, render: (l: Lot) => <span className="val-yellow">{fmt2(l.highBid)}</span> },
    { key: "median", label: "Median Est.", numeric: true, render: (l: Lot) => l.median != null ? fmt2(l.median) : "-" },
    { key: "bidCount", label: "Bids", numeric: true, render: (l: Lot) => l.bidCount },
  ];

  return (
    <div className="section highlight-section">
      <div className="section-title">Lowest Priced Items <span className="badge">Top 10</span></div>
      <SortableTable
        id="highest-priced-table"
        columns={columns}
        data={data}
        defaultSortCol="highBid"
        defaultSortDir={1}
        actions={(l) => <LotActions lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite} />}
      />
    </div>
  );
}
