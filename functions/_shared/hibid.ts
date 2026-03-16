const GRAPHQL_URL = "https://hibid.com/graphql";
const PAGE_SIZE = 100;

export const QUERY = `query LotSearchLotOnly($auctionId: Int = null, $pageNumber: Int!, $pageLength: Int!, $sortOrder: EventItemSortOrder = null) {
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

export function parseEstimate(estimate: string | null | undefined): { low: number | null; high: number | null } {
  if (!estimate) return { low: null, high: null };
  const match = estimate.match(/([\d,]+(?:\.\d+)?)\s*-\s*\$?([\d,]+(?:\.\d+)?)/);
  if (!match) return { low: null, high: null };
  return {
    low: parseFloat(match[1].replace(/,/g, "")),
    high: parseFloat(match[2].replace(/,/g, "")),
  };
}

export function parseCloseTime(lotState: { timeLeftSeconds?: number | null } | null | undefined): string | null {
  const secs = lotState?.timeLeftSeconds;
  if (secs != null && secs > 0) {
    return new Date(Date.now() + secs * 1000).toISOString();
  }
  return null;
}

export async function fetchPage(auctionId: number, pageNumber: number) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "LotSearchLotOnly",
      variables: { auctionId, pageNumber, pageLength: PAGE_SIZE, sortOrder: "LOT_NUMBER" },
      query: QUERY,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const json = await res.json() as any;
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.lotSearch.pagedResults;
}

export async function fetchBidHistory(lotId: number) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query { bidHistory(input: "${lotId}") { bids { count bid username } } }`,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as any;
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.bidHistory.bids || [];
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

export interface AuctionMetadata {
  bidOpenDateTime: string | null;
  bidCloseDateTime: string | null;
  previewDateInfo: string | null;
  checkoutDateInfo: string | null;
  status: string | null;
  bidType: string | null;
  buyerPremiumRate: number | null;
  description: string | null;
  location: string | null;
  auctioneerName: string | null;
}

export async function fetchAuctionMetadata(auctionId: number): Promise<AuctionMetadata | null> {
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
    const json = await res.json() as any;
    if (json.errors || !json.data?.auction) return null;
    const a = json.data.auction;

    const locationParts = [a.eventCity, a.eventState, a.eventZip].filter(Boolean);
    const location = locationParts.length > 0
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

export async function lookupAuctionTitle(auctionId: number): Promise<{ title: string; lotCount: number; metadata: AuctionMetadata | null }> {
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
  const json = await res.json() as any;
  if (json.errors) throw new Error(json.errors[0]?.message || "GraphQL error");
  const count = json.data?.lotSearch?.pagedResults?.totalCount ?? 0;
  if (count === 0) throw new Error("No lots found for this auction ID");

  const metadata = await fetchAuctionMetadata(auctionId);

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
          .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
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

export function parseAuctionIdFromInput(input: string): number | null {
  const s = input.trim();
  if (/^\d+$/.test(s)) return parseInt(s);
  const m = s.match(/hibid\.com\/(?:auctions?\/[^/]+\/|auction\/)(\d+)/i)
    || s.match(/hibid\.com\/.*?(\d{5,})/i);
  if (m) return parseInt(m[1]);
  return null;
}
