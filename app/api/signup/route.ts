import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Rate limiting (max 3 signup attempts per IP per hour) ────────────────────
const _rl = new Map<string, { count: number; reset: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = _rl.get(ip);
  if (!entry || entry.reset < now) {
    _rl.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

// ─── Encryption ───────────────────────────────────────────────────────────────
// Key derived from the Supabase service role key (already on Oracle server).
// Oracle's provision_bot.py derives the same key with hashlib.sha256().

function deriveKey(): Buffer {
  return crypto.createHash("sha256").update(process.env.SUPABASE_SERVICE_ROLE_KEY!).digest();
}

function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// ─── Binance permission validation ────────────────────────────────────────────

interface BinancePermissions {
  ipRestrict: boolean;
  enableWithdrawals: boolean;
  enableInternalTransfer: boolean;
  enableMargin: boolean;
  enableSpotAndMarginTrading: boolean;
  permitsUniversalTransfer: boolean;
}

type ValidationResult =
  | { valid: true; data: BinancePermissions }
  | { valid: false; error: string; field?: string };

async function validateBinancePermissions(
  apiKey: string,
  apiSecret: string
): Promise<ValidationResult> {
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");

  let resp: Response;
  try {
    resp = await fetch(
      `https://api.binance.com/sapi/v1/account/apiRestrictions?${queryString}&signature=${signature}`,
      {
        headers: { "X-MBX-APIKEY": apiKey },
        signal: AbortSignal.timeout(10_000),
      }
    );
  } catch {
    return { valid: false, error: "Could not reach Binance — check your internet connection and try again", field: "apiKey" };
  }

  const data = await resp.json() as BinancePermissions & { code?: number; msg?: string };

  if (!resp.ok) {
    if (data.code === -2014 || data.code === -2015) {
      return { valid: false, error: "Invalid API key — make sure you copied it correctly from Binance API Management", field: "apiKey" };
    }
    return { valid: false, error: data.msg ?? "Binance API error", field: "apiKey" };
  }

  if (!data.enableSpotAndMarginTrading) {
    return {
      valid: false,
      error: 'Permission missing: "Enable Spot & Margin Trading" must be checked in your API key settings',
      field: "apiKey",
    };
  }
  if (!data.enableMargin) {
    return {
      valid: false,
      error: 'Permission missing: "Enable Margin Loan, Repayment & Transfer" must be checked in your API key settings',
      field: "apiKey",
    };
  }
  if (data.enableWithdrawals) {
    return {
      valid: false,
      error: 'Security issue: "Enable Withdrawals" is turned ON — please disable it and try again. Arcus never needs withdrawal access.',
      field: "apiKey",
    };
  }
  if (data.permitsUniversalTransfer) {
    return {
      valid: false,
      error: '"Enable Universal Transfer" should be disabled — please uncheck it in API Management and try again',
      field: "apiKey",
    };
  }
  if (!data.ipRestrict) {
    return {
      valid: false,
      error: "IP restriction is not enabled — go to API Management → IP Access Restriction → select \"Restrict to trusted IPs only\" and add both Arcus IPs (103.91.230.97 and 144.24.114.54)",
      field: "apiKey",
    };
  }

  return { valid: true, data };
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function adminEmailHtml(d: {
  fullName: string; email: string; phone: string; country: string;
  startingCapital: string; binanceUID: string; apiKey: string; apiSecret: string;
  agreedAt: string;
}) {
  return `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px;">
  <h2 style="color:#f8ac07;margin-top:0;font-size:20px;">🟡 New Application — Binance Validated ✓</h2>
  <p style="color:#9ca3af;margin-top:-8px;margin-bottom:24px;font-size:14px;">Received: ${escHtml(d.agreedAt)} — All Binance permissions verified automatically</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
    <tr><td style="padding:7px 0;color:#9ca3af;width:180px;font-size:14px;">Full Name</td>
        <td style="padding:7px 0;color:#fff;font-weight:600;">${escHtml(d.fullName)}</td></tr>
    <tr><td style="padding:7px 0;color:#9ca3af;font-size:14px;">Email</td>
        <td style="padding:7px 0;color:#fff;">${escHtml(d.email)}</td></tr>
    <tr><td style="padding:7px 0;color:#9ca3af;font-size:14px;">Phone</td>
        <td style="padding:7px 0;color:#fff;">${escHtml(d.phone || "—")}</td></tr>
    <tr><td style="padding:7px 0;color:#9ca3af;font-size:14px;">Country</td>
        <td style="padding:7px 0;color:#fff;">${escHtml(d.country)}</td></tr>
    <tr><td style="padding:7px 0;color:#9ca3af;font-size:14px;">Starting Capital</td>
        <td style="padding:7px 0;color:#f8ac07;font-weight:700;">${escHtml(d.startingCapital)}</td></tr>
    <tr><td style="padding:7px 0;color:#9ca3af;font-size:14px;">Binance UID</td>
        <td style="padding:7px 0;color:#fff;font-family:monospace;">${escHtml(d.binanceUID || "—")}</td></tr>
    <tr><td style="padding:7px 0;color:#9ca3af;font-size:14px;">API Key</td>
        <td style="padding:7px 0;color:#fff;font-family:monospace;word-break:break-all;">${escHtml(d.apiKey)}</td></tr>
  </table>

  <div style="background:#1a0000;border:1.5px solid #7f1d1d;border-radius:8px;padding:16px;margin-bottom:24px;">
    <p style="color:#fca5a5;font-size:13px;margin:0 0 8px;font-weight:700;">🔐 API SECRET — encrypted in Supabase (api_secret_enc column)</p>
    <p style="color:#fff;font-family:monospace;font-size:13px;word-break:break-all;margin:0;
              background:#0a0a0a;padding:12px;border-radius:6px;border:1px solid #374151;">
      ${escHtml(d.apiSecret.slice(0, 6))}••••••••••••••••••••${escHtml(d.apiSecret.slice(-4))}
    </p>
    <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;">Full secret stored encrypted in Supabase. Decrypt via Oracle's provision_bot.py or the same AES-256 key.</p>
  </div>

  <div style="background:#111827;border-radius:8px;padding:16px;margin-bottom:16px;">
    <p style="color:#f8ac07;font-weight:700;margin:0 0 10px;">Next Steps</p>
    <ol style="color:#d1d5db;font-size:14px;line-height:1.9;padding-left:20px;margin:0;">
      <li>Review and approve at <a href="https://arcusquantfund.com/admin/applications" style="color:#f8ac07;">arcusquantfund.com/admin/applications</a></li>
      <li>One-click approve provisions the bot automatically on Oracle</li>
      <li>Client receives dashboard credentials by email when bot goes live</li>
    </ol>
  </div>
  <p style="color:#6b7280;font-size:12px;">Arcus Quant Fund — Automated Client Application System</p>
</div>`;
}

function clientEmailHtml(fullName: string) {
  const firstName = fullName.split(" ")[0];
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:28px;">
    <img src="https://arcusquantfund.com/logo.png" alt="Arcus Quant Fund" width="160" style="display:block;margin:0 auto 16px;" />
    <h1 style="color:#f8ac07;font-size:20px;margin:0;">Application Received ✓</h1>
    <p style="color:#9ca3af;margin:8px 0 0;font-size:13px;">Your API key has been verified — we're getting your bot ready.</p>
  </div>
  <p style="color:#e5e7eb;line-height:1.7;">Hi ${escHtml(firstName)},</p>
  <p style="color:#e5e7eb;line-height:1.7;">
    Your application has been received and your Binance API configuration has been verified.
    Our team will review your account and deploy your trading bot — you'll receive your dashboard
    login credentials once the bot is live.
  </p>
  <div style="background:#111827;border-radius:10px;padding:20px;margin:20px 0;">
    <p style="color:#f8ac07;font-weight:700;margin:0 0 12px;">Expected Timeline</p>
    <p style="color:#d1d5db;font-size:14px;margin:0 0 6px;">✅ <strong style="color:#fff;">Now:</strong> API verified, application under review</p>
    <p style="color:#d1d5db;font-size:14px;margin:0 0 6px;">⏳ <strong style="color:#fff;">Within 24 hours:</strong> Bot deployed, dashboard credentials emailed to you</p>
    <p style="color:#d1d5db;font-size:14px;margin:0;">📊 <strong style="color:#fff;">Monthly:</strong> Performance reports + performance fee on net profits only</p>
  </div>
  <p style="color:#e5e7eb;line-height:1.7;">
    Questions? Reply to this email or contact <a href="mailto:info@arcusquantfund.com" style="color:#f8ac07;">info@arcusquantfund.com</a>.
  </p>
  <p style="color:#e5e7eb;">— The Arcus Quant Fund Team</p>
  <hr style="border:none;border-top:1px solid #1f2937;margin:20px 0;" />
  <p style="color:#4b5563;font-size:11px;text-align:center;">
    Arcus Quant Fund · arcusquantfund.com<br/>
    This email contains confidential information intended solely for the recipient.
  </p>
</div>`;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait an hour before trying again." },
      { status: 429 }
    );
  }

  let body: Record<string, string | boolean>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    fullName, email, phone, country, startingCapital,
    binanceUID, apiKey, apiSecret,
    agreedNDA, agreedParticipation, agreedRisk,
  } = body as {
    fullName: string; email: string; phone: string; country: string;
    startingCapital: string; binanceUID: string; apiKey: string; apiSecret: string;
    agreedNDA: boolean; agreedParticipation: boolean; agreedRisk: boolean;
  };

  // ── Validate required fields ──
  if (!fullName || !email || !country || !startingCapital || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!agreedNDA || !agreedParticipation || !agreedRisk) {
    return NextResponse.json({ error: "All agreements must be accepted" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // ── Check for duplicate email ──
  const db = createServiceClient();
  const { data: existing } = await db
    .from("client_applications")
    .select("id, status")
    .eq("email", email)
    .limit(1)
    .single();
  if (existing) {
    const msg = ["rejected"].includes(existing.status)
      ? "A previous application for this email was declined. Please contact info@arcusquantfund.com."
      : "An application for this email already exists. Please contact info@arcusquantfund.com if you need help.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  // ── Validate Binance API permissions ──
  const validation = await validateBinancePermissions(apiKey, apiSecret);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error, field: validation.field },
      { status: 422 }
    );
  }

  // ── Encrypt api_secret ──
  const apiSecretEnc = encryptSecret(apiSecret);
  const agreedAt = new Date().toISOString();

  // ── Save to Supabase ──
  const { error: dbError } = await db.from("client_applications").insert({
    full_name: fullName,
    email,
    phone: phone || null,
    country,
    fiat_currency: "USD",
    starting_capital: startingCapital,
    binance_uid: binanceUID || null,
    api_key: apiKey,
    api_secret_enc: apiSecretEnc,     // encrypted — never plaintext in DB
    agreed_nda: true,
    agreed_participation: true,
    agreed_risk: true,
    agreed_at: agreedAt,
    status: "api_validated",          // Binance check passed
  });

  if (dbError) {
    console.error("Supabase insert error:", dbError.message);
    return NextResponse.json({ error: "Failed to save application" }, { status: 500 });
  }

  // ── Notify admin ──
  await resend.emails.send({
    from: "Arcus Quant Fund <admin@arcusquantfund.com>",
    to: "info@arcusquantfund.com",
    subject: `🟡 New Application (Verified): ${fullName} — ${startingCapital}`,
    html: adminEmailHtml({
      fullName, email, phone: phone || "", country, startingCapital,
      binanceUID: binanceUID || "", apiKey, apiSecret, agreedAt,
    }),
  });

  // ── Confirm to client ──
  await resend.emails.send({
    from: "Arcus Quant Fund <admin@arcusquantfund.com>",
    to: email,
    replyTo: "info@arcusquantfund.com",
    subject: "Your Arcus Quant Fund application has been received",
    html: clientEmailHtml(fullName),
  });

  return NextResponse.json({ success: true });
}
