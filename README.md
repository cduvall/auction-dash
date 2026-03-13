# AuctionDash

A monitoring dashboard for HiBid auctions. Tracks lots, bids, bidders, and pricing trends across multiple auctions with per-auction data isolation.

## Features

- **Lot tracking** -- estimates, high bids, bid counts, discounts, close times
- **Bid history snapshots** -- trend charts for dollar values, discount percentages, and lot counts over time
- **Bidder analytics** -- unique bidder count, 24h active bidders via smart incremental bid history refresh
- **Favorites & hidden lots** -- star items to track, hide items to declutter, with server-side persistence
- **Multi-auction support** -- switch between auctions via dropdown, each with isolated data
- **Sortable tables** -- lowest priced, over estimate, underpriced, all lots, favorites, untouched
- **SPA navigation** -- hash-based routing with keyboard support (Escape to dashboard)

## Setup

```
npm install
cp auctions.example.json auctions.json
```

Edit `auctions.json` with your HiBid auction IDs:

```json
[
  { "id": 720405, "title": "Woodworking Auction" },
  { "id": 123456, "title": "Another Auction" }
]
```

Find the auction ID in the HiBid URL for the auction page.

## Running

```
npm run dev
```

This starts:
- **API server** on port 3457 (proxied by Vite)
- **Vite dev server** on port 3456

Open http://localhost:3456.

Data is not fetched automatically on page load. Click **Refresh** to pull lot data from HiBid. Bidder data is refreshed incrementally -- only lots with changed high bids are re-queried.

## Data Storage

Per-auction data is stored under `data/<auction-id>/`:

| File | Contents |
|------|----------|
| `hidden.json` | Hidden lot numbers |
| `favorites.json` | Favorited lot numbers |
| `history.json` | Snapshot time series for trend charts |
| `bidders.json` | Bidder cache with activity log |

All data files are gitignored.
