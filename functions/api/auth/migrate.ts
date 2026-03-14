export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(context.request.url);
  const skip = url.searchParams.get("skip") === "1";
  const db = context.env.DB;

  if (!skip) {
    // Claim anonymous hidden/favorites for this user
    await db.batch([
      db.prepare("UPDATE hidden SET user_id = ? WHERE user_id IS NULL").bind(user.id),
      db.prepare("UPDATE favorites SET user_id = ? WHERE user_id IS NULL").bind(user.id),
    ]);
  }

  // Mark migration as done
  await db.prepare("UPDATE users SET migrated_anonymous = 1 WHERE id = ?").bind(user.id).run();

  return Response.json({ ok: true });
};
