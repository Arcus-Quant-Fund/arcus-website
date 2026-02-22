"use client";
import { signOut } from "next-auth/react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { DollarSign, TrendingUp, Percent, BarChart2, LogOut } from "lucide-react";

type Props = {
  session: { user: { name: string; email: string } };
  summary: Record<string, unknown> | null;
  balanceHistory: { balance: number; recorded_at: string }[];
  positions: Record<string, unknown>[];
  trades: Record<string, unknown>[];
};

function fmt(val: unknown, prefix = "") {
  if (val == null) return "—";
  const n = Number(val);
  return `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pnlColor(val: unknown) {
  const n = Number(val);
  if (!n) return "text-gray-400";
  return n >= 0 ? "text-green-400" : "text-red-400";
}

export default function DashboardClient({ session, summary, balanceHistory, positions, trades }: Props) {
  const stats = [
    {
      label: "Balance",
      value: fmt(summary?.current_balance, "$"),
      icon: <DollarSign size={18} className="text-gray-500" />,
    },
    {
      label: "Total P&L",
      value: fmt(summary?.total_pnl, "$"),
      icon: <TrendingUp size={18} className="text-gray-500" />,
      colorClass: pnlColor(summary?.total_pnl),
    },
    {
      label: "Monthly P&L",
      value: fmt(summary?.monthly_pnl, "$"),
      icon: <BarChart2 size={18} className="text-gray-500" />,
      colorClass: pnlColor(summary?.monthly_pnl),
    },
    {
      label: "Win Rate",
      value: summary?.win_rate != null ? `${summary.win_rate}%` : "—",
      icon: <Percent size={18} className="text-gray-500" />,
    },
  ];

  const chartData = balanceHistory.map((b) => ({
    date: new Date(b.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    balance: b.balance,
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-6 pb-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {session.user.name} · {summary?.strategy as string ?? "—"} · {summary?.exchange as string ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Bot Active
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 hover:text-white text-sm transition-colors"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-xs">{s.label}</span>
                {s.icon}
              </div>
              <div className={`text-2xl font-bold ${s.colorClass ?? "text-white"}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Balance chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-5">Balance Over Time</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={70}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af" }}
                  itemStyle={{ color: "#f8ac07" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Balance"]}
                />
                <Line type="monotone" dataKey="balance" stroke="#f8ac07" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">
              No balance history yet
            </div>
          )}
        </div>

        {/* Open positions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4">Open Positions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left text-xs">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Side</th>
                  <th className="pb-3 pr-4">Size</th>
                  <th className="pb-3 pr-4">Entry</th>
                  <th className="pb-3 pr-4">Current</th>
                  <th className="pb-3">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-600">No open positions</td></tr>
                ) : positions.map((p) => (
                  <tr key={p.id as string} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 pr-4 text-white font-medium">{p.symbol as string}</td>
                    <td className={`py-3 pr-4 font-medium ${p.side === "long" ? "text-green-400" : "text-red-400"}`}>
                      {(p.side as string).toUpperCase()}
                    </td>
                    <td className="py-3 pr-4 text-gray-300">{p.size as string}</td>
                    <td className="py-3 pr-4 text-gray-300">${p.entry_price as string}</td>
                    <td className="py-3 pr-4 text-gray-300">${p.current_price as string}</td>
                    <td className={`py-3 font-medium ${pnlColor(p.unrealized_pnl)}`}>
                      {fmt(p.unrealized_pnl, "$")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade history */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">
            Trade History
            {trades.length > 0 && <span className="text-gray-500 text-sm font-normal ml-2">last {trades.length} trades</span>}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left text-xs">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Side</th>
                  <th className="pb-3 pr-4">Size</th>
                  <th className="pb-3 pr-4">Entry</th>
                  <th className="pb-3 pr-4">Exit</th>
                  <th className="pb-3">P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-600">No trade history yet</td></tr>
                ) : trades.map((t) => (
                  <tr key={t.id as string} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 pr-4 text-gray-400 text-xs">
                      {new Date(t.closed_at as string).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 text-white font-medium">{t.symbol as string}</td>
                    <td className={`py-3 pr-4 text-xs font-medium ${t.side === "long" ? "text-green-400" : "text-red-400"}`}>
                      {(t.side as string).toUpperCase()}
                    </td>
                    <td className="py-3 pr-4 text-gray-300">{t.size as string}</td>
                    <td className="py-3 pr-4 text-gray-300">${t.entry_price as string}</td>
                    <td className="py-3 pr-4 text-gray-300">${t.exit_price as string}</td>
                    <td className={`py-3 font-medium ${pnlColor(t.pnl)}`}>{fmt(t.pnl, "$")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
