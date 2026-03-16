import { useState } from "react";
import type { Auction } from "@/shared/types";
import { refreshAuctionMetadata } from "@/features/auctions/api/auctions";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function statusColor(status: string | null): string {
  if (!status) return "bg-secondary/20 text-secondary";
  const s = status.toUpperCase();
  if (s.includes("CLOSED") || s.includes("ARCHIVED")) return "bg-terracotta/15 text-terracotta";
  if (s.includes("OPEN")) return "bg-olive/15 text-olive-light";
  if (s.includes("PREVIEW") || s.includes("ABSENTEE")) return "bg-ochre/15 text-ochre";
  return "bg-secondary/20 text-secondary";
}

function formatStatus(status: string | null): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatBidType(bidType: string | null): string | null {
  if (!bidType) return null;
  const t = bidType.toUpperCase();
  if (t === "INTERNET_ONLY") return "Online Only";
  if (t === "LIVE") return "Live";
  if (t === "LIVE_WITH_INTERNET") return "Live + Online";
  return bidType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatPremium(rate: number | null): string | null {
  if (rate == null) return null;
  const pct = Math.round((rate - 1) * 100);
  if (pct === 0) return null;
  return `${pct}% Buyer Premium`;
}

interface Props {
  auction: Auction;
  onAuctionsUpdated: (auctions: Auction[]) => void;
}

export function AuctionInfoBar({ auction, onAuctionsUpdated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const m = auction.metadata;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const updated = await refreshAuctionMetadata(auction.id);
      onAuctionsUpdated(updated);
    } catch {
      // silent fail
    } finally {
      setRefreshing(false);
    }
  }

  if (!m) {
    return (
      <div className="bg-surface border border-elevated rounded-lg mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <div className="px-4 py-3 flex items-center gap-2 text-xs">
          <span className="text-secondary">No auction details available.</span>
          <button
            className="text-ochre hover:text-ochre/80 cursor-pointer transition-colors bg-transparent border-none text-xs font-medium"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Fetching..." : "Fetch info"}
          </button>
        </div>
      </div>
    );
  }

  const openDate = formatDate(m.bidOpenDateTime);
  const closeDate = formatDate(m.bidCloseDateTime);
  const bidType = formatBidType(m.bidType);
  const premium = formatPremium(m.buyerPremiumRate);
  const hasDetails = m.description || m.location || m.previewDateInfo || m.checkoutDateInfo || m.auctioneerName;

  return (
    <div className="bg-surface border border-elevated rounded-lg mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 text-xs">
        {/* Status badge */}
        <span className={`px-2 py-0.5 rounded-full font-medium ${statusColor(m.status)}`}>
          {formatStatus(m.status)}
        </span>

        {/* Bid type */}
        {bidType && (
          <span className="px-2 py-0.5 rounded-full bg-elevated text-secondary font-medium">
            {bidType}
          </span>
        )}

        {/* Dates */}
        {openDate && (
          <span className="text-secondary">
            Opens: <span className="text-primary">{openDate}</span>
          </span>
        )}
        {closeDate && (
          <span className="text-secondary">
            Closes: <span className="text-primary">{closeDate}</span>
          </span>
        )}

        {/* Buyer premium */}
        {premium && (
          <span className="text-secondary">{premium}</span>
        )}

        {/* Expand toggle */}
        {hasDetails && (
          <button
            className="ml-auto text-secondary hover:text-primary cursor-pointer transition-colors p-1 bg-transparent border-none"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Hide details" : "Show details"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-3 pt-0 border-t border-elevated">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 text-xs">
            {m.auctioneerName && (
              <div>
                <span className="text-secondary">Auctioneer: </span>
                <span className="text-primary">{m.auctioneerName}</span>
              </div>
            )}
            {m.location && (
              <div>
                <span className="text-secondary">Location: </span>
                <span className="text-primary">{m.location}</span>
              </div>
            )}
            {m.previewDateInfo && (
              <div>
                <span className="text-secondary">Preview: </span>
                <span className="text-primary">{m.previewDateInfo}</span>
              </div>
            )}
            {m.checkoutDateInfo && (
              <div>
                <span className="text-secondary">Checkout: </span>
                <span className="text-primary">{m.checkoutDateInfo}</span>
              </div>
            )}
            {m.description && (
              <div className="sm:col-span-2">
                <span className="text-secondary">Description: </span>
                <span className="text-primary">{m.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
