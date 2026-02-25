/**
 * POST /api/admin/capital-event
 * Record a client deposit or withdrawal.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Body:
 *   client_email  string   — find client by email
 *   event_type    string   — "DEPOSIT" | "WITHDRAWAL"
 *   amount        number   — always positive (sign inferred from event_type)
 *   occurred_at   string   — ISO timestamp of when the transfer happened (optional, defaults to now)
 *   notes         string   — e.g. "Initial capital", "Partial withdrawal"
 *
 * GET /api/admin/capital-event?email=<email>&limit=<n>
 * List capital events for a client.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── POST — record a new capital event ───────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    client_email?: string;
    event_type?: string;
    amount?: number;
    occurred_at?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { client_email, event_type, amount, occurred_at, notes } = body;

  // Validate
  if (!client_email) return NextResponse.json({ error: "client_email required" }, { status: 400 });
  if (!event_type || !["DEPOSIT", "WITHDRAWAL"].includes(event_type)) {
    return NextResponse.json({ error: "event_type must be DEPOSIT or WITHDRAWAL" }, { status: 400 });
  }
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Look up client by email
  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, email, bot_id")
    .eq("email", client_email)
    .single();

  if (clientErr || !clientRow) {
    return NextResponse.json({ error: `No client found with email: ${client_email}` }, { status: 404 });
  }

  const client = clientRow as { id: string; name: string; email: string; bot_id: string | null };

  // Get current balance for the audit delta
  const { data: latestBalance } = await supabase
    .from("balance_history")
    .select("balance")
    .eq("client_id", client.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();

  const balanceBefore = (latestBalance as { balance: number } | null)?.balance ?? null;

  // Also fetch live bot state for current_amount
  let liveBalance: number | null = null;
  if (client.bot_id) {
    const { data: botRow } = await supabase
      .from("bot_state")
      .select("current_amount")
      .eq("client_id", client.bot_id)
      .single();
    liveBalance = (botRow as { current_amount: number } | null)?.current_amount ?? null;
  }

  const eventTs = occurred_at ?? new Date().toISOString();

  // Estimated balance after (for audit trail — actual balance comes from next sync)
  const estimatedAfter = balanceBefore != null
    ? event_type === "DEPOSIT"
      ? balanceBefore + amount
      : balanceBefore - amount
    : null;

  // Insert capital event
  const { data: eventRow, error: insertErr } = await supabase
    .from("capital_events")
    .insert({
      client_id:     client.id,
      event_type,
      amount,
      balance_before: liveBalance ?? balanceBefore,
      balance_after:  estimatedAfter,
      notes:          notes ?? null,
      occurred_at:    eventTs,
      recorded_by:    "admin",
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: "Failed to insert capital event", detail: insertErr.message }, { status: 500 });
  }

  // Append to audit log
  const auditType = event_type as "DEPOSIT" | "WITHDRAWAL";
  const signedAmount = event_type === "DEPOSIT" ? amount : -amount;

  await supabase.from("audit_log").insert({
    client_id:     client.id,
    event_type:    auditType,
    amount:        signedAmount,
    balance_before: liveBalance ?? balanceBefore,
    balance_after:  estimatedAfter,
    description:   `${event_type}: ${amount} USDT ${event_type === "DEPOSIT" ? "added to" : "withdrawn from"} ${client.name}'s account${notes ? ` — ${notes}` : ""}`,
    metadata: {
      capital_event_id: (eventRow as { id: number }).id,
      client_name: client.name,
      notes: notes ?? null,
      recorded_by: "admin",
    },
  });

  return NextResponse.json({
    success: true,
    event: {
      id:          (eventRow as { id: number }).id,
      client:      client.name,
      event_type,
      amount,
      occurred_at: eventTs,
      notes:       notes ?? null,
      balance_before: liveBalance ?? balanceBefore,
      balance_after:  estimatedAfter,
    },
    note: "This capital event will be used in the next monthly report to correctly calculate true trading P&L.",
  });
}

// ─── GET — list capital events for a client ───────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  if (!email) return NextResponse.json({ error: "email query param required" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, name")
    .eq("email", email)
    .single();

  if (!clientRow) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const client = clientRow as { id: string; name: string };

  const { data: events, error } = await supabase
    .from("capital_events")
    .select("id, event_type, amount, balance_before, balance_after, notes, occurred_at, recorded_at, recorded_by")
    .eq("client_id", client.id)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute totals
  const rows = (events ?? []) as { event_type: string; amount: number }[];
  const total_deposited   = rows.filter(e => e.event_type === "DEPOSIT").reduce((s, e) => s + e.amount, 0);
  const total_withdrawn   = rows.filter(e => e.event_type === "WITHDRAWAL").reduce((s, e) => s + e.amount, 0);
  const net_capital_in    = total_deposited - total_withdrawn;

  return NextResponse.json({
    client: client.name,
    total_deposited,
    total_withdrawn,
    net_capital_in,
    events,
  });
}
