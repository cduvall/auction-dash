import { loadCachedLots, getHiddenSet, getFavoritesSet } from "../../_shared/db";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auctionId = (context.data as any).auctionId as number;
  const db = context.env.DB;

  const data = await loadCachedLots(db, auctionId);
  if (!data) {
    return Response.json({ error: "no cached data" }, { status: 404 });
  }

  const [hiddenSet, favoritesSet] = await Promise.all([
    getHiddenSet(db, auctionId),
    getFavoritesSet(db, auctionId),
  ]);

  const updated = {
    ...data,
    lots: data.lots.map((l: any) => ({
      ...l,
      hidden: hiddenSet.has(l.lotNumber),
      favorited: favoritesSet.has(l.lotNumber),
    })),
  };

  return Response.json(updated);
};
