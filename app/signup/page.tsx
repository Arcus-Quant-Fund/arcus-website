"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, ChevronRight, ChevronLeft, Shield, Eye, EyeOff,
  AlertTriangle, Info, Lock, Copy, Check, ExternalLink
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  // Step 1
  fullName: string;
  email: string;
  phone: string;
  country: string;
  startingCapital: string;
  // Step 2
  agreedNDA: boolean;
  agreedParticipation: boolean;
  agreedRisk: boolean;
  // Step 3
  confirmedSubAccount: boolean;
  // Step 4
  confirmedMargin: boolean;
  // Step 5
  binanceUID: string;
  apiKey: string;
  apiSecret: string;
  confirmedPermissions: boolean;
}

const STEPS = [
  "Your Details",
  "Legal Agreements",
  "Open Sub-Account",
  "Fund & Enable Margin",
  "API Keys",
  "All Done",
];

const CAPITAL_OPTIONS = [
  "$1,000 – $5,000",
  "$5,000 – $20,000",
  "$20,000 – $50,000",
  "$50,000 – $100,000",
  "$100,000+",
];

const COUNTRIES = [
  "Bangladesh", "United Arab Emirates", "United States", "United Kingdom",
  "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Jordan",
  "Malaysia", "Indonesia", "Pakistan", "India", "Turkey", "Egypt",
  "Nigeria", "Singapore", "Canada", "Australia", "Germany", "France",
  "Other",
];


// ─── Sub-components ───────────────────────────────────────────────────────────
function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-amber-950/30 border border-amber-700/40 rounded-xl p-4 text-sm text-amber-200/90 leading-relaxed">
      <Info size={16} className="text-gold flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 bg-red-950/30 border border-red-700/40 rounded-xl p-4 text-sm text-red-300 leading-relaxed">
      <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

function StepNum({ n, label }: { n: number; label: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gold text-black font-bold text-xs flex items-center justify-center">
        {n}
      </div>
      <p className="text-gray-200 leading-relaxed pt-0.5">{label}</p>
    </div>
  );
}

function MonoTag({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-800 text-gold font-mono text-sm px-2 py-0.5 rounded">
      {children}
    </code>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-800" />
      <span className="text-xs text-gray-500 uppercase tracking-widest">{title}</span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  );
}

// ─── Permission row ───────────────────────────────────────────────────────────
function PermRow({ allowed, label, sub }: { allowed: boolean; label: string; sub?: string }) {
  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-800/60 last:border-0`}>
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
        allowed ? "bg-emerald-900/60 text-emerald-400" : "bg-red-900/40 text-red-400"
      }`}>
        {allowed ? <Check size={13} /> : <span className="text-xs font-bold">✕</span>}
      </div>
      <div>
        <p className={`text-sm font-medium ${allowed ? "text-white" : "text-gray-400"}`}>{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {!allowed && (
        <span className="ml-auto text-xs font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded flex-shrink-0">
          NEVER
        </span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    fullName: "", email: "", phone: "", country: "", startingCapital: "",
    agreedNDA: false, agreedParticipation: false, agreedRisk: false,
    confirmedSubAccount: false, confirmedMargin: false,
    binanceUID: "", apiKey: "", apiSecret: "",
    confirmedPermissions: false,
  });

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ── copy helper ──
  const copyToClipboard = (text: string, tag: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── validation ──
  const canNext = () => {
    if (step === 0) return form.fullName && form.email && form.country && form.startingCapital;
    if (step === 1) return form.agreedNDA && form.agreedParticipation && form.agreedRisk;
    if (step === 2) return form.confirmedSubAccount;
    if (step === 3) return form.confirmedMargin;
    if (step === 4) return form.apiKey && form.apiSecret && form.confirmedPermissions;
    return true;
  };

  // ── submit ──
  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          startingCapital: form.startingCapital,
          binanceUID: form.binanceUID,
          apiKey: form.apiKey,
          apiSecret: form.apiSecret,
          agreedNDA: form.agreedNDA,
          agreedParticipation: form.agreedParticipation,
          agreedRisk: form.agreedRisk,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setStep(5);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (step === 4) { handleSubmit(); return; }
    setStep((s) => s + 1);
  };
  const back = () => setStep((s) => s - 1);

  // ─── Progress bar ─────────────────────────────────────────────────────────
  const Progress = () => (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < step ? "bg-gold text-black" :
              i === step ? "bg-gold text-black ring-2 ring-gold/30 ring-offset-2 ring-offset-[#0a0a0a]" :
              "bg-gray-800 text-gray-500"
            }`}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-center hidden md:block leading-tight text-[10px] transition-colors ${
              i === step ? "text-gold" : i < step ? "text-gray-400" : "text-gray-600"
            }`} style={{ maxWidth: 70 }}>
              {label}
            </span>
          </div>
        ))}
      </div>
      {/* connector line */}
      <div className="h-px bg-gray-800 relative -mt-[22px] mb-3 mx-4 hidden md:block">
        <div
          className="absolute top-0 left-0 h-full bg-gold transition-all duration-500"
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-center md:hidden">
        Step {step + 1} of {STEPS.length}: <span className="text-gold">{STEPS[step]}</span>
      </p>
    </div>
  );

  // ─── Step renderers ───────────────────────────────────────────────────────

  // STEP 0 — Your Details
  const StepDetails = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Tell us about yourself</h2>
      <p className="text-gray-400 mb-8 text-sm">This helps us set up your account correctly.</p>

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            placeholder="e.g. Ahmed Al-Rashid"
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Email Address <span className="text-red-400">*</span></label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1.5">Your confirmation and dashboard access will be sent here.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Phone / WhatsApp <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            type="tel"
            placeholder="+971 50 123 4567"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Country of Residence <span className="text-red-400">*</span></label>
          <select
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold transition-colors appearance-none"
          >
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Estimated Starting Capital <span className="text-red-400">*</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CAPITAL_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => set("startingCapital", opt)}
                className={`px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all ${
                  form.startingCapital === opt
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Minimum recommended: $1,000. Higher capital enables more positions and better diversification.</p>
        </div>
      </div>
    </div>
  );

  // STEP 1 — Legal Agreements
  const StepLegal = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Review & agree to our terms</h2>
      <p className="text-gray-400 mb-8 text-sm">
        Read each summary carefully. Full documents are available on request at{" "}
        <a href="mailto:info@arcusquantfund.com" className="text-gold hover:underline">info@arcusquantfund.com</a>.
      </p>

      {/* NDA */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock size={16} className="text-gold" />
          <h3 className="text-white font-semibold">Non-Disclosure Agreement (NDA)</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-4">
          You agree to keep all information about Arcus Quant Fund's trading methodology, system
          configurations, strategy parameters, and proprietary data strictly confidential. You may
          not share, reproduce, or disclose this information to any third party without prior
          written consent. This protects our intellectual property and the interests of all
          participants.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.agreedNDA}
            onChange={(e) => set("agreedNDA", e.target.checked)}
            className="mt-1 w-4 h-4 accent-gold flex-shrink-0"
          />
          <span className="text-sm text-gray-300">
            I have read and agree to the <span className="text-white font-medium">Non-Disclosure Agreement</span>
          </span>
        </label>
      </div>

      {/* Participation Agreement */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-gold" />
          <h3 className="text-white font-semibold">Participation & Service Agreement</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-3">
          You are engaging Arcus Quant Fund to operate algorithmic trading strategies on your
          behalf via secure, trade-only API access to your Binance account. Key terms:
        </p>
        <ul className="text-gray-400 text-sm space-y-1.5 mb-4 ml-4 list-disc">
          <li>Your capital remains in your own Binance account at all times — Arcus cannot withdraw or transfer funds</li>
          <li>You retain full custody and can revoke API access at any moment</li>
          <li>Performance fee: <span className="text-gold font-semibold">35% of net monthly profits</span> — no management fee</li>
          <li>High-water mark applies: no fee is charged on previously lost capital</li>
          <li>No profit = no fee. You can exit the arrangement at any time</li>
        </ul>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.agreedParticipation}
            onChange={(e) => set("agreedParticipation", e.target.checked)}
            className="mt-1 w-4 h-4 accent-gold flex-shrink-0"
          />
          <span className="text-sm text-gray-300">
            I have read and agree to the <span className="text-white font-medium">Participation & Service Agreement</span>
          </span>
        </label>
      </div>

      {/* Risk Disclosure */}
      <div className="bg-gray-900 border border-red-900/40 rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-400" />
          <h3 className="text-white font-semibold">Risk Disclosure Statement</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-3">
          Cryptocurrency trading and the use of leverage involves <strong className="text-red-300">substantial risk of loss,
          including the total loss of your invested capital</strong>. By participating, you acknowledge:
        </p>
        <ul className="text-gray-400 text-sm space-y-1.5 mb-4 ml-4 list-disc">
          <li>Trading results can be negative — losses are possible in any month</li>
          <li>Leverage amplifies both gains and losses</li>
          <li>Cryptocurrency markets can move rapidly and unpredictably</li>
          <li>Past performance does not guarantee future results</li>
          <li>This arrangement is <span className="text-red-300 font-medium">not a regulated financial product</span> — you do not benefit from investor protection schemes</li>
          <li>You should only allocate capital you can afford to lose entirely</li>
        </ul>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.agreedRisk}
            onChange={(e) => set("agreedRisk", e.target.checked)}
            className="mt-1 w-4 h-4 accent-gold flex-shrink-0"
          />
          <span className="text-sm text-gray-300">
            I have read the <span className="text-white font-medium">Risk Disclosure Statement</span> and
            understand I may lose my entire invested capital
          </span>
        </label>
      </div>
    </div>
  );

  // STEP 2 — Open Sub-Account
  const StepSubAccount = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Open a Binance Sub-Account</h2>
      <p className="text-gray-400 mb-5 text-sm">
        We strongly recommend a dedicated sub-account — this keeps your Arcus trading funds
        completely separate from your personal assets.
      </p>

      <InfoBox>
        <strong>Why a sub-account?</strong> Your main Binance account and all its assets remain
        completely untouched. The sub-account is used exclusively for Arcus trading, giving you
        clear visibility, cleaner records, and one-click shutdown at any time.
      </InfoBox>

      <SectionDivider title="Step-by-step" />

      <div className="flex flex-col gap-1 mb-6">
        <StepNum n={1} label={<>Log in to your <strong className="text-white">main</strong> Binance account at <a href="https://www.binance.com" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">binance.com</a></>} />
        <StepNum n={2} label={<>Click your <strong className="text-white">profile icon</strong> (top-right corner) → select <MonoTag>Sub-Account</MonoTag> from the dropdown menu</>} />
        <StepNum n={3} label={<>Click <MonoTag>Create Sub-Account</MonoTag> → fill in a descriptive label (e.g. <MonoTag>Arcus Trading</MonoTag>) and enter a dedicated email address for this sub-account</>} />
        <StepNum n={4} label="Binance will send a verification email to that address — open it and click the confirmation link" />
        <StepNum n={5} label={<>Log in to the sub-account using the new email address. You can switch between accounts using the account switcher at the top of Binance.</>} />
        <StepNum n={6} label={<>Set up <strong className="text-white">2-Factor Authentication (2FA)</strong> on the sub-account — use Google Authenticator or a similar app. This is required before creating API keys.</>} />
        <StepNum n={7} label="Confirm the sub-account is active and you can log into it — then come back here." />
      </div>

      <InfoBox>
        <strong>Already have a suitable account?</strong> If you already have a separate Binance
        account you'd like to use exclusively for Arcus trading, that works too — simply proceed
        to the next step.
      </InfoBox>

      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.confirmedSubAccount}
            onChange={(e) => set("confirmedSubAccount", e.target.checked)}
            className="mt-1 w-4 h-4 accent-gold flex-shrink-0"
          />
          <span className="text-sm text-gray-300">
            I have created (or have ready) a Binance account dedicated to Arcus trading, and I am
            currently logged into it
          </span>
        </label>
      </div>
    </div>
  );

  // STEP 3 — Fund & Enable Margin
  const StepMargin = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Fund your account & enable margin</h2>
      <p className="text-gray-400 mb-5 text-sm">
        Complete both parts below while logged into your Arcus sub-account.
      </p>

      {/* Part A */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center">A</span>
          Transfer Funds to Your Sub-Account
        </h3>

        <div className="flex flex-col gap-1 mb-4">
          <StepNum n={1} label={<>In your <strong className="text-white">main</strong> Binance account: go to <MonoTag>Wallet</MonoTag> → <MonoTag>Overview</MonoTag></>} />
          <StepNum n={2} label={<>Click <MonoTag>Transfer</MonoTag> → choose <MonoTag>To Sub-Account</MonoTag></>} />
          <StepNum n={3} label="Select your Arcus sub-account from the dropdown" />
          <StepNum n={4} label={<>Enter your amount in <strong className="text-white">USDT</strong> and confirm the transfer</>} />
          <StepNum n={5} label="Funds appear in your sub-account Spot wallet within seconds" />
        </div>

        <InfoBox>
          <strong>Recommended minimum: $1,000 USDT.</strong> The strategy is designed for accounts
          in the $1,000–$50,000+ range. Starting with at least $1,000 ensures adequate margin for
          position sizing.
        </InfoBox>
      </div>

      {/* Part B */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center">B</span>
          Enable Isolated Margin Trading
        </h3>

        <div className="flex flex-col gap-1 mb-4">
          <StepNum n={1} label={<>In your sub-account: go to <MonoTag>Wallet</MonoTag> → <MonoTag>Margin</MonoTag></>} />
          <StepNum n={2} label={<>Click <MonoTag>Open</MonoTag> next to <strong className="text-white">Isolated Margin</strong> → read and accept the margin trading agreement</>} />
          <StepNum n={3} label={<>Navigate to the <MonoTag>Isolated</MonoTag> tab → search for <MonoTag>XRPUSDT</MonoTag></>} />
          <StepNum n={4} label={<>Click <MonoTag>Enable</MonoTag> next to XRPUSDT to activate the trading pair</>} />
        </div>

        <WarnBox>
          <strong>Isolated Margin only.</strong> Do NOT enable Cross Margin. Isolated margin
          limits potential losses to the funds allocated to each individual position — your entire
          account balance is never at risk on a single trade.
        </WarnBox>
      </div>

      <div className="mt-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.confirmedMargin}
            onChange={(e) => set("confirmedMargin", e.target.checked)}
            className="mt-1 w-4 h-4 accent-gold flex-shrink-0"
          />
          <span className="text-sm text-gray-300">
            I have transferred funds to my sub-account and enabled Isolated Margin for XRPUSDT
          </span>
        </label>
      </div>
    </div>
  );

  // STEP 4 — API Keys
  const StepAPIKeys = () => (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Create & submit your API keys</h2>
      <p className="text-gray-400 mb-5 text-sm">
        API keys allow our system to trade on your account. Follow these steps exactly — the
        permissions below ensure we can <strong className="text-white">never</strong> withdraw your funds.
      </p>

      {/* Instructions */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">
        <h3 className="text-white font-semibold mb-4">How to create your API key</h3>

        <div className="flex flex-col gap-1 mb-5">
          <StepNum n={1} label={<>While logged into your <strong className="text-white">Arcus sub-account</strong>: click your profile icon (top-right) → <MonoTag>API Management</MonoTag></>} />
          <StepNum n={2} label={<>Click <MonoTag>Create API</MonoTag> → select <MonoTag>System-generated</MonoTag></>} />
          <StepNum n={3} label={<>Enter a label: <MonoTag>Arcus Bot</MonoTag> → click <MonoTag>Next</MonoTag></>} />
          <StepNum n={4} label={<>Configure permissions <strong className="text-white">exactly</strong> as shown in the table below</>} />
          <StepNum n={5} label={<>Under <MonoTag>IP Access Restriction</MonoTag>: select <MonoTag>Restrict access to trusted IPs only</MonoTag></>} />
          <StepNum n={6} label={<>Add <strong className="text-white">both</strong> of the following IPs (click Add after each):</>} />
        </div>

        {/* IP addresses */}
        <div className="bg-gray-950 border border-gray-700 rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Arcus Server IPs — Whitelist Both</p>
          {["103.91.230.97", "144.24.114.54"].map((ip) => (
            <div key={ip} className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2.5 mb-2 last:mb-0">
              <code className="text-gold font-mono text-sm">{ip}</code>
              <button
                onClick={() => copyToClipboard(ip, ip)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                {copied === ip ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied === ip ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <StepNum n={7} label={<>Click <MonoTag>Save</MonoTag> → confirm with your 2FA code</>} />
          <StepNum n={8} label={<><strong className="text-red-300">IMMEDIATELY</strong> copy both your API Key and API Secret — the Secret is shown <strong className="text-white">only once</strong> and cannot be retrieved again</>} />
        </div>
      </div>

      {/* Permissions table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-5">
        <h3 className="text-white font-semibold mb-1">Required permissions</h3>
        <p className="text-gray-500 text-sm mb-4">Set these exactly. Nothing more, nothing less.</p>

        <PermRow allowed label="Enable Reading" sub="Required to monitor positions and account balance" />
        <PermRow allowed label="Enable Spot & Margin Trading" sub="Required to open and close positions" />
        <PermRow allowed label="Enable Margin Loan, Repayment & Transfer" sub="Required for margin management operations" />
        <PermRow allowed={false} label="Enable Withdrawals" sub="Never share this — Arcus does not need it" />
        <PermRow allowed={false} label="Enable Internal Transfer" sub="Not required and should remain disabled" />
        <PermRow allowed={false} label="Enable Universal Transfer" sub="Not required and should remain disabled" />
      </div>

      <WarnBox>
        <strong>API Secret security.</strong> Your API Secret is sent directly and securely to our
        admin team via encrypted email. It is <strong>not stored</strong> in any database. Our team
        uses it only to configure your trading bot. You can delete and regenerate API keys on
        Binance at any time — revoking access instantly.
      </WarnBox>

      {/* Form fields */}
      <SectionDivider title="Enter your details" />

      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Binance Sub-Account UID <span className="text-gray-500 font-normal">(optional but recommended)</span>
          </label>
          <input
            type="text"
            placeholder="Found in: Profile → Dashboard on your sub-account"
            value={form.binanceUID}
            onChange={(e) => set("binanceUID", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            API Key <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            placeholder="Paste your API Key here"
            value={form.apiKey}
            onChange={(e) => set("apiKey", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            API Secret <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showSecret ? "text" : "password"}
              placeholder="Paste your API Secret here"
              value={form.apiSecret}
              onChange={(e) => set("apiSecret", e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-gold transition-colors font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
            <Lock size={11} className="text-gray-500" />
            Sent securely to admin via email only — never stored in our database
          </p>
        </div>

        {/* Confirmation checkbox */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.confirmedPermissions}
              onChange={(e) => set("confirmedPermissions", e.target.checked)}
              className="mt-1 w-4 h-4 accent-gold flex-shrink-0"
            />
            <span className="text-sm text-gray-300">
              I confirm I have set the IP whitelist to both Arcus IPs, have{" "}
              <strong className="text-white">not</strong> enabled Withdrawals or Transfer
              permissions, and the API key above was generated on my Arcus sub-account
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl p-4 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );

  // STEP 5 — Confirmation
  const StepDone = () => (
    <div className="text-center py-4">
      <div className="w-20 h-20 rounded-full bg-emerald-900/40 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={40} className="text-emerald-400" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">You're all set!</h2>
      <p className="text-gray-400 mb-10 text-sm max-w-md mx-auto">
        Your application has been received and your API credentials sent securely to our team.
        Here's what happens next.
      </p>

      <div className="text-left max-w-md mx-auto mb-10">
        {[
          {
            icon: "1",
            title: "API Verification — within 2 hours",
            desc: "We verify your API key connectivity and confirm the permissions and IP whitelist are correct.",
          },
          {
            icon: "2",
            title: "Bot Goes Live — within 24 hours",
            desc: "Your trading bot is deployed and begins executing the DC VWAP strategy on your account.",
          },
          {
            icon: "3",
            title: "Dashboard Access",
            desc: "You'll receive an email with your private dashboard login — monitor every trade, position, and P&L in real time.",
          },
          {
            icon: "4",
            title: "Monthly Reports & Performance Fee",
            desc: "At the end of each month you receive a detailed performance report. Our 35% performance fee is charged only on net profits.",
          },
        ].map((item) => (
          <div key={item.icon} className="flex items-start gap-4 mb-5">
            <div className="w-9 h-9 rounded-full bg-gold text-black font-bold text-sm flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            <div className="pt-0.5">
              <p className="text-white font-semibold text-sm mb-0.5">{item.title}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-950/20 border border-amber-700/30 rounded-2xl p-5 text-left mb-8">
        <p className="text-amber-300 font-semibold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle size={15} /> Keep your account active
        </p>
        <ul className="text-amber-200/80 text-sm space-y-1.5 list-disc ml-4">
          <li>Keep your Binance sub-account funded — don't transfer funds out entirely</li>
          <li>Do not delete or modify the <strong className="text-amber-200">Arcus Bot</strong> API key</li>
          <li>Do not change the IP whitelist on the API key</li>
          <li>To stop trading instantly: delete the API key on Binance — the bot stops within seconds</li>
        </ul>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        Questions? Email us at{" "}
        <a href="mailto:info@arcusquantfund.com" className="text-gold hover:underline">
          info@arcusquantfund.com
        </a>{" "}
        or reply to your confirmation email.
      </p>

      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 border border-gold/40 hover:border-gold text-gold hover:text-white text-sm font-medium rounded-xl transition-colors"
      >
        Back to Homepage <ExternalLink size={14} />
      </Link>
    </div>
  );

  // ─── Render step content ──────────────────────────────────────────────────
  const stepContent = [
    <StepDetails key={0} />,
    <StepLegal key={1} />,
    <StepSubAccount key={2} />,
    <StepMargin key={3} />,
    <StepAPIKeys key={4} />,
    <StepDone key={5} />,
  ];

  // ─── Layout ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-semibold text-gold bg-gold/10 border border-gold/20 px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
            Client Onboarding
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Activate Your <span className="gradient-text">Trading Bot</span>
          </h1>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Complete the steps below — takes about 15 minutes. A member of our team is available to
            guide you on a live call if needed.
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 md:p-10">
          {step < 5 && <Progress />}
          <div>{stepContent[step]}</div>

          {/* Navigation */}
          {step < 5 && (
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-800">
              {step > 0 ? (
                <button
                  onClick={back}
                  disabled={submitting}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={next}
                disabled={!canNext() || submitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                  canNext() && !submitting
                    ? "bg-gold hover:bg-gold-dark text-white"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting…
                  </>
                ) : step === 4 ? (
                  <>Submit Application <ChevronRight size={16} /></>
                ) : (
                  <>Continue <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Trust signals */}
        {step < 5 && (
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><Lock size={12} className="text-gray-600" /> 256-bit TLS encryption</span>
            <span className="flex items-center gap-1.5"><Shield size={12} className="text-gray-600" /> API secret never stored</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-gray-600" /> No withdrawal permissions required</span>
          </div>
        )}

        {/* Need help */}
        {step < 5 && (
          <p className="text-center text-gray-500 text-xs mt-6">
            Need a hand?{" "}
            <a
              href="mailto:info@arcusquantfund.com"
              className="text-gold hover:underline"
            >
              Email us
            </a>{" "}
            to schedule a live setup call — we&apos;ll walk you through every step in under 15 minutes.
          </p>
        )}
      </div>
    </div>
  );
}
