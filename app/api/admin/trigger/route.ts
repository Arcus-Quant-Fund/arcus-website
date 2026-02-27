import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_DOMAIN = "@arcusquantfund.com";
const ALLOWED_ACTIONS = ["monthly-report", "daily-snapshot"] as const;
type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email?.endsWith(ADMIN_DOMAIN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let action: string;
  try {
    ({ action } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!ALLOWED_ACTIONS.includes(action as AllowedAction)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Resolve host for server-to-server call
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  const cronUrl = `${proto}://${host}/api/cron/${action}`;

  let cronStatus = 500;
  let cronBody: unknown = {};
  try {
    const cronRes = await fetch(cronUrl, {
      method: "GET",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    cronStatus = cronRes.status;
    cronBody = await cronRes.json().catch(() => ({ ok: cronRes.ok }));
  } catch (err) {
    return NextResponse.json(
      { error: "Cron call failed", detail: String(err) },
      { status: 502 }
    );
  }

  return NextResponse.json(cronBody, { status: cronStatus });
}
