import { NextResponse } from "next/server";

// Live on-chain stats from Baraka Protocol — Arbitrum Sepolia (chainId 421614)
// Uses Alchemy JSON-RPC eth_call with raw ABI-encoded data (no library dependency).
// Cache: 60s Next.js revalidation (balances freshness vs. RPC quota)

const RPC_URL =
  process.env.ALCHEMY_ARBITRUM_SEPOLIA_RPC ??
  "https://arb-sepolia.g.alchemy.com/v2/GLeaFAgyC1y-tbGFosfaG";

// ─────────────────────────────────────────────────────────────
// Contract addresses — Arbitrum Sepolia
// ─────────────────────────────────────────────────────────────
const FUNDING_ENGINE   = "0x459BE882BC8736e92AA4589D1b143e775b114b38";
const ORACLE_ADAPTER   = "0x86C475d9943ABC61870C6F19A7e743B134e1b563";
const INSURANCE_FUND   = "0x7B440af63D5fa5592E53310ce914A21513C1a716";

// Market / collateral addresses
const WBTC_ADDRESS = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";
const USDC_ADDRESS = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

// ─────────────────────────────────────────────────────────────
// ABI-encoding helpers — address param, uint256 param
// ─────────────────────────────────────────────────────────────

/** Pad a hex address to 32 bytes (ABI word). */
function encodeAddress(addr: string): string {
  return addr.replace("0x", "").toLowerCase().padStart(64, "0");
}

/** Pad a uint256 to 32 bytes. */
function encodeUint256(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

// ─────────────────────────────────────────────────────────────
// eth_call helper
// ─────────────────────────────────────────────────────────────

async function ethCall(to: string, data: string): Promise<string> {
  const body = {
    jsonrpc: "2.0",
    id:      1,
    method:  "eth_call",
    params:  [{ to, data }, "latest"],
  };
  const res = await fetch(RPC_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    next:    { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result ?? "0x";
}

// ─────────────────────────────────────────────────────────────
// ABI decoders for simple return types
// ─────────────────────────────────────────────────────────────

/** Decode a single int256 from eth_call result. */
function decodeInt256(hex: string): bigint {
  const word = hex.replace("0x", "").slice(0, 64);
  const n = BigInt("0x" + word);
  // Two's complement for negative values
  const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  const SIGN_BIT   = BigInt("0x8000000000000000000000000000000000000000000000000000000000000000");
  return n >= SIGN_BIT ? n - (MAX_UINT256 + 1n) : n;
}

/** Decode a single uint256 from eth_call result. */
function decodeUint256(hex: string): bigint {
  const word = hex.replace("0x", "").slice(0, 64);
  return BigInt("0x" + word);
}

/** Decode a tuple of (int256, int256, uint8) from eth_call result (getKappaSignal). */
function decodeKappaSignal(hex: string): { kappa: bigint; premium: bigint; regime: number } {
  const raw = hex.replace("0x", "");
  const kappa   = decodeInt256("0x" + raw.slice(0, 64));
  const premium = decodeInt256("0x" + raw.slice(64, 128));
  const regime  = Number(decodeUint256("0x" + raw.slice(128, 192)));
  return { kappa, premium, regime };
}

// ─────────────────────────────────────────────────────────────
// Individual contract reads
// ─────────────────────────────────────────────────────────────

// Function selectors (keccak256 of signature, first 4 bytes):
// getFundingRate(address)            → 0x0baaa528
// getMarkPrice(address,uint256)      → 0x9e68de8e
// getIndexPrice(address)             → 0xb263e010
// fundBalance(address)               → 0x0ad5a865
// getKappaSignal(address)            → 0x371b996f

async function getFundingRate(): Promise<bigint> {
  const data = "0x0baaa528" + encodeAddress(WBTC_ADDRESS);
  const result = await ethCall(FUNDING_ENGINE, data);
  return decodeInt256(result);
}

async function getMarkPrice(): Promise<bigint> {
  const TWAP_WINDOW = 1800n;
  const data = "0x9e68de8e" + encodeAddress(WBTC_ADDRESS) + encodeUint256(TWAP_WINDOW);
  const result = await ethCall(ORACLE_ADAPTER, data);
  return decodeUint256(result);
}

async function getIndexPrice(): Promise<bigint> {
  const data = "0xb263e010" + encodeAddress(WBTC_ADDRESS);
  const result = await ethCall(ORACLE_ADAPTER, data);
  return decodeUint256(result);
}

async function getInsuranceFundBalance(): Promise<bigint> {
  const data = "0x0ad5a865" + encodeAddress(USDC_ADDRESS);
  const result = await ethCall(INSURANCE_FUND, data);
  return decodeUint256(result);
}

async function getKappaSignal(): Promise<{ kappa: bigint; premium: bigint; regime: number }> {
  const data = "0x371b996f" + encodeAddress(WBTC_ADDRESS);
  const result = await ethCall(ORACLE_ADAPTER, data);
  return decodeKappaSignal(result);
}

// ─────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────

export interface ChainStats {
  fundingRate:     number;   // F in %, e.g. 0.12 means 0.12%
  markPrice:       number;   // USD (1e18 → float)
  indexPrice:      number;   // USD (1e18 → float)
  insuranceFund:   number;   // USDC (6 dec → float)
  kappa:           number;   // κ annualised
  regime:          number;   // 0=NORMAL 1=ELEVATED 2=HIGH 3=CRITICAL
  regimeLabel:     string;
  iota:            number;   // always 0
  fetchedAt:       string;   // ISO timestamp
}

const REGIME_LABELS = ["NORMAL", "ELEVATED", "HIGH", "CRITICAL"];

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [fundingRate, markPrice, indexPrice, insuranceFund, kappaData] = await Promise.all([
      getFundingRate().catch(() => 0n),
      getMarkPrice().catch(() => 0n),
      getIndexPrice().catch(() => 0n),
      getInsuranceFundBalance().catch(() => 0n),
      getKappaSignal().catch(() => ({ kappa: 0n, premium: 0n, regime: 0 })),
    ]);

    const WAD = 1_000_000_000_000_000_000n; // 1e18

    const stats: ChainStats = {
      // Funding rate: int256 in 1e18 → percentage (multiply by 100)
      fundingRate:   Number(fundingRate * 10000n / WAD) / 100,
      // Prices: uint256 in 1e18 → USD float
      markPrice:     Number(markPrice)  / 1e18,
      indexPrice:    Number(indexPrice) / 1e18,
      // Insurance fund: uint256 in 1e6 (USDC) → USD float
      insuranceFund: Number(insuranceFund) / 1e6,
      // Kappa: int256 in 1e18 → float
      kappa:         Number(kappaData.kappa) / 1e18,
      regime:        kappaData.regime,
      regimeLabel:   REGIME_LABELS[kappaData.regime] ?? "NORMAL",
      iota:          0,
      fetchedAt:     new Date().toISOString(),
    };

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    console.error("[chain-stats]", err);
    return NextResponse.json(
      { error: "Failed to fetch on-chain data", details: String(err) },
      { status: 502 }
    );
  }
}
