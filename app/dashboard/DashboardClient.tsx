"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { LogOut } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BotState = {
  symbol: string;
  position: string | null;
  entry_price: number | null;
  extreme_price: number | null;
  is_uptrend: boolean;
  current_amount: number;
  current_quantity: number | null;
  last_dc_price: number | null;
  leverage: number;
  margin_type: string;
  updated_at: string;
} | null;

type PricePoint = {
  timestamp: string;
  open: number; high: number; low: number; close: number;
  volume: number; vwap: number; vwap_ema: number;
};

type Trade = {
  trade_id: string;
  timestamp: string;
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  amount: number;
  pnl: number | null;
  pnl_percent: number | null;
  reason: string | null;
};

type Props = {
  session: { user: { name: string; email: string } };
  botState: BotState;
  priceData: PricePoint[];
  trades: Trade[];
  balanceHistory: { balance: number; recorded_at: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: number | null | undefined, decimals = 2, prefix = "") {
  if (val == null) return "N/A";
  return `${prefix}${val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function pnlClass(val: number | null | undefined) {
  if (val == null || val === 0) return "text-gray-400";
  return val > 0 ? "text-green-400" : "text-red-400";
}

function calcMargin(botState: NonNullable<BotState>, currentPrice: number) {
  if (botState.position !== "long" || !botState.entry_price || !botState.current_quantity) return null;
  const { entry_price: entry, current_quantity: qty, leverage } = botState;
  const maintenance = 0.04;
  const positionValue = qty * currentPrice;
  const liqPrice = entry * (1 - 1 / leverage + maintenance);
  const distToLiq = ((currentPrice - liqPrice) / currentPrice) * 100;
  const requiredMargin = positionValue / leverage;
  const marginRatio = ((positionValue - requiredMargin) / positionValue) * 100;
  const borrowedValue = positionValue - requiredMargin;
  const unrealizedPnl = (currentPrice - entry) * qty;
  const marginLevel = borrowedValue > 0 ? positionValue / borrowedValue : Infinity;
  const marginStatus = marginLevel < 1 ? "HIGH RISK" : marginLevel < 1.3 ? "MODERATE RISK" : "SAFE";
  const pnlPct = positionValue > 0 ? (unrealizedPnl / positionValue) * 100 * leverage : 0;
  return {
    positionValue, liqPrice, distToLiq, requiredMargin,
    marginRatio, borrowedValue, unrealizedPnl, marginLevel,
    marginStatus, pnlPct,
    totalAssetValue: positionValue,
    totalEquityValue: requiredMargin + unrealizedPnl,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, delta, deltaColor = "neutral", sub }:
  { label: string; value: string; delta?: string; deltaColor?: "positive" | "negative" | "neutral"; sub?: string }) {
  const dc = deltaColor === "positive" ? "text-green-400" : deltaColor === "negative" ? "text-red-400" : "text-gray-400";
  return (
    <div className="bg-gray-800/60 rounded-xl p-4">
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <div className="text-white font-bold text-lg">{value}</div>
      {delta && <div className={`text-xs mt-0.5 ${dc}`}>{delta}</div>}
      {sub && <div className="text-gray-600 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-white font-semibold text-sm mb-3 mt-5 first:mt-0">{children}</h3>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardClient({ session, botState, priceData, trades, balanceHistory }: Props) {
  const [tab, setTab] = useState<"dashboard" | "trades">("dashboard");

  const sortedPrice = [...priceData].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const latest = sortedPrice[sortedPrice.length - 1];
  const prev = sortedPrice[sortedPrice.length - 2];
  const currentPrice = latest?.close ?? null;
  const priceChange = currentPrice && prev ? ((currentPrice - prev.close) / prev.close) * 100 : null;
  const margin = botState && currentPrice ? calcMargin(botState, currentPrice) : null;

  const chartData = sortedPrice.slice(-240).map((p) => ({
    time: new Date(p.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    close: +p.close.toFixed(4),
    vwap_ema: p.vwap_ema ? +p.vwap_ema.toFixed(4) : null,
    volume: +p.volume.toFixed(0),
  }));

  const balanceChartData = balanceHistory.slice(-100).map((b) => ({
    date: new Date(b.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    balance: +b.balance.toFixed(2),
  }));

  const isUptrend = botState?.is_uptrend ?? false;
  const inPosition = botState?.position === "long";

  // Win rate calc
  const closedTrades = trades.filter(t => t.pnl != null);
  const wins = closedTrades.filter(t => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? ((wins / closedTrades.length) * 100).toFixed(1) : null;
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-4 pb-16">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Trading Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">{session.user.name} · {botState?.symbol ?? "XRPUSDT"} · Isolated Margin · {botState?.leverage ?? 3.5}x</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
              isUptrend
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isUptrend ? "bg-green-500" : "bg-red-500"}`} />
              {isUptrend ? "UPTREND" : "DOWNTREND"}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 border-b border-gray-800">
          {(["dashboard", "trades"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-gold text-gold"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {t === "dashboard" ? "Trading Dashboard" : "Trade History"}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD TAB ══ */}
        {tab === "dashboard" && (
          <>
            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* LEFT — Bot State */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4">Current Bot State</h2>

                <SectionTitle>Position</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="Position"
                    value={inPosition ? "LONG" : "No Position"}
                    deltaColor={inPosition ? "positive" : "neutral"}
                  />
                  <MetricCard
                    label="Entry Price"
                    value={botState?.entry_price ? fmt(botState.entry_price, 4, "$") : "N/A"}
                    delta={margin ? `${fmt(((currentPrice! - botState!.entry_price!) / botState!.entry_price!) * 100, 2)}%` : undefined}
                    deltaColor={margin && margin.unrealizedPnl >= 0 ? "positive" : "negative"}
                  />
                  <MetricCard
                    label="Balance"
                    value={botState?.current_amount ? fmt(botState.current_amount, 2, "$") : "N/A"}
                  />
                </div>

                {/* Margin Position — only when in trade */}
                {inPosition && margin && (
                  <>
                    <SectionTitle>Margin Position</SectionTitle>
                    <div className="grid grid-cols-4 gap-3">
                      <MetricCard label="Eff. Position" value={fmt(margin.positionValue, 2, "$")} />
                      <MetricCard label="Leverage" value={`${botState!.leverage}x`} />
                      <MetricCard label="Margin Type" value={botState!.margin_type} />
                      <MetricCard
                        label="Margin Level"
                        value={isFinite(margin.marginLevel) ? fmt(margin.marginLevel, 2) : "∞"}
                        delta={margin.marginStatus}
                        deltaColor={margin.marginStatus === "SAFE" ? "positive" : "negative"}
                      />
                    </div>

                    <SectionTitle>Position Details</SectionTitle>
                    <div className="grid grid-cols-4 gap-3">
                      <MetricCard label="Total Asset" value={fmt(margin.totalAssetValue, 2, "$")} />
                      <MetricCard label="Borrowed" value={fmt(margin.borrowedValue, 2, "$")} />
                      <MetricCard label="Equity" value={fmt(margin.totalEquityValue, 2, "$")} />
                      <MetricCard
                        label="Unrealized PnL"
                        value={fmt(margin.unrealizedPnl, 2, "$")}
                        delta={`${fmt(margin.pnlPct, 1)}%`}
                        deltaColor={margin.unrealizedPnl >= 0 ? "positive" : "negative"}
                      />
                    </div>

                    {margin.marginStatus !== "SAFE" && (
                      <div className="mt-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        ⚠ {margin.marginStatus}: Monitor position closely.
                      </div>
                    )}
                  </>
                )}

                <SectionTitle>Trend Information</SectionTitle>
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="Trend"
                    value={isUptrend ? "UPTREND" : "DOWNTREND"}
                    deltaColor={isUptrend ? "positive" : "negative"}
                  />
                  <MetricCard
                    label="Extreme Price"
                    value={botState?.extreme_price ? fmt(botState.extreme_price, 4, "$") : "N/A"}
                  />
                  <MetricCard
                    label="Last DC Price"
                    value={botState?.last_dc_price ? fmt(botState.last_dc_price, 4, "$") : "N/A"}
                  />
                </div>
              </div>

              {/* RIGHT — Market Overview */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-white font-bold mb-4">Market Overview</h2>

                <SectionTitle>Price</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Current Price"
                    value={currentPrice ? fmt(currentPrice, 4, "$") : "N/A"}
                    delta={priceChange != null ? `${fmt(priceChange, 2)}%` : undefined}
                    deltaColor={priceChange != null ? (priceChange >= 0 ? "positive" : "negative") : "neutral"}
                  />
                  <MetricCard
                    label="VWAP EMA"
                    value={latest?.vwap_ema ? fmt(latest.vwap_ema, 4, "$") : "N/A"}
                  />
                </div>

                {latest && (
                  <>
                    <SectionTitle>24h Stats</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard label="Volume" value={latest.volume ? fmt(latest.volume, 0) : "N/A"} />
                      <MetricCard
                        label="Range"
                        value={`$${fmt(latest.low, 4)} – $${fmt(latest.high, 4)}`}
                        deltaColor="neutral"
                      />
                      <MetricCard
                        label="Range %"
                        value={`${fmt(((latest.high - latest.low) / latest.low) * 100, 2)}%`}
                      />
                    </div>
                  </>
                )}

                {/* Risk metrics — only when in trade */}
                {inPosition && margin && (
                  <>
                    <SectionTitle>Risk Metrics</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard
                        label="Liquidation Price"
                        value={fmt(margin.liqPrice, 4, "$")}
                        deltaColor="negative"
                      />
                      <MetricCard
                        label="Distance to Liq."
                        value={`${fmt(margin.distToLiq, 2)}%`}
                        deltaColor={margin.distToLiq > 10 ? "positive" : "negative"}
                      />
                      <MetricCard
                        label="Margin Ratio"
                        value={`${fmt(margin.marginRatio, 2)}%`}
                        deltaColor={margin.marginRatio > 50 ? "positive" : "negative"}
                      />
                      <MetricCard
                        label="Collateral"
                        value={fmt(margin.requiredMargin, 2, "$")}
                      />
                    </div>
                  </>
                )}

                {/* Stats when no position */}
                {!inPosition && (
                  <>
                    <SectionTitle>Performance</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                      <MetricCard label="Total Trades" value={String(closedTrades.length)} />
                      <MetricCard
                        label="Win Rate"
                        value={winRate ? `${winRate}%` : "N/A"}
                        deltaColor={parseFloat(winRate ?? "0") >= 50 ? "positive" : "negative"}
                      />
                      <MetricCard
                        label="Total PnL"
                        value={fmt(totalPnl, 2, "$")}
                        deltaColor={totalPnl >= 0 ? "positive" : "negative"}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ── Price Chart ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="text-white font-semibold mb-5">
                {botState?.symbol ?? "XRPUSDT"} — Price & VWAP EMA
              </h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={chartData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="price" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={65}
                      tickFormatter={(v) => `$${v}`} domain={["auto", "auto"]} />
                    <YAxis yAxisId="vol" orientation="right" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} width={50}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                      labelStyle={{ color: "#9ca3af", fontSize: 11 }}
                      itemStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                    <Bar yAxisId="vol" dataKey="volume" fill="#374151" opacity={0.4} name="Volume" />
                    <Line yAxisId="price" type="monotone" dataKey="close" stroke="#f8ac07" strokeWidth={1.5} dot={false} name="Price" />
                    <Line yAxisId="price" type="monotone" dataKey="vwap_ema" stroke="#f97316" strokeWidth={1.5} dot={false} name="VWAP EMA" strokeDasharray="4 2" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-600 text-sm">No price data yet</div>
              )}
            </div>

            {/* ── Balance Chart ── */}
            {balanceChartData.length > 1 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                <h3 className="text-white font-semibold mb-5">Balance Over Time</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <ComposedChart data={balanceChartData}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={65}
                      tickFormatter={(v) => `$${v.toLocaleString()}`} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                      itemStyle={{ color: "#f8ac07" }}
                      formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, "Balance"]}
                    />
                    <Line type="monotone" dataKey="balance" stroke="#f8ac07" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* ══ TRADE HISTORY TAB ══ */}
        {tab === "trades" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold">Trade History</h2>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500">Total: <span className="text-white">{closedTrades.length}</span></span>
                <span className="text-gray-500">Win Rate: <span className={winRate ? pnlClass(parseFloat(winRate) - 50) : "text-gray-400"}>{winRate ? `${winRate}%` : "N/A"}</span></span>
                <span className="text-gray-500">Total PnL: <span className={pnlClass(totalPnl)}>{fmt(totalPnl, 2, "$")}</span></span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-left text-xs">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Side</th>
                    <th className="pb-3 pr-4">Price</th>
                    <th className="pb-3 pr-4">Quantity</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">PnL</th>
                    <th className="pb-3 pr-4">PnL %</th>
                    <th className="pb-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-gray-600">No trades yet</td></tr>
                  ) : trades.map((t) => (
                    <tr key={t.trade_id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 pr-4 text-gray-400 text-xs">{new Date(t.timestamp).toLocaleDateString()}</td>
                      <td className={`py-3 pr-4 font-medium text-xs ${t.side === "BUY" ? "text-green-400" : "text-red-400"}`}>{t.side}</td>
                      <td className="py-3 pr-4 text-gray-300">{fmt(t.price, 4, "$")}</td>
                      <td className="py-3 pr-4 text-gray-300">{fmt(t.quantity, 4)}</td>
                      <td className="py-3 pr-4 text-gray-300">{fmt(t.amount, 2, "$")}</td>
                      <td className={`py-3 pr-4 font-medium ${pnlClass(t.pnl)}`}>{t.pnl != null ? fmt(t.pnl, 2, "$") : "—"}</td>
                      <td className={`py-3 pr-4 ${pnlClass(t.pnl_percent)}`}>{t.pnl_percent != null ? `${fmt(t.pnl_percent, 2)}%` : "—"}</td>
                      <td className="py-3 text-gray-500 text-xs">{t.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Last update ── */}
        {botState?.updated_at && (
          <p className="text-gray-700 text-xs text-center mt-6">
            Last sync: {new Date(botState.updated_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
