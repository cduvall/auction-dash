import { discountColor, barWidth, pct } from "../lib/format";

export function DiscountCell({ discount, highBid, scale = 1 }: { discount: number; highBid: number; scale?: number }) {
  if (highBid <= 0) {
    return <span style={{ color: "var(--text2)" }}>-</span>;
  }
  return (
    <>
      <span
        className="discount-bar"
        style={{
          width: barWidth(discount) * scale,
          background: discountColor(discount),
        }}
      />
      <span style={{ color: discountColor(discount) }}>{pct(discount)}</span>
    </>
  );
}
