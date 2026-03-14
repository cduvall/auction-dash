import type { Snapshot } from "./snapshot";
import { snapshotChanged } from "./snapshot";

export async function getHiddenSet(db: D1Database, auctionId: number): Promise<Set<string>> {
  const { results } = await db.prepare("SELECT lot_number FROM hidden WHERE auction_id = ?").bind(auctionId).all();
  return new Set(results.map((r: any) => r.lot_number));
}

export async function getFavoritesSet(db: D1Database, auctionId: number): Promise<Set<string>> {
  const { results } = await db.prepare("SELECT lot_number FROM favorites WHERE auction_id = ?").bind(auctionId).all();
  return new Set(results.map((r: any) => r.lot_number));
}

export async function loadCachedLots(db: D1Database, auctionId: number): Promise<any | null> {
  const row = await db.prepare("SELECT fetched_at, data FROM cached_lots WHERE auction_id = ?").bind(auctionId).first() as any;
  if (!row) return null;
  return JSON.parse(row.data);
}

export async function saveCachedLots(db: D1Database, auctionId: number, data: any): Promise<void> {
  await db.prepare(
    "INSERT OR REPLACE INTO cached_lots (auction_id, fetched_at, data) VALUES (?, ?, ?)"
  ).bind(auctionId, data.fetchedAt, JSON.stringify(data)).run();
}

export async function appendSnapshot(db: D1Database, auctionId: number, snapshot: Snapshot): Promise<void> {
  // Check if last snapshot is different
  const last = await db.prepare(
    "SELECT data FROM history WHERE auction_id = ? ORDER BY id DESC LIMIT 1"
  ).bind(auctionId).first() as any;

  if (last) {
    const prev = JSON.parse(last.data) as Snapshot;
    if (!snapshotChanged(prev, snapshot)) return;
  }

  await db.prepare(
    "INSERT INTO history (auction_id, timestamp, data) VALUES (?, ?, ?)"
  ).bind(auctionId, snapshot.timestamp, JSON.stringify(snapshot)).run();
}

export async function loadHistory(db: D1Database, auctionId: number): Promise<Snapshot[]> {
  const { results } = await db.prepare(
    "SELECT data FROM history WHERE auction_id = ? ORDER BY id ASC"
  ).bind(auctionId).all();
  return results.map((r: any) => JSON.parse(r.data));
}

interface BidderLotRow {
  lot_id: number;
  high_bid: number;
  max_bid: number;
  bid_count: number;
  usernames: string;
  v: number;
}

export async function loadBidderCache(db: D1Database, auctionId: number) {
  const { results: lotRows } = await db.prepare(
    "SELECT lot_id, high_bid, max_bid, bid_count, usernames, v FROM bidder_lots WHERE auction_id = ?"
  ).bind(auctionId).all() as { results: BidderLotRow[] };

  const lots: Record<number, { highBid: number; maxBid: number; bidCount: number; usernames: string[]; v: number }> = {};
  for (const row of lotRows) {
    lots[row.lot_id] = {
      highBid: row.high_bid,
      maxBid: row.max_bid,
      bidCount: row.bid_count,
      usernames: JSON.parse(row.usernames),
      v: row.v,
    };
  }

  const { results: activityRows } = await db.prepare(
    "SELECT username, timestamp FROM bidder_activity WHERE auction_id = ? ORDER BY id ASC"
  ).bind(auctionId).all() as { results: { username: string; timestamp: string }[] };

  const meta = await db.prepare(
    "SELECT max_active_bidders FROM bidder_meta WHERE auction_id = ?"
  ).bind(auctionId).first() as { max_active_bidders: number } | null;

  return {
    lots,
    activity: activityRows,
    maxActiveBidders: meta?.max_active_bidders ?? 0,
  };
}

export async function saveBidderLot(
  db: D1Database,
  auctionId: number,
  lotId: number,
  data: { highBid: number; maxBid: number; bidCount: number; usernames: string[]; v: number }
): Promise<void> {
  await db.prepare(
    "INSERT OR REPLACE INTO bidder_lots (auction_id, lot_id, high_bid, max_bid, bid_count, usernames, v) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(auctionId, lotId, data.highBid, data.maxBid, data.bidCount, JSON.stringify(data.usernames), data.v).run();
}

export async function addBidderActivity(db: D1Database, auctionId: number, username: string, timestamp: string): Promise<void> {
  await db.prepare(
    "INSERT INTO bidder_activity (auction_id, username, timestamp) VALUES (?, ?, ?)"
  ).bind(auctionId, username, timestamp).run();
}

export async function pruneBidderActivity(db: D1Database, auctionId: number): Promise<void> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  await db.prepare("DELETE FROM bidder_activity WHERE auction_id = ? AND timestamp < ?").bind(auctionId, cutoff).run();
}

export async function updateBidderMeta(db: D1Database, auctionId: number, maxActiveBidders: number): Promise<void> {
  await db.prepare(
    "INSERT OR REPLACE INTO bidder_meta (auction_id, max_active_bidders) VALUES (?, ?)"
  ).bind(auctionId, maxActiveBidders).run();
}

export function computeBidderStats(cache: { lots: Record<number, { usernames: string[] }>; activity: { username: string; timestamp: string }[]; maxActiveBidders: number }) {
  const allUsernames = new Set<string>();
  for (const entry of Object.values(cache.lots)) {
    for (const u of entry.usernames) allUsernames.add(u);
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentUsernames = new Set<string>();
  for (const a of cache.activity) {
    if (new Date(a.timestamp).getTime() >= cutoff) {
      recentUsernames.add(a.username);
    }
  }

  const allActiveUsernames = new Set(cache.activity.map(a => a.username));
  const peak = Math.max(cache.maxActiveBidders || 0, allActiveUsernames.size);

  return {
    uniqueBidders: allUsernames.size,
    activeLast24h: recentUsernames.size,
    maxActiveBidders: peak,
  };
}
