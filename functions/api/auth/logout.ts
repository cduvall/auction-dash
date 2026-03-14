// Clear local CF cookies, then redirect to CF Access logout to clear team-domain cookies
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const teamDomain = context.env.CF_ACCESS_TEAM_DOMAIN;
  const appUrl = new URL(context.request.url).origin;

  // Two-step: first clear app-domain cookies, then redirect to CF Access logout
  // CF Access logout will clear team-domain cookies and redirect back
  const logoutUrl = `${teamDomain}/cdn-cgi/access/logout?returnTo=${encodeURIComponent(appUrl)}`;

  return new Response(null, {
    status: 302,
    headers: new Headers([
      ["Location", logoutUrl],
      ["Set-Cookie", "CF_Authorization=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"],
      ["Set-Cookie", "CF_AppSession=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"],
    ]),
  });
};
