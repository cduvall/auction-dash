import { getTokenFromRequest, getSessionUser } from "../_shared/auth";

// Middleware 1: Auth resolution - attach user to context for all routes
async function authMiddleware(context: EventContext<Env, string, Record<string, unknown>>) {
  const token = getTokenFromRequest(context.request);
  if (token) {
    const user = await getSessionUser(context.env.DB, token);
    (context.data as any).user = user;
  } else {
    (context.data as any).user = null;
  }
  return context.next();
}

// Middleware 2: Validate ?auction= param for scoped routes
async function auctionMiddleware(context: EventContext<Env, string, Record<string, unknown>>) {
  const url = new URL(context.request.url);

  // These endpoints don't need an auction param
  if (url.pathname.startsWith("/api/auctions") || url.pathname.startsWith("/api/auth")) {
    return context.next();
  }

  const auctionId = parseInt(url.searchParams.get("auction") || "");
  if (!auctionId || isNaN(auctionId)) {
    return Response.json({ error: "Missing or invalid auction parameter" }, { status: 400 });
  }

  const user = (context.data as any).user;

  if (user) {
    // Logged-in user: validate against user_auctions
    const row = await context.env.DB.prepare(
      "SELECT auction_id FROM user_auctions WHERE user_id = ? AND auction_id = ?"
    ).bind(user.id, auctionId).first();
    if (!row) {
      return Response.json({ error: "Missing or invalid auction parameter" }, { status: 400 });
    }
  } else {
    // Anonymous: validate against global auctions table
    const row = await context.env.DB.prepare("SELECT id FROM auctions WHERE id = ?").bind(auctionId).first();
    if (!row) {
      return Response.json({ error: "Missing or invalid auction parameter" }, { status: 400 });
    }
  }

  (context.data as any).auctionId = auctionId;
  return context.next();
}

export const onRequest: PagesFunction<Env>[] = [authMiddleware, auctionMiddleware];
