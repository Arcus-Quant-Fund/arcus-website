"use client";
import { useState } from "react";

type State = "idle" | "running" | "ok" | "err";

export default function QuickActions() {
  const [states, setStates] = useState<Record<string, State>>({});
  const [msgs,   setMsgs]   = useState<Record<string, string>>({});

  async function run(action: string) {
    setStates(s => ({ ...s, [action]: "running" }));
    try {
      const res  = await fetch("/api/admin/trigger", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      const msg  = json.message ?? json.error ?? (res.ok ? "Done" : `HTTP ${res.status}`);
      setStates(s => ({ ...s, [action]: res.ok ? "ok" : "err" }));
      setMsgs  (s => ({ ...s, [action]: String(msg) }));
    } catch {
      setStates(s => ({ ...s, [action]: "err" }));
      setMsgs  (s => ({ ...s, [action]: "Network error" }));
    }
  }

  const cronActions = [
    {
      action: "monthly-report",
      label:  "Trigger Monthly Report",
      desc:   "Compute P&L and send emails to all clients",
      icon:   "📧",
      cls:    "border-yellow-500/30 hover:border-yellow-500/60 hover:bg-yellow-500/5",
    },
    {
      action: "daily-snapshot",
      label:  "Trigger Daily Snapshot",
      desc:   "Force balance + BDT rate capture now",
      icon:   "📸",
      cls:    "border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5",
    },
  ];

  const linkActions = [
    {
      href:  "/api/admin/capital-event",
      label: "Record Capital Event",
      desc:  "Log a deposit or withdrawal",
      icon:  "💸",
      cls:   "border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5",
    },
    {
      href:  "/api/admin/fee-paid",
      label: "Mark Fee Paid",
      desc:  "Confirm performance fee received",
      icon:  "✅",
      cls:   "border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cronActions.map(a => {
        const st = states[a.action] ?? "idle";
        return (
          <button
            key={a.action}
            onClick={() => run(a.action)}
            disabled={st === "running"}
            className={`w-full border rounded-xl p-4 text-left transition-all disabled:opacity-60 cursor-pointer ${a.cls}`}
          >
            <div className="text-2xl mb-2">{a.icon}</div>
            <div className="text-white text-sm font-semibold">{a.label}</div>
            <div className="text-gray-600 text-xs mt-0.5">{a.desc}</div>
            {st !== "idle" && (
              <div className={`text-xs mt-2 font-medium ${
                st === "running" ? "text-yellow-400" :
                st === "ok"      ? "text-green-400"  : "text-red-400"
              }`}>
                {st === "running" ? "Running…" : st === "ok" ? `✓ ${msgs[a.action]}` : `✗ ${msgs[a.action]}`}
              </div>
            )}
          </button>
        );
      })}
      {linkActions.map(a => (
        <a
          key={a.href}
          href={a.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`block border rounded-xl p-4 transition-all ${a.cls}`}
        >
          <div className="text-2xl mb-2">{a.icon}</div>
          <div className="text-white text-sm font-semibold">{a.label}</div>
          <div className="text-gray-600 text-xs mt-0.5">{a.desc}</div>
        </a>
      ))}
    </div>
  );
}
