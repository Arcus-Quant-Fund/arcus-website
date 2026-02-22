"use client";

import { useEffect, useRef, useState } from "react";
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
  priceData: PricePoint[]; // recent 1-min candles (fallback / not used for history)
  trades: Trade[];
  symbol?: string;
};

export default function TradeHistoryChart({ trades, symbol = "XRPUSDT" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [candles, setCandles] = useState<PricePoint[]>([]);

  // Fetch Binance historical 4h candles from earliest trade → now
  useEffect(() => {
    if (trades.length === 0) { setLoading(false); return; }

    const earliest = trades.reduce(
      (min, t) => new Date(t.timestamp) < new Date(min) ? t.timestamp : min,
      trades[0].timestamp
    );
    // Start 1 day before earliest trade so chart isn't cut off
    const startTime = new Date(earliest).getTime() - 86_400_000;

    fetch(`/api/price-history?symbol=${symbol}&startTime=${startTime}&interval=4h`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setCandles(data);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [trades, symbol]);

  // Build chart once candles are loaded
  useEffect(() => {
    if (!containerRef.current || candles.length === 0 || trades.length === 0) return;

    const sorted = [...candles].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const candleTimes = sorted.map(
      (p) => Math.floor(new Date(p.timestamp).getTime() / 1000)
    );

    function snapToCandle(tradeSec: number): Time | null {
      const sec = Math.floor(tradeSec);
      if (sec < candleTimes[0] || sec > candleTimes[candleTimes.length - 1]) return null;
      let closest = candleTimes[0];
      let minDiff = Infinity;
      for (const ct of candleTimes) {
        const d = Math.abs(ct - sec);
        if (d < minDiff) { minDiff = d; closest = ct; }
      }
      return closest as Time;
    }

    // Destroy previous chart if re-rendering
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

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

    // ── Candlesticks ──────────────────────────────────────────────────────────
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    candleSeries.setData(
      sorted.map((p, i) => ({
        time: candleTimes[i] as Time,
        open: p.open, high: p.high, low: p.low, close: p.close,
      }))
    );

    // ── Volume ────────────────────────────────────────────────────────────────
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    volumeSeries.setData(
      sorted.map((p, i) => ({
        time: candleTimes[i] as Time,
        value: p.volume,
        color: p.close >= p.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
      }))
    );

    // ── Buy / Sell markers ────────────────────────────────────────────────────
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const markerMap = new Map<number, SeriesMarker<Time>>();
    for (const t of sortedTrades) {
      const snapped = snapToCandle(new Date(t.timestamp).getTime() / 1000);
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

    const observer = new ResizeObserver(() => {
      if (containerRef.current)
        chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); chart.remove(); chartRef.current = null; };
  }, [candles, trades]);

  const buys  = trades.filter(t => t.side?.toUpperCase() === "BUY").length;
  const sells = trades.filter(t => t.side?.toUpperCase() === "SELL").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{symbol} — Full Bot Trade History (4h candles)</h3>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-4">
            <span><span className="text-green-400 font-bold">▲</span> {buys} Buys</span>
            <span><span className="text-red-400 font-bold">▼</span> {sells} Sells</span>
          </p>
        </div>
        <div className="text-gray-600 text-xs text-right">
          <div>{candles.length} candles</div>
          <div>{trades.length} trades</div>
        </div>
      </div>

      {loading && (
        <div className="h-[480px] flex items-center justify-center text-gray-500 text-sm">
          Loading price history…
        </div>
      )}
      {error && (
        <div className="h-[480px] flex items-center justify-center text-red-400 text-sm">
          Failed to load price data
        </div>
      )}
      <div ref={containerRef} className={loading || error ? "hidden" : ""} />
    </div>
  );
}
