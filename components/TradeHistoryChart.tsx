"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";

type PricePoint = {
  timestamp: string;
  open: number; high: number; low: number; close: number;
  volume: number; vwap_ema: number;
};

type Trade = {
  trade_id: string;
  timestamp: string;
  side: string;
  price: number;
  pnl: number | null;
  amount: number | null;
};

type Props = {
  priceData: PricePoint[];
  trades: Trade[];
  symbol?: string;
};

export default function TradeHistoryChart({ priceData, trades, symbol = "XRPUSDT" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || priceData.length === 0) return;

    const sorted = [...priceData].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Candle times as integer seconds (Math.floor avoids float precision issues
    // that cause lightweight-charts to silently drop markers)
    const candleTimes = sorted.map((p) => Math.floor(new Date(p.timestamp).getTime() / 1000));

    function snapToCandle(tradeSec: number): Time | null {
      const sec = Math.floor(tradeSec);
      const first = candleTimes[0];
      const last  = candleTimes[candleTimes.length - 1];
      if (sec < first || sec > last) return null; // outside chart range
      let closest = candleTimes[0];
      let minDiff = Infinity;
      for (const ct of candleTimes) {
        const d = Math.abs(ct - sec);
        if (d < minDiff) { minDiff = d; closest = ct; }
      }
      return closest as Time;
    }

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
      rightPriceScale: {
        borderColor: "#374151",
        scaleMargins: { top: 0.08, bottom: 0.28 },
      },
      timeScale: { borderColor: "#374151", timeVisible: true, secondsVisible: false, rightOffset: 5 },
      width: containerRef.current.clientWidth,
      height: 480,
    });
    chartRef.current = chart;

    // ── Candlestick series ────────────────────────────────────────────────────
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeries.setData(
      sorted.map((p, i) => ({
        time: candleTimes[i] as Time,
        open: p.open, high: p.high, low: p.low, close: p.close,
      }))
    );

    // ── Volume histogram ──────────────────────────────────────────────────────
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });
    volumeSeries.setData(
      sorted.map((p, i) => ({
        time: candleTimes[i] as Time,
        value: p.volume,
        color: p.close >= p.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
      }))
    );

    // ── Buy / Sell markers snapped to nearest candle ───────────────────────
    if (trades.length > 0) {
      const sortedTrades = [...trades].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const markerMap = new Map<number, SeriesMarker<Time>>();

      for (const t of sortedTrades) {
        const tradeSec = new Date(t.timestamp).getTime() / 1000; // snapToCandle floors it
        const snapped = snapToCandle(tradeSec);
        if (snapped === null) continue;

        const isBuy = t.side?.toUpperCase() === "BUY";
        markerMap.set(snapped as number, {
          time: snapped,
          position: isBuy ? "belowBar" : "aboveBar",
          color: isBuy ? "#22c55e" : "#ef4444",
          shape: isBuy ? "arrowUp" : "arrowDown",
          text: isBuy
            ? "BUY"
            : t.pnl != null
            ? `SELL ${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(1)}`
            : "SELL",
          size: 1.5,
        } as SeriesMarker<Time>);
      }

      const markers = [...markerMap.values()].sort(
        (a, b) => (a.time as number) - (b.time as number)
      );
      if (markers.length > 0) candleSeries.setMarkers(markers);
    }

    // ── Responsive resize ─────────────────────────────────────────────────────
    const observer = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);

    return () => { observer.disconnect(); chart.remove(); };
  }, [priceData, trades]);

  const buys  = trades.filter(t => t.side?.toUpperCase() === "BUY").length;
  const sells = trades.filter(t => t.side?.toUpperCase() === "SELL").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{symbol} — Full Trade History</h3>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-4">
            <span><span className="text-green-400 font-bold">▲</span> {buys} Buys</span>
            <span><span className="text-red-400 font-bold">▼</span> {sells} Sells</span>
          </p>
        </div>
        <div className="text-gray-600 text-xs text-right">
          <div>{priceData.length.toLocaleString()} candles</div>
          <div>{trades.length} trades</div>
        </div>
      </div>
      <div ref={containerRef} />
      {priceData.length === 0 && (
        <div className="h-[480px] flex items-center justify-center text-gray-600 text-sm">
          No price data yet
        </div>
      )}
    </div>
  );
}
