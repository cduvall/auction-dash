import { useMemo } from "react";
import type { Lot } from "../types";
import { SortableTable } from "./SortableTable";
import { LotActions } from "./LotActions";
import { LotName } from "./LotName";
import { fmt, fmt2 } from "../lib/format";

interface Props {
  lots: Lot[];
  showHidden: boolean;
  hideFavorites: boolean;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

export function OverEstimate({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const data = useMemo(() => {
    return lots
      .filter((l) => {
        if (l.hidden && !showHidden) return false;
        if (l.favorited && hideFavorites) return false;
        return l.highBid > 0 && l.median != null && l.highBid > l.median;
      })
      .sort((a, b) => (b.highBid - (b.median ?? 0)) - (a.highBid - (a.median ?? 0)))
      .slice(0, 10);
  }, [lots, showHidden, hideFavorites]);

  const columns = [
    { key: "lotNumber", label: "Item", render: (l: Lot) => <LotName lot={l} /> },
    { key: "highBid", label: "High Bid", numeric: true, render: (l: Lot) => <span className="val-yellow">{fmt2(l.highBid)}</span> },
    { key: "median", label: "Median Est.", numeric: true, render: (l: Lot) => fmt2(l.median ?? 0) },
    {
      key: "overAmount",
      label: "Over By",
      numeric: true,
      render: (l: Lot) => {
        const over = l.highBid - (l.median ?? 0);
        const overPct = l.median ? (over / l.median) * 100 : 0;
        return <span className="val-red">+{fmt(over)} (+{overPct.toFixed(0)}%)</span>;
      },
    },
  ];

  if (data.length === 0) {
    return (
      <div className="section highlight-section">
        <div className="section-title">Most Over Estimate <span className="badge">Top 10</span></div>
        <div className="table-wrap">
          <table id="over-estimate-table">
            <tbody>
              <tr>
                <td colSpan={5} style={{ color: "var(--text2)", textAlign: "center", padding: 20 }}>
                  No items currently over estimate
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="section highlight-section">
      <div className="section-title">Most Over Estimate <span className="badge">Top 10</span></div>
      <SortableTable
        id="over-estimate-table"
        columns={columns}
        data={data}
        defaultSortCol="overAmount"
        defaultSortDir={-1}
        actions={(l) => <LotActions lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite} />}
      />
    </div>
  );
}
