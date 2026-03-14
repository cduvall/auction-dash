import { useMemo } from "react";
import type { Lot } from "../types";
import { SortableTable } from "./SortableTable";
import { LotActions } from "./LotActions";
import { LotName } from "./LotName";
import { DiscountCell } from "./DiscountCell";
import { fmt2, fmtClose } from "../lib/format";

interface Props {
  lots: Lot[];
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

export function Favorites({ lots, onToggleHide, onToggleFavorite }: Props) {
  const favs = useMemo(() => lots.filter((l) => l.favorited), [lots]);

  const columns = [
    { key: "lotNumber", label: "Item", render: (l: Lot) => <LotName lot={l} /> },
    { key: "median", label: "Median Est.", numeric: true, render: (l: Lot) => l.median != null ? fmt2(l.median) : "-" },
    { key: "highBid", label: "High Bid", numeric: true, render: (l: Lot) => <span style={{ color: l.highBid > 0 ? "var(--text)" : "var(--text2)" }}>{fmt2(l.highBid)}</span> },
    { key: "bidCount", label: "Bids", numeric: true, render: (l: Lot) => l.bidCount },
    { key: "discount", label: "Discount", numeric: true, render: (l: Lot) => <DiscountCell discount={l.discount} highBid={l.highBid} scale={0.6} /> },
    { key: "closeTime", label: "Closes", numeric: true, render: (l: Lot) => fmtClose(l.closeTime) },
  ];

  return (
    <div className="section">
      <div className="section-title">Favorites <span className="badge">{favs.length}</span></div>
      {favs.length === 0 ? (
        <div className="history-empty">No favorites yet. Star a lot from any table to add it here.</div>
      ) : (
        <SortableTable
          id="favorites-table"
          columns={columns}
          data={favs}
          defaultSortCol="discount"
          defaultSortDir={-1}
          actions={(l) => <LotActions lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite} />}
        />
      )}
    </div>
  );
}
