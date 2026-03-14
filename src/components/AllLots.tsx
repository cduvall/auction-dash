import { useState, useMemo } from "react";
import type { Lot, BidFilter, SortDir } from "../types";
import { LotActions } from "./LotActions";
import { LotName } from "./LotName";
import { DiscountCell } from "./DiscountCell";
import { fmt2, fmtClose } from "../lib/format";
import { compareLots } from "../lib/sort";

interface Props {
  lots: Lot[];
  showHidden: boolean;
  hideFavorites: boolean;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

export function AllLots({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BidFilter>(null);
  const [sortCol, setSortCol] = useState("discount");
  const [sortDir, setSortDir] = useState<SortDir>(-1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
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
  }, [lots, search, filter, sortCol, sortDir, showHidden, hideFavorites]);

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortCol(col);
      setSortDir(col === "name" || col === "lotNumber" || col === "closeTime" ? 1 : -1);
    }
  }

  function toggleFilter(f: "bids" | "nobids") {
    setFilter((prev) => (prev === f ? null : f));
  }

  const columns = [
    { key: "lotNumber", label: "Item" },
    { key: "estimateLow", label: "Estimate", numeric: true },
    { key: "median", label: "Median", numeric: true },
    { key: "highBid", label: "High Bid", numeric: true },
    { key: "bidCount", label: "Bids", numeric: true },
    { key: "discount", label: "Discount", numeric: true },
    { key: "closeTime", label: "Closes", numeric: true },
  ];

  return (
    <div className="section">
      <div className="section-title">All Lots <span className="badge">{lots.length} lots</span></div>
      <div className="controls">
        <input
          className="search-input"
          placeholder="Search lots..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`filter-btn ${filter === "bids" ? "active" : ""}`}
          onClick={() => toggleFilter("bids")}
        >
          Has Bids
        </button>
        <button
          className={`filter-btn ${filter === "nobids" ? "active" : ""}`}
          onClick={() => toggleFilter("nobids")}
        >
          No Bids
        </button>
        <span className="lot-count">{filtered.length} shown</span>
      </div>
      <div className="table-wrap" id="all-table-wrap">
        <table id="all-table">
          <thead>
            <tr>
              <th className="actions-col"></th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.numeric ? "num" : ""} ${sortCol === col.key ? "sorted" : ""}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}{" "}
                  <span className="sort-arrow">
                    {sortCol === col.key && sortDir === 1 ? "\u25B2" : "\u25BC"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className={l.hidden ? "hidden-row" : ""}>
                <td className="actions-col">
                  <span className="lot-actions">
                    <LotActions lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite} />
                  </span>
                </td>
                <td className="name-col"><LotName lot={l} /></td>
                <td className="num">{l.estimateLow != null ? `${fmt2(l.estimateLow)} - ${fmt2(l.estimateHigh!)}` : "-"}</td>
                <td className="num">{l.median != null ? fmt2(l.median) : "-"}</td>
                <td className="num" style={{ color: l.highBid > 0 ? "var(--text)" : "var(--text2)" }}>{fmt2(l.highBid)}</td>
                <td className="num">{l.bidCount}</td>
                <td className="num"><DiscountCell discount={l.discount} highBid={l.highBid} scale={0.6} /></td>
                <td className="num">{fmtClose(l.closeTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
