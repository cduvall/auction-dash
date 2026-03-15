import type { SortDir } from "@/shared/types";

interface SortOption {
  key: string;
  label: string;
}

interface ListControlsProps {
  sortOptions: SortOption[];
  sortCol: string;
  sortDir: SortDir;
  onSort: (col: string) => void;
  onToggleDir: () => void;
  limits?: number[];
  activeLimit?: number;
  onLimitChange?: (n: number) => void;
}

export function ListControls({
  sortOptions,
  sortCol,
  sortDir,
  onSort,
  onToggleDir,
  limits,
  activeLimit,
  onLimitChange,
}: ListControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {sortOptions.map((o) => {
        const active = sortCol === o.key;
        return (
          <button
            key={o.key}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
              active
                ? "bg-ochre/15 border-ochre/50 text-ochre"
                : "bg-elevated/60 border-elevated text-secondary hover:text-primary hover:border-ochre/30"
            }`}
            onClick={() => {
              if (active) {
                onToggleDir();
              } else {
                onSort(o.key);
              }
            }}
          >
            {o.label}
            {active && (
              <span className="ml-1 text-[9px]">{sortDir === 1 ? "\u25B2" : "\u25BC"}</span>
            )}
          </button>
        );
      })}
      {limits && activeLimit != null && onLimitChange && (
        <>
          <span className="w-px h-4 bg-elevated mx-1" />
          {limits.map((n) => (
            <button
              key={n}
              className={`px-2 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                activeLimit === n
                  ? "bg-olive/15 border-olive/50 text-olive-light"
                  : "bg-elevated/60 border-elevated text-secondary hover:text-primary hover:border-olive/30"
              }`}
              onClick={() => onLimitChange(n)}
            >
              {n}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
