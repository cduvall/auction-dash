# AuctionDash

HiBid auction tracker. React + Vite + TypeScript frontend, Cloudflare Pages Functions backend, D1 (SQLite) database.

## Deploy

```
npm run build && npx wrangler pages deploy dist --commit-dirty=true
```

No auto-deploy from git. Manual deploy via wrangler.

## Authentication

Uses **Cloudflare Access** with one-time PIN (email) authentication. No GitHub OAuth, no third-party auth service.

### How it works

1. User visits `/api/auth/login` which is behind a Cloudflare Access policy
2. CF Access handles the authentication flow (email + one-time PIN)
3. On success, CF Access sets `CF_Authorization` cookie containing a signed RS256 JWT
4. The login handler verifies the JWT, upserts a `users` row by email, creates `user_auctions` entries, then redirects to the app
5. Middleware (`functions/api/_middleware.ts`) verifies the JWT on every API request and attaches user to context

### Key files

- `functions/_shared/cf-access.ts` -- JWT verification using Web Crypto API (RS256), fetches public keys from CF Access certs endpoint
- `functions/api/_middleware.ts` -- Auth resolution middleware (verifies JWT, looks up user) + auction validation middleware
- `functions/api/auth/login.ts` -- Entry point; behind CF Access, upserts user, redirects with `?setup=1` / `?migrate=1`
- `functions/api/auth/logout.ts` -- Clears CF cookies, redirects to CF Access logout endpoint
- `functions/api/auth/me.ts` -- Returns current user or null
- `functions/api/auth/migrate.ts` -- One-time migration of anonymous data to authenticated user

### Environment variables (secrets)

- `CF_ACCESS_TEAM_DOMAIN` -- e.g. `https://auction-dash.cloudflareaccess.com`
- `CF_ACCESS_AUD` -- Application Audience (AUD) tag from CF Access
- Set via `npx wrangler pages secret put <NAME>`
- Local dev: `.dev.vars` file (gitignored)

### Per-user data isolation

- `user_auctions` table scopes which auctions each user sees
- `hidden` and `favorites` tables include `user_id` column (NULL = anonymous/legacy data)
- Unauthenticated users see a sign-in landing page with no data
- First login prompts auction setup and optional migration of anonymous data

### Database migrations

In `migrations/` directory. Run against remote D1 with:
```
npx wrangler d1 execute auction-dash-db --remote --file=migrations/<file>.sql
```
