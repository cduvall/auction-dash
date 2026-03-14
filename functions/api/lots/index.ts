import { fetchPage, parseEstimate, parseCloseTime } from "../../_shared/hibid";
import { computeSnapshot } from "../../_shared/snapshot";
import { saveCachedLots, appendSnapshot, loadBidderCache, getHiddenSet, getFavoritesSet } from "../../_shared/db";

const PAGE_SIZE = 100;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auctionId = (context.data as any).auctionId as number;
  const db = context.env.DB;

  try {
    // Fetch all lots from HiBid
    let allResults: any[] = [];
    let page = 1;
    while (true) {
      const data = await fetchPage(auctionId, page);
      allResults.push(...data.results);
      if (allResults.length >= data.totalCount || data.results.length < PAGE_SIZE) break;
      page++;
    }

    const [hiddenSet, favoritesSet] = await Promise.all([
      getHiddenSet(db, auctionId),
      getFavoritesSet(db, auctionId),
    ]);

    let totalMedian = 0;
    let totalBids = 0;
    let totalBidCount = 0;
    let withBidsCount = 0;
    let discountSum = 0;

    const lots = allResults.map((lot: any) => {
      const est = parseEstimate(lot.estimate);
      const median = est.low != null && est.high != null ? (est.low + est.high) / 2 : null;
      const highBid = lot.lotState?.highBid ?? lot.bidAmount ?? 0;
      const bidCount = lot.lotState?.bidCount ?? 0;
      const discount = median != null && median > 0 ? ((median - highBid) / median) * 100 : 0;

      if (median != null) totalMedian += median;
      totalBids += highBid;
      totalBidCount += bidCount;
      if (highBid > 0) {
        withBidsCount++;
        discountSum += discount;
      }

      const slug = (lot.lead || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      return {
        id: lot.id,
        lotNumber: lot.lotNumber,
        name: lot.lead,
        estimateLow: est.low,
        estimateHigh: est.high,
        median,
        highBid,
        bidCount,
        discount,
        closeTime: parseCloseTime(lot.lotState),
        hidden: hiddenSet.has(lot.lotNumber),
        favorited: favoritesSet.has(lot.lotNumber),
        url: `https://hibid.com/lot/${lot.id}/${slug}`,
      };
    });

    // Recover final prices for closed lots from bidder cache
    const bidderCache = await loadBidderCache(db, auctionId);
    for (const lot of lots) {
      const cached = bidderCache.lots[lot.id];
      if (!cached) continue;
      if (lot.highBid === 0 && cached.maxBid > 0) {
        lot.highBid = cached.maxBid;
        lot.discount = lot.median != null && lot.median > 0
          ? ((lot.median - lot.highBid) / lot.median) * 100
          : 0;
        totalBids += lot.highBid;
        withBidsCount++;
        discountSum += lot.discount;
      }
      if (lot.bidCount === 0 && cached.bidCount > 0) {
        lot.bidCount = cached.bidCount;
        totalBidCount += cached.bidCount;
      }
    }

    const avgDiscount = withBidsCount > 0 ? discountSum / withBidsCount : 0;

    const data = {
      fetchedAt: new Date().toISOString(),
      stats: {
        totalLots: lots.length,
        totalBids: totalBidCount,
        totalMedianValue: totalMedian,
        totalHighBids: totalBids,
        gap: totalMedian - totalBids,
        avgDiscount,
        withBids: withBidsCount,
        withoutBids: lots.length - withBidsCount,
      },
      lots,
    };

    // Persist cache + snapshot
    const snapshot = computeSnapshot(data.fetchedAt, data.stats, data.lots);
    await Promise.all([
      saveCachedLots(db, auctionId, data),
      appendSnapshot(db, auctionId, snapshot),
    ]);

    return Response.json(data);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
