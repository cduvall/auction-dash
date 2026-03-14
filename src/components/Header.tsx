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
    <div className="header">
      <div className="header-left">
        <h1>AuctionDash</h1>
        {auctions.length > 1 && (
          <select
            className="auction-select"
            value={currentAuctionId ?? ""}
            onChange={(e) => onAuctionChange(parseInt(e.target.value))}
          >
            {auctions.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        )}
      </div>
      <div className="header-right">
        {fetchedAt && (
          <span className="fetched-at">
            Updated {new Date(fetchedAt).toLocaleTimeString()}
          </span>
        )}
        <nav className="nav-tabs">
          {views.map((v) => (
            <a
              key={v.key}
              href={`#${v.key === "dashboard" ? "" : v.key}`}
              className={`nav-link ${currentView === v.key ? "active" : ""}`}
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
          className={`filter-btn ${showHidden ? "active" : ""}`}
          onClick={onToggleShowHidden}
        >
          {showHidden ? "Hide Hidden" : "Show Hidden"}
        </button>
        <button
          className={`filter-btn ${hideFavorites ? "active" : ""}`}
          onClick={onToggleHideFavorites}
        >
          {hideFavorites ? "Show Favorites" : "Hide Favorites"}
        </button>
        <button className="refresh-btn" disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? (
            <><span className="spinner"></span>Refreshing...</>
          ) : (
            "Refresh"
          )}
        </button>
      </div>
    </div>
  );
}
