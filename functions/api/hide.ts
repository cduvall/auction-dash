export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auctionId = (context.data as any).auctionId as number;
  const { lotNumber } = await context.request.json() as { lotNumber: string };

  try {
    await context.env.DB.prepare(
      "INSERT OR IGNORE INTO hidden (auction_id, lot_number) VALUES (?, ?)"
    ).bind(auctionId, lotNumber).run();
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const auctionId = (context.data as any).auctionId as number;
  const { lotNumber } = await context.request.json() as { lotNumber: string };

  try {
    await context.env.DB.prepare(
      "DELETE FROM hidden WHERE auction_id = ? AND lot_number = ?"
    ).bind(auctionId, lotNumber).run();
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 400 });
  }
};
