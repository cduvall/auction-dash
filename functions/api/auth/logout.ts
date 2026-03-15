// Clear local CF cookies and redirect to CF Access logout to clear team-domain cookies.
// After CF Access clears its cookies, the user lands back on the Access login gate
// (which is fine — they'll see the PIN prompt next time they visit a protected route).
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const teamDomain = context.env.CF_ACCESS_TEAM_DOMAIN;
  const logoutUrl = `${teamDomain}/cdn-cgi/access/logout`;

  return new Response(null, {
    status: 302,
    headers: new Headers([
      ["Location", logoutUrl],
      ["Set-Cookie", "CF_Authorization=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"],
      ["Set-Cookie", "CF_AppSession=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"],
    ]),
  });
};
