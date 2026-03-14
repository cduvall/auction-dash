import { createSession, setSessionCookie } from "../../_shared/auth";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // Verify state
  const cookie = context.request.headers.get("Cookie") || "";
  const stateMatch = cookie.match(/(?:^|;\s*)oauth_state=([^\s;]+)/);
  const savedState = stateMatch ? stateMatch[1] : null;

  if (!code || !state || state !== savedState) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: context.env.GITHUB_CLIENT_ID,
      client_secret: context.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json<{ access_token?: string; error?: string }>();
  if (!tokenData.access_token) {
    return new Response(`OAuth error: ${tokenData.error || "unknown"}`, { status: 400 });
  }

  // Fetch GitHub user
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "AuctionDash",
    },
  });
  const ghUser = await userRes.json<{ id: number; login: string; avatar_url: string }>();

  const db = context.env.DB;

  // Upsert user
  await db
    .prepare(
      `INSERT INTO users (github_id, username, avatar_url) VALUES (?, ?, ?)
       ON CONFLICT(github_id) DO UPDATE SET username = excluded.username, avatar_url = excluded.avatar_url`
    )
    .bind(ghUser.id, ghUser.login, ghUser.avatar_url)
    .run();

  const userRow = await db
    .prepare("SELECT id, migrated_anonymous FROM users WHERE github_id = ?")
    .bind(ghUser.id)
    .first<{ id: number; migrated_anonymous: number }>();

  // Seed user_auctions from global auctions table if user has none
  const hasAuctions = await db
    .prepare("SELECT 1 FROM user_auctions WHERE user_id = ? LIMIT 1")
    .bind(userRow!.id)
    .first();
  if (!hasAuctions) {
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

  const session = await createSession(db, userRow!.id);

  // Check if anonymous data exists for migration prompt
  const hasAnon = await db
    .prepare("SELECT 1 FROM hidden WHERE user_id IS NULL UNION SELECT 1 FROM favorites WHERE user_id IS NULL LIMIT 1")
    .first();
  const shouldMigrate = hasAnon && userRow!.migrated_anonymous === 0;

  const redirectUrl = shouldMigrate ? "/?migrate=1" : "/";

  return new Response(null, {
    status: 302,
    headers: new Headers([
      ["Location", redirectUrl],
      ["Set-Cookie", setSessionCookie(session)],
      ["Set-Cookie", "oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"],
    ]),
  });
};
