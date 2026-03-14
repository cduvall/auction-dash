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
import { fetchHistory } from "../api/history";
import { fmt, pct } from "../lib/format";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

function chartOptions(tickFmt: (v: number) => string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { labels: { color: "#8b90a0", font: { size: 12 } } },
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
        time: { unit: "hour" as const, tooltipFormat: "MMM d, h:mm a", displayFormats: { hour: "MMM d ha" } },
        ticks: { color: "#8b90a0", font: { size: 11 }, maxTicksLimit: 10, maxRotation: 45 },
        grid: { color: "rgba(45,50,68,0.5)" },
      },
      y: {
        ticks: { color: "#8b90a0", font: { size: 11 }, callback: (v: string | number) => tickFmt(Number(v)) },
        grid: { color: "rgba(45,50,68,0.3)" },
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

  if (isLoading) return <div className="history-empty">Loading history...</div>;
  if (!history || history.length === 0) {
    return <div className="history-empty">No history data yet. Refresh the dashboard to start collecting snapshots.</div>;
  }

  const labels = history.map((h) => h.timestamp);

  return (
    <>
      <div className="chart-section">
        <div className="section-title">Dollar Trends</div>
        <div className="chart-box">
          <Line
            data={{
              datasets: [
                ds("Total High Bids", labels, history.map((h) => h.totalHighBids), "#fbbf24"),
                ds("Value Gap", labels, history.map((h) => h.gap), "#34d399"),
              ],
            }}
            options={chartOptions(fmt)}
          />
        </div>
      </div>
      <div className="chart-section">
        <div className="section-title">Discount Trends</div>
        <div className="chart-box">
          <Line
            data={{
              datasets: [
                ds("Avg Discount", labels, history.map((h) => h.avgDiscount), "#fb923c"),
                ds("Max Discount", labels, history.map((h) => h.maxDiscount), "#60a5fa"),
              ],
            }}
            options={chartOptions(pct)}
          />
        </div>
      </div>
      <div className="chart-section">
        <div className="section-title">Lot Counts</div>
        <div className="chart-box">
          <Line
            data={{
              datasets: [
                ds("With Bids", labels, history.map((h) => h.withBids), "#34d399"),
                ds("Without Bids", labels, history.map((h) => h.withoutBids), "#f87171"),
              ],
            }}
            options={chartOptions((v) => String(v))}
          />
        </div>
      </div>
    </>
  );
}
