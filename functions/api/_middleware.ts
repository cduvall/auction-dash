// Middleware: validate ?auction= param for scoped routes, pass through for /api/auctions*
export const onRequest: PagesFunction<Env>[] = [
  async (context) => {
    const url = new URL(context.request.url);

    // Auctions endpoints don't need an auction param
    if (url.pathname.startsWith("/api/auctions")) {
      return context.next();
    }

    const auctionId = parseInt(url.searchParams.get("auction") || "");
    if (!auctionId || isNaN(auctionId)) {
      return Response.json({ error: "Missing or invalid auction parameter" }, { status: 400 });
    }

    // Verify auction exists
    const row = await context.env.DB.prepare("SELECT id FROM auctions WHERE id = ?").bind(auctionId).first();
    if (!row) {
      return Response.json({ error: "Missing or invalid auction parameter" }, { status: 400 });
    }

    // Store auctionId on context.data for downstream handlers
    (context.data as any).auctionId = auctionId;
    return context.next();
  },
];
