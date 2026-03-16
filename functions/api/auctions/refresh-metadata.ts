import { fetchAuctionMetadata } from "../../_shared/hibid";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.request.json() as { id: number };
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const db = context.env.DB;

  // Verify user owns this auction
  const existing = await db.prepare(
    "SELECT auction_id FROM user_auctions WHERE user_id = ? AND auction_id = ?"
  ).bind(user.id, id).first();
  if (!existing) return Response.json({ error: "Auction not found" }, { status: 400 });

  const metadata = await fetchAuctionMetadata(id);
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  await db.batch([
    db.prepare("UPDATE user_auctions SET metadata = ? WHERE user_id = ? AND auction_id = ?").bind(metadataJson, user.id, id),
    db.prepare("UPDATE auctions SET metadata = ? WHERE id = ?").bind(metadataJson, id),
  ]);

  const { results } = await db.prepare(
    "SELECT auction_id as id, title, metadata FROM user_auctions WHERE user_id = ? ORDER BY auction_id"
  ).bind(user.id).all();
  return Response.json({ ok: true, auctions: results.map((r: any) => ({
    id: r.id,
    title: r.title,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
  })) });
};
