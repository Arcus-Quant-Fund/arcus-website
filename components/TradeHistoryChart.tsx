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

    // Sort all trades chronologically
    const sorted = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Build integer seconds array from trade timestamps
    const tradeTimes = sorted.map(
      (t) => Math.floor(new Date(t.timestamp).getTime() / 1000)
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
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      width: containerRef.current.clientWidth,
      height: 460,
    });
    chartRef.current = chart;

    // ── Price line built from trade prices ────────────────────────────────────
    // Covers full bot lifetime regardless of candle data availability
    const priceLine = chart.addLineSeries({
      color: "#4b5563",
      lineWidth: 1,
      lineStyle: LineStyle.Solid,
      priceScaleId: "right",
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    // Deduplicate by time (two trades at same second → keep last price)
    const timeMap = new Map<number, number>();
    sorted.forEach((t, i) => { timeMap.set(tradeTimes[i], t.price); });
    const lineData = [...timeMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, value]) => ({ time: time as Time, value }));

    priceLine.setData(lineData);

    // ── Buy / Sell markers ────────────────────────────────────────────────────
    const markerMap = new Map<number, SeriesMarker<Time>>();

    sorted.forEach((t, i) => {
      const time = tradeTimes[i] as Time;
      const isBuy = t.side?.toUpperCase() === "BUY";

      markerMap.set(tradeTimes[i], {
        time,
        position: isBuy ? "belowBar" : "aboveBar",
        color: isBuy ? "#22c55e" : "#ef4444",
        shape: isBuy ? "arrowUp" : "arrowDown",
        text: isBuy
          ? "BUY"
          : t.pnl != null
          ? `SELL ${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}`
          : "SELL",
        size: 1.5,
      } as SeriesMarker<Time>);
    });

    const markers = [...markerMap.values()].sort(
      (a, b) => (a.time as number) - (b.time as number)
    );
    if (markers.length > 0) priceLine.setMarkers(markers);

    // ── Responsive resize ─────────────────────────────────────────────────────
    const observer = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => { observer.disconnect(); chart.remove(); };
  }, [trades]);

  const buys  = trades.filter(t => t.side?.toUpperCase() === "BUY").length;
  const sells = trades.filter(t => t.side?.toUpperCase() === "SELL").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{symbol} — Full Bot Trade History</h3>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-4">
            <span><span className="text-green-400 font-bold">▲</span> {buys} Buys</span>
            <span><span className="text-red-400 font-bold">▼</span> {sells} Sells with PnL</span>
            <span className="text-gray-600">Price line built from trade execution prices</span>
          </p>
        </div>
        <div className="text-gray-600 text-xs">{trades.length} total trades</div>
      </div>
      <div ref={containerRef} />
      {trades.length === 0 && (
        <div className="h-[460px] flex items-center justify-center text-gray-600 text-sm">
          No trade history yet
        </div>
      )}
    </div>
  );
}
