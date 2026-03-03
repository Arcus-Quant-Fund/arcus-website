/**
 * POST /api/admin/approve
 * Admin-only. Approves a client application:
 *   1. Decrypts API secret, re-validates Binance permissions
 *   2. Determines next available bot slot (c1, c2, ...)
 *   3. Creates Supabase Auth user (dashboard login)
 *   4. Creates clients table row
 *   5. Updates application: status=provisioning, bot_id, client_uuid
 *   6. Emails client their dashboard credentials
 * Oracle provision_bot.py picks up status=provisioning within 1 minute.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { Resend } from "resend";
import crypto from "node:crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_DOMAIN = "@arcusquantfund.com";

// ─── Crypto ───────────────────────────────────────────────────────────────────

function deriveKey(): Buffer {
  return crypto.createHash("sha256").update(process.env.SUPABASE_SERVICE_ROLE_KEY!).digest();
}

function decryptSecret(encStr: string): string {
  const key = deriveKey();
  const [ivHex, ctHex] = encStr.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

// ─── Binance re-validation ────────────────────────────────────────────────────

async function revalidateBinance(apiKey: string, apiSecret: string): Promise<boolean> {
  const timestamp = Date.now();
  const qs = `timestamp=${timestamp}`;
  const sig = crypto.createHmac("sha256", apiSecret).update(qs).digest("hex");
  try {
    const resp = await fetch(
      `https://api.binance.com/sapi/v1/account/apiRestrictions?${qs}&signature=${sig}`,
      { headers: { "X-MBX-APIKEY": apiKey }, signal: AbortSignal.timeout(10_000) }
    );
    if (!resp.ok) return false;
    const d = await resp.json() as Record<string, boolean>;
    return (
      d.enableSpotAndMarginTrading === true &&
      d.enableMargin === true &&
      d.enableWithdrawals === false &&
      d.ipRestrict === true
    );
  } catch {
    return false;
  }
}

// ─── Bot slot ────────────────────────────────────────────────────────────────

async function nextBotId(db: ReturnType<typeof createServiceClient>): Promise<string> {
  const { data } = await db.from("clients").select("bot_id").like("bot_id", "c%");
  const used = new Set<number>();
  for (const row of data ?? []) {
    const m = (row.bot_id as string).match(/^c(\d+)$/);
    if (m) used.add(parseInt(m[1]));
  }
  let n = 1;
  while (used.has(n)) n++;
  return `c${n}`;
}

// ─── Password generator ───────────────────────────────────────────────────────

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from(crypto.randomBytes(16))
    .map((b) => chars[b % chars.length])
    .join("");
}

// ─── Client email ─────────────────────────────────────────────────────────────

function clientCredentialsEmail(
  fullName: string,
  email: string,
  password: string,
  botId: string,
  profitSharePct: number
): string {
  const firstName = fullName.split(" ")[0];
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:28px;">
    <img src="https://arcusquantfund.com/logo.png" alt="Arcus Quant Fund" width="160"
         style="display:block;margin:0 auto 16px;" />
    <div style="width:64px;height:64px;border-radius:50%;background:#14532d;border:2px solid #16a34a;
                display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
      <span style="font-size:28px;">🚀</span>
    </div>
    <h1 style="color:#f8ac07;font-size:22px;margin:0;">Your Bot Is Live!</h1>
    <p style="color:#9ca3af;margin:8px 0 0;font-size:13px;">Account ID: ${botId.toUpperCase()}</p>
  </div>

  <p style="color:#e5e7eb;line-height:1.7;">Hi ${firstName},</p>
  <p style="color:#e5e7eb;line-height:1.7;">
    Your Arcus Quant Fund trading bot is now active and executing the DC VWAP strategy on
    your Binance account. Here are your private dashboard login credentials:
  </p>

  <div style="background:#1a1200;border:1.5px solid #78350f;border-radius:10px;padding:20px;margin:20px 0;">
    <p style="color:#fbbf24;font-weight:700;margin:0 0 14px;font-size:14px;">🔑 Your Dashboard Login</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;width:120px;">Login URL</td>
        <td style="padding:8px 0;">
          <a href="https://arcusquantfund.com/login" style="color:#f8ac07;font-weight:600;">
            arcusquantfund.com/login
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Email</td>
        <td style="padding:8px 0;color:#fff;font-family:monospace;">${email}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Password</td>
        <td style="padding:8px 0;color:#fff;font-family:monospace;font-weight:700;font-size:16px;
                   letter-spacing:1px;">${password}</td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:14px 0 0;">
      We recommend changing your password after first login.
    </p>
  </div>

  <div style="background:#111827;border-radius:10px;padding:16px;margin-bottom:20px;">
    <p style="color:#f8ac07;font-weight:700;margin:0 0 10px;font-size:14px;">What You Can See in Your Dashboard</p>
    <ul style="color:#d1d5db;font-size:13px;line-height:1.9;padding-left:16px;margin:0;">
      <li>Live bot status — position, entry price, P&amp;L, margin level</li>
      <li>Full trade history with entry/exit prices and profit per trade</li>
      <li>Balance chart — equity over time</li>
      <li>Monthly performance breakdown and capital events</li>
    </ul>
  </div>

  <div style="background:#111827;border-radius:8px;padding:14px;margin-bottom:20px;">
    <p style="color:#9ca3af;font-size:13px;margin:0 0 6px;">💰 <strong style="color:#fff;">Performance Fee:</strong>
      <strong style="color:#f8ac07;">${(profitSharePct * 100).toFixed(0)}%</strong> of net monthly profits only —
      no fee on losing months, high-water mark applies.</p>
    <p style="color:#6b7280;font-size:12px;margin:0;">You'll receive a monthly performance report and invoice by email.</p>
  </div>

  <div style="background:#1a0000;border:1px solid #7f1d1d;border-radius:8px;padding:14px;margin-bottom:20px;">
    <p style="color:#fca5a5;font-weight:700;font-size:13px;margin:0 0 8px;">⚠ Keep your API key active</p>
    <ul style="color:#fca5a5;font-size:13px;line-height:1.8;padding-left:16px;margin:0;">
      <li>Do not delete or modify the <strong>Arcus Bot</strong> API key on Binance</li>
      <li>Keep your sub-account funded (minimum $100 USDT margin buffer)</li>
      <li>To pause trading: delete the API key on Binance — bot stops instantly</li>
    </ul>
  </div>

  <p style="color:#e5e7eb;line-height:1.7;">
    Questions or concerns? Reply to this email or reach us at
    <a href="mailto:info@arcusquantfund.com" style="color:#f8ac07;">info@arcusquantfund.com</a>.
  </p>
  <p style="color:#e5e7eb;">Good luck — let's build something great together.</p>
  <p style="color:#e5e7eb;">— The Arcus Quant Fund Team</p>
  <hr style="border:none;border-top:1px solid #1f2937;margin:20px 0;" />
  <p style="color:#4b5563;font-size:11px;text-align:center;">
    Arcus Quant Fund · arcusquantfund.com · info@arcusquantfund.com<br/>
    Confidential — for addressee only.
  </p>
</div>`;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Auth guard ──
  const session = await getServerSession(authOptions);
  if (!session?.user?.email?.endsWith(ADMIN_DOMAIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { applicationId: string; profitSharePct?: number; fiatCurrency?: string };
  const { applicationId } = body;
  if (!applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  // profitSharePct: 0–1 decimal (e.g. 0.35 = 35%). Required — must be explicitly set per client.
  if (typeof body.profitSharePct !== "number" || body.profitSharePct <= 0 || body.profitSharePct > 1) {
    return NextResponse.json({ error: "profitSharePct required (0–1 decimal, e.g. 0.35 for 35%)" }, { status: 400 });
  }
  const profitSharePct = body.profitSharePct;

  const db = createServiceClient();

  // ── Fetch application ──
  const { data: app, error: fetchErr } = await db
    .from("client_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchErr || !app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (!["api_validated", "pending"].includes(app.status)) {
    return NextResponse.json(
      { error: `Application already has status: ${app.status}` },
      { status: 409 }
    );
  }
  if (!app.api_secret_enc) {
    return NextResponse.json({ error: "No encrypted API secret on record" }, { status: 400 });
  }

  // ── Decrypt & re-validate ──
  let apiSecret: string;
  try {
    apiSecret = decryptSecret(app.api_secret_enc);
  } catch {
    return NextResponse.json({ error: "Failed to decrypt API secret" }, { status: 500 });
  }

  const stillValid = await revalidateBinance(app.api_key, apiSecret);
  if (!stillValid) {
    await db
      .from("client_applications")
      .update({ status: "pending", notes: "Re-validation failed at approval time" })
      .eq("id", applicationId);
    return NextResponse.json(
      { error: "Binance re-validation failed — API permissions may have changed. Client must re-submit." },
      { status: 422 }
    );
  }

  // ── Determine initial bot slot ──
  const tempPassword = generatePassword();
  let botIdCandidate = await nextBotId(db);

  // ── Create Supabase Auth user ──
  // Done before the clients insert so we have a UUID to use as the primary key.
  const authResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: app.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: app.full_name },
    }),
  });

  const authData = await authResp.json() as { id?: string; msg?: string };
  if (!authResp.ok || !authData.id) {
    console.error("Auth user creation failed:", authData);
    return NextResponse.json(
      { error: authData.msg ?? "Failed to create user account" },
      { status: 500 }
    );
  }
  const clientUuid = authData.id;

  // Helper: delete the Auth user we just created (rollback on failure)
  const rollbackAuthUser = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${clientUuid}`,
        {
          method: "DELETE",
          headers: {
            "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
            "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          },
        }
      );
    } catch (e) {
      console.error("Auth user rollback failed (dangling auth user):", clientUuid, e);
    }
  };

  // ── Create clients row (with retry on bot_id unique-constraint violation) ──
  // nextBotId() is non-transactional so two concurrent approvals can compute
  // the same slot. The UNIQUE constraint on clients.bot_id is the true guard:
  // if we lose the race, re-fetch the next free slot and retry (up to 5x).
  let botIdFinal = botIdCandidate;
  let insertError: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await db.from("clients").insert({
      id:               clientUuid,
      name:             app.full_name,
      email:            app.email,
      bot_id:           botIdFinal,
      initial_capital:  0,
      profit_share_pct: profitSharePct,
      fiat_currency:    app.fiat_currency ?? "USD",
      is_active:        true,   // required for daily-snapshot + monthly-report crons
      carried_loss:     0,      // high-water mark starts at zero
    });

    if (!error) { insertError = null; break; }

    // Unique violation on bot_id → another approval just took this slot, retry
    if (error.code === "23505" && (error.message ?? "").includes("bot_id")) {
      console.warn(`[approve] bot_id ${botIdFinal} conflict on attempt ${attempt + 1} — retrying`);
      botIdFinal = await nextBotId(db);
      insertError = error;
      continue;
    }

    // Any other error — do not retry
    insertError = error;
    break;
  }

  if (insertError) {
    console.error("clients insert error:", insertError.message);
    await rollbackAuthUser();
    return NextResponse.json({ error: "Failed to create client record" }, { status: 500 });
  }

  // ── Update application ──
  await db.from("client_applications").update({
    status:      "provisioning",
    bot_id:      botIdFinal,
    client_uuid: clientUuid,
  }).eq("id", applicationId);

  // ── Email client ──
  const emailResult = await resend.emails.send({
    from:    "Arcus Quant Fund <admin@arcusquantfund.com>",
    to:      app.email,
    replyTo: "info@arcusquantfund.com",
    subject: "🚀 Your Arcus Quant Fund bot is live — dashboard login inside",
    html:    clientCredentialsEmail(app.full_name, app.email, tempPassword, botIdFinal, profitSharePct),
  });
  if (emailResult.error) {
    console.error("Client credentials email error:", emailResult.error);
  }

  return NextResponse.json({
    success: true,
    botId:   botIdFinal,
    clientUuid,
    message: `Bot slot ${botIdFinal} assigned. Oracle will provision within 1 minute.`,
  });
}
