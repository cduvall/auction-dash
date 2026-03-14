export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const auctionId = (context.data as any).auctionId as number;
  const { lotNumber } = await context.request.json() as { lotNumber: string };

  try {
    await context.env.DB.prepare(
      "INSERT OR IGNORE INTO hidden (user_id, auction_id, lot_number) VALUES (?, ?, ?)"
    ).bind(user.id, auctionId, lotNumber).run();
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const auctionId = (context.data as any).auctionId as number;
  const { lotNumber } = await context.request.json() as { lotNumber: string };

  try {
    await context.env.DB.prepare(
      "DELETE FROM hidden WHERE user_id = ? AND auction_id = ? AND lot_number = ?"
    ).bind(user.id, auctionId, lotNumber).run();
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
};
