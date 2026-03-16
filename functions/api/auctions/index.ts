export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;

  if (user) {
    const { results } = await context.env.DB.prepare(
      "SELECT auction_id as id, title, metadata FROM user_auctions WHERE user_id = ? ORDER BY auction_id"
    ).bind(user.id).all();
    return Response.json(results.map((r: any) => ({
      id: r.id,
      title: r.title,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    })));
  }

  // Anonymous: no auctions
  return Response.json([]);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title, metadata } = await context.request.json() as { id: number; title: string; metadata?: any };
  if (!id || !title) return Response.json({ error: "id and title required" }, { status: 400 });

  const db = context.env.DB;
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  // Check if user already has this auction
  const existing = await db.prepare(
    "SELECT auction_id FROM user_auctions WHERE user_id = ? AND auction_id = ?"
  ).bind(user.id, id).first();
  if (existing) return Response.json({ error: "Auction already exists" }, { status: 400 });

  // Add to user_auctions and upsert into global catalog
  await db.batch([
    db.prepare("INSERT INTO user_auctions (user_id, auction_id, title, metadata) VALUES (?, ?, ?, ?)").bind(user.id, id, title, metadataJson),
    db.prepare("INSERT OR IGNORE INTO auctions (id, title, metadata) VALUES (?, ?, ?)").bind(id, title, metadataJson),
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

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, title } = await context.request.json() as { id: number; title: string };
  if (!id || !title) return Response.json({ error: "id and title required" }, { status: 400 });

  const result = await context.env.DB.prepare(
    "UPDATE user_auctions SET title = ? WHERE user_id = ? AND auction_id = ?"
  ).bind(title, user.id, id).run();
  if (!result.meta.changes) return Response.json({ error: "Auction not found" }, { status: 400 });

  const { results } = await context.env.DB.prepare(
    "SELECT auction_id as id, title, metadata FROM user_auctions WHERE user_id = ? ORDER BY auction_id"
  ).bind(user.id).all();
  return Response.json({ ok: true, auctions: results.map((r: any) => ({
    id: r.id,
    title: r.title,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
  })) });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.request.json() as { id: number };
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const result = await context.env.DB.prepare(
    "DELETE FROM user_auctions WHERE user_id = ? AND auction_id = ?"
  ).bind(user.id, id).run();
  if (!result.meta.changes) return Response.json({ error: "Auction not found" }, { status: 400 });

  const { results } = await context.env.DB.prepare(
    "SELECT auction_id as id, title, metadata FROM user_auctions WHERE user_id = ? ORDER BY auction_id"
  ).bind(user.id).all();
  return Response.json({ ok: true, auctions: results.map((r: any) => ({
    id: r.id,
    title: r.title,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
  })) });
};
