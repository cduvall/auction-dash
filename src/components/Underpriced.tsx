import { useMemo } from "react";
import type { Lot } from "../types";
import { SortableTable } from "./SortableTable";
import { LotActions } from "./LotActions";
import { LotName } from "./LotName";
import { fmt, fmt2 } from "../lib/format";
import { DiscountCell } from "./DiscountCell";

interface Props {
  lots: Lot[];
  showHidden: boolean;
  hideFavorites: boolean;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

export function Underpriced({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const data = useMemo(() => {
    return lots
      .filter((l) => {
        if (l.hidden && !showHidden) return false;
        if (l.favorited && hideFavorites) return false;
        return l.highBid > 0 && l.discount > 0;
      })
      .sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0))
      .slice(0, 20);
  }, [lots, showHidden, hideFavorites]);

  const columns = [
    { key: "lotNumber", label: "Item", render: (l: Lot) => <LotName lot={l} /> },
    { key: "median", label: "Median Est.", numeric: true, render: (l: Lot) => l.median != null ? fmt2(l.median) : "-" },
    { key: "highBid", label: "High Bid", numeric: true, render: (l: Lot) => fmt2(l.highBid) },
    { key: "savings", label: "Savings", numeric: true, render: (l: Lot) => <span className="val-green">{l.median != null ? fmt(l.median - l.highBid) : "-"}</span> },
    { key: "discount", label: "Discount", numeric: true, render: (l: Lot) => <DiscountCell discount={l.discount} highBid={l.highBid} /> },
  ];

  return (
    <div className="section">
      <div className="section-title">Top Underpriced Lots <span className="badge">Top {data.length}</span></div>
      <SortableTable
        id="underpriced-table"
        columns={columns}
        data={data}
        defaultSortCol="discount"
        defaultSortDir={-1}
        actions={(l) => <LotActions lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite} />}
      />
    </div>
  );
}
