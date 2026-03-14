import { useState, useMemo, type ReactNode } from "react";
import type { Lot, SortDir } from "../types";
import { compareLots } from "../lib/sort";

interface Column {
  key: string;
  label: string;
  numeric?: boolean;
  render: (lot: Lot) => ReactNode;
}

interface SortableTableProps {
  id: string;
  columns: Column[];
  data: Lot[];
  defaultSortCol: string;
  defaultSortDir?: SortDir;
  actions?: (lot: Lot) => ReactNode;
}

export function SortableTable({
  id,
  columns,
  data,
  defaultSortCol,
  defaultSortDir = -1,
  actions,
}: SortableTableProps) {
  const [sortCol, setSortCol] = useState(defaultSortCol);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  const sorted = useMemo(
    () => [...data].sort((a, b) => compareLots(a, b, sortCol, sortDir)),
    [data, sortCol, sortDir]
  );

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortCol(col);
      setSortDir(
        col === "name" || col === "lotNumber" || col === "closeTime" ? 1 : -1
      );
    }
  }

  return (
    <div className="table-wrap">
      <table id={id} className="sortable">
        <thead>
          <tr>
            {actions && <th className="actions-col"></th>}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${col.numeric ? "num" : ""} ${sortCol === col.key ? "sorted" : ""}`}
                data-col={col.key}
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
          {sorted.map((lot) => (
            <tr key={lot.id} className={lot.hidden ? "hidden-row" : ""}>
              {actions && (
                <td className="actions-col">
                  <span className="lot-actions">{actions(lot)}</span>
                </td>
              )}
              {columns.map((col) => (
                <td key={col.key} className={col.numeric ? "num" : ""}>
                  {col.render(lot)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
