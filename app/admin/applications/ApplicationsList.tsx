"use client";

import { useState } from "react";

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string;
  fiat_currency: string | null;
  starting_capital: string;
  binance_uid: string | null;
  api_key: string;
  status: string;
  notes: string | null;
  bot_id: string | null;
  client_uuid: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  api_validated: "bg-yellow-900 text-yellow-300 border-yellow-700",
  pending:       "bg-orange-900 text-orange-300 border-orange-700",
  provisioning:  "bg-blue-900  text-blue-300  border-blue-700",
  active:        "bg-green-900 text-green-300 border-green-700",
  rejected:      "bg-red-900   text-red-300   border-red-700",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-gray-800 text-gray-300 border-gray-600";
  return (
    <span className={`inline-block border rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function maskKey(key: string) {
  if (!key || key.length < 8) return key;
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}

export default function ApplicationsList({ applications }: { applications: Application[] }) {
  const [apps, setApps] = useState(applications);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  // Per-app fee input: keyed by appId, value is a string like "35"
  const [feeInputs, setFeeInputs] = useState<Record<string, string>>({});

  function getFee(appId: string): string {
    return feeInputs[appId] ?? "35";
  }

  async function handleApprove(app: Application) {
    const feeStr = getFee(app.id);
    const feePct = parseFloat(feeStr);
    if (isNaN(feePct) || feePct < 5 || feePct > 60) {
      setMsg({ id: app.id, text: "Performance fee must be between 5% and 60%.", ok: false });
      return;
    }

    setLoading(app.id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          profitSharePct: feePct / 100,          // convert % → decimal
          fiatCurrency: app.fiat_currency ?? "USD",
        }),
      });
      const data = await res.json() as {
        success?: boolean; botId?: string; message?: string; error?: string;
      };
      if (res.ok && data.success) {
        setMsg({
          id: app.id,
          text: `✓ ${data.message ?? "Approved"} · Bot: ${data.botId} · Fee: ${feePct}%`,
          ok: true,
        });
        setApps((prev) =>
          prev.map((a) => (a.id === app.id ? { ...a, status: "provisioning", bot_id: data.botId ?? a.bot_id } : a))
        );
      } else {
        setMsg({ id: app.id, text: data.error ?? "Unknown error", ok: false });
      }
    } catch (e) {
      setMsg({ id: app.id, text: String(e), ok: false });
    } finally {
      setLoading(null);
    }
  }

  async function handleResend(app: Application) {
    if (!app.client_uuid) {
      setMsg({ id: app.id, text: "No client UUID — app not yet approved.", ok: false });
      return;
    }
    if (!confirm(`Resend login credentials to ${app.email}? A new password will be generated.`)) return;
    setLoading(app.id);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/resend-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUuid: app.client_uuid }),
      });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      setMsg({ id: app.id, text: data.message ?? data.error ?? (res.ok ? "Credentials resent." : "Error"), ok: res.ok && !!data.success });
    } catch (e) {
      setMsg({ id: app.id, text: String(e), ok: false });
    } finally {
      setLoading(null);
    }
  }

  async function handleDecline(appId: string) {
    if (!confirm("Decline this application? Status will be set to 'rejected'.")) return;
    setLoading(appId);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        setMsg({ id: appId, text: "Application declined.", ok: true });
        setApps((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: "rejected" } : a))
        );
      } else {
        setMsg({ id: appId, text: data.error ?? "Error", ok: false });
      }
    } catch (e) {
      setMsg({ id: appId, text: String(e), ok: false });
    } finally {
      setLoading(null);
    }
  }

  if (apps.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-[#0d0d0d] p-16 text-center">
        <p className="text-gray-500 text-lg">No applications yet.</p>
        <p className="text-gray-600 text-sm mt-2">New submissions will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {apps.map((app) => {
        const isOpen = expanded === app.id;
        const isLoading = loading === app.id;
        const appMsg = msg?.id === app.id ? msg : null;
        const canApprove = ["api_validated", "pending"].includes(app.status);

        return (
          <div
            key={app.id}
            className="rounded-xl border border-gray-800 bg-[#0d0d0d] overflow-hidden"
          >
            {/* ── Summary row ── */}
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#111] transition-colors"
              onClick={() => setExpanded(isOpen ? null : app.id)}
            >
              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{app.full_name}</p>
                <p className="text-gray-400 text-sm truncate">{app.email}</p>
              </div>

              {/* Country + capital */}
              <div className="hidden sm:block w-32 text-right">
                <p className="text-[#f8ac07] font-bold text-sm">{app.starting_capital}</p>
                <p className="text-gray-500 text-xs">{app.country}{app.fiat_currency ? ` · ${app.fiat_currency}` : ""}</p>
              </div>

              {/* Bot ID if assigned */}
              {app.bot_id && (
                <div className="hidden md:block w-16 text-center">
                  <span className="font-mono text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                    {app.bot_id.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Status */}
              <div className="w-28 text-right">
                <StatusBadge status={app.status} />
              </div>

              {/* Date */}
              <div className="hidden lg:block w-28 text-right text-gray-500 text-xs">
                {new Date(app.created_at).toLocaleDateString()}
              </div>

              {/* Expand arrow */}
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* ── Expanded detail ── */}
            {isOpen && (
              <div className="border-t border-gray-800 px-5 pb-5 pt-4 space-y-4">

                {/* Info grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Phone</p>
                    <p className="text-gray-200">{app.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Binance UID</p>
                    <p className="font-mono text-gray-200">{app.binance_uid || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Report Currency</p>
                    <p className="font-mono text-gray-200">{app.fiat_currency || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">API Key</p>
                    <p className="font-mono text-gray-200 break-all">{maskKey(app.api_key)}</p>
                  </div>
                  {app.client_uuid && (
                    <div>
                      <p className="text-gray-500 text-xs mb-0.5">Client UUID</p>
                      <p className="font-mono text-gray-400 text-xs break-all">{app.client_uuid}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 text-xs mb-0.5">Application ID</p>
                    <p className="font-mono text-gray-400 text-xs">{app.id}</p>
                  </div>
                  {app.notes && (
                    <div className="col-span-2">
                      <p className="text-gray-500 text-xs mb-0.5">Notes</p>
                      <p className="text-red-300 text-sm">{app.notes}</p>
                    </div>
                  )}
                </div>

                {/* ── Fee input (only when can approve) ── */}
                {canApprove && (
                  <div className="bg-[#0a0a0a] border border-gray-700 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">
                      Approval Settings
                    </p>
                    <div className="flex items-end gap-4 flex-wrap">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">
                          Performance Fee %
                          <span className="text-gray-600 ml-1 font-normal">(charged on net monthly profit)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="5"
                            max="60"
                            step="0.5"
                            value={getFee(app.id)}
                            onChange={(e) => setFeeInputs((prev) => ({ ...prev, [app.id]: e.target.value }))}
                            className="w-24 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-[#f8ac07] transition-colors"
                          />
                          <span className="text-gray-400 text-sm font-medium">%</span>
                          <div className="flex gap-1 ml-1">
                            {[25, 30, 35, 40, 50].map((pct) => (
                              <button
                                key={pct}
                                onClick={() => setFeeInputs((prev) => ({ ...prev, [app.id]: String(pct) }))}
                                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                                  getFee(app.id) === String(pct)
                                    ? "bg-[#f8ac07] text-black"
                                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1.5">
                          High-water mark applies — no fee on previously lost capital.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Report Currency</label>
                        <p className="text-sm font-mono text-gray-200 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
                          {app.fiat_currency || "USD"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message */}
                {appMsg && (
                  <div className={`rounded-lg px-4 py-3 text-sm font-medium ${appMsg.ok ? "bg-green-950 text-green-300 border border-green-800" : "bg-red-950 text-red-300 border border-red-800"}`}>
                    {appMsg.text}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  {canApprove && (
                    <button
                      onClick={() => handleApprove(app)}
                      disabled={isLoading}
                      className="px-5 py-2 rounded-lg bg-[#f8ac07] text-black font-bold text-sm hover:bg-[#e09c06] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? "Approving…" : `✓ Approve & Provision (${getFee(app.id)}% fee)`}
                    </button>
                  )}
                  {canApprove && (
                    <button
                      onClick={() => handleDecline(app.id)}
                      disabled={isLoading}
                      className="px-5 py-2 rounded-lg border border-red-800 text-red-400 font-semibold text-sm hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Decline
                    </button>
                  )}
                  {(app.status === "active" || app.status === "provisioning") && (
                    <button
                      onClick={() => handleResend(app)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-lg border border-gray-700 text-gray-400 font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? "Sending…" : "↺ Resend Login"}
                    </button>
                  )}
                  {app.status === "active" && (
                    <span className="px-4 py-2 text-green-400 text-sm font-medium">
                      ✓ Bot is live
                    </span>
                  )}
                  {app.status === "provisioning" && (
                    <span className="px-4 py-2 text-blue-400 text-sm font-medium animate-pulse">
                      ⏳ Oracle provisioning…
                    </span>
                  )}
                  {app.status === "rejected" && (
                    <span className="px-4 py-2 text-red-400 text-sm">
                      Application declined
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
