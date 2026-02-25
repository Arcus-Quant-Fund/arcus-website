import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type Client = {
  id: string;
  name: string;
  email: string;
  bot_id: string | null;
  fiat_currency: string;
};

type BotState = {
  client_id: string;
  current_amount: number | null;
  position: string | null;
  symbol: string | null;
  leverage: number | null;
  updated_at: string | null;
};

type P2PRate = {
  fiat: string;
  lower_bound: number;
  upper_bound: number;
  mid_rate: number;
  ad_count: number;
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

// ─── Binance P2P Rate Fetcher ─────────────────────────────────────────────────
// Fetches USDT→fiat rates for bank transfer ads with min 1000 USDT.
// tradeType "BUY" = advertiser buys USDT from client → client receives fiat.
// price = fiat received per 1 USDT.

async function fetchP2PRates(fiat: string): Promise<P2PRate | null> {
  try {
    const res = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; ArcusQuantFund/1.0)",
        },
        body: JSON.stringify({
          asset: "USDT",
          fiat,
          tradeType: "BUY",    // advertisers buying USDT — client sells USDT, receives fiat
          page: 1,
          rows: 20,
          publisherType: null,
          payTypes: ["BANK"],  // bank transfer only
          transAmount: "1000", // 1000+ USDT per trade
          countries: [],
        }),
      }
    );

    if (!res.ok) return null;

    const json = await res.json();
    const ads: { adv: { price: string; minSingleTransAmount: string } }[] =
      json?.data ?? [];

    // Filter: only ads that accept >= 1000 USDT
    const filtered = ads.filter(
      (ad) => parseFloat(ad.adv.minSingleTransAmount) <= 1000
    );

    if (filtered.length === 0) return null;

    const prices = filtered
      .map((ad) => parseFloat(ad.adv.price))
      .filter((p) => !isNaN(p) && p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) return null;

    const lower_bound = prices[0];
    const upper_bound = prices[prices.length - 1];
    const mid_rate = prices[Math.floor(prices.length / 2)]; // median

    return { fiat, lower_bound, upper_bound, mid_rate, ad_count: prices.length };
  } catch {
    console.error(`[daily-snapshot] P2P rate fetch failed for ${fiat}`);
    return null;
  }
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
    rates_fetched: 0,
    errors: [] as string[],
  };

  // ── 1. Fetch all active clients ──────────────────────────────────────────
  const { data: clients, error: clientsErr } = await supabase
    .from("clients")
    .select("id, name, email, bot_id, fiat_currency")
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

    // Insert balance snapshot (total equity = true account value)
    const { error: balErr } = await supabase
      .from("balance_history")
      .insert({
        client_id: client.id,
        balance: currentBalance,
        equity: currentBalance,
        recorded_at: now,
      });

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

  // ── 3. Fetch P2P exchange rates per unique fiat currency ─────────────────
  const fiats = [...new Set((clients as Client[]).map((c) => c.fiat_currency).filter(Boolean))];

  for (const fiat of fiats) {
    const rate = await fetchP2PRates(fiat);
    if (!rate) {
      results.errors.push(`P2P rate fetch failed for ${fiat}`);
      continue;
    }

    // Store rate
    const { error: rateErr } = await supabase.from("exchange_rates").insert({
      asset: "USDT",
      fiat: rate.fiat,
      lower_bound: rate.lower_bound,
      upper_bound: rate.upper_bound,
      mid_rate: rate.mid_rate,
      ad_count: rate.ad_count,
      source: "Binance P2P",
      fetched_at: now,
    });

    if (rateErr) {
      results.errors.push(`Rate insert failed for ${fiat}: ${rateErr.message}`);
      continue;
    }

    // Log rate fetch to audit log (use first client with this fiat as reference)
    const refClient = (clients as Client[]).find((c) => c.fiat_currency === fiat);
    if (refClient) {
      await supabase.from("audit_log").insert({
        client_id: refClient.id,
        event_type: "RATE_FETCH",
        amount: null,
        balance_before: null,
        balance_after: null,
        description: `USDT/${fiat} P2P bank transfer rate (1000+ USDT) fetched`,
        metadata: {
          asset: "USDT",
          fiat,
          lower_bound: rate.lower_bound,
          upper_bound: rate.upper_bound,
          mid_rate: rate.mid_rate,
          ad_count: rate.ad_count,
        },
      });
    }

    results.rates_fetched++;
  }

  console.log("[daily-snapshot] Complete:", results);
  return NextResponse.json({ success: true, timestamp: now, ...results });
}
