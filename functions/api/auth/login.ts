import { getAccessJWTFromRequest, verifyAccessJWT } from "../../_shared/cf-access";

// This path is protected by Cloudflare Access, so the JWT is guaranteed present.
// Read it, upsert the user, seed auctions if needed, then redirect home.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const token = getAccessJWTFromRequest(context.request);
  if (!token) {
    return new Response("No Access token", { status: 401 });
  }

  const payload = await verifyAccessJWT(
    token,
    context.env.CF_ACCESS_TEAM_DOMAIN,
    context.env.CF_ACCESS_AUD
  );
  if (!payload?.email) {
    return new Response("Invalid Access token", { status: 401 });
  }

  const db = context.env.DB;
  const email = payload.email;
  const username = email.split("@")[0];

  // Upsert user
  await db
    .prepare(
      `INSERT INTO users (email, username) VALUES (?, ?)
       ON CONFLICT(email) DO UPDATE SET username = excluded.username`
    )
    .bind(email, username)
    .run();

  const userRow = await db
    .prepare("SELECT id, migrated_anonymous FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: number; migrated_anonymous: number }>();

  // Seed user_auctions from global auctions table if user has none
  const hasAuctions = await db
    .prepare("SELECT 1 FROM user_auctions WHERE user_id = ? LIMIT 1")
    .bind(userRow!.id)
    .first();
  const isFirstLogin = !hasAuctions;
  if (isFirstLogin) {
    const { results: globalAuctions } = await db
      .prepare("SELECT id, title FROM auctions")
      .all<{ id: number; title: string }>();
    if (globalAuctions.length > 0) {
      await db.batch(
        globalAuctions.map((a) =>
          db.prepare("INSERT OR IGNORE INTO user_auctions (user_id, auction_id, title) VALUES (?, ?, ?)")
            .bind(userRow!.id, a.id, a.title)
        )
      );
    }
  }

  // Check if anonymous data exists for migration prompt
  const hasAnon = await db
    .prepare("SELECT 1 FROM hidden WHERE user_id IS NULL UNION SELECT 1 FROM favorites WHERE user_id IS NULL LIMIT 1")
    .first();
  const shouldMigrate = hasAnon && userRow!.migrated_anonymous === 0;

  const params = new URLSearchParams();
  if (shouldMigrate) params.set("migrate", "1");
  if (isFirstLogin) params.set("setup", "1");
  const query = params.toString();

  return new Response(null, {
    status: 302,
    headers: { Location: query ? `/?${query}` : "/" },
  });
};
