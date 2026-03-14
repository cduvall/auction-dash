import { useState, useRef, useEffect } from "react";
import type { Auction, ViewName } from "../types";
import { useAuth } from "../hooks/useAuth";
import { UserMenu } from "./UserMenu";

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
  refreshInterval: number | false;
  onCycleRefreshInterval: () => void;
  onManageAuctions: () => void;
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
  refreshInterval,
  onCycleRefreshInterval,
  onManageAuctions,
}: HeaderProps) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const intervalLabel = refreshInterval === 60_000 ? "1m"
    : refreshInterval === 300_000 ? "5m"
    : refreshInterval === 3_600_000 ? "1h"
    : "Off";

  const views: { key: ViewName; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "favorites", label: "Favorites" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="bg-nav border-b border-elevated sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-5">
        {/* Top row: logo + controls */}
        <div className="flex items-center justify-between gap-2 py-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <img src="/logo.png" alt="AuctionDash" className="h-7 sm:h-8 shrink-0" />
            {auctions.length > 1 && (
              <select
                className="bg-surface border border-elevated text-primary px-2 sm:px-3 py-1.5 rounded-lg text-[13px] font-sans outline-none cursor-pointer focus:border-ochre min-w-0 truncate"
                value={currentAuctionId ?? ""}
                onChange={(e) => onAuctionChange(parseInt(e.target.value))}
              >
                {auctions.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            )}
            {user && (
              <button
                className="bg-surface border border-elevated text-secondary rounded-md p-1.5 cursor-pointer transition-all hover:border-ochre hover:text-ochre shrink-0"
                onClick={onManageAuctions}
                title="Manage auctions"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <UserMenu />
            {user && <div className="relative" ref={menuRef}>
              <button
                className="bg-surface border border-elevated text-secondary rounded-md p-1.5 cursor-pointer transition-all hover:border-ochre hover:text-ochre"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-surface border border-elevated rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.6)] py-1 min-w-[140px] z-50">
                  {views.map((v) => (
                    <a
                      key={v.key}
                      href={`#${v.key === "dashboard" ? "" : v.key}`}
                      className={`block px-4 py-2 text-[13px] font-medium no-underline transition-colors ${
                        currentView === v.key
                          ? "text-terracotta bg-terracotta/10"
                          : "text-secondary hover:text-primary hover:bg-elevated/50"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        onViewChange(v.key);
                        setMenuOpen(false);
                      }}
                    >
                      {v.label}
                    </a>
                  ))}
                </div>
              )}
            </div>}
          </div>
        </div>

        {/* Bottom row: toolbar (authenticated only) */}
        {user && <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pb-3 -mt-1">
          <button
            className={`border rounded-md p-1.5 cursor-pointer transition-all shrink-0 ${showHidden ? "bg-terracotta border-terracotta text-primary" : "bg-surface border-elevated text-secondary hover:border-ochre hover:text-ochre"}`}
            onClick={onToggleShowHidden}
            title={showHidden ? "Hide hidden items" : "Show hidden items"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            className={`border rounded-md p-1.5 cursor-pointer transition-all shrink-0 ${hideFavorites ? "bg-terracotta border-terracotta text-primary" : "bg-surface border-elevated text-secondary hover:border-ochre hover:text-ochre"}`}
            onClick={onToggleHideFavorites}
            title={hideFavorites ? "Show favorites in lists" : "Hide favorites from lists"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
                fill={hideFavorites ? "none" : "currentColor"}
              />
              {hideFavorites && <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
            </svg>
          </button>

          <span className="w-px h-4 bg-elevated mx-0.5" />

          <button
            className={`border rounded-md px-2 py-1.5 cursor-pointer transition-all inline-flex items-center gap-1 shrink-0 ${refreshInterval ? "bg-olive/20 border-olive/50 text-olive-light" : "bg-surface border-elevated text-secondary hover:border-ochre hover:text-ochre"}`}
            onClick={onCycleRefreshInterval}
            title={`Auto-refresh: ${intervalLabel}. Click to cycle.`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
            </svg>
            <span className="text-[10px] font-semibold">{intervalLabel}</span>
          </button>
          <button
            className="bg-terracotta text-primary border-none px-3 sm:px-4 py-1.5 rounded-md text-[12px] font-semibold font-sans cursor-pointer transition-all hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            {isRefreshing ? (
              <><span className="inline-block w-3 h-3 border-2 border-transparent border-t-current rounded-full animate-spin mr-1 align-middle"></span>Refreshing</>
            ) : (
              "Refresh"
            )}
          </button>

          {fetchedAt && (
            <span className="text-[11px] text-secondary ml-auto whitespace-nowrap">
              Updated {new Date(fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>}
      </div>
    </div>
  );
}
