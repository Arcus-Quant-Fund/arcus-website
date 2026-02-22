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

type BotState = {
  extreme_price: number | null;
  is_uptrend: boolean;
  last_dc_price: number | null;
  leverage?: number;
} | null;

type Props = {
  priceData: PricePoint[];
  trades: Trade[];
  botState: BotState;
  symbol?: string;
};

export default function TradingChart({ priceData, trades, botState, symbol = "XRPUSDT" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current || priceData.length === 0) return;

    // Sort price data ascending
    const sorted = [...priceData].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

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
      rightPriceScale: { borderColor: "#374151", scaleMargins: { top: 0.1, bottom: 0.35 } },
      timeScale: { borderColor: "#374151", timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: 380,
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

    const candleData = sorted.map((p) => ({
      time: (new Date(p.timestamp).getTime() / 1000) as Time,
      open: p.open,
      high: p.high,
      low: p.low,
      close: p.close,
    }));
    candleSeries.setData(candleData);

    // ── VWAP EMA line (orange) ────────────────────────────────────────────────
    const vwapSeries = chart.addLineSeries({
      color: "#f97316",
      lineWidth: 1,
      lineStyle: 2, // dashed
      title: "VWAP EMA",
      priceScaleId: "right",
    });
    vwapSeries.setData(
      sorted
        .filter((p) => p.vwap_ema != null)
        .map((p) => ({
          time: (new Date(p.timestamp).getTime() / 1000) as Time,
          value: p.vwap_ema,
        }))
    );

    // ── Volume histogram (separate pane) ─────────────────────────────────────
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
    });
    volumeSeries.setData(
      sorted.map((p) => ({
        time: (new Date(p.timestamp).getTime() / 1000) as Time,
        value: p.volume,
        color: p.close >= p.open ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
      }))
    );

    // ── DC level lines ────────────────────────────────────────────────────────
    if (botState?.extreme_price) {
      const extremePrice = chart.addLineSeries({
        color: "#a855f7",
        lineWidth: 1,
        lineStyle: 1, // dotted
        title: "Extreme Price",
        priceScaleId: "right",
        lastValueVisible: true,
        priceLineVisible: false,
      });
      // Draw a flat line at extreme_price across the whole chart
      const firstTime = (new Date(sorted[0].timestamp).getTime() / 1000) as Time;
      const lastTime = (new Date(sorted[sorted.length - 1].timestamp).getTime() / 1000) as Time;
      extremePrice.setData([
        { time: firstTime, value: botState.extreme_price },
        { time: lastTime, value: botState.extreme_price },
      ]);
    }

    // ── Buy / Sell trade markers ──────────────────────────────────────────────
    if (trades.length > 0) {
      const sortedTrades = [...trades].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const markers: SeriesMarker<Time>[] = sortedTrades
        .filter((t) => {
          const tTime = new Date(t.timestamp).getTime();
          const chartStart = new Date(sorted[0].timestamp).getTime();
          const chartEnd = new Date(sorted[sorted.length - 1].timestamp).getTime();
          return tTime >= chartStart && tTime <= chartEnd;
        })
        .map((t) => {
          const isBuy = t.side?.toUpperCase() === "BUY";
          return {
            time: (new Date(t.timestamp).getTime() / 1000) as Time,
            position: isBuy ? "belowBar" : "aboveBar",
            color: isBuy ? "#22c55e" : "#ef4444",
            shape: isBuy ? "arrowUp" : "arrowDown",
            text: isBuy
              ? "BUY"
              : t.pnl != null
              ? `SELL ${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(1)}`
              : "SELL",
            size: 1,
          } as SeriesMarker<Time>;
        });

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
          <h3 className="text-white font-semibold">{symbol} — Candlestick & VWAP EMA</h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Green ▲ = Buy entry &nbsp;·&nbsp; Red ▼ = Sell exit &nbsp;·&nbsp;
            <span className="text-orange-400">— VWAP EMA</span>
            {botState?.extreme_price && (
              <span className="text-purple-400"> &nbsp;·&nbsp; — Extreme Price</span>
            )}
          </p>
        </div>
      </div>
      <div ref={containerRef} />
      {priceData.length === 0 && (
        <div className="h-[380px] flex items-center justify-center text-gray-600 text-sm">
          No price data yet
        </div>
      )}
    </div>
  );
}
