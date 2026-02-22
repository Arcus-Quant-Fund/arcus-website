import { NextRequest, NextResponse } from "next/server";

// Fetches historical XRPUSDT klines from Binance Futures public API.
// Used by TradeHistoryChart to cover the full bot lifetime.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol    = searchParams.get("symbol")    ?? "XRPUSDT";
  const startTime = searchParams.get("startTime") ?? "";
  const interval  = searchParams.get("interval")  ?? "4h";

  const url = new URL("https://fapi.binance.com/fapi/v1/klines");
  url.searchParams.set("symbol",   symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit",    "1500");
  if (startTime) url.searchParams.set("startTime", startTime);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) {
    return NextResponse.json({ error: "Binance API error" }, { status: 502 });
  }

  // Binance kline format: [openTime, open, high, low, close, volume, ...]
  const raw: unknown[][] = await res.json();
  const data = raw.map((k) => ({
    timestamp: new Date(k[0] as number).toISOString(),
    open:      parseFloat(k[1] as string),
    high:      parseFloat(k[2] as string),
    low:       parseFloat(k[3] as string),
    close:     parseFloat(k[4] as string),
    volume:    parseFloat(k[5] as string),
    vwap_ema:  0,
  }));

  return NextResponse.json(data);
}
