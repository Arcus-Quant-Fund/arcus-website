"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";

type Trade = {
  trade_id: string;
  timestamp: string;
  side: string;
  price: number;
  pnl: number | null;
  amount: number | null;
};

type Props = {
  trades: Trade[];
  symbol?: string;
};

export default function TradeHistoryChart({ trades, symbol = "XRPUSDT" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || trades.length === 0) return;

    // All trades sorted chronologically
    const sorted = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#111827" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151", timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: 420,
    });
    chartRef.current = chart;

    // Price line — connects every trade in sequence to show price path
    const priceLine = chart.addLineSeries({
      color: "#374151",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      priceScaleId: "right",
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    priceLine.setData(
      sorted.map((t) => ({
        time: (new Date(t.timestamp).getTime() / 1000) as Time,
        value: t.price,
      }))
    );

    // Buy / Sell markers on the price line
    const markers: SeriesMarker<Time>[] = sorted.map((t) => {
      const isBuy = t.side?.toUpperCase() === "BUY";
      return {
        time: (new Date(t.timestamp).getTime() / 1000) as Time,
        position: isBuy ? "belowBar" : "aboveBar",
        color: isBuy ? "#22c55e" : "#ef4444",
        shape: isBuy ? "arrowUp" : "arrowDown",
        text: isBuy
          ? `BUY $${t.price?.toFixed(4) ?? ""}`
          : t.pnl != null
          ? `SELL ${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}`
          : `SELL $${t.price?.toFixed(4) ?? ""}`,
        size: 1,
      } as SeriesMarker<Time>;
    });

    if (markers.length > 0) {
      priceLine.setMarkers(markers);
    }

    // Resize observer
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [trades]);

  const buys  = trades.filter(t => t.side?.toUpperCase() === "BUY").length;
  const sells = trades.filter(t => t.side?.toUpperCase() === "SELL").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{symbol} — All Bot Trades</h3>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-4">
            <span><span className="text-green-400 font-bold">▲</span> {buys} Buys</span>
            <span><span className="text-red-400 font-bold">▼</span> {sells} Sells</span>
            <span className="text-gray-600">Price path connects every trade chronologically</span>
          </p>
        </div>
        <div className="text-gray-600 text-xs">{trades.length} total trades</div>
      </div>
      <div ref={containerRef} />
      {trades.length === 0 && (
        <div className="h-[420px] flex items-center justify-center text-gray-600 text-sm">
          No trade history yet
        </div>
      )}
    </div>
  );
}
