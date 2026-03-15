# AuctionDash

Real-time HiBid auction tracker. Monitor bids, spot underpriced lots, track price history, and organize favorites across multiple auctions.

Live at **https://auction-dash.pages.dev**

## Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, TanStack Query, Vite
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Cloudflare Access (one-time PIN / Google)
- **CI/CD**: GitHub Actions deploys to Cloudflare Pages on push to main

## Features

- Lot tracking with estimates, high bids, bid counts, discounts, close times
- Dashboard widgets: lowest priced, highest priced, underpriced, over estimate
- Bid history snapshots with trend charts
- Bidder analytics with incremental refresh
- Per-user favorites and hidden lots
- Multi-auction support with per-user auction configuration
- Sortable/filterable All Lots view with debounced search
- Auto-refresh on configurable intervals

## Development

```
npm install
npx wrangler pages dev dist --d1 DB=auction-dash-db
```

Create a `.dev.vars` file with:

```
CF_ACCESS_TEAM_DOMAIN=https://auction-dash.cloudflareaccess.com
CF_ACCESS_AUD=<your-aud-tag>
```

## Deploy

Automatic on push to main via GitHub Actions.

Manual deploy:

```
npm run build
npx wrangler pages deploy dist --project-name=auction-dash
```

## Database Migrations

Migrations live in `migrations/`. Run against remote D1:

```
npx wrangler d1 execute auction-dash-db --remote --file=migrations/<file>.sql
```
