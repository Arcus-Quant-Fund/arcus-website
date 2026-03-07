/**
 * POST /api/admin/resend-credentials
 * Generates a new password for an existing client, updates Supabase Auth, re-sends credentials email.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { Resend } from "resend";
import crypto from "node:crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_DOMAIN = "@arcusquantfund.com";

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from(crypto.randomBytes(16))
    .map((b) => chars[b % chars.length])
    .join("");
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function credentialsEmail(fullName: string, email: string, password: string, botId: string, profitSharePct: number): string {
  const firstName = fullName.split(" ")[0];
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:28px;">
    <img src="https://arcusquantfund.com/logo.png" alt="Arcus Quant Fund" width="160" style="display:block;margin:0 auto 16px;" />
    <h1 style="color:#f8ac07;font-size:22px;margin:0;">Updated Dashboard Credentials</h1>
    <p style="color:#9ca3af;margin:8px 0 0;font-size:13px;">Account: ${escHtml(botId.toUpperCase())}</p>
  </div>

  <p style="color:#e5e7eb;line-height:1.7;">Hi ${escHtml(firstName)},</p>
  <p style="color:#e5e7eb;line-height:1.7;">
    Your Arcus Quant Fund dashboard password has been reset. Use the credentials below to log in.
  </p>

  <div style="background:#1a1200;border:1.5px solid #78350f;border-radius:10px;padding:20px;margin:20px 0;">
    <p style="color:#fbbf24;font-weight:700;margin:0 0 14px;font-size:14px;">🔑 Your New Login Credentials</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;width:120px;">Login URL</td>
        <td style="padding:8px 0;">
          <a href="https://arcusquantfund.com/login" style="color:#f8ac07;font-weight:600;">arcusquantfund.com/login</a>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Email</td>
        <td style="padding:8px 0;color:#fff;font-family:monospace;">${escHtml(email)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#9ca3af;font-size:14px;">Password</td>
        <td style="padding:8px 0;color:#fff;font-family:monospace;font-weight:700;font-size:16px;letter-spacing:1px;">${escHtml(password)}</td>
      </tr>
    </table>
    <p style="color:#9ca3af;font-size:12px;margin:14px 0 0;">Please change your password after logging in.</p>
  </div>

  <div style="background:#111827;border-radius:8px;padding:14px;margin-bottom:20px;">
    <p style="color:#9ca3af;font-size:13px;margin:0;">💰 <strong style="color:#fff;">Performance Fee:</strong>
      <strong style="color:#f8ac07;">${(profitSharePct * 100).toFixed(0)}%</strong> of net monthly profits only.</p>
  </div>

  <p style="color:#e5e7eb;line-height:1.7;">
    Questions? Reply to this email or reach us at
    <a href="mailto:info@arcusquantfund.com" style="color:#f8ac07;">info@arcusquantfund.com</a>.
  </p>
  <p style="color:#e5e7eb;">— The Arcus Quant Fund Team</p>
  <hr style="border:none;border-top:1px solid #1f2937;margin:20px 0;" />
  <p style="color:#4b5563;font-size:11px;text-align:center;">
    Arcus Quant Fund · arcusquantfund.com · info@arcusquantfund.com<br/>
    Confidential — for addressee only.
  </p>
</div>`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email?.endsWith(ADMIN_DOMAIN)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientUuid } = (await req.json()) as { clientUuid: string };
  if (!clientUuid) return NextResponse.json({ error: "clientUuid required" }, { status: 400 });

  const db = createServiceClient();

  // Fetch the client record
  const { data: client } = await db
    .from("clients")
    .select("id, name, email, bot_id, profit_share_pct")
    .eq("id", clientUuid)
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const newPassword = generatePassword();

  // Update Supabase Auth user's password
  const authRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${client.id}`,
    {
      method: "PUT",
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: newPassword }),
    }
  );

  if (!authRes.ok) {
    const d = await authRes.json();
    return NextResponse.json({ error: d.msg ?? "Failed to reset password" }, { status: 500 });
  }

  // Re-send credentials email
  await resend.emails.send({
    from: "Arcus Quant Fund <admin@arcusquantfund.com>",
    to: client.email,
    replyTo: "info@arcusquantfund.com",
    subject: "Your Arcus Quant Fund login credentials (updated)",
    html: credentialsEmail(
      client.name,
      client.email,
      newPassword,
      client.bot_id,
      client.profit_share_pct ?? 0.35
    ),
  });

  return NextResponse.json({ success: true, message: `Credentials resent to ${client.email}` });
}
