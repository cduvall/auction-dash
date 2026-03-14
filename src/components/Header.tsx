import type { Auction, ViewName } from "../types";

interface HeaderProps {
  auctions: Auction[];
  currentAuctionId: number | null;
  onAuctionChange: (id: number) => void;
  currentView: ViewName;
  onViewChange: (view: ViewName) => void;
  showHidden: boolean;
  onToggleShowHidden: () => void;
  hideFavorites: boolean;
  onToggleHideFavorites: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  fetchedAt: string | null;
}

export function Header({
  auctions,
  currentAuctionId,
  onAuctionChange,
  currentView,
  onViewChange,
  showHidden,
  onToggleShowHidden,
  hideFavorites,
  onToggleHideFavorites,
  onRefresh,
  isRefreshing,
  fetchedAt,
}: HeaderProps) {
  const views: { key: ViewName; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "favorites", label: "Favorites" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="bg-nav border-b border-elevated px-8 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-primary tracking-tight">AuctionDash</h1>
        {auctions.length > 1 && (
          <select
            className="bg-surface border border-elevated text-primary px-3 py-1.5 rounded-lg text-[13px] font-sans outline-none cursor-pointer focus:border-ochre"
            value={currentAuctionId ?? ""}
            onChange={(e) => onAuctionChange(parseInt(e.target.value))}
          >
            {auctions.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-3">
        {fetchedAt && (
          <span className="text-xs text-secondary">
            Updated {new Date(fetchedAt).toLocaleTimeString()}
          </span>
        )}
        <nav className="flex gap-1">
          {views.map((v) => (
            <a
              key={v.key}
              href={`#${v.key === "dashboard" ? "" : v.key}`}
              className={`text-[13px] font-medium px-3.5 py-2 rounded-lg transition-all no-underline cursor-pointer ${
                currentView === v.key
                  ? "bg-terracotta border-terracotta text-primary"
                  : "text-secondary border border-elevated hover:border-ochre hover:text-ochre"
              }`}
              onClick={(e) => {
                e.preventDefault();
                onViewChange(v.key);
              }}
            >
              {v.label}
            </a>
          ))}
        </nav>
        <button
          className={`border rounded-lg p-2 cursor-pointer transition-all ${showHidden ? "bg-terracotta border-terracotta text-primary" : "bg-surface border-elevated text-secondary hover:border-ochre hover:text-ochre"}`}
          onClick={onToggleShowHidden}
          title={showHidden ? "Hide hidden items" : "Show hidden items"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showHidden ? (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            ) : (
              <>
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            )}
          </svg>
        </button>
        <button
          className={`border rounded-lg p-2 cursor-pointer transition-all ${hideFavorites ? "bg-terracotta border-terracotta text-primary" : "bg-surface border-elevated text-secondary hover:border-ochre hover:text-ochre"}`}
          onClick={onToggleHideFavorites}
          title={hideFavorites ? "Show favorites in lists" : "Hide favorites from lists"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
              fill={hideFavorites ? "none" : "currentColor"}
            />
            {hideFavorites && <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
          </svg>
        </button>
        <button
          className="bg-terracotta text-primary border-none px-5 py-2 rounded-lg text-[13px] font-semibold font-sans cursor-pointer transition-all hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          {isRefreshing ? (
            <><span className="inline-block w-3.5 h-3.5 border-2 border-transparent border-t-current rounded-full animate-spin mr-1.5 align-middle"></span>Refreshing...</>
          ) : (
            "Refresh"
          )}
        </button>
      </div>
    </div>
  );
}
