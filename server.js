const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3457;
const DATA_DIR = path.join(__dirname, "data");
const GRAPHQL_URL = "https://hibid.com/graphql";
const PAGE_SIZE = 100;

// Load auction config (mutable)
const AUCTIONS_FILE = path.join(__dirname, "auctions.json");
let AUCTIONS = JSON.parse(fs.readFileSync(AUCTIONS_FILE, "utf8"));
let AUCTION_MAP = new Map(AUCTIONS.map(a => [a.id, a]));

function saveAuctions() {
  fs.writeFileSync(AUCTIONS_FILE, JSON.stringify(AUCTIONS, null, 2));
  AUCTION_MAP = new Map(AUCTIONS.map(a => [a.id, a]));
}

function parseAuctionIdFromInput(input) {
  const s = String(input).trim();
  // Pure number
  if (/^\d+$/.test(s)) return parseInt(s);
  // URL like hibid.com/auctions/TITLE/720405 or hibid.com/auction/720405/...
  const m = s.match(/hibid\.com\/(?:auctions?\/[^/]+\/|auction\/)(\d+)/i)
    || s.match(/hibid\.com\/.*?(\d{5,})/i);
  if (m) return parseInt(m[1]);
  return null;
}

const AUCTION_METADATA_QUERY = `query AuctionMetadata($id: Int!) {
  auction(id: $id) {
    id eventName bidType description
    bidOpenDateTime bidCloseDateTime
    previewDateInfo checkoutDateInfo
    buyerPremiumRate auctionNotice
    auctionState { auctionStatus }
    auctioneer { name city state address }
    eventCity eventState eventZip
  }
}`;

async function fetchAuctionMetadata(auctionId) {
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operationName: "AuctionMetadata",
        variables: { id: auctionId },
        query: AUCTION_METADATA_QUERY,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.errors || !json.data?.auction) return null;
    const a = json.data.auction;

    const location = [a.eventCity, a.eventState, a.eventZip].filter(Boolean).length > 0
      ? `${a.eventCity || ""}${a.eventCity && a.eventState ? ", " : ""}${a.eventState || ""} ${a.eventZip || ""}`.trim()
      : null;

    return {
      bidOpenDateTime: a.bidOpenDateTime || null,
      bidCloseDateTime: a.bidCloseDateTime || null,
      previewDateInfo: a.previewDateInfo || null,
      checkoutDateInfo: a.checkoutDateInfo || null,
      status: a.auctionState?.auctionStatus || null,
      bidType: a.bidType || null,
      buyerPremiumRate: a.buyerPremiumRate ?? null,
      description: a.description || null,
      location,
      auctioneerName: a.auctioneer?.name || null,
    };
  } catch {
    return null;
  }
}

async function lookupAuctionTitle(auctionId) {
  // Fetch a single lot page to get auction context
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "LotSearchLotOnly",
      variables: { auctionId, pageNumber: 1, pageLength: 1, sortOrder: "LOT_NUMBER" },
      query: QUERY,
    }),
  });
  if (!res.ok) throw new Error(`HiBid returned ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || "GraphQL error");
  const count = json.data?.lotSearch?.pagedResults?.totalCount ?? 0;
  if (count === 0) throw new Error("No lots found for this auction ID");

  const metadata = await fetchAuctionMetadata(auctionId);

  // Try scraping auction page title
  try {
    const pageRes = await fetch(`https://hibid.com/auction/${auctionId}/x`);
    if (pageRes.ok) {
      const html = await pageRes.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        let title = titleMatch[1]
          .replace(/\s*\|.*$/i, "")
          .replace(/\s*-\s*HiBid.*$/i, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
          .replace(/&quot;/g, '"')
          .trim();
        if (title && title.length > 2 && !title.toLowerCase().includes("not found")) {
          return { title, lotCount: count, metadata };
        }
      }
    }
  } catch {}
  return { title: `Auction ${auctionId}`, lotCount: count, metadata };
}

// Per-auction state cache: { hiddenSet, favoritesSet, cachedLots }
const auctionState = new Map();

function getDataDir(auctionId) {
  return path.join(DATA_DIR, String(auctionId));
}

function loadSet(filePath) {
  try {
    return new Set(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return new Set();
  }
}

function saveSet(filePath, set) {
  fs.writeFileSync(filePath, JSON.stringify([...set], null, 2));
}

function loadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getState(auctionId) {
  if (!auctionState.has(auctionId)) {
    const dir = getDataDir(auctionId);
    fs.mkdirSync(dir, { recursive: true });
    auctionState.set(auctionId, {
      hiddenSet: loadSet(path.join(dir, "hidden.json")),
      favoritesSet: loadSet(path.join(dir, "favorites.json")),
      cachedLots: null,
    });
  }
  return auctionState.get(auctionId);
}

function loadHistory(auctionId) {
  return loadJson(path.join(getDataDir(auctionId), "history.json"), []);
}

function saveHistory(auctionId, history) {
  saveJson(path.join(getDataDir(auctionId), "history.json"), history);
}

// Migrate old flat files into data/720405/ if they exist
function migrateOldFiles() {
  const dir = getDataDir(720405);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ["hidden.json", "favorites.json", "history.json"]) {
    const old = path.join(__dirname, name);
    const dest = path.join(dir, name);
    if (fs.existsSync(old) && !fs.existsSync(dest)) {
      fs.copyFileSync(old, dest);
      console.log(`Migrated ${name} -> data/720405/${name}`);
    }
  }
}

function computeSnapshot(timestamp, stats, lots) {
  let maxDiscount = 0;
  let maxBidToValueRatio = 0;
  let maxDiscountLot = null;
  let maxRatioLot = null;

  for (const l of lots) {
    if (l.median != null && l.median > 0) {
      const disc = ((l.median - l.highBid) / l.median) * 100;
      if (disc > maxDiscount) {
        maxDiscount = disc;
        maxDiscountLot = { lotNumber: l.lotNumber, name: l.name };
      }
      if (l.highBid > 0) {
        const ratio = l.highBid / l.median;
        if (ratio > maxBidToValueRatio) {
          maxBidToValueRatio = ratio;
          maxRatioLot = { lotNumber: l.lotNumber, name: l.name };
        }
      }
    }
  }

  return {
    timestamp,
    totalHighBids: stats.totalHighBids,
    totalMedianValue: stats.totalMedianValue,
    gap: stats.gap,
    avgDiscount: stats.avgDiscount,
    withBids: stats.withBids,
    withoutBids: stats.withoutBids,
    maxDiscount,
    maxBidToValueRatio,
    maxDiscountLot,
    maxRatioLot,
  };
}

const SNAPSHOT_KEYS = ["totalHighBids", "totalMedianValue", "gap", "avgDiscount", "withBids", "withoutBids", "maxDiscount", "maxBidToValueRatio"];

function snapshotChanged(a, b) {
  return SNAPSHOT_KEYS.some(k => a[k] !== b[k]);
}

function appendSnapshot(auctionId, snapshot) {
  const history = loadHistory(auctionId);
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (!snapshotChanged(last, snapshot)) return;
  }
  history.push(snapshot);
  saveHistory(auctionId, history);
}

function parseEstimate(estimate) {
  if (!estimate) return { low: null, high: null };
  const match = estimate.match(
    /([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)/
  );
  if (!match) return { low: null, high: null };
  return {
    low: parseFloat(match[1].replace(/,/g, "")),
    high: parseFloat(match[2].replace(/,/g, "")),
  };
}

// Seed history from backup file if history is empty (auction 720405 only)
function seedHistory() {
  const history = loadHistory(720405);
  if (history.length > 0) return;

  const backupPath = path.join(__dirname, "2026.03.12.lots.json");
  if (!fs.existsSync(backupPath)) return;

  const raw = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  let totalMedian = 0;
  let totalBids = 0;
  let withBidsCount = 0;
  let discountSum = 0;

  const lots = raw.map((item) => {
    const est = parseEstimate(item.estimatedPriceRange);
    const median =
      est.low != null && est.high != null ? (est.low + est.high) / 2 : null;
    const highBid = parseFloat((item.currentHighBid || "0").replace(/[$,]/g, "")) || 0;
    const discount =
      median != null && median > 0 ? ((median - highBid) / median) * 100 : 0;

    if (median != null) totalMedian += median;
    totalBids += highBid;
    if (highBid > 0) {
      withBidsCount++;
      discountSum += discount;
    }

    const nameParts = (item.name || "").split("|");
    const lotNumber = (nameParts[0] || "").replace(/^Lot\s*/i, "").trim();
    const name = (nameParts[1] || item.name || "").trim();

    return { lotNumber, name, median, highBid, discount };
  });

  const avgDiscount = withBidsCount > 0 ? discountSum / withBidsCount : 0;
  const stats = {
    totalLots: lots.length,
    totalMedianValue: totalMedian,
    totalHighBids: totalBids,
    gap: totalMedian - totalBids,
    avgDiscount,
    withBids: withBidsCount,
    withoutBids: lots.length - withBidsCount,
  };

  const snapshot = computeSnapshot("2026-03-13T02:00:00.000Z", stats, lots);
  saveHistory(720405, [snapshot]);
  console.log("Seeded history from backup file");
}

const QUERY = `query LotSearchLotOnly($auctionId: Int = null, $pageNumber: Int!, $pageLength: Int!, $sortOrder: EventItemSortOrder = null) {
  lotSearch(
    input: {auctionId: $auctionId, sortOrder: $sortOrder, status: ALL, filter: ALL, countAsView: false, hideGoogle: false}
    pageNumber: $pageNumber
    pageLength: $pageLength
    sortDirection: DESC
  ) {
    pagedResults {
      pageLength
      pageNumber
      totalCount
      filteredCount
      results {
        id
        itemId
        lead
        lotNumber
        estimate
        bidAmount
        description
        lotState {
          highBid
          bidCount
          isClosed
          status
          timeLeftTitle
          timeLeftSeconds
        }
      }
    }
  }
}`;

async function fetchPage(auctionId, pageNumber) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "LotSearchLotOnly",
      variables: {
        auctionId,
        pageNumber,
        pageLength: PAGE_SIZE,
        sortOrder: "LOT_NUMBER",
      },
      query: QUERY,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.lotSearch.pagedResults;
}

function parseCloseTime(lotState) {
  // Use timeLeftSeconds — most accurate since HiBid mislabels EDT as EST
  const secs = lotState?.timeLeftSeconds;
  if (secs != null && secs > 0) {
    return new Date(Date.now() + secs * 1000).toISOString();
  }
  return null;
}

async function fetchAllLots(auctionId) {
  const state = getState(auctionId);
  let allResults = [];
  let page = 1;
  while (true) {
    const data = await fetchPage(auctionId, page);
    allResults.push(...data.results);
    if (allResults.length >= data.totalCount || data.results.length < PAGE_SIZE)
      break;
    page++;
  }

  let totalMedian = 0;
  let totalBids = 0;
  let totalBidCount = 0;
  let withBidsCount = 0;
  let discountSum = 0;

  const lots = allResults.map((lot) => {
    const est = parseEstimate(lot.estimate);
    const median =
      est.low != null && est.high != null ? (est.low + est.high) / 2 : null;
    const highBid = lot.lotState?.highBid ?? lot.bidAmount ?? 0;
    const bidCount = lot.lotState?.bidCount ?? 0;
    const discount =
      median != null && median > 0 ? ((median - highBid) / median) * 100 : 0;

    if (median != null) totalMedian += median;
    totalBids += highBid;
    totalBidCount += bidCount;
    if (highBid > 0) {
      withBidsCount++;
      discountSum += discount;
    }

    const slug = (lot.lead || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return {
      id: lot.id,
      lotNumber: lot.lotNumber,
      name: lot.lead,
      estimateLow: est.low,
      estimateHigh: est.high,
      median,
      highBid,
      bidCount,
      discount,
      closeTime: parseCloseTime(lot.lotState),
      hidden: state.hiddenSet.has(lot.lotNumber),
      favorited: state.favoritesSet.has(lot.lotNumber),
      url: `https://hibid.com/lot/${lot.id}/${slug}`,
    };
  });

  // Recover final prices for closed lots from bidder cache
  const bidderCache = loadBidderCache(auctionId);
  for (const lot of lots) {
    const cached = bidderCache.lots[lot.id];
    if (!cached) continue;
    if (lot.highBid === 0 && cached.maxBid > 0) {
      lot.highBid = cached.maxBid;
      lot.discount = lot.median != null && lot.median > 0
        ? ((lot.median - lot.highBid) / lot.median) * 100
        : 0;
      // Recount into stats
      totalBids += lot.highBid;
      withBidsCount++;
      discountSum += lot.discount;
    }
    if (lot.bidCount === 0 && cached.bidCount > 0) {
      lot.bidCount = cached.bidCount;
      totalBidCount += cached.bidCount;
    }
  }

  const avgDiscount = withBidsCount > 0 ? discountSum / withBidsCount : 0;

  return {
    fetchedAt: new Date().toISOString(),
    stats: {
      totalLots: lots.length,
      totalBids: totalBidCount,
      totalMedianValue: totalMedian,
      totalHighBids: totalBids,
      gap: totalMedian - totalBids,
      avgDiscount,
      withBids: withBidsCount,
      withoutBids: lots.length - withBidsCount,
    },
    lots,
  };
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => resolve(body));
  });
}

// Bidder tracking
// bidders.json shape: { lots: { [lotId]: { highBid, usernames: [string] } }, activity: [ { username, timestamp } ], maxActiveBidders: number }

function loadBidderCache(auctionId) {
  const raw = loadJson(path.join(getDataDir(auctionId), "bidders.json"), {});
  // Migrate old format (flat lot map) to new format with activity log
  if (!raw.lots) return { lots: raw, activity: [], maxActiveBidders: 0 };
  if (raw.maxActiveBidders == null) raw.maxActiveBidders = 0;
  return raw;
}

function saveBidderCache(auctionId, cache) {
  saveJson(path.join(getDataDir(auctionId), "bidders.json"), cache);
}

function computeBidderStats(cache) {
  const allUsernames = new Set();
  for (const entry of Object.values(cache.lots)) {
    for (const u of entry.usernames) allUsernames.add(u);
  }

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recentUsernames = new Set();
  for (const a of cache.activity) {
    if (new Date(a.timestamp).getTime() >= cutoff) {
      recentUsernames.add(a.username);
    }
  }

  // Derive peak from all activity if not yet tracked
  const allActiveUsernames = new Set(cache.activity.map(a => a.username));
  const peak = Math.max(cache.maxActiveBidders || 0, allActiveUsernames.size);

  return {
    uniqueBidders: allUsernames.size,
    activeLast24h: recentUsernames.size,
    maxActiveBidders: peak,
  };
}

async function fetchBidHistory(lotId) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query { bidHistory(input: "${lotId}") { bids { count bid username } } }`,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.bidHistory.bids || [];
}

async function refreshBidders(auctionId, lots) {
  const cache = loadBidderCache(auctionId);
  const toFetch = [];

  for (const lot of lots) {
    const cached = cache.lots[lot.id];
    if (!cached || cached.highBid !== lot.highBid || cached.maxBid === undefined || !cached.v) {
      toFetch.push(lot);
    }
  }

  console.log(`Bidders: ${toFetch.length} lots changed out of ${lots.length}, fetching...`);

  const now = new Date().toISOString();

  // Fetch in batches of 10 for some parallelism
  const BATCH = 10;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (lot) => {
      try {
        const bids = await fetchBidHistory(lot.id);
        const usernames = [...new Set(bids.map(b => b.username).filter(Boolean))];
        const maxBid = bids.length > 0 ? Math.max(...bids.map(b => b.bid)) : 0;
        const bidCount = bids.reduce((sum, b) => sum + (b.count || 0), 0);
        return { id: lot.id, highBid: lot.highBid, usernames, maxBid, bidCount };
      } catch (err) {
        console.error(`Failed to fetch bids for lot ${lot.id}: ${err.message}`);
        return null;
      }
    }));
    for (const r of results) {
      if (!r) continue;
      const prev = cache.lots[r.id];
      const prevSet = new Set(prev ? prev.usernames : []);
      // Record newly observed usernames in the activity log
      for (const u of r.usernames) {
        if (!prevSet.has(u)) {
          cache.activity.push({ username: u, timestamp: now });
        }
      }
      cache.lots[r.id] = { highBid: r.highBid, usernames: r.usernames, maxBid: r.maxBid, bidCount: r.bidCount, v: 1 };
    }
  }

  // Prune activity entries older than 48h to keep file from growing forever
  const pruneAfter = Date.now() - 48 * 60 * 60 * 1000;
  cache.activity = cache.activity.filter(a => new Date(a.timestamp).getTime() >= pruneAfter);

  // Track peak active bidders
  const stats = computeBidderStats(cache);
  if (stats.activeLast24h > (cache.maxActiveBidders || 0)) {
    cache.maxActiveBidders = stats.activeLast24h;
  }

  saveBidderCache(auctionId, cache);
  return { ...stats, lotsRefreshed: toFetch.length, totalLots: lots.length };
}

migrateOldFiles();
seedHistory();

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  // Auction list
  if (pathname === "/api/auctions" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(AUCTIONS));
    return;
  }

  // Lookup auction title from HiBid
  if (pathname === "/api/auctions/lookup" && req.method === "GET") {
    try {
      const input = parsed.searchParams.get("q") || "";
      const id = parseAuctionIdFromInput(input);
      if (!id) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Could not parse auction ID from input" }));
        return;
      }
      const info = await lookupAuctionTitle(id);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id, ...info }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Add auction
  if (pathname === "/api/auctions" && req.method === "POST") {
    try {
      const { id, title, metadata } = JSON.parse(await readBody(req));
      if (!id || !title) throw new Error("id and title required");
      if (AUCTION_MAP.has(id)) throw new Error("Auction already exists");
      AUCTIONS.push({ id, title, metadata: metadata || null });
      saveAuctions();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, auctions: AUCTIONS }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Refresh metadata for a single auction
  if (pathname === "/api/auctions/refresh-metadata" && req.method === "POST") {
    try {
      const { id } = JSON.parse(await readBody(req));
      if (!id) throw new Error("id required");
      const auction = AUCTIONS.find(a => a.id === id);
      if (!auction) throw new Error("Auction not found");
      const metadata = await fetchAuctionMetadata(id);
      auction.metadata = metadata;
      saveAuctions();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, auctions: AUCTIONS }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Update auction title
  if (pathname === "/api/auctions" && req.method === "PUT") {
    try {
      const { id, title } = JSON.parse(await readBody(req));
      if (!id || !title) throw new Error("id and title required");
      const auction = AUCTIONS.find(a => a.id === id);
      if (!auction) throw new Error("Auction not found");
      auction.title = title;
      saveAuctions();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, auctions: AUCTIONS }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Remove auction
  if (pathname === "/api/auctions" && req.method === "DELETE") {
    try {
      const { id } = JSON.parse(await readBody(req));
      if (!id) throw new Error("id required");
      const idx = AUCTIONS.findIndex(a => a.id === id);
      if (idx === -1) throw new Error("Auction not found");
      AUCTIONS.splice(idx, 1);
      saveAuctions();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, auctions: AUCTIONS }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Auth endpoints for local dev — always return a fake user
  if (pathname === "/api/auth/me") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      user: { id: 1, email: "dev@localhost", username: "dev", displayName: "Dev User", avatarUrl: null, migratedAnonymous: false },
      hasAnonymousData: false,
    }));
    return;
  }

  if (pathname === "/api/auth/login") {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  if (pathname === "/api/auth/logout") {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  // All other /api routes require ?auction=ID
  const auctionId = parseInt(parsed.searchParams.get("auction"));
  if (!auctionId || !AUCTION_MAP.has(auctionId)) {
    if (pathname.startsWith("/api/")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing or invalid auction parameter" }));
      return;
    }
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const state = getState(auctionId);
  const dir = getDataDir(auctionId);

  if (pathname === "/api/hide" && req.method === "POST") {
    try {
      const { lotNumber } = JSON.parse(await readBody(req));
      state.hiddenSet.add(lotNumber);
      saveSet(path.join(dir, "hidden.json"), state.hiddenSet);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === "/api/hide" && req.method === "DELETE") {
    try {
      const { lotNumber } = JSON.parse(await readBody(req));
      state.hiddenSet.delete(lotNumber);
      saveSet(path.join(dir, "hidden.json"), state.hiddenSet);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === "/api/favorite" && req.method === "POST") {
    try {
      const { lotNumber } = JSON.parse(await readBody(req));
      state.favoritesSet.add(lotNumber);
      saveSet(path.join(dir, "favorites.json"), state.favoritesSet);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === "/api/favorite" && req.method === "DELETE") {
    try {
      const { lotNumber } = JSON.parse(await readBody(req));
      state.favoritesSet.delete(lotNumber);
      saveSet(path.join(dir, "favorites.json"), state.favoritesSet);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === "/api/bidders") {
    if (!state.cachedLots) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No lot data cached. Refresh lots first." }));
      return;
    }
    try {
      const stats = await refreshBidders(auctionId, state.cachedLots.lots);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(stats));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (pathname === "/api/bidders/cached") {
    const cache = loadBidderCache(auctionId);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(computeBidderStats(cache)));
    return;
  }

  if (pathname === "/api/history") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(loadHistory(auctionId)));
    return;
  }

  if (pathname === "/api/lots/cached") {
    if (state.cachedLots) {
      const updated = {
        ...state.cachedLots,
        lots: state.cachedLots.lots.map(l => ({
          ...l,
          hidden: state.hiddenSet.has(l.lotNumber),
          favorited: state.favoritesSet.has(l.lotNumber),
        })),
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(updated));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "no cached data" }));
    }
    return;
  }

  if (pathname === "/api/lots") {
    try {
      const data = await fetchAllLots(auctionId);
      state.cachedLots = data;
      const snapshot = computeSnapshot(data.fetchedAt, data.stats, data.lots);
      appendSnapshot(auctionId, snapshot);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
});
