const fs = require("fs");

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
  // Format: "$300.00 - $500.00 USD" or "300.00 - 500.00"
  const match = estimate.match(/([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)/);
  if (!match) return { low: null, high: null };
  return {
    low: parseFloat(match[1].replace(/,/g, "")),
    high: parseFloat(match[2].replace(/,/g, "")),
  };
}

function buildLotUrl(id, lead) {
  const slug = (lead || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://hibid.com/lot/${id}/${slug}`;
}

async function main() {
  console.log("Fetching lot data from HiBid GraphQL API...\n");

  let allResults = [];
  let page = 1;
  let totalCount = 0;

  while (true) {
    const data = await fetchPage(page);
    totalCount = data.totalCount;
    const results = data.results;

    console.log(`  Page ${page}: ${results.length} lots (${allResults.length + results.length}/${totalCount})`);
    allResults.push(...results);

    if (allResults.length >= totalCount || results.length < PAGE_SIZE) break;
    page++;
  }

  const items = allResults.map((lot) => {
    const est = parseEstimate(lot.estimate);
    const median = est.low != null && est.high != null ? (est.low + est.high) / 2 : null;
    const highBid = lot.lotState?.highBid ?? lot.bidAmount ?? 0;

    return {
      name: `Lot ${lot.lotNumber} | ${lot.lead}`,
      estimatedPriceRange: est.low != null ? `$${est.low.toFixed(2)} - $${est.high.toFixed(2)}` : null,
      medianEstimatedPrice: median != null ? `$${median.toFixed(2)}` : null,
      currentHighBid: `$${highBid.toFixed(2)}`,
      url: buildLotUrl(lot.id, lot.lead),
    };
  });

  console.log(`\n========================================`);
  console.log(`Total lot count: ${items.length}`);
  console.log(`========================================\n`);

  const outPath = "/Users/xian/Documents/dev/hibid-scraper/lots.json";
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2));
  console.log(`Output written to ${outPath}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
