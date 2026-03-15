import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ViewName, Auction } from "@/shared/types";
import { toggleHide, toggleFavorite } from "@/features/lots/api/lots";
import { useAuctions } from "@/features/auctions/hooks/useAuctions";
import { useLots } from "@/features/lots/hooks/useLots";
import { useBidders } from "@/features/dashboard/hooks/useBidders";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Header } from "@/shared/components/Header";
import { StatsGrid } from "@/features/dashboard/components/StatsGrid";
import { BidStatsGrid } from "@/features/dashboard/components/BidStatsGrid";
import { LowestPriced } from "@/features/dashboard/components/LowestPriced";
import { HighestPriced } from "@/features/dashboard/components/HighestPriced";
import { OverEstimate } from "@/features/dashboard/components/OverEstimate";
import { Underpriced } from "@/features/dashboard/components/Underpriced";
import { AllLots } from "@/features/lots/components/AllLots";
import { Favorites } from "@/features/lots/components/Favorites";
import { Untouched } from "@/features/lots/components/Untouched";
import { HistoryCharts } from "@/features/dashboard/components/HistoryCharts";
import { LoadingOverlay } from "@/shared/components/LoadingOverlay";
import { AuctionManager } from "@/features/auctions/components/AuctionManager";
import { MigrationPrompt } from "@/features/auth/components/MigrationPrompt";

export function App() {
  const { user, hasAnonymousData, loading: authLoading } = useAuth();
  const { data: auctions = [] } = useAuctions();
  const [auctionId, setAuctionId] = useState<number | null>(null);
  const [view, setView] = useState<ViewName>(() => {
    const hash = window.location.hash.slice(1);
    return ["all", "history", "favorites", "untouched"].includes(hash) ? (hash as ViewName) : "dashboard";
  });
  const [showHidden, setShowHidden] = useState(false);
  const [hideFavorites, setHideFavorites] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | false>(false);
  const [showAuctionManager, setShowAuctionManager] = useState(() => {
    return new URLSearchParams(window.location.search).get("setup") === "1";
  });
  const [showMigration, setShowMigration] = useState(() => {
    return new URLSearchParams(window.location.search).get("migrate") === "1";
  });

  const queryClient = useQueryClient();
  const { data: lotsData, isLoading } = useLots(auctionId, refreshInterval);
  const { data: bidderStats } = useBidders(auctionId);
  const { refresh: refreshLots } = useLots(auctionId, refreshInterval);
  const { refresh: refreshBiddersData } = useBidders(auctionId);

  useEffect(() => {
    if (auctions.length > 0 && auctionId == null) {
      setAuctionId(auctions[0].id);
    }
  }, [auctions, auctionId]);

  useEffect(() => {
    const auction = auctions.find((a) => a.id === auctionId);
    document.title = auction ? `${auction.title} - AuctionDash` : "AuctionDash";
  }, [auctions, auctionId]);

  useEffect(() => {
    window.location.hash = view === "dashboard" ? "" : view;
    window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && view !== "dashboard") setView("dashboard");
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [view]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshLots();
      refreshBiddersData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshLots, refreshBiddersData]);

  const handleToggleHide = useCallback(
    async (lotNumber: string) => {
      if (!auctionId || !lotsData) return;
      const lot = lotsData.lots.find((l) => l.lotNumber === lotNumber);
      if (!lot) return;
      await toggleHide(auctionId, lotNumber, lot.hidden);
      queryClient.setQueryData(["lots", auctionId], {
        ...lotsData,
        lots: lotsData.lots.map((l) =>
          l.lotNumber === lotNumber ? { ...l, hidden: !l.hidden } : l
        ),
      });
    },
    [auctionId, lotsData, queryClient]
  );

  const handleToggleFavorite = useCallback(
    async (lotNumber: string) => {
      if (!auctionId || !lotsData) return;
      const lot = lotsData.lots.find((l) => l.lotNumber === lotNumber);
      if (!lot) return;
      await toggleFavorite(auctionId, lotNumber, lot.favorited);
      queryClient.setQueryData(["lots", auctionId], {
        ...lotsData,
        lots: lotsData.lots.map((l) =>
          l.lotNumber === lotNumber ? { ...l, favorited: !l.favorited } : l
        ),
      });
    },
    [auctionId, lotsData, queryClient]
  );

  const handleAuctionChange = useCallback((id: number) => {
    setAuctionId(id);
  }, []);

  const handleAuctionsUpdated = useCallback((updated: Auction[]) => {
    queryClient.setQueryData(["auctions"], updated);
    // If current auction was removed, switch to first available
    if (auctionId && !updated.find(a => a.id === auctionId)) {
      setAuctionId(updated.length > 0 ? updated[0].id : null);
    }
  }, [queryClient, auctionId]);

  if (authLoading) return null;
  if (user && isLoading && !lotsData) return <LoadingOverlay />;

  return (
    <>
      <Header
        auctions={auctions}
        currentAuctionId={auctionId}
        onAuctionChange={handleAuctionChange}
        currentView={view}
        onViewChange={setView}
        showHidden={showHidden}
        onToggleShowHidden={() => setShowHidden((s) => !s)}
        hideFavorites={hideFavorites}
        onToggleHideFavorites={() => setHideFavorites((s) => !s)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        fetchedAt={lotsData?.fetchedAt ?? null}
        refreshInterval={refreshInterval}
        onCycleRefreshInterval={() => {
          setRefreshInterval((prev) => {
            if (prev === false) return 60_000;
            if (prev === 60_000) return 300_000;
            if (prev === 300_000) return 3_600_000;
            return false;
          });
        }}
        onManageAuctions={() => setShowAuctionManager(true)}
      />

      {showAuctionManager && (
        <AuctionManager
          auctions={auctions}
          currentAuctionId={auctionId}
          onUpdate={handleAuctionsUpdated}
          onSelect={handleAuctionChange}
          onClose={() => {
            setShowAuctionManager(false);
            const url = new URL(window.location.href);
            if (url.searchParams.has("setup")) {
              url.searchParams.delete("setup");
              window.history.replaceState({}, "", url.pathname + url.search);
            }
          }}
        />
      )}

      {showMigration && user && hasAnonymousData && !user.migratedAnonymous && (
        <MigrationPrompt onDone={() => {
          setShowMigration(false);
          window.history.replaceState({}, "", "/");
          queryClient.invalidateQueries({ queryKey: ["lots"] });
        }} />
      )}

      <div className="max-w-[1400px] mx-auto px-3 sm:px-5 py-4 sm:py-5">
        {!user && (
          <>
            <div className="flex flex-col items-center justify-center pt-16 sm:pt-24 px-4 relative z-10">
              <img src="/logo.png" alt="AuctionDash" className="h-12 sm:h-16 mb-8" />
              <h2 className="text-xl sm:text-2xl font-bold text-primary mb-3 text-center">Track auctions in real time</h2>
              <p className="text-sm sm:text-base text-secondary text-center max-w-md mb-8 leading-relaxed">
                Monitor bids, spot underpriced lots, track price history, and organize your favorites across multiple HiBid auctions.
              </p>
              <a
                href="/api/auth/login"
                className="bg-terracotta text-primary border-none px-8 py-3 rounded-lg text-sm font-semibold no-underline transition-all hover:opacity-85 shadow-[0_4px_12px_rgba(179,93,67,0.3)]"
              >
                Sign in to get started
              </a>
            </div>
            <DemoPreview />
          </>
        )}

        {user && view === "dashboard" && lotsData && (
          <>
            <StatsGrid stats={lotsData.stats} onUntouchedClick={() => setView("untouched")} />
            <BidStatsGrid stats={lotsData.stats} lots={lotsData.lots} bidderStats={bidderStats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              <LowestPriced
                lots={lotsData.lots}
                showHidden={showHidden}
                hideFavorites={hideFavorites}
                onToggleHide={handleToggleHide}
                onToggleFavorite={handleToggleFavorite}
              />
              <HighestPriced
                lots={lotsData.lots}
                showHidden={showHidden}
                hideFavorites={hideFavorites}
                onToggleHide={handleToggleHide}
                onToggleFavorite={handleToggleFavorite}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              <Underpriced
                lots={lotsData.lots}
                showHidden={showHidden}
                hideFavorites={hideFavorites}
                onToggleHide={handleToggleHide}
                onToggleFavorite={handleToggleFavorite}
              />
              <OverEstimate
                lots={lotsData.lots}
                showHidden={showHidden}
                hideFavorites={hideFavorites}
                onToggleHide={handleToggleHide}
                onToggleFavorite={handleToggleFavorite}
              />
            </div>
          </>
        )}

        {user && view === "all" && lotsData && (
          <AllLots
            lots={lotsData.lots}
            showHidden={showHidden}
            hideFavorites={hideFavorites}
            onToggleHide={handleToggleHide}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {user && view === "favorites" && lotsData && (
          <Favorites
            lots={lotsData.lots}
            onToggleHide={handleToggleHide}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {user && view === "untouched" && lotsData && (
          <Untouched
            lots={lotsData.lots}
            showHidden={showHidden}
            hideFavorites={hideFavorites}
            onToggleHide={handleToggleHide}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {user && view === "history" && auctionId && (
          <HistoryCharts auctionId={auctionId} />
        )}
      </div>
    </>
  );
}

const demoStats = [
  { label: "Total Lots", value: "247", sub: "189 with bids, 58 without", color: "#d9a05b" },
  { label: "Total Median Value", value: "$84,320", sub: "Sum of all median estimates", color: "#909194" },
  { label: "Total High Bids", value: "$51,475", sub: "Sum of all current bids", color: "#cc7722" },
  { label: "Value Gap", value: "$32,845", sub: "Median value minus bids", color: "#6b705c" },
  { label: "Avg Discount", value: "-39%", sub: "Avg % below median (items w/ bids)", color: "#b35d43" },
  { label: "Untouched", value: "58", sub: "Lots with zero bids", color: "#b35d43" },
];

const demoLots = [
  { name: "001 - Vintage Oak Writing Desk", median: "$450", bid: "$85", bids: 3 },
  { name: "014 - Sterling Silver Tea Service", median: "$1,200", bid: "$340", bids: 7 },
  { name: "027 - Mid-Century Modern Armchair", median: "$800", bid: "$195", bids: 4 },
  { name: "033 - Antique Brass Telescope", median: "$350", bid: "$110", bids: 2 },
  { name: "041 - Hand-Knotted Persian Rug 8x10", median: "$2,400", bid: "$620", bids: 9 },
];

function DemoPreview() {
  return (
    <div className="relative mt-12 select-none pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-base z-10" />
      <div className="opacity-50 blur-[1px]">
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 sm:gap-3 mb-6">
          {demoStats.map((s) => (
            <div key={s.label} className="bg-surface border border-elevated rounded-lg p-3 sm:p-4 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-secondary font-medium mb-1.5">{s.label}</div>
              <div className="text-lg sm:text-[26px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[10px] sm:text-[11px] text-secondary mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-secondary">Lowest Priced Items</span>
              <span className="bg-elevated text-secondary text-[10px] px-2 py-0.5 rounded-full font-medium">Top 5</span>
            </div>
            <div className="flex flex-col gap-1">
              {demoLots.map((l) => (
                <div key={l.name} className="bg-surface border border-elevated rounded-md px-3 py-2">
                  <div className="text-primary font-medium text-[13px] leading-tight mb-0.5">{l.name}</div>
                  <div className="flex items-center gap-4 text-[11px] text-secondary">
                    <span>Median: <span className="text-primary">{l.median}</span></span>
                    <span>Bid: <span className="text-ochre">{l.bid}</span></span>
                    <span>Bids: <span className="text-primary">{l.bids}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-secondary">Highest Priced Items</span>
              <span className="bg-elevated text-secondary text-[10px] px-2 py-0.5 rounded-full font-medium">Top 5</span>
            </div>
            <div className="flex flex-col gap-1">
              {[...demoLots].reverse().map((l) => (
                <div key={l.name} className="bg-surface border border-elevated rounded-md px-3 py-2">
                  <div className="text-primary font-medium text-[13px] leading-tight mb-0.5">{l.name}</div>
                  <div className="flex items-center gap-4 text-[11px] text-secondary">
                    <span>Median: <span className="text-primary">{l.median}</span></span>
                    <span>Bid: <span className="text-ochre">{l.bid}</span></span>
                    <span>Bids: <span className="text-primary">{l.bids}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
