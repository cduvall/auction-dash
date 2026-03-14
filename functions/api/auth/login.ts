export const onRequestGet: PagesFunction<Env> = async (context) => {
  const state = crypto.randomUUID();
  const clientId = context.env.GITHUB_CLIENT_ID;
  const url = new URL(context.request.url);
  const callbackUrl = `${url.origin}/api/auth/callback`;

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", "read:user");

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Set-Cookie": `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    },
  });
};
