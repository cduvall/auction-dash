/**
 * One-time seed script to import existing filesystem data into D1.
 *
 * Usage:
 *   npx tsx migrations/seed.ts
 *
 * Requires wrangler to be configured with the D1 database.
 * This script generates SQL files that can be executed via wrangler:
 *   npx wrangler d1 execute auction-dash-db --file=migrations/seed_data.sql
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const AUCTIONS_FILE = path.join(ROOT, "auctions.json");
const OUTPUT_FILE = path.join(__dirname, "seed_data.sql");

function escapeSQL(s: string): string {
  return s.replace(/'/g, "''");
}

function main() {
  const lines: string[] = [];

  // Import auctions
  const auctions = JSON.parse(fs.readFileSync(AUCTIONS_FILE, "utf8"));
  for (const a of auctions) {
    lines.push(`INSERT OR IGNORE INTO auctions (id, title) VALUES (${a.id}, '${escapeSQL(a.title)}');`);
  }

  // Import per-auction data
  const auctionDirs = fs.readdirSync(DATA_DIR).filter(d => /^\d+$/.test(d));
  for (const dir of auctionDirs) {
    const auctionId = parseInt(dir);
    const auctionPath = path.join(DATA_DIR, dir);

    // Hidden
    const hiddenFile = path.join(auctionPath, "hidden.json");
    if (fs.existsSync(hiddenFile)) {
      const hidden = JSON.parse(fs.readFileSync(hiddenFile, "utf8"));
      for (const lotNumber of hidden) {
        lines.push(`INSERT OR IGNORE INTO hidden (auction_id, lot_number) VALUES (${auctionId}, '${escapeSQL(String(lotNumber))}');`);
      }
    }

    // Favorites
    const favFile = path.join(auctionPath, "favorites.json");
    if (fs.existsSync(favFile)) {
      const favs = JSON.parse(fs.readFileSync(favFile, "utf8"));
      for (const lotNumber of favs) {
        lines.push(`INSERT OR IGNORE INTO favorites (auction_id, lot_number) VALUES (${auctionId}, '${escapeSQL(String(lotNumber))}');`);
      }
    }

    // History
    const histFile = path.join(auctionPath, "history.json");
    if (fs.existsSync(histFile)) {
      const history = JSON.parse(fs.readFileSync(histFile, "utf8"));
      for (const snapshot of history) {
        const ts = snapshot.timestamp || new Date().toISOString();
        lines.push(`INSERT INTO history (auction_id, timestamp, data) VALUES (${auctionId}, '${escapeSQL(ts)}', '${escapeSQL(JSON.stringify(snapshot))}');`);
      }
    }

    // Bidders
    const biddersFile = path.join(auctionPath, "bidders.json");
    if (fs.existsSync(biddersFile)) {
      const raw = JSON.parse(fs.readFileSync(biddersFile, "utf8"));
      const lotsMap = raw.lots || raw;
      const activity = raw.activity || [];
      const maxActiveBidders = raw.maxActiveBidders || 0;

      for (const [lotId, data] of Object.entries(lotsMap) as [string, any][]) {
        const usernames = JSON.stringify(data.usernames || []);
        lines.push(`INSERT OR IGNORE INTO bidder_lots (auction_id, lot_id, high_bid, max_bid, bid_count, usernames, v) VALUES (${auctionId}, ${lotId}, ${data.highBid || 0}, ${data.maxBid || 0}, ${data.bidCount || 0}, '${escapeSQL(usernames)}', ${data.v || 0});`);
      }

      for (const a of activity) {
        lines.push(`INSERT INTO bidder_activity (auction_id, username, timestamp) VALUES (${auctionId}, '${escapeSQL(a.username)}', '${escapeSQL(a.timestamp)}');`);
      }

      if (maxActiveBidders > 0) {
        lines.push(`INSERT OR IGNORE INTO bidder_meta (auction_id, max_active_bidders) VALUES (${auctionId}, ${maxActiveBidders});`);
      }
    }
  }

  fs.writeFileSync(OUTPUT_FILE, lines.join("\n") + "\n");
  console.log(`Wrote ${lines.length} SQL statements to ${OUTPUT_FILE}`);
  console.log(`Run: npx wrangler d1 execute auction-dash-db --file=migrations/seed_data.sql`);
}

main();
