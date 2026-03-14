import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ViewName } from "./types";
import { toggleHide, toggleFavorite } from "./api/lots";
import { useAuctions } from "./hooks/useAuctions";
import { useLots } from "./hooks/useLots";
import { useBidders } from "./hooks/useBidders";
import { useAuth } from "./hooks/useAuth";
import { Header } from "./components/Header";
import { StatsGrid } from "./components/StatsGrid";
import { BidStatsGrid } from "./components/BidStatsGrid";
import { LowestPriced } from "./components/LowestPriced";
import { HighestPriced } from "./components/HighestPriced";
import { OverEstimate } from "./components/OverEstimate";
import { Underpriced } from "./components/Underpriced";
import { AllLots } from "./components/AllLots";
import { Favorites } from "./components/Favorites";
import { Untouched } from "./components/Untouched";
import { HistoryCharts } from "./components/HistoryCharts";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { AuctionManager } from "./components/AuctionManager";
import { MigrationPrompt } from "./components/MigrationPrompt";
import type { Auction } from "./types";

export function App() {
  const { user, hasAnonymousData } = useAuth();
  const { data: auctions = [] } = useAuctions();
  const [auctionId, setAuctionId] = useState<number | null>(null);
  const [view, setView] = useState<ViewName>(() => {
    const hash = window.location.hash.slice(1);
    return ["history", "favorites", "untouched"].includes(hash) ? (hash as ViewName) : "dashboard";
  });
  const [showHidden, setShowHidden] = useState(false);
  const [hideFavorites, setHideFavorites] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number | false>(false);
  const [showAuctionManager, setShowAuctionManager] = useState(false);
  const [showMigration, setShowMigration] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("migrate") === "1";
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

  if (isLoading && !lotsData) return <LoadingOverlay />;

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
          onClose={() => setShowAuctionManager(false)}
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
        {view === "dashboard" && lotsData && (
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
            <AllLots
              lots={lotsData.lots}
              showHidden={showHidden}
              hideFavorites={hideFavorites}
              onToggleHide={handleToggleHide}
              onToggleFavorite={handleToggleFavorite}
            />
          </>
        )}

        {view === "favorites" && lotsData && (
          <Favorites
            lots={lotsData.lots}
            onToggleHide={handleToggleHide}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {view === "untouched" && lotsData && (
          <Untouched
            lots={lotsData.lots}
            showHidden={showHidden}
            hideFavorites={hideFavorites}
            onToggleHide={handleToggleHide}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {view === "history" && auctionId && (
          <HistoryCharts auctionId={auctionId} />
        )}
      </div>
    </>
  );
}
