"use client";
import { useState } from "react";

type Client = { id: string; name: string; email: string };
type State = "idle" | "running" | "ok" | "err";

export default function QuickActions({ clients }: { clients: Client[] }) {
  const [states, setStates] = useState<Record<string, State>>({});
  const [msgs,   setMsgs]   = useState<Record<string, string>>({});
  const [modal,  setModal]  = useState<null | "capital-event" | "fee-paid">(null);

  // Capital Event form
  const [ceEmail,   setCeEmail]   = useState(clients[0]?.email ?? "");
  const [ceType,    setCeType]    = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [ceAmount,  setCeAmount]  = useState("");
  const [ceDate,    setCeDate]    = useState("");
  const [ceNotes,   setCeNotes]   = useState("");
  const [ceConfirm, setCeConfirm] = useState(false);
  const [ceDryResult, setCeDryResult] = useState<string | null>(null);

  // Fee Paid form
  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // previous month
  const defaultYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [fpEmail,  setFpEmail]  = useState(clients[0]?.email ?? "");
  const [fpYear,   setFpYear]   = useState(defaultYear);
  const [fpMonth,  setFpMonth]  = useState(defaultMonth);
  const [fpAmount, setFpAmount] = useState("");
  const [fpMethod, setFpMethod] = useState("Binance");
  const [fpRef,    setFpRef]    = useState("");

  const [formState, setFormState] = useState<State>("idle");
  const [formMsg,   setFormMsg]   = useState("");

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

  function openModal(m: "capital-event" | "fee-paid") {
    setModal(m);
    setFormState("idle");
    setFormMsg("");
    setCeDryResult(null);
    setCeConfirm(false);
    setCeAmount("");
    setFpAmount("");
    setFpRef("");
  }

  function closeModal() {
    setModal(null);
    setFormState("idle");
    setFormMsg("");
    setCeDryResult(null);
  }

  async function submitCapitalEvent() {
    const amt = parseFloat(ceAmount);
    if (!ceAmount || isNaN(amt) || amt <= 0) {
      setFormState("err");
      setFormMsg("Amount must be a positive number");
      return;
    }
    setFormState("running");
    setFormMsg("");
    setCeDryResult(null);
    try {
      const body: Record<string, unknown> = {
        client_email: ceEmail,
        event_type:   ceType,
        amount:       amt,
      };
      if (ceNotes)   body.notes       = ceNotes;
      if (ceDate)    body.occurred_at = new Date(ceDate).toISOString();
      if (ceConfirm) body.confirm     = true;

      const res  = await fetch("/api/admin/capital-event", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (json.preview) {
        setCeDryResult(json.warning ?? "Dry-run: no changes made. Check the box and resubmit to confirm.");
        setFormState("idle");
      } else if (res.ok) {
        setFormState("ok");
        setFormMsg(`Recorded ${ceType} of $${amt.toFixed(2)} USDT`);
      } else {
        setFormState("err");
        setFormMsg(json.error ?? `HTTP ${res.status}`);
      }
    } catch {
      setFormState("err");
      setFormMsg("Network error");
    }
  }

  async function submitFeePaid() {
    const amt = parseFloat(fpAmount);
    if (!fpAmount || isNaN(amt) || amt <= 0) {
      setFormState("err");
      setFormMsg("Amount must be a positive number");
      return;
    }
    setFormState("running");
    setFormMsg("");
    try {
      const body: Record<string, unknown> = {
        client_email:   fpEmail,
        year:           fpYear,
        month:          fpMonth,
        amount_paid:    amt,
        payment_method: fpMethod,
      };
      if (fpRef) body.transaction_ref = fpRef;

      const res  = await fetch("/api/admin/fee-paid", {
        method:  "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        setFormState("ok");
        const outstanding = json.outstanding ?? 0;
        setFormMsg(
          `Payment recorded — $${amt.toFixed(2)} via ${fpMethod}.` +
          (outstanding > 0.01 ? ` Outstanding: $${outstanding.toFixed(2)}` : " Fully settled ✓")
        );
      } else {
        setFormState("err");
        setFormMsg(json.error ?? `HTTP ${res.status}`);
      }
    } catch {
      setFormState("err");
      setFormMsg("Network error");
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

  const modalButtons = [
    {
      key:   "capital-event" as const,
      label: "Record Capital Event",
      desc:  "Log a deposit or withdrawal",
      icon:  "💸",
      cls:   "border-green-500/30 hover:border-green-500/60 hover:bg-green-500/5",
    },
    {
      key:   "fee-paid" as const,
      label: "Mark Fee Paid",
      desc:  "Confirm performance fee received",
      icon:  "✅",
      cls:   "border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5",
    },
  ];

  const linkButtons = [
    {
      href:  "/admin/applications",
      label: "Client Applications",
      desc:  "Review and approve new signups",
      icon:  "📋",
      cls:   "border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/5",
    },
  ];

  const inputCls = "w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400";
  const labelCls = "text-gray-400 text-xs mb-1 block";

  return (
    <>
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
        {modalButtons.map(a => (
          <button
            key={a.key}
            onClick={() => openModal(a.key)}
            className={`w-full border rounded-xl p-4 text-left transition-all cursor-pointer ${a.cls}`}
          >
            <div className="text-2xl mb-2">{a.icon}</div>
            <div className="text-white text-sm font-semibold">{a.label}</div>
            <div className="text-gray-600 text-xs mt-0.5">{a.desc}</div>
          </button>
        ))}
        {linkButtons.map(a => (
          <a
            key={a.href}
            href={a.href}
            className={`w-full border rounded-xl p-4 text-left transition-all cursor-pointer block no-underline ${a.cls}`}
          >
            <div className="text-2xl mb-2">{a.icon}</div>
            <div className="text-white text-sm font-semibold">{a.label}</div>
            <div className="text-gray-600 text-xs mt-0.5">{a.desc}</div>
          </a>
        ))}
      </div>

      {/* ── Capital Event Modal ── */}
      {modal === "capital-event" && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-5">
              Record Capital Event
            </h3>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Client</label>
                <select value={ceEmail} onChange={e => setCeEmail(e.target.value)} className={inputCls}>
                  {clients.map(c => (
                    <option key={c.email} value={c.email}>{c.name} — {c.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-2">
                  {(["DEPOSIT", "WITHDRAWAL"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setCeType(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                        ceType === t
                          ? t === "DEPOSIT"
                            ? "bg-green-500/20 border-green-500 text-green-400"
                            : "bg-red-500/20 border-red-500 text-red-400"
                          : "border-gray-600 text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelCls}>Amount (USDT)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={ceAmount} onChange={e => setCeAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Date &amp; Time (optional — defaults to now)</label>
                <input
                  type="datetime-local"
                  value={ceDate} onChange={e => setCeDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Notes (optional)</label>
                <input
                  type="text"
                  value={ceNotes} onChange={e => setCeNotes(e.target.value)}
                  placeholder="e.g. Initial capital"
                  className={inputCls}
                />
              </div>

              {ceDryResult && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-300 text-xs leading-relaxed">
                  {ceDryResult}
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ceConfirm} onChange={e => setCeConfirm(e.target.checked)}
                  className="mt-0.5 accent-green-500"
                />
                <span className="text-gray-400 text-xs leading-relaxed">
                  I have verified all fields and want to write to the database.
                  Leave unchecked for a dry-run preview first.
                </span>
              </label>

              {formMsg && (
                <div className={`text-xs font-medium ${formState === "ok" ? "text-green-400" : "text-red-400"}`}>
                  {formState === "ok" ? "✓ " : "✗ "}{formMsg}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 border border-gray-600 rounded-lg text-gray-400 text-sm hover:border-gray-400 transition-all"
              >
                {formState === "ok" ? "Close" : "Cancel"}
              </button>
              {formState !== "ok" && (
                <button
                  onClick={submitCapitalEvent}
                  disabled={formState === "running"}
                  className="flex-1 py-2.5 bg-green-500/20 border border-green-500/60 rounded-lg text-green-400 text-sm font-semibold hover:bg-green-500/30 disabled:opacity-60 transition-all"
                >
                  {formState === "running" ? "Submitting…" : ceConfirm ? "Submit" : "Preview (Dry Run)"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Fee Paid Modal ── */}
      {modal === "fee-paid" && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-5">
              Mark Performance Fee Paid
            </h3>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Client</label>
                <select value={fpEmail} onChange={e => setFpEmail(e.target.value)} className={inputCls}>
                  {clients.map(c => (
                    <option key={c.email} value={c.email}>{c.name} — {c.email}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={labelCls}>Year</label>
                  <input
                    type="number" value={fpYear}
                    onChange={e => setFpYear(parseInt(e.target.value) || defaultYear)}
                    className={inputCls}
                  />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Month (1–12)</label>
                  <input
                    type="number" min="1" max="12" value={fpMonth}
                    onChange={e => setFpMonth(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Amount Paid (USDT)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={fpAmount} onChange={e => setFpAmount(e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Payment Method</label>
                <select value={fpMethod} onChange={e => setFpMethod(e.target.value)} className={inputCls}>
                  <option>Binance</option>
                  <option>UCB Bank</option>
                  <option>Cash</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Transaction Reference (optional)</label>
                <input
                  type="text"
                  value={fpRef} onChange={e => setFpRef(e.target.value)}
                  placeholder="Binance tx ID / bank reference"
                  className={inputCls}
                />
              </div>

              {formMsg && (
                <div className={`text-xs font-medium ${formState === "ok" ? "text-green-400" : "text-red-400"}`}>
                  {formState === "ok" ? "✓ " : "✗ "}{formMsg}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 border border-gray-600 rounded-lg text-gray-400 text-sm hover:border-gray-400 transition-all"
              >
                {formState === "ok" ? "Close" : "Cancel"}
              </button>
              {formState !== "ok" && (
                <button
                  onClick={submitFeePaid}
                  disabled={formState === "running"}
                  className="flex-1 py-2.5 bg-purple-500/20 border border-purple-500/60 rounded-lg text-purple-400 text-sm font-semibold hover:bg-purple-500/30 disabled:opacity-60 transition-all"
                >
                  {formState === "running" ? "Submitting…" : "Record Payment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
