import { useQuery } from "@tanstack/react-query";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  type TooltipItem,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { fetchHistory } from "@/features/dashboard/api/history";
import { fmt, pct } from "@/shared/lib/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 640;

function chartOptions(tickFmt: (v: number) => string) {
  const mobile = isMobile();
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { labels: { color: "#909194", font: { size: mobile ? 10 : 12 } } },
      tooltip: {
        callbacks: {
          label(tip: TooltipItem<"line">) {
            return (tip.dataset.label ?? "") + ": " + tickFmt(tip.parsed.y ?? 0);
          },
        },
      },
    },
    scales: {
      x: {
        type: "time" as const,
        time: { unit: "hour" as const, tooltipFormat: "MMM d, h:mm a", displayFormats: { hour: mobile ? "M/d ha" : "MMM d ha" } },
        ticks: { color: "#909194", font: { size: mobile ? 9 : 11 }, maxTicksLimit: mobile ? 5 : 10, maxRotation: 45 },
        grid: { color: "rgba(63,65,68,0.4)" },
      },
      y: {
        ticks: { color: "#909194", font: { size: mobile ? 9 : 11 }, callback: (v: string | number) => tickFmt(Number(v)) },
        grid: { color: "rgba(63,65,68,0.3)" },
      },
    },
  };
}

function ds(label: string, timestamps: string[], data: number[], color: string) {
  return {
    label,
    data: timestamps.map((t, i) => ({ x: t, y: data[i] })),
    borderColor: color,
    backgroundColor: color + "1a",
    tension: 0.3,
    pointRadius: 4,
    borderWidth: 2,
  };
}

interface Props {
  auctionId: number;
}

export function HistoryCharts({ auctionId }: Props) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["history", auctionId],
    queryFn: () => fetchHistory(auctionId),
  });

  if (isLoading) return <div className="text-secondary text-center py-10">Loading history...</div>;
  if (!history || history.length === 0) {
    return <div className="text-secondary text-center py-10">No history data yet. Refresh the dashboard to start collecting snapshots.</div>;
  }

  const labels = history.map((h) => h.timestamp);
  const hasEstimates = history.some((h) => h.gap !== 0);

  return (
    <>
      <div className="mb-6">
        <div className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Dollar Trends</div>
        <div className="bg-surface border border-elevated rounded-lg p-2 sm:p-4 h-56 sm:h-72 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <Line
            data={{
              datasets: [
                ds("Total High Bids", labels, history.map((h) => h.totalHighBids), "#d9a05b"),
                ...(hasEstimates ? [ds("Value Gap", labels, history.map((h) => h.gap), "#6b705c")] : []),
              ],
            }}
            options={chartOptions(fmt)}
          />
        </div>
      </div>
      <div className="mb-6">
        <div className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Discount Trends</div>
        <div className="bg-surface border border-elevated rounded-lg p-2 sm:p-4 h-56 sm:h-72 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <Line
            data={{
              datasets: [
                ds("Avg Discount", labels, history.map((h) => h.avgDiscount), "#cc7722"),
                ds("Max Discount", labels, history.map((h) => h.maxDiscount), "#b35d43"),
              ],
            }}
            options={chartOptions(pct)}
          />
        </div>
      </div>
      <div className="mb-6">
        <div className="text-sm font-semibold uppercase tracking-wider text-secondary mb-3">Lot Counts</div>
        <div className="bg-surface border border-elevated rounded-lg p-2 sm:p-4 h-56 sm:h-72 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          <Line
            data={{
              datasets: [
                ds("With Bids", labels, history.map((h) => h.withBids), "#6b705c"),
                ds("Without Bids", labels, history.map((h) => h.withoutBids), "#b35d43"),
              ],
            }}
            options={chartOptions((v) => String(v))}
          />
        </div>
      </div>
    </>
  );
}
