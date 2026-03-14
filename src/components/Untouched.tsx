import { useMemo } from "react";
import type { Lot } from "../types";
import { LotActions } from "./LotActions";
import { LotName } from "./LotName";
import { fmt2, fmtClose } from "../lib/format";
import { compareLots } from "../lib/sort";

interface Props {
  lots: Lot[];
  showHidden: boolean;
  hideFavorites: boolean;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
}

export function Untouched({ lots, showHidden, hideFavorites, onToggleHide, onToggleFavorite }: Props) {
  const untouched = useMemo(() => {
    return lots
      .filter((l) => {
        if (l.hidden && !showHidden) return false;
        if (l.favorited && hideFavorites) return false;
        return l.highBid <= 0;
      })
      .sort((a, b) => compareLots(a, b, "lotNumber", 1));
  }, [lots, showHidden, hideFavorites]);

  return (
    <div className="section">
      <div className="section-title">Untouched Lots <span className="badge">{untouched.length}</span></div>
      <div className="table-wrap" id="untouched-table-wrap">
        <table id="untouched-table">
          <thead>
            <tr>
              <th className="actions-col"></th>
              <th>Item</th>
              <th className="num">Median Est.</th>
              <th className="num">Closes</th>
            </tr>
          </thead>
          <tbody>
            {untouched.map((l) => (
              <tr key={l.id} className={l.hidden ? "hidden-row" : ""}>
                <td className="actions-col">
                  <span className="lot-actions">
                    <LotActions lot={l} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite} />
                  </span>
                </td>
                <td className="name-col"><LotName lot={l} /></td>
                <td className="num">{l.median != null ? fmt2(l.median) : "-"}</td>
                <td className="num">{fmtClose(l.closeTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
