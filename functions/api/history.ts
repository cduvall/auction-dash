import { loadHistory } from "../_shared/db";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auctionId = (context.data as any).auctionId as number;
  return Response.json(await loadHistory(context.env.DB, auctionId));
};
