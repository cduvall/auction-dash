import { getAccessJWTFromRequest, verifyAccessJWT } from "../_shared/cf-access";

// Middleware 1: Auth resolution - verify CF Access JWT if present, attach user to context
async function authMiddleware(context: EventContext<Env, string, Record<string, unknown>>) {
  (context.data as any).user = null;

  const token = getAccessJWTFromRequest(context.request);
  if (token) {
    const payload = await verifyAccessJWT(
      token,
      context.env.CF_ACCESS_TEAM_DOMAIN,
      context.env.CF_ACCESS_AUD
    );
    if (payload?.email) {
      // Look up user by email
      const user = await context.env.DB.prepare(
        "SELECT id, email, username, avatar_url, migrated_anonymous FROM users WHERE email = ?"
      ).bind(payload.email).first<{
        id: number; email: string; username: string; avatar_url: string | null; migrated_anonymous: number;
      }>();
      if (user) {
        (context.data as any).user = {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatar_url,
          migratedAnonymous: user.migrated_anonymous === 1,
        };
      }
    }
  }
  return context.next();
}

// Middleware 2: Validate ?auction= param for scoped routes
async function auctionMiddleware(context: EventContext<Env, string, Record<string, unknown>>) {
  const url = new URL(context.request.url);

  if (url.pathname.startsWith("/api/auctions") || url.pathname.startsWith("/api/auth")) {
    return context.next();
  }

  const auctionId = parseInt(url.searchParams.get("auction") || "");
  if (!auctionId || isNaN(auctionId)) {
    return Response.json({ error: "Missing or invalid auction parameter" }, { status: 400 });
  }

  const user = (context.data as any).user;

  if (user) {
    const row = await context.env.DB.prepare(
      "SELECT auction_id FROM user_auctions WHERE user_id = ? AND auction_id = ?"
    ).bind(user.id, auctionId).first();
    if (!row) {
      return Response.json({ error: "Missing or invalid auction parameter" }, { status: 400 });
    }
  } else {
    const row = await context.env.DB.prepare("SELECT id FROM auctions WHERE id = ?").bind(auctionId).first();
    if (!row) {
      return Response.json({ error: "Missing or invalid auction parameter" }, { status: 400 });
    }
  }

  (context.data as any).auctionId = auctionId;
  return context.next();
}

export const onRequest: PagesFunction<Env>[] = [authMiddleware, auctionMiddleware];
