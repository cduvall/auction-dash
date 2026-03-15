import { pct } from "@/shared/lib/format";

const badgeClasses = (d: number): string => {
  if (d >= 90) return "bg-olive/20 text-olive-light";
  if (d >= 70) return "bg-olive/20 text-olive-light";
  if (d >= 50) return "bg-ochre/20 text-ochre";
  if (d >= 30) return "bg-burnt/20 text-burnt";
  return "bg-terracotta/20 text-terracotta";
};

export function DiscountBadge({ discount }: { discount: number }) {
  if (discount <= 0) return null;
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-px rounded-full ${badgeClasses(discount)}`}>
      {pct(discount)} Discount
    </span>
  );
}
