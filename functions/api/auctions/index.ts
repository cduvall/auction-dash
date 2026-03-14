export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare("SELECT id, title FROM auctions ORDER BY id").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { id, title } = await context.request.json() as { id: number; title: string };
  if (!id || !title) return Response.json({ error: "id and title required" }, { status: 400 });

  const existing = await context.env.DB.prepare("SELECT id FROM auctions WHERE id = ?").bind(id).first();
  if (existing) return Response.json({ error: "Auction already exists" }, { status: 400 });

  await context.env.DB.prepare("INSERT INTO auctions (id, title) VALUES (?, ?)").bind(id, title).run();
  const { results } = await context.env.DB.prepare("SELECT id, title FROM auctions ORDER BY id").all();
  return Response.json({ ok: true, auctions: results });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { id, title } = await context.request.json() as { id: number; title: string };
  if (!id || !title) return Response.json({ error: "id and title required" }, { status: 400 });

  const result = await context.env.DB.prepare("UPDATE auctions SET title = ? WHERE id = ?").bind(title, id).run();
  if (!result.meta.changes) return Response.json({ error: "Auction not found" }, { status: 400 });

  const { results } = await context.env.DB.prepare("SELECT id, title FROM auctions ORDER BY id").all();
  return Response.json({ ok: true, auctions: results });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { id } = await context.request.json() as { id: number };
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const result = await context.env.DB.prepare("DELETE FROM auctions WHERE id = ?").bind(id).run();
  if (!result.meta.changes) return Response.json({ error: "Auction not found" }, { status: 400 });

  const { results } = await context.env.DB.prepare("SELECT id, title FROM auctions ORDER BY id").all();
  return Response.json({ ok: true, auctions: results });
};
