import type { ReactNode } from "react";
import type { Lot } from "../types";
import { LotActions } from "./LotActions";

interface LotCardProps {
  lot: Lot;
  onToggleHide: (lotNumber: string) => void;
  onToggleFavorite: (lotNumber: string) => void;
  children: ReactNode;
}

export function LotCard({ lot, onToggleHide, onToggleFavorite, children }: LotCardProps) {
  return (
    <div className={`bg-surface border border-elevated rounded-md px-3 py-2 transition-colors hover:border-ochre/40 ${lot.hidden ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <a
          href={lot.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium text-[13px] leading-tight no-underline hover:text-ochre transition-colors truncate"
        >
          {lot.lotNumber} - {lot.name}
        </a>
        <span className="inline-flex gap-1 shrink-0">
          <LotActions lot={lot} onToggleHide={onToggleHide} onToggleFavorite={onToggleFavorite} />
        </span>
      </div>
      {children}
    </div>
  );
}
