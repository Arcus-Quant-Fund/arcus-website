import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = "shehzadahmed@arcusquantfund.com";

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id: string;
  name: string;
  email: string;
  bot_id: string | null;
};

type BotState = {
  client_id: string;
  current_amount: number | null;
  position: string | null;
  symbol: string | null;
  leverage: number | null;
  updated_at: string | null;
};

// ─── Authorization ────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  // Vercel cron jobs include this header automatically
  const isCronRequest = req.headers.get("x-vercel-cron-job-name") !== null;
  // Manual invocation via Authorization: Bearer <CRON_SECRET>
  const isManual =
    req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
  return isCronRequest || isManual;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const results = {
    clients_snapshotted: 0,
    clients_skipped: 0,
    errors: [] as string[],
  };

  // ── 1. Fetch all active clients ──────────────────────────────────────────
  const { data: clients, error: clientsErr } = await supabase
    .from("clients")
    .select("id, name, email, bot_id")
    .eq("is_active", true);

  if (clientsErr || !clients) {
    return NextResponse.json(
      { error: "Failed to fetch clients", detail: clientsErr?.message },
      { status: 500 }
    );
  }

  // ── 2. Balance snapshot for each client ─────────────────────────────────
  for (const client of clients as Client[]) {
    if (!client.bot_id) {
      results.clients_skipped++;
      continue;
    }

    // Read current bot state — prefer total_equity (free margin + position equity + unrealized PnL)
    const { data: botState } = await supabase
      .from("bot_state")
      .select("client_id, current_amount, total_equity, position, symbol, leverage, updated_at")
      .eq("client_id", client.bot_id)
      .single();

    const state = botState as BotState | null;
    // Use total_equity when available (set by supabase_sync); fall back to current_amount
    const currentBalance = (state as { total_equity?: number } | null)?.total_equity
      ?? state?.current_amount
      ?? null;

    if (currentBalance === null) {
      results.clients_skipped++;
      results.errors.push(`No bot state for ${client.name} (bot_id: ${client.bot_id})`);
      continue;
    }

    // Get previous balance for audit delta
    const { data: lastBalance } = await supabase
      .from("balance_history")
      .select("balance")
      .eq("client_id", client.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .single();

    const balanceBefore = (lastBalance as { balance: number } | null)?.balance ?? null;

    // Idempotent snapshot: one row per client per UTC day.
    // If the cron fires twice (Vercel retry), UPDATE the existing row instead of inserting a duplicate.
    const todayUtc = now.substring(0, 10); // e.g. "2026-02-28"
    const { data: todaySnap } = await supabase
      .from("balance_history")
      .select("id")
      .eq("client_id", client.id)
      .gte("recorded_at", `${todayUtc}T00:00:00.000Z`)
      .order("recorded_at", { ascending: true })
      .limit(1)
      .single();

    let balErr: { message: string } | null = null;
    if (todaySnap) {
      // Already snapshotted today — overwrite with latest reading (most recent bot state wins)
      const { error } = await supabase
        .from("balance_history")
        .update({ balance: currentBalance, equity: currentBalance, recorded_at: now })
        .eq("id", (todaySnap as { id: number }).id);
      balErr = error;
    } else {
      const { error } = await supabase
        .from("balance_history")
        .insert({ client_id: client.id, balance: currentBalance, equity: currentBalance, recorded_at: now });
      balErr = error;
    }

    if (balErr) {
      results.errors.push(`Balance snapshot failed for ${client.name}: ${balErr.message}`);
      continue;
    }

    // Append to audit log
    await supabase.from("audit_log").insert({
      client_id: client.id,
      event_type: "BALANCE_SNAPSHOT",
      amount: 0,
      balance_before: balanceBefore,
      balance_after: currentBalance,
      description: `Daily balance snapshot for ${client.name}`,
      metadata: {
        bot_id: client.bot_id,
        position: state?.position ?? null,
        symbol: state?.symbol ?? "XRPUSDT",
        leverage: state?.leverage ?? null,
        bot_updated_at: state?.updated_at ?? null,
      },
    });

    results.clients_snapshotted++;
  }

  console.log("[daily-snapshot] Complete:", results);

  // Alert admin if any clients were skipped due to missing bot state.
  // Silent skips are a data gap — dashboard and monthly report will show wrong figures.
  if (results.errors.length > 0) {
    try {
      const errorList = results.errors
        .map((e) => `<li style="font-family:monospace;font-size:12px;color:#ef4444;">${e}</li>`)
        .join("");
      await resend.emails.send({
        from:    "Arcus Quant Fund <admin@arcusquantfund.com>",
        to:      ADMIN_EMAIL,
        subject: `[Arcus Alert] ⚠ Daily snapshot: ${results.errors.length} client(s) skipped (${now.substring(0, 10)})`,
        html: `<!DOCTYPE html><html><body style="background:#000;margin:0;padding:32px;font-family:sans-serif;">
          <div style="max-width:560px;margin:0 auto;background:#0a0a0a;border:1px solid #ef444440;border-radius:12px;padding:24px;">
            <div style="color:#ef4444;font-size:15px;font-weight:800;margin-bottom:8px;">⚠ Daily Snapshot — Clients Skipped</div>
            <div style="color:#6b7280;font-size:12px;margin-bottom:16px;">
              ${results.clients_snapshotted} client(s) snapshotted · ${results.clients_skipped} skipped · ${results.errors.length} error(s)
            </div>
            <ul style="color:#fca5a5;font-size:13px;line-height:1.8;padding-left:16px;">
              ${errorList}
            </ul>
            <div style="margin-top:16px;color:#6b7280;font-size:11px;">
              Cause: bot_state row missing or total_equity null — ensure supabase_sync is running.
              Monthly report will skip these clients if not resolved before month-end.
            </div>
          </div>
        </body></html>`,
      });
    } catch (alertErr) {
      console.error("[daily-snapshot] Failed to send error alert:", alertErr instanceof Error ? alertErr.message : String(alertErr));
    }
  }

  return NextResponse.json({ success: true, timestamp: now, ...results });
}
