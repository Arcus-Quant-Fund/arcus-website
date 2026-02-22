"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
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
  reason: string | null;
};

// Bot DC strategy constants (same for all bots)
const BUY_THRESHOLD = 0.043;   // 4.3% above extreme → buy trigger
const SELL_THRESHOLD = 0.0109; // 1.09% below extreme → sell trigger

type BotState = {
  extreme_price: number | null;
  is_uptrend: boolean;
  last_dc_price: number | null;
  entry_price?: number | null;
  position?: string | null;
  leverage?: number;
} | null;

type Props = {
  priceData: PricePoint[];
  trades: Trade[];
  botState: BotState;
  symbol?: string;
};

// Resample 1-min candles into N-minute buckets.
// Produces proper OHLCV candles and averaged VWAP EMA per bucket.
function resample(data: PricePoint[], intervalMin: number): PricePoint[] {
  const intervalSec = intervalMin * 60;
  const buckets = new Map<number, PricePoint[]>();
  for (const p of data) {
    const sec = Math.floor(new Date(p.timestamp).getTime() / 1000);
    const bucket = sec - (sec % intervalSec);
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(p);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucket, pts]) => {
      const vwapPts = pts.filter((p) => p.vwap_ema > 0);
      return {
        timestamp: new Date(bucket * 1000).toISOString(),
        open:  pts[0].open,
        high:  Math.max(...pts.map((p) => p.high)),
        low:   Math.min(...pts.map((p) => p.low)),
        close: pts[pts.length - 1].close,
        volume: pts.reduce((s, p) => s + p.volume, 0),
        vwap_ema: vwapPts.length
          ? vwapPts.reduce((s, p) => s + p.vwap_ema, 0) / vwapPts.length
          : 0,
      };
    });
}

export default function TradingChart({ priceData, trades, botState, symbol = "XRPUSDT" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || priceData.length === 0) return;

    // Resample 1-min candles to 1h so 30 days → 720 readable bars
    const sorted = resample(priceData, 60);

    // Integer seconds — Math.floor prevents float precision mismatches that
    // cause lightweight-charts to silently drop markers
    const candleTimes: number[] = sorted.map(
      (p) => Math.floor(new Date(p.timestamp).getTime() / 1000)
    );

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

    // ── Create chart ──────────────────────────────────────────────────────────
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
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      width: containerRef.current.clientWidth,
      height: 520,
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
    candleRef.current = candleSeries;

    candleSeries.setData(
      sorted.map((p, i) => ({
        time: candleTimes[i] as Time,
        open: p.open, high: p.high, low: p.low, close: p.close,
      }))
    );

    // ── VWAP EMA line (orange dashed) ─────────────────────────────────────────
    const vwapSeries = chart.addLineSeries({
      color: "#f97316",
      lineWidth: 2,
      lineStyle: 2,
      title: "VWAP EMA",
      priceScaleId: "right",
      crosshairMarkerVisible: false,
    });
    vwapSeries.setData(
      sorted
        .filter((p) => p.vwap_ema != null)
        .map((p) => ({
          time: Math.floor(new Date(p.timestamp).getTime() / 1000) as Time,
          value: p.vwap_ema,
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
        color: p.close >= p.open ? "rgba(34,197,94,0.45)" : "rgba(239,68,68,0.45)",
      }))
    );

    const firstTime = candleTimes[0] as Time;
    const lastTime  = candleTimes[candleTimes.length - 1] as Time;

    function hline(color: string, title: string, price: number, dash: number) {
      const s = chart.addLineSeries({
        color, lineWidth: 1, lineStyle: dash,
        title, priceScaleId: "right",
        lastValueVisible: true, priceLineVisible: false, crosshairMarkerVisible: false,
      });
      s.setData([{ time: firstTime, value: price }, { time: lastTime, value: price }]);
    }

    if (botState?.extreme_price) {
      const ep = botState.extreme_price;

      // Extreme price (purple dotted) — the current DC reference level
      hline("#a855f7", "Extreme", ep, 1);

      // Trigger line: depends on trend direction
      if (botState.is_uptrend) {
        // Uptrend → bot will SELL if price falls below extreme by sell_threshold
        hline("#ef4444", `Sell Trigger −${(SELL_THRESHOLD * 100).toFixed(2)}%`, ep * (1 - SELL_THRESHOLD), 2);
      } else {
        // Downtrend → bot will BUY if price rises above extreme by buy_threshold
        hline("#22c55e", `Buy Trigger +${(BUY_THRESHOLD * 100).toFixed(1)}%`, ep * (1 + BUY_THRESHOLD), 2);
      }
    }

    // Entry price (blue) — shown when bot holds a long position
    if (botState?.position === "long" && botState.entry_price) {
      hline("#3b82f6", "Entry Price", botState.entry_price, 2);
    }


    // ── Buy / Sell trade markers ──────────────────────────────────────────────
    // Each trade is snapped to its nearest candle bar.
    // When two trades snap to the same bar, the later one (SELL with PnL) wins.
    if (trades.length > 0) {
      const sortedTrades = [...trades].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const markerMap = new Map<number, SeriesMarker<Time>>();

      for (const t of sortedTrades) {
        const tradeSec = Math.floor(new Date(t.timestamp).getTime() / 1000);
        const snapped = snapToCandle(tradeSec);
        if (snapped === null) continue;

        const isBuy = t.side?.toUpperCase() === "BUY";
        const key = snapped as number;

        markerMap.set(key, {
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
      if (markers.length > 0) {
        candleSeries.setMarkers(markers);
      }
    }

    // ── Responsive resize ─────────────────────────────────────────────────────
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
  }, [priceData, trades, botState]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold">{symbol} — Candlestick & VWAP EMA (1h)</h3>
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-4 flex-wrap">
            <span><span className="text-green-400 font-bold">▲</span> Buy</span>
            <span><span className="text-red-400 font-bold">▼</span> Sell+PnL</span>
            <span className="text-orange-400">━ VWAP EMA</span>
            {botState?.extreme_price && <span className="text-purple-400">┄ Extreme</span>}
            {botState?.is_uptrend
              ? <span className="text-red-400">┄ Sell Trigger −{(SELL_THRESHOLD * 100).toFixed(2)}%</span>
              : <span className="text-green-400">┄ Buy Trigger +{(BUY_THRESHOLD * 100).toFixed(1)}%</span>
            }
            {botState?.position === "long" && <span className="text-blue-400">━ Entry Price</span>}
          </p>
        </div>
        <div className="text-gray-600 text-xs text-right">
          <div>{Math.round(priceData.length / 60)} candles (1h)</div>
          <div className="text-gray-700">{priceData.length.toLocaleString()} raw 1m</div>
          <div>{trades.length} trades</div>
        </div>
      </div>
      <div ref={containerRef} />
      {priceData.length === 0 && (
        <div className="h-[520px] flex items-center justify-center text-gray-600 text-sm">
          No price data yet
        </div>
      )}
    </div>
  );
}
