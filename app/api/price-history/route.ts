import { NextRequest, NextResponse } from "next/server";

// Fetches historical XRP/USD 4h OHLC from Kraken's public API.
// Kraken has no IP restrictions and open CORS — works from any server/region.
// Kraken returns max 720 candles per request; we paginate up to 3 pages
// (3 × 720 = 2160 candles ≈ 360 days of 4h data — enough for full bot lifetime).

type KrakenRow = [number, string, string, string, string, string, string, number];

type PricePoint = {
  timestamp: string;
  open: number; high: number; low: number; close: number;
  volume: number; vwap_ema: number;
};

async function fetchKrakenPage(since: number): Promise<{ candles: PricePoint[]; last: number }> {
  const url = new URL("https://api.kraken.com/0/public/OHLC");
  url.searchParams.set("pair",     "XRPUSD");
  url.searchParams.set("interval", "240");        // 4h in minutes
  url.searchParams.set("since",    String(since));

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Kraken HTTP ${res.status}`);

  const json = await res.json() as {
    error: string[];
    result: Record<string, KrakenRow[]> & { last: number };
  };
  if (json.error?.length > 0) throw new Error(json.error[0]);

  const key = Object.keys(json.result).find((k) => k !== "last")!;
  const rows = json.result[key] as KrakenRow[];
  const last = json.result.last as number;

  // Kraken row: [time_sec, open, high, low, close, vwap, volume, count]
  const candles: PricePoint[] = rows.map((k) => ({
    timestamp: new Date(k[0] * 1000).toISOString(),
    open:      parseFloat(k[1]),
    high:      parseFloat(k[2]),
    low:       parseFloat(k[3]),
    close:     parseFloat(k[4]),
    volume:    parseFloat(k[6]),
    vwap_ema:  0,
  }));

  return { candles, last };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startTimeMs = searchParams.get("startTime") ?? "";

  // Convert ms → seconds (Kraken uses Unix seconds)
  const startSec = startTimeMs
    ? Math.floor(Number(startTimeMs) / 1000)
    : Math.floor(Date.now() / 1000) - 180 * 86_400; // default: 180 days back

  const allCandles: PricePoint[] = [];
  let since = startSec;
  const nowSec = Math.floor(Date.now() / 1000);

  try {
    for (let page = 0; page < 3; page++) {
      const { candles, last } = await fetchKrakenPage(since);
      allCandles.push(...candles);
      // Stop if we got a partial page or we've reached now
      if (candles.length < 720 || last >= nowSec) break;
      since = last;
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  return NextResponse.json(allCandles);
}
