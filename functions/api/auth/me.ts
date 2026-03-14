export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = (context.data as any).user;
  if (!user) {
    return Response.json({ user: null });
  }

  let hasAnonymousData = false;
  if (!user.migratedAnonymous) {
    const row = await context.env.DB.prepare(
      "SELECT 1 FROM hidden WHERE user_id IS NULL UNION SELECT 1 FROM favorites WHERE user_id IS NULL LIMIT 1"
    ).first();
    hasAnonymousData = !!row;
  }

  return Response.json({ user, hasAnonymousData });
};
