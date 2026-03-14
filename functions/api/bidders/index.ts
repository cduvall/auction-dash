import { fetchBidHistory } from "../../_shared/hibid";
import {
  loadCachedLots,
  loadBidderCache,
  saveBidderLot,
  addBidderActivity,
  pruneBidderActivity,
  updateBidderMeta,
  computeBidderStats,
} from "../../_shared/db";

const MAX_LOTS_PER_REQUEST = 40;
const BATCH_SIZE = 10;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auctionId = (context.data as any).auctionId as number;
  const db = context.env.DB;
  const url = new URL(context.request.url);
  const cursor = parseInt(url.searchParams.get("cursor") || "0");

  const cachedData = await loadCachedLots(db, auctionId);
  if (!cachedData) {
    return Response.json({ error: "No lot data cached. Refresh lots first." }, { status: 400 });
  }

  try {
    const cache = await loadBidderCache(db, auctionId);
    const allLots = cachedData.lots;

    // Determine which lots need fetching
    const toFetch: any[] = [];
    for (const lot of allLots) {
      const cached = cache.lots[lot.id];
      if (!cached || cached.highBid !== lot.highBid || cached.maxBid === undefined || !cached.v) {
        toFetch.push(lot);
      }
    }

    // Apply cursor-based pagination
    const slice = toFetch.slice(cursor, cursor + MAX_LOTS_PER_REQUEST);
    const now = new Date().toISOString();

    // Fetch in batches of BATCH_SIZE for parallelism
    for (let i = 0; i < slice.length; i += BATCH_SIZE) {
      const batch = slice.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async (lot: any) => {
        try {
          const bids = await fetchBidHistory(lot.id);
          const usernames = [...new Set(bids.map((b: any) => b.username).filter(Boolean))] as string[];
          const maxBid = bids.length > 0 ? Math.max(...bids.map((b: any) => b.bid)) : 0;
          const bidCount = bids.reduce((sum: number, b: any) => sum + (b.count || 0), 0);
          return { id: lot.id, highBid: lot.highBid, usernames, maxBid, bidCount };
        } catch {
          return null;
        }
      }));

      for (const r of results) {
        if (!r) continue;
        const prev = cache.lots[r.id];
        const prevSet = new Set(prev ? prev.usernames : []);

        // Record new activity
        for (const u of r.usernames) {
          if (!prevSet.has(u)) {
            await addBidderActivity(db, auctionId, u, now);
            cache.activity.push({ username: u, timestamp: now });
          }
        }

        const lotData = { highBid: r.highBid, maxBid: r.maxBid, bidCount: r.bidCount, usernames: r.usernames, v: 1 };
        await saveBidderLot(db, auctionId, r.id, lotData);
        cache.lots[r.id] = lotData;
      }
    }

    // Prune old activity
    await pruneBidderActivity(db, auctionId);

    // Update peak
    const stats = computeBidderStats(cache);
    if (stats.activeLast24h > cache.maxActiveBidders) {
      await updateBidderMeta(db, auctionId, stats.activeLast24h);
    }

    const nextCursorVal = cursor + MAX_LOTS_PER_REQUEST;
    const hasMore = nextCursorVal < toFetch.length;

    return Response.json({
      ...stats,
      lotsRefreshed: slice.length,
      totalLots: allLots.length,
      toFetchTotal: toFetch.length,
      nextCursor: hasMore ? nextCursorVal : null,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
