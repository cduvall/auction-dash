export interface Auction {
  id: number;
  title: string;
}

export interface Lot {
  id: number;
  lotNumber: string;
  name: string;
  estimateLow: number | null;
  estimateHigh: number | null;
  median: number | null;
  highBid: number;
  bidCount: number;
  discount: number;
  closeTime: string | null;
  hidden: boolean;
  favorited: boolean;
  url: string;
}

export interface LotStats {
  totalLots: number;
  totalBids: number;
  totalMedianValue: number;
  totalHighBids: number;
  gap: number;
  avgDiscount: number;
  withBids: number;
  withoutBids: number;
}

export interface LotsResponse {
  fetchedAt: string;
  stats: LotStats;
  lots: Lot[];
}

export interface BidderStats {
  uniqueBidders: number;
  activeLast24h: number;
  maxActiveBidders: number;
  lotsRefreshed?: number;
  totalLots?: number;
}

export interface HistorySnapshot {
  timestamp: string;
  totalHighBids: number;
  totalMedianValue: number;
  gap: number;
  avgDiscount: number;
  withBids: number;
  withoutBids: number;
  maxDiscount: number;
  maxBidToValueRatio: number;
  maxDiscountLot: { lotNumber: string; name: string } | null;
  maxRatioLot: { lotNumber: string; name: string } | null;
}

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  avatarUrl: string | null;
  migratedAnonymous: boolean;
}

export type SortCol = string;
export type SortDir = 1 | -1;
export type ViewName = "dashboard" | "all" | "favorites" | "untouched" | "history";
export type BidFilter = "bids" | "nobids" | null;
