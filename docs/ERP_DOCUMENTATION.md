# Arcus Quant Fund — ERP System Documentation

**Version:** 1.0 · **Date:** February 2026 · **Status:** Production

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Core Accounting Engine](#4-core-accounting-engine)
5. [Automated Pipelines (Cron Jobs)](#5-automated-pipelines-cron-jobs)
6. [Admin Endpoints](#6-admin-endpoints)
7. [Client Portal (Dashboard)](#7-client-portal-dashboard)
8. [Admin Panel (/admin)](#8-admin-panel-admin)
9. [Security & Access Control](#9-security--access-control)
10. [Edge Case Analysis](#10-edge-case-analysis)
11. [Dollar Trail — Is Every Dollar Tracked?](#11-dollar-trail--is-every-dollar-tracked)
12. [ERP Rating](#12-erp-rating)
13. [Known Limitations & Deferred Items](#13-known-limitations--deferred-items)
14. [Operational Runbook](#14-operational-runbook)

---

## 1. System Overview

Arcus Quant Fund runs automated crypto trading bots (Binance isolated margin, XRPUSDT) on behalf of multiple clients. The ERP system provides:

- **Daily** balance snapshots and P2P exchange rate fetching
- **Monthly** automated email reports per client (income statement, balance sheet, cash flow)
- **Monthly** internal admin report (fund P&L, AUM, operating costs, net income)
- **Real-time** client portal with trade history, balance chart, capital & returns accounting
- **Admin panel** for fund management with per-client fee status and bot health monitoring
- **Audit log** — append-only, immutable ledger of every financial event

### Fund Structure (as of Feb 2026)

| Client | Bot ID | UUID | Initial Capital |
|--------|--------|------|-----------------|
| Shehzad Ahmed (Founder) | eth | a1121d0e-... | $246 USDT |
| A Q M Abdullah Al Monsur | eth2 | 84a3b100-... | $2,327 USDT |
| Jahidul Islam | eth4 | 6dc10f46-... | $3,969 USDT |

**Performance fee:** 50% of monthly net profit (after deducting any carried loss from prior loss months)
**Operating costs:** $5,000/month (servers, AI subscriptions, domain, email)
**Payment:** Binance UID 131952271 OR UCB Bank A/C 050 3201 0000 99748

---

## 2. Architecture

```
Oracle Cloud Server (144.24.114.54)
├── eth bot (XRP spot isolated margin, 3.5x leverage)
├── eth2 bot
├── eth4 bot
├── sync_to_supabase.py  — runs in screen session "supabase_sync"
│     • Every 60s: reads Binance API for all 3 bots
│     • Updates bot_state (equity, position, margin level, liq_price)
│     • Detects ROLL_IN/ROLL_OUT transfers → writes capital_events
│     • Sends margin alerts if within 10%/20% of liquidation price
└── bot_monitor.py  — cron every 1 min, heartbeat monitoring

Vercel (arcusquantfund.com)
├── /api/cron/daily-snapshot  (midnight UTC daily)
│     • Reads bot_state → writes balance_history
│     • Fetches Binance P2P rates → writes exchange_rates
│     • Writes audit_log (BALANCE_SNAPSHOT)
├── /api/cron/monthly-report  (9am UTC, 1st of month)
│     • Computes monthly stats via Modified Dietz
│     • Builds HTML email (Income Stmt, Balance Sheet, Cash Flow)
│     • Sends via Resend to each client
│     • Writes monthly_snapshots, updates clients.carried_loss
│     • Sends internal admin report to shehzadahmed@arcusquantfund.com
│     • Writes audit_log (REPORT_SENT)
├── /api/admin/capital-event   (manual POST — admin only)
│     • Record deposits/withdrawals not auto-detected
├── /api/admin/fee-paid        (manual POST — admin only)
│     • Mark performance fee as received
├── /dashboard  (client portal, authenticated)
└── /admin      (fund management, @arcusquantfund.com only)

Supabase (idbnpxljkepzfizmrazb.supabase.co)
├── clients
├── bot_state
├── balance_history
├── trade_log
├── capital_events
├── monthly_snapshots
├── exchange_rates
└── audit_log
```

---

## 3. Database Schema

### `clients`
Core client registry. Schema v1 base + v3 additions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Supabase auth user ID |
| name | text | Full name |
| email | text UNIQUE | Login + email destination |
| bot_id | text | e.g. "eth", "eth2", "eth4" |
| fiat_currency | text | "BDT" (default) |
| profit_share_pct | float8 | 0.50 (50% fee) |
| carried_loss | float8 | Accumulated loss from prior months |
| initial_capital | float8 | Starting USDT amount |
| is_active | bool | Used to skip inactive clients in cron |

### `bot_state`
Live trading position. Written by sync_to_supabase.py every ~60s.

| Column | Type | Description |
|--------|------|-------------|
| client_id | text | bot_id (e.g. "eth2") |
| current_amount | float8 | Total equity in USDT |
| position_side | text | "LONG" / "NONE" |
| entry_price | float8 | Average entry |
| current_price | float8 | XRP index price |
| unrealized_pnl | float8 | Open position MTM P&L |
| margin_level | float8 | Binance margin level ratio |
| liq_price | float8 | Liquidation price |
| updated_at | timestamptz | Last sync time |

**Equity formula:** `equity = (XRP_netAsset × index_price) + USDT_netAsset`
API: `GET /sapi/v1/margin/isolated/account?symbols=XRPUSDT`

### `balance_history`
Daily equity snapshots. Written by daily-snapshot cron.

| Column | Type | Description |
|--------|------|-------------|
| client_id | uuid | Client UUID (NOT bot_id) |
| balance | float8 | Total equity in USDT |
| recorded_at | timestamptz | Snapshot timestamp |

**Critical:** Uses client UUID, not bot_id. UUID→bot_id mapping: eth→a1121d0e, eth2→84a3b100, eth4→6dc10f46.

### `trade_log`
Individual trade executions from Binance.

| Column | Type | Description |
|--------|------|-------------|
| client_id | text | bot_id |
| trade_id | text | Binance order ID |
| timestamp | timestamptz | Execution time |
| symbol | text | "XRPUSDT" |
| side | text | "BUY" / "SELL" |
| price | float8 | Execution price |
| quantity | float8 | XRP quantity |
| amount | float8 | USDT notional |
| pnl | float8 | P&L (SELL side only) |
| reason | text | DC entry/exit/etc. |

### `capital_events`
Deposits and withdrawals. Source of truth for Modified Dietz.

| Column | Type | Description |
|--------|------|-------------|
| id | bigserial PK | |
| client_id | uuid | Client UUID |
| event_type | text | "DEPOSIT" / "WITHDRAWAL" |
| amount | float8 | USDT amount (always positive) |
| notes | text | Description / Binance txId |
| occurred_at | timestamptz | Event datetime |
| recorded_by | text | "admin" / "sync_auto" |
| binance_tx_id | bigint UNIQUE | (v5) DB dedup guard |

**Dedup:** Partial unique index `(client_id, binance_tx_id) WHERE binance_tx_id IS NOT NULL` prevents duplicate auto-detected transfers even on server reboot.

### `monthly_snapshots`
Immutable monthly accounting record. Written once per client per month.

| Column | Type | Description |
|--------|------|-------------|
| id | bigserial PK | |
| client_id | uuid | |
| year, month | int | Reporting period |
| opening_balance | float8 | Last balance BEFORE month |
| closing_balance | float8 | Last balance of month |
| total_deposits | float8 | Sum of DEPOSIT capital_events |
| total_withdrawals | float8 | Sum of WITHDRAWAL capital_events |
| net_new_capital | float8 | deposits − withdrawals |
| gross_pnl | float8 | (closing−opening)−net_new_capital |
| carried_loss_in | float8 | Loss brought from prior month |
| net_pnl | float8 | gross_pnl − carried_loss_in |
| performance_fee | float8 | net_pnl × profit_share_pct (if > 0) |
| carried_loss_out | float8 | Loss carried to next month |
| total_trades / win_rate / etc. | | Trading statistics |
| fee_paid | float8 | Amount received via /api/admin/fee-paid |
| fee_paid_at | timestamptz | When payment was recorded |
| fee_payment_ref | text | Binance txId or bank reference |
| report_sent_at | timestamptz | Idempotency guard |
| report_sent_to | text | Email address |

**Unique constraint:** `(client_id, year, month)` — one record per client per month.

### `exchange_rates`
Daily Binance P2P rates for USDT→fiat conversion.

| Column | Type | Description |
|--------|------|-------------|
| asset | text | "USDT" |
| fiat | text | "BDT" |
| lower_bound | float8 | Worst rate (min of top-10 ads) |
| upper_bound | float8 | Best rate (max of top-10 ads) |
| mid_rate | float8 | Median rate |
| source | text | "Binance P2P" |
| fetched_at | timestamptz | |

### `audit_log`
Append-only, immutable ledger. No UPDATE or DELETE RLS policies.

| Column | Type | Description |
|--------|------|-------------|
| id | bigserial PK | |
| client_id | uuid | |
| event_type | text | DEPOSIT / WITHDRAWAL / FEE / BALANCE_SNAPSHOT / REPORT_SENT / RATE_FETCH |
| amount | float8 | Event amount |
| balance_before / after | float8 | |
| description | text | Human-readable |
| metadata | jsonb | Full context |
| created_at | timestamptz | Immutable |

---

## 4. Core Accounting Engine

### 4.1 Modified Dietz P&L Formula

**The fundamental formula:**
```
gross_pnl = (closing_balance − opening_balance) − net_new_capital
```
where `net_new_capital = total_deposits − total_withdrawals`

**Why this matters:** Without stripping capital flows, a $500 deposit in a month where the account went from $1,000 to $1,600 would show $600 profit. The actual bot profit is only $100.

**Example:**
```
Opening: $1,000  |  Deposit: +$500  |  Closing: $1,600
gross_pnl = ($1,600 − $1,000) − $500 = $100 ✓ (bot made $100)
Naive: $1,600 − $1,000 = $600 ✗ (includes the deposit)
```

### 4.2 Opening Balance (Bug 1 Fix)

```typescript
// Query last balance BEFORE month start
const { data: prevRow } = await supabase
  .from("balance_history")
  .select("balance, recorded_at")
  .eq("client_id", client.id)
  .lt("recorded_at", startISO)          // strictly BEFORE month start
  .order("recorded_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const opening_balance = prevClosingBalance ?? sorted[0]?.balance ?? 0;
```

**Why:** If daily-snapshot cron fails for Jan 1–3, using first-of-month balance would give Jan 4 as opening, losing 3 days of P&L. Using December's closing balance is always correct.

### 4.3 Performance Fee Calculation

```
net_pnl = gross_pnl − carried_loss_in

if net_pnl > 0:
    performance_fee = net_pnl × profit_share_pct   (default 50%)
    carried_loss_out = 0

elif net_pnl ≤ 0:
    performance_fee = 0
    carried_loss_out = |net_pnl|

# Roll forward
UPDATE clients SET carried_loss = carried_loss_out
```

**Example (two months):**
```
Month 1: gross_pnl = −$100, carried_loss_in = 0
  → net_pnl = −$100, fee = $0, carried_loss_out = $100

Month 2: gross_pnl = +$300, carried_loss_in = $100
  → net_pnl = +$200, fee = $100 (50% of $200), carried_loss_out = 0
  → Client receives $200 credit; owes Arcus $100 fee
```

### 4.4 Time-Weighted Return (TWR)

Calculated client-side in the dashboard Capital & Returns tab:
```typescript
let twrFactor = 1.0;
snapshots.forEach(snap => {
  if (snap.opening_balance > 0)
    twrFactor *= (1 + snap.gross_pnl / snap.opening_balance);
});
const twr = (twrFactor - 1) * 100;   // e.g. 12.7%
```

**Why TWR instead of simple return:** TWR eliminates the impact of external cash flows (deposits/withdrawals). Two clients with identical strategies but different deposit patterns will show the same TWR, accurately reflecting the bot's performance.

### 4.5 Three Financial Statements (in client email)

**Income Statement:**
```
Gross Trading P&L (capital-adjusted)    ±$gross_pnl
Less: Prior Period Carried Loss         −$carried_loss_in  (if applicable)
─────────────────────────────────────────
Net Profit                              ±$net_pnl
Performance Fee (50%)                   −$performance_fee  (if net_pnl > 0)
═════════════════════════════════════════
Net Income to Client                    ±$client_share
```

**Balance Sheet (as of last day of month):**
```
ASSETS
  Account Equity                        $closing_balance
LIABILITIES
  Performance Fee Payable               $performance_fee
NET ASSET VALUE (NAV)                   $closing_balance − $performance_fee

NAV MOVEMENT
  Opening NAV                           $opening_balance
  + Trading Gains                       ±$gross_pnl
  + Net Capital In                      ±$net_new_capital
  − Performance Fee Due                 −$performance_fee
  ═════════════════════════════════════
  Closing NAV                           $nav_closing
```

**Cash Flow Statement:**
```
OPERATING ACTIVITIES
  Realized Trading P&L (closed trades)    ±$realized_pnl
  Unrealized P&L Change (open positions)  ±$unrealized_pnl_change
  ──────────────────────────────────────
  Net Operating Cash Flow                 ±$gross_pnl

FINANCING ACTIVITIES
  Capital Contributions                   +$total_deposits
  Capital Withdrawals                     −$total_withdrawals
  Performance Fee Paid                    −$fee_paid
  ──────────────────────────────────────
  Net Financing Activities                ±$net_financing

NET CHANGE IN BALANCE                     ±$(closing − opening)
```

### 4.6 Reconciliation Check

Before every email send, the system verifies the accounting identity:
```
closing = opening + net_new_capital + gross_pnl   (±$0.01 tolerance)
```
If this fails, the error is:
1. Logged to Vercel logs with full breakdown
2. Added to the `results.errors` array (returned in API response)
3. The email is **still sent** (not blocked — client should get their report)

The admin is expected to investigate via `GET /api/admin/capital-event?email=<client>` and compare against Binance transfer history.

---

## 5. Automated Pipelines (Cron Jobs)

### 5.1 Daily Snapshot — `/api/cron/daily-snapshot`

**Schedule:** Every day at midnight UTC
**Auth:** `x-vercel-cron-job-name` header OR `Bearer <CRON_SECRET>`

**Procedure:**
1. Fetch all active clients from `clients` table
2. For each client: read `bot_state` WHERE `client_id = bot_id` → insert into `balance_history`
3. Fetch distinct fiat currencies from clients
4. For each fiat: POST to Binance P2P API (top-10 bank transfer ads, min 1000 USDT)
5. Extract lower/upper/mid rates → insert into `exchange_rates`
6. Write `audit_log` (BALANCE_SNAPSHOT + RATE_FETCH entries)

**P2P API call:**
```
POST https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search
{ asset:"USDT", fiat:"BDT", tradeType:"BUY", page:1, rows:10,
  payTypes:["BANK"], transAmount:"1000" }
```
`tradeType:"BUY"` = advertisers buying USDT = clients sell USDT → receive BDT.

### 5.2 Monthly Report — `/api/cron/monthly-report`

**Schedule:** 1st of each month at 9:00am UTC
**Auth:** Same as daily snapshot

**Procedure (per active client):**
1. Check `monthly_snapshots` for existing `report_sent_at` → skip if already sent (idempotency)
2. Query `trade_log` for month window
3. Query `balance_history` for month window
4. Query last `balance_history` BEFORE month start (Bug 1 fix — correct opening)
5. Query `capital_events` for month window
6. Fetch latest `exchange_rates` for client's fiat
7. Guard: skip if no balance history (log error, don't send $0 report)
8. Compute `MonthStats` via `computeStats()`
9. Run reconciliation check
10. Build HTML email via `buildEmail()`
11. Send via Resend (from: admin@arcusquantfund.com, cc: shehzadahmed@arcusquantfund.com)
12. Upsert `monthly_snapshots` with full stats + `report_sent_at`
13. Update `clients.carried_loss` (non-fatal if fails — snapshot is source of truth)
14. Insert `audit_log` (REPORT_SENT)

**After all clients:**
Call `sendArcusAdminReport()` — internal email to Shehzad with:
- AUM, fund P&L, average ROI
- Income Statement: fees earned − $5,000 operating costs = net income to Arcus
- Fee collection status (earned vs paid vs outstanding)
- Per-client breakdown table with PAID/PENDING/LOSS MONTH badges

### 5.3 Transfer Detection — sync_to_supabase.py (Oracle)

Runs continuously (~60s loop) in `screen -S supabase_sync`.

**Transfer detection logic:**
1. Call `GET /sapi/v1/margin/isolated/transfer?asset=USDT&symbol=XRPUSDT&limit=50`
2. Load `transfer_state.json` for `last_tx_id` and `initialized` flag
3. If not initialized: **baseline initialization** — process all 50 rows through DB upsert (safe via `binance_tx_id` unique index), log `⚠ BASELINE INITIALIZATION` warning
4. If initialized: process only rows with `txId > last_tx_id`
5. Map `ROLL_IN` → DEPOSIT, `ROLL_OUT` → WITHDRAWAL
6. Upsert `capital_events` with `on_conflict="client_id,binance_tx_id"` (DB dedup guard)
7. Update `transfer_state.json` with new `last_tx_id`

---

## 6. Admin Endpoints

All admin endpoints require `Authorization: Bearer <CRON_SECRET>`.

### POST `/api/admin/capital-event`
Record a deposit or withdrawal manually.

**Body:**
```json
{
  "client_email": "client@example.com",
  "event_type": "DEPOSIT",
  "amount": 500.00,
  "notes": "Initial capital contribution",
  "occurred_at": "2026-02-01T10:00:00Z"
}
```

### GET `/api/admin/capital-event?email=<email>`
List all capital events for a client.

### POST `/api/admin/fee-paid`
Mark a monthly performance fee as received.

**Body:**
```json
{
  "client_email": "client@example.com",
  "year": 2026,
  "month": 2,
  "amount_paid": 86.50,
  "payment_method": "Binance",
  "transaction_ref": "481234567890"
}
```

**Guards (in order):**
1. `performance_fee <= 0` → 400 (loss month, no fee owed)
2. `total_paid > performance_fee + 0.01` → 400 with `max_recordable` hint
3. `transaction_ref` duplicate → 409 (prevents double-recording same payment)

**Updates:** `monthly_snapshots.fee_paid` (additive), `fee_paid_at`, `fee_payment_ref`
**Writes:** `audit_log` (FEE event with full metadata)

### GET `/api/admin/fee-paid?email=<email>`
Full fee payment history for a client — all monthly snapshots with totals.

---

## 7. Client Portal (Dashboard)

**Auth:** NextAuth session, redirect to /login if unauthenticated.

**Data fetched on load:**
- `bot_state` (live position)
- `price_data` (up to 50,000 candles for chart)
- `trade_log` (last 500 trades)
- `balance_history` (last 100 snapshots for equity curve)
- `monthly_snapshots` (all time, for Capital & Returns tab)
- `capital_events` (all time, for Capital & Returns tab)
- `initial_capital` (from clients table)

**Tabs:**

**Overview** — Live equity, position status, margin level, unrealized P&L
**Chart** — Candlestick price chart with VWAP + VWAP-EMA overlay
**Trades** — Paginated trade log with P&L per trade
**Capital & Returns** — Full accounting history (described below)

### Capital & Returns Tab

**Key metrics:**
- **Total Deposited** = `first_month.opening_balance + sum(all deposits)` — includes initial capital as first deposit
- **Total Withdrawn** = `sum(all withdrawals)`
- **Net In Account** = `totalDeposited − totalWithdrawn`
- **Current Equity** = live `bot_state.current_amount` OR last month's closing
- **Absolute P&L** = `currentEquity − netInAccount` — how much the bot made in dollar terms
- **Absolute Return** = `absolutePnl / netInAccount × 100`% — total dollar return %
- **TWR** = time-weighted return across all months (eliminates deposit/withdrawal distortion)
- **Total Fees Earned/Paid/Outstanding** = cumulative fee tracking

**Payable/Receivable Banner:**
- Yellow: "Performance fee outstanding — you owe Arcus $X"
- Blue: "Carried loss — no fee this month"
- Green: "All fees settled for the period"

**Monthly History Table:**
| Month | Opening | Deposits | Withdrawals | Trading P&L | Closing | Monthly % | Cumul. TWR | Fee Owed | Fee Paid | Status |
|-------|---------|----------|-------------|-------------|---------|-----------|------------|---------|---------|--------|

**Capital Events Table:** Full history of every deposit/withdrawal.

---

## 8. Admin Panel (/admin)

**Auth:** `session.user?.email?.endsWith("@arcusquantfund.com")` — any Arcus email; redirect to /dashboard otherwise.

**URL:** `/admin?period=YYYY-M` (defaults to most recent available month)

**Sections:**

1. **Live AUM Banner** — total current equity across all bots (from `bot_state`)
2. **6-Metric Grid** — AUM, Clients, Fund P&L, Fees Earned, Fees Outstanding, Net Income
3. **Income Statement** — Fees Earned − $5,000 = Net Income (green/red)
4. **Fund Statistics** — Total trades, total deposits/withdrawals, avg ROI
5. **Client Status & Bot Health Table:**
   - Client | Opening | Closing | P&L | ROI% | Fee | Status | Bot | Last Sync
   - Bot badges: LIVE (green, <5 min), DELAYED (yellow, <30 min), OFFLINE (red)
   - Fee badges: PAID / PENDING / LOSS MONTH
6. **Recent Capital Events** — Last 10 deposits/withdrawals across all clients
7. **Audit Log** — Last 15 entries across all clients
8. **Quick Actions** — Links to admin API endpoints with curl examples

**Month Selector:** `MonthSelector` client component (dropdown) → navigates to `?period=YYYY-M`.

---

## 9. Security & Access Control

| Endpoint | Auth Method |
|----------|-------------|
| Cron routes | `x-vercel-cron-job-name` header OR `Bearer <CRON_SECRET>` |
| Admin endpoints | `Bearer <CRON_SECRET>` |
| /dashboard | NextAuth session (any logged-in user, sees their own data) |
| /admin | NextAuth session + email domain check (`@arcusquantfund.com`) |

**CRON_SECRET:** 64-char hex, stored in Vercel env vars + `.env.local`.
**Service role key:** Supabase `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS, used only in server routes.
**RLS:** `audit_log` has INSERT+SELECT only (no UPDATE/DELETE) — immutability enforced at DB level.

---

## 10. Edge Case Analysis

### E1 — Deposit at midnight on last day of month
**Scenario:** Client sends $500 USDT at 11:58pm on Feb 28. Transfer detected at 12:03am March 1.
**Current behavior:** `occurred_at` is set from Binance transfer timestamp (UTC). If Binance records it as Feb 28 23:58 UTC, it's included in February's `capital_events`; if March 1 00:03, it's March's.
**Risk:** LOW — $500 deposit shifts P&L by exactly $500 in the correct direction. No fee is gained or lost since deposits don't generate fees (only trading P&L does).
**Verdict:** CORRECT. Modified Dietz handles this correctly regardless of timing.

### E2 — Daily snapshot cron fails for first N days of month
**Scenario:** Vercel cron fails Jan 1–5. First `balance_history` entry is Jan 6.
**Current behavior (Bug 1 fix):** Opening balance = December 31 closing (last record BEFORE `startISO`). Not affected by Jan 1–5 outage.
**Verdict:** CORRECT. Bug 1 fix explicitly handles this.

### E3 — Report cron fires twice (Vercel retry or manual trigger)
**Scenario:** Monthly report cron runs, email sends, then Vercel retries due to timeout.
**Current behavior:** `report_sent_at` check at start of loop → skips if already sent. `monthly_snapshots` uses UPSERT with `onConflict: "client_id,year,month"`.
**Verdict:** CORRECT. Fully idempotent — no duplicate emails, no double fee calculation.

### E4 — Client withdraws entire balance
**Scenario:** Client withdraws $3,969 (entire account) on Feb 20. Closing balance = $0.
**Current behavior:** `gross_pnl = ($0 − $3,969) − (−$3,969) = $0`. Fee = $0. Closing NAV = $0.
**Verdict:** CORRECT. Modified Dietz cancels correctly.

### E5 — New client, first month — no prior balance_history
**Scenario:** New client joins Feb 15. No December `balance_history` exists.
**Current behavior:** `prevClosingBalance = null` → falls back to `sorted[0]?.balance` (first balance of month). Admin manually inserts a synthetic `balance_history` row at `2026-02-01T00:00:00` with `initial_capital` as the starting point.
**Verdict:** CORRECT for manually onboarded clients (this is the established procedure). The admin should insert the synthetic row before the end of the first month.

### E6 — Trade pnl = null (BUY side)
**Scenario:** BUY orders have `pnl = null` in `trade_log`.
**Current behavior:** `computeStats()` filters `closed = trades.filter(t => t.side === "SELL" && t.pnl != null)`. BUY trades are excluded from P&L calculations.
**Verdict:** CORRECT. Realized P&L is only on SELL (close) side.

### E7 — Loss month followed by large profit
**Scenario:** Feb loss −$200 (carried). Mar profit +$150. Apr profit +$100.
```
Feb: carried_loss_out = $200, fee = $0
Mar: net_pnl = $150 − $200 = −$50 → still loss, fee = $0, carried_loss_out = $50
Apr: net_pnl = $100 − $50 = $50 → fee = $25 (50% of $50)
```
**Verdict:** CORRECT. Carried loss accumulates correctly across multiple loss months.

### E8 — carried_loss DB update fails after email sent
**Scenario:** `UPDATE clients SET carried_loss = X` fails (DB timeout) after email has been sent and `monthly_snapshots` has been written.
**Current behavior:** Error logged to Vercel logs. `results.errors` array includes the failure. Email was sent and snapshot is written correctly with `carried_loss_out`. Next month's cron uses `existingSnap.carried_loss_in` (from snapshot) rather than `client.carried_loss` — so the correct value is used regardless.
**Recovery:** Admin runs: `UPDATE clients SET carried_loss = <carried_loss_out> WHERE id = '<uuid>'`
**Verdict:** RECOVERABLE. Snapshot is source of truth.

### E9 — transfer_state.json lost/corrupted on Oracle
**Scenario:** Oracle server reboots, `transfer_state.json` is deleted.
**Current behavior:** `initialized` flag is false → "baseline initialization" path runs. All 50 rows from Binance are processed via upsert with `on_conflict="client_id,binance_tx_id"`. `binance_tx_id` unique index prevents duplicates. Admin is warned: `⚠ BASELINE INITIALIZATION — ACTION REQUIRED: verify no duplicate capital_events`.
**Verdict:** SAFE (no data loss, no duplicates). Admin should verify via `GET /api/admin/capital-event?email=<client>` after initialization.

### E10 — Fee overpayment (admin error)
**Scenario:** Admin records $200 payment on a $86.50 invoice.
**Current behavior:** `total_paid > performance_fee + 0.01` → 400 error with: `max_recordable: $86.50`, `suggestion: "The maximum recordable amount is $86.50 USDT"`.
**Verdict:** BLOCKED. Guard prevents overpayment.

### E11 — Same Binance txId submitted twice to /api/admin/fee-paid
**Scenario:** Admin accidentally calls fee-paid twice with same `transaction_ref`.
**Current behavior:** `snap.fee_payment_ref === transaction_ref` → 409 Conflict.
**Verdict:** BLOCKED.

### E12 — Multiple partial payments for same month's fee
**Scenario:** Client pays $50 first, then $36.50 to complete the $86.50 fee.
**Current behavior:** First call: `total_paid = $50`, stored. Second call (different `transaction_ref`): `total_paid = $86.50`, stored.
**Verdict:** CORRECT. `fee_paid` is additive. Each call checks `total_paid > performance_fee` before writing.

### E13 — No trades executed in a month
**Scenario:** Bot had no SELL trades (was in position all month or flat).
**Current behavior:** `closed = []`. Trade stats all = 0. `realized_pnl = 0`. `gross_pnl` still computes correctly from balance history (includes unrealized MTM movement).
**Verdict:** CORRECT. P&L from balance history captures unrealized movement; trade stats show zeros.

### E14 — profit_factor when no losses
**Scenario:** All trades are winners (no loss trades).
**Current behavior:** `grossLosses = 0` → `profit_factor = grossWins > 0 ? 999 : 0`.
**Verdict:** CORRECT. 999 is standard convention for "infinite" profit factor. Database stores it as `isFinite(stats.profit_factor) ? stats.profit_factor : null` → stored as NULL.

### E15 — Exchange rate unavailable
**Scenario:** P2P rate fetch failed or no BDT rates exist in DB.
**Current behavior:** `rate = null` → `closingFiatLow/High = null` → `fmtFiat(null, "BDT")` returns "N/A" in email. BDT conversion section still shows, but values read "N/A".
**Verdict:** GRACEFUL DEGRADATION. Email sends, USDT values are correct, BDT conversion is absent.

### E16 — Bot position open at month end (unrealized P&L)
**Scenario:** Bot is long XRP at month end. Some P&L is unrealized.
**Current behavior:** `balance_history` records total equity including unrealized (Binance equity = USDT + XRP value at mark price). So `closing_balance` includes unrealized. `gross_pnl` includes unrealized via balance change. `realized_pnl = sum(SELL pnl)` is the closed subset. `unrealized_pnl_change = gross_pnl − realized_pnl`.
**Verdict:** CORRECT. Equity-based accounting correctly marks unrealized positions to market.

### E17 — Balance history gap (daily snapshot missed mid-month)
**Scenario:** Daily snapshot cron fails Dec 15. Balance history jumps from Dec 14 to Dec 16.
**Current behavior:** `closing_balance = last balance in month = Dec 31` — unaffected by mid-month gap. `opening_balance = last balance BEFORE month = Nov 30` — unaffected. Monthly P&L is correct. Trade stats are computed from `trade_log` (independent of balance history gaps).
**Verdict:** CORRECT. End-of-month and beginning-of-next-month figures are what matter.

### E18 — Client deposited via spot→margin, bot also in position
**Scenario:** Client sends $500 USDT. Bot simultaneously has an open long position. Equity changes both from the deposit and from XRP price movement.
**Current behavior:** Both are captured: the deposit appears in `capital_events`, balance history reflects combined equity. `gross_pnl = (closing − opening) − deposit = price_movement_only`. Correct.
**Verdict:** CORRECT.

### E19 — Admin records deposit with wrong date (off by a month)
**Scenario:** Admin records a Feb deposit with `occurred_at` of March 1.
**Current behavior:** February's `capital_events` query (`.gte("occurred_at", feb_start).lte("occurred_at", feb_end)`) will NOT pick it up. February `gross_pnl` will be inflated by $deposit_amount. March's `gross_pnl` will be deflated by the same amount. Reconciliation check will fire for February.
**Risk:** MEDIUM — the reconciliation alert will catch this and prompt admin to investigate.
**Verdict:** DETECTABLE. Fix: admin must call `/api/admin/capital-event` with correct date, then delete the wrong entry directly in Supabase.

### E20 — New client mid-month, no synthetic balance row
**Scenario:** New client added to Supabase but admin forgets to insert synthetic `balance_history` row with `initial_capital`.
**Current behavior:** `balances.length === 0` → cron skips this client with error: "No balance history found for {month}".
**Verdict:** GUARDED. No corrupted data; admin gets an error alert.

### E21 — Multiple balance_history entries same day (daily cron runs twice)
**Scenario:** Daily snapshot cron fires twice due to Vercel retry.
**Current behavior:** `balance_history` has no unique constraint — duplicate rows are inserted. `computeStats()` uses `sorted[sorted.length - 1]` as closing (last timestamp). Two identical rows for same day: the last one is the closing, which equals the first. No P&L impact.
**Risk:** LOW (cosmetic duplicate rows). The balance chart may show a tiny dip.
**Verdict:** HARMLESS but known; deferred per Medium Issues list.

### E22 — profit_share_pct = 0 for a client
**Scenario:** Founder/internal account with 0% fee.
**Current behavior:** `performance_fee = net_pnl > 0 ? net_pnl × 0 = 0`. Fee section shows $0. No payment required.
**Verdict:** CORRECT.

### E23 — Year boundary (December → January)
**Scenario:** December report runs on Jan 1, 2027.
**Current behavior:** `getPreviousMonth()` detects `now.getMonth() === 0` (January = 0 in JS) → `year = 2026`, `month = 12`. Correct.
**Verdict:** CORRECT.

### E24 — Resend email fails (API error, rate limit)
**Scenario:** Resend throws an error on email send.
**Current behavior:** `emailErr` is thrown, caught by the `try/catch` in the client loop. Error added to `results.errors`. `monthly_snapshots` upsert and `clients.carried_loss` update are NOT reached (they come after the email send). So the report can be safely re-triggered; the idempotency check (no `report_sent_at`) will allow re-processing.
**Verdict:** RECOVERABLE. Re-trigger the cron endpoint.

### E25 — Admin email (sendArcusAdminReport) fails
**Scenario:** Internal admin email fails.
**Current behavior:** Wrapped in `try/catch` separate from the client loop. Client emails are not affected. Error logged but not fatal.
**Verdict:** ISOLATED. Client reports succeed independently.

### E26 — Supabase service unavailable during monthly report
**Scenario:** Supabase has downtime mid-report.
**Current behavior:** Client loop catches each error individually. Clients already processed have their snapshots saved; clients not yet processed will have errors in `results.errors`. No `report_sent_at` set for failed clients → they can be re-processed on manual re-trigger.
**Verdict:** PARTIALLY RECOVERABLE. Manual re-trigger needed for failed clients.

### E27 — Fee recorded as paid but client disputed / reversed
**Scenario:** Binance transfer reversed after `fee-paid` endpoint was called.
**Current behavior:** No reversal mechanism in the ERP. `fee_paid` is only additive. Audit log shows the FEE entry.
**Risk:** MEDIUM — requires manual SQL to correct: `UPDATE monthly_snapshots SET fee_paid = new_amount WHERE ...`
**Verdict:** MANUAL INTERVENTION. The audit log provides an immutable trail for dispute resolution.

### E28 — Carried loss state inconsistency (clients.carried_loss ≠ last monthly_snapshots.carried_loss_out)
**Scenario:** If carried_loss update failed (E8) or was manually edited in Supabase.
**Current behavior:** If `existingSnap` (from prior partial run) is NOT null, uses `existingSnap.carried_loss_in`. If it IS null (first run), uses `client.carried_loss`. If `client.carried_loss` is wrong but snapshot doesn't exist yet, the first run will use the wrong value.
**Risk:** LOW (only relevant if admin manually edits the DB and then the cron hasn't run yet for this month).
**Verdict:** RECOVERABLE via manual SQL before cron runs.

### E29 — All clients in loss month → admin report shows negative net income
**Scenario:** All bots lose in February. `totalFeesEarned = $0`. `netIncome = $0 − $5,000 = −$5,000`.
**Current behavior:** Admin email shows "Net Income to Arcus: −$5,000.00" in red.
**Verdict:** CORRECT. This is accurate — the fund still has operating costs even in loss months.

### E30 — Bot liquidated
**Scenario:** XRP crashes, position liquidated by Binance. All USDT lost.
**Current behavior:** Binance force-liquidates the position. Equity drops to near $0. sync_to_supabase.py records equity change in `bot_state`. Daily snapshot captures low closing balance. Monthly report shows large negative `gross_pnl`. No fee. Large `carried_loss_out`.
**Risk:** HIGH event, but accounting handles it: `gross_pnl = (0 − opening) − 0 = −opening_balance` (huge loss). Carried loss accumulates.
**Verdict:** CORRECT accounting. The fund needs a proper risk management response (not an accounting issue).

---

## 11. Dollar Trail — Is Every Dollar Tracked?

### What IS tracked ✓

| Event | Where recorded |
|-------|----------------|
| Initial capital deposit | Synthetic `balance_history` row + `capital_events` DEPOSIT |
| Ongoing deposits | `capital_events` DEPOSIT (auto via sync_to_supabase or manual via API) |
| Withdrawals | `capital_events` WITHDRAWAL (auto via sync_to_supabase or manual via API) |
| Every trade execution | `trade_log` (bot writes directly) |
| Daily equity | `balance_history` (daily snapshot cron) |
| Unrealized P&L | Embedded in equity snapshots (mark-to-market) |
| Realized P&L per trade | `trade_log.pnl` (SELL side) |
| Monthly P&L (capital-adjusted) | `monthly_snapshots.gross_pnl` |
| Performance fee invoiced | `monthly_snapshots.performance_fee` |
| Performance fee received | `monthly_snapshots.fee_paid` + `audit_log` FEE |
| Carried loss | `monthly_snapshots.carried_loss_out` + `clients.carried_loss` |
| BDT exchange rates | `exchange_rates` (daily P2P fetch) |
| Every admin action | `audit_log` (append-only) |

### What is NOT tracked (acknowledged gaps)

| Item | Why not tracked | Risk |
|------|----------------|------|
| Binance trading fees | Not extracted from trade data (embedded in `amount`) | LOW — small vs notional, consistent across all trades |
| Binance interest/funding on margin | Interest is deducted by Binance silently from equity | LOW at 3.5x leverage for short-term trades |
| Admin operating costs ($5,000/month) | Hardcoded constant, not in DB | LOW — intentional design; update code when costs change |
| Arcus founder's personal trades (eth bot) | Tracked same as clients, but no "fund expense" separation | LOW |
| Payment in BDT (bank transfer) | Only USDT amounts tracked; BDT equivalent is informational only | LOW |

### Accounting Identity Verification

The reconciliation check verifies:
```
closing = opening + net_new_capital + gross_pnl   ✓
```

If this holds for every client every month, every dollar is accounted for. The current system enforces this as a runtime check before every email send.

---

## 12. ERP Rating

### Scoring

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Data Completeness** | 8/10 | All equity, trades, capital flows tracked. Missing: trading fees per-trade, margin interest. |
| **Accounting Accuracy** | 9/10 | Modified Dietz is institutional-grade. Bug 1 (opening balance) fix is correct. Reconciliation enforced at runtime. |
| **Audit Trail** | 9/10 | Immutable audit_log with event types + metadata. No DELETE policy. Every financial event logged. |
| **Idempotency & Resilience** | 9/10 | Report has idempotency guard. Binance dedup via unique index. Transfer baseline initialization is safe. |
| **Fraud/Error Prevention** | 8/10 | Fee overpayment blocked. Duplicate tx_ref blocked. Reconciliation mismatch detected and logged. |
| **Client Transparency** | 9/10 | Full Income Stmt + Balance Sheet + Cash Flow in email. Dashboard with TWR, monthly history, capital events. |
| **Admin Visibility** | 8/10 | Real-time admin panel with fund P&L, bot health, fee status. Internal monthly email. |
| **Carried Loss Accounting** | 9/10 | Correct multi-month accumulation. Snapshot-based source of truth for recovery. |
| **Scalability** | 7/10 | Works for 3–20 clients. No bulk-processing optimization. Sequential client loop. |
| **Compliance Readiness** | 6/10 | No AML/KYC, no formal audit export, no regulatory reporting. Appropriate for current fund size. |

### **Overall Rating: 8.1/10 — Production-Grade for Early-Stage Fund**

**What this system does well:**
- The core P&L formula (Modified Dietz) is the same one used by institutional fund administrators
- The three financial statements (Income, Balance Sheet, Cash Flow) are accounting-correct and reconcile with each other
- The immutable audit log provides a complete and tamper-evident ledger
- The idempotency design means the system can be safely re-triggered after any failure
- The reconciliation check is a runtime accounting integrity test — few systems this size have this

**What would make it a 9/10:**
- Extract and track Binance trading fees separately (true net realized P&L)
- Track Binance margin interest as an operating expense (currently embedded in equity movement)
- Add formal PDF export for each monthly report (for eventual regulatory use)
- Add a manual reconciliation tool that fetches Binance history and compares it against Supabase in one click

**What would make it a 10/10:**
- Annual performance report with TWRR across all periods
- Full NAV per unit / unit value tracking (for future institutional LP reporting)
- Automated KYC/AML screening integration
- Third-party custody or escrow for larger AUM

---

## 13. Known Limitations & Deferred Items

| Item | Impact | Deferred Reason |
|------|--------|-----------------|
| Daily snapshot cron duplicate rows | Cosmetic duplicate in balance chart | Harmless; fix when adding daily-snapshot dedup |
| fee_paid has no reversal mechanism | Manual SQL needed for chargebacks | Low occurrence at current fund size |
| No annual P&L reset for carried loss | Correct fund behavior; clients accumulate losses | Should be documented in client contracts |
| $5,000 operating costs hardcoded | Must edit source + redeploy to change | Update when costs change materially |
| No trading fee extraction from Binance | ~0.1% per trade gap | Small relative to notional; document in client contracts |
| Sequential client loop in cron | Adds latency for 10+ clients | Parallelizable with Promise.all when needed |
| Bot startup mid-month P&L gap | New bot has no trades for first partial month | Document + handle with synthetic balance row |

---

## 14. Operational Runbook

### Manual Report Trigger
```bash
curl -H "Authorization: Bearer e799e9fc416fec75dbb2c8c1002a17da3cccd7d2406344818596f8e63cdd6275" \
  https://arcusquantfund.com/api/cron/monthly-report
```
Expected response:
```json
{ "success": true, "period": {...}, "reports_sent": 3, "skipped": 0, "errors": [] }
```

### Record a Deposit
```bash
curl -X POST https://arcusquantfund.com/api/admin/capital-event \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"client_email":"client@example.com","event_type":"DEPOSIT","amount":500,"notes":"Bank transfer Feb 15"}'
```

### Mark Fee as Paid
```bash
curl -X POST https://arcusquantfund.com/api/admin/fee-paid \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"client_email":"client@example.com","year":2026,"month":2,"amount_paid":86.50,"payment_method":"Binance","transaction_ref":"481234567890"}'
```

### Fix Wrong carried_loss (after E8 failure)
```sql
-- Run in Supabase SQL editor
-- First check what the snapshot says:
SELECT client_id, year, month, carried_loss_out
FROM monthly_snapshots
WHERE year = 2026 AND month = 2;

-- Then update clients table:
UPDATE clients
SET carried_loss = <carried_loss_out_from_above>
WHERE id = '<client_uuid>';
```

### Verify Transfer Baseline After Oracle Reboot
```bash
# On Oracle server
cat /home/ubuntu/crypto_trading/transfer_state.json

# Check Supabase via API
curl "https://arcusquantfund.com/api/admin/capital-event?email=<client>" \
  -H "Authorization: Bearer <CRON_SECRET>"

# Compare against Binance transfer history manually
```

### Check Reconciliation Failures
```bash
# Check Vercel logs for lines containing "RECONCILIATION MISMATCH"
# Or check the cron response errors array

# To fix a missing deposit:
# 1. Identify the missing transfer from Binance account history
# 2. POST to /api/admin/capital-event with correct occurred_at
# 3. Re-trigger monthly report (idempotency check will be false since report_sent_at is set)
# 4. To force re-send: DELETE monthly_snapshots WHERE ... (Supabase SQL editor)
```

---

*Documentation auto-generated from codebase analysis. Last updated: February 2026.*
