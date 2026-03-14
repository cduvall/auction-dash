interface LotForSnapshot {
  lotNumber: string;
  name: string;
  median: number | null;
  highBid: number;
}

interface StatsForSnapshot {
  totalHighBids: number;
  totalMedianValue: number;
  gap: number;
  avgDiscount: number;
  withBids: number;
  withoutBids: number;
}

export interface Snapshot {
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

export function computeSnapshot(timestamp: string, stats: StatsForSnapshot, lots: LotForSnapshot[]): Snapshot {
  let maxDiscount = 0;
  let maxBidToValueRatio = 0;
  let maxDiscountLot: { lotNumber: string; name: string } | null = null;
  let maxRatioLot: { lotNumber: string; name: string } | null = null;

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

const SNAPSHOT_KEYS = ["totalHighBids", "totalMedianValue", "gap", "avgDiscount", "withBids", "withoutBids", "maxDiscount", "maxBidToValueRatio"] as const;

export function snapshotChanged(a: Snapshot, b: Snapshot): boolean {
  return SNAPSHOT_KEYS.some(k => a[k] !== b[k]);
}
