/**
 * POST /api/admin/migrate
 * One-time: adds missing columns to bot_state.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

function isAuthorized(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();

  // Add missing columns to bot_state
  const migrations = [
    `ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS margin_level float8`,
    `ALTER TABLE bot_state ADD COLUMN IF NOT EXISTS liq_price float8`,
  ];

  const results = [];
  for (const sql of migrations) {
    try {
      const { error } = await supabase.rpc("exec_sql", { query: sql });
      results.push({ sql, error: error?.message ?? null });
    } catch (e) {
      results.push({ sql, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ results });
}
