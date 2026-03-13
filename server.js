const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3457;
const HIDDEN_FILE = path.join(__dirname, "hidden.json");

function loadHidden() {
  try {
    return new Set(JSON.parse(fs.readFileSync(HIDDEN_FILE, "utf8")));
  } catch {
    return new Set();
  }
}

function saveHidden(set) {
  fs.writeFileSync(HIDDEN_FILE, JSON.stringify([...set], null, 2));
}

let hiddenSet = loadHidden();
const GRAPHQL_URL = "https://hibid.com/graphql";
const AUCTION_ID = 720405;
const PAGE_SIZE = 100;

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
        }
      }
    }
  }
}`;

async function fetchPage(pageNumber) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "LotSearchLotOnly",
      variables: {
        auctionId: AUCTION_ID,
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

async function fetchAllLots() {
  let allResults = [];
  let page = 1;
  while (true) {
    const data = await fetchPage(page);
    allResults.push(...data.results);
    if (allResults.length >= data.totalCount || data.results.length < PAGE_SIZE)
      break;
    page++;
  }

  let totalMedian = 0;
  let totalBids = 0;
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
    if (highBid > 0) {
      withBidsCount++;
      discountSum += discount;
    }

    const slug = (lot.lead || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    return {
      lotNumber: lot.lotNumber,
      name: lot.lead,
      estimateLow: est.low,
      estimateHigh: est.high,
      median,
      highBid,
      bidCount,
      discount,
      hidden: hiddenSet.has(lot.lotNumber),
      url: `https://hibid.com/lot/${lot.id}/${slug}`,
    };
  });

  const avgDiscount = withBidsCount > 0 ? discountSum / withBidsCount : 0;

  return {
    fetchedAt: new Date().toISOString(),
    stats: {
      totalLots: lots.length,
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

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.url === "/api/hide" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { lotNumber } = JSON.parse(body);
        hiddenSet.add(lotNumber);
        saveHidden(hiddenSet);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === "/api/hide" && req.method === "DELETE") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try {
        const { lotNumber } = JSON.parse(body);
        hiddenSet.delete(lotNumber);
        saveHidden(hiddenSet);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.url === "/api/lots") {
    try {
      const data = await fetchAllLots();
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
