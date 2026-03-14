import { loadBidderCache, computeBidderStats } from "../../_shared/db";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auctionId = (context.data as any).auctionId as number;
  const cache = await loadBidderCache(context.env.DB, auctionId);
  return Response.json(computeBidderStats(cache));
};
