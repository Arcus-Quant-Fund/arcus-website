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
  priceData: PricePoint[];
  trades: Trade[];
  symbol?: string;
};

// Binance klines — supports arbitrary historical start dates, 1000 candles per request
const BINANCE_LIMIT = 1000;
const INTERVAL_4H_MS = 4 * 3600 * 1000;

type BinanceKline = [number, string, string, string, string, string, ...unknown[]];

async function fetchBinancePage(startMs: number, endMs: number): Promise<PricePoint[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=XRPUSDT&interval=4h&startTime=${startMs}&endTime=${endMs}&limit=${BINANCE_LIMIT}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Binance HTTP ${r.status}`);
  const json = await r.json() as BinanceKline[];
  return json.map((k) => ({
    timestamp: new Date(k[0] as number).toISOString(),
    open:  parseFloat(k[1] as string),
    high:  parseFloat(k[2] as string),
    low:   parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
    vwap_ema: 0,
  }));
}

export default function TradeHistoryChart({ trades, symbol = "XRPUSDT" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [candles, setCandles] = useState<PricePoint[]>([]);

  // Fetch Binance 4h candles directly from browser — parallel pages, no server proxy
  // Binance supports arbitrary startTime (ms), so we get the full history back to first trade
  useEffect(() => {
    if (trades.length === 0) { setLoading(false); return; }

    const earliest = trades.reduce(
      (min, t) => new Date(t.timestamp) < new Date(min) ? t.timestamp : min,
      trades[0].timestamp
    );
    const startMs = new Date(earliest).getTime() - 86_400_000; // 1 day before first trade
    const nowMs   = Date.now();

    // 1000 candles × 4h = ~166 days per page; 6 pages = ~2.7 years of coverage
    const PAGE_MS = BINANCE_LIMIT * INTERVAL_4H_MS;
    const pageStarts: number[] = [];
    let s = startMs;
    while (s < nowMs && pageStarts.length < 6) {
      pageStarts.push(s);
      s += PAGE_MS;
    }

    Promise.all(
      pageStarts.map((ps) => fetchBinancePage(ps, Math.min(ps + PAGE_MS, nowMs)))
    )
      .then((pages) => {
        // Merge, deduplicate, sort
        const seen = new Set<number>();
        const all: PricePoint[] = [];
        for (const page of pages) {
          for (const c of page) {
            const t = new Date(c.timestamp).getTime();
            if (!seen.has(t)) { seen.add(t); all.push(c); }
          }
        }
        all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setCandles(all);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [trades, symbol]);

  // Build chart once candles are loaded
  useEffect(() => {
    if (!containerRef.current || candles.length === 0 || trades.length === 0) return;

    const sorted = candles; // already sorted ascending
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
      const snapped = snapToCandle(Math.floor(new Date(t.timestamp).getTime() / 1000));
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
  const visible = candles.length > 0
    ? trades.filter(t => {
        const sec = Math.floor(new Date(t.timestamp).getTime() / 1000);
        const first = Math.floor(new Date(candles[0].timestamp).getTime() / 1000);
        const last  = Math.floor(new Date(candles[candles.length - 1].timestamp).getTime() / 1000);
        return sec >= first && sec <= last;
      }).length
    : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{symbol} — Full Bot Trade History (4h candles)</h3>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-4">
            <span><span className="text-green-400 font-bold">▲</span> {buys} Buys</span>
            <span><span className="text-red-400 font-bold">▼</span> {sells} Sells</span>
            {!loading && candles.length > 0 && (
              <span className="text-gray-600">{visible}/{trades.length} trades in range</span>
            )}
          </p>
        </div>
        <div className="text-gray-600 text-xs text-right">
          <div>{candles.length > 0 ? `${candles.length} candles` : ""}</div>
          <div>{trades.length} trades</div>
        </div>
      </div>

      {loading && (
        <div className="h-[480px] flex flex-col items-center justify-center gap-3 text-gray-500 text-sm">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-gold rounded-full animate-spin" />
          Loading price history…
        </div>
      )}
      {!loading && error && (
        <div className="h-[480px] flex flex-col items-center justify-center text-red-400 text-sm gap-2">
          <span>Failed to load price data</span>
          <span className="text-red-600 text-xs font-mono">{error}</span>
        </div>
      )}
      {!loading && !error && candles.length === 0 && (
        <div className="h-[480px] flex items-center justify-center text-gray-600 text-sm">
          No candle data returned
        </div>
      )}
      <div ref={containerRef} className={loading || error || candles.length === 0 ? "hidden" : ""} />
    </div>
  );
}
