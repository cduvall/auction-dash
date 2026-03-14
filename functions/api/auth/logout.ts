import { getTokenFromRequest, destroySession, clearSessionCookie } from "../../_shared/auth";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const token = getTokenFromRequest(context.request);
  if (token) {
    await destroySession(context.env.DB, token);
  }
  return new Response(null, {
    status: 200,
    headers: { "Set-Cookie": clearSessionCookie() },
  });
};
