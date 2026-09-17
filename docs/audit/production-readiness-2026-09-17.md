# Production Readiness Audit — 2026-09-17

Source: client feedback videos in `feedback_videos/new sept/` (3 clips, recorded 2026-09-09) + code review of `main` @ `1e21d22`.

**Verdict: NOT production ready.** The core revenue path (reserve → pay 500 SAR commitment fee) is broken for every buyer.

---

## P0 — Blockers

### 0. Production backend is offline (found 2026-09-17 during verification)
- The Supabase project `uxvznuzpaowtjrzapinb.supabase.co` returns **NXDOMAIN** from public DNS (Cloudflare). Production (`cardeal-beta.vercel.app`) and all local env files point to it.
- Live `/cars` shows "السوق غير متاح مؤقتاً". No login, browsing or payments work.
- Likely cause: the project is paused (for example, free-tier inactivity) or was deleted. **Restore it in the Supabase dashboard**, then re-test.

### 1. Payment dialog never appears after reserving (videos 1 & 3)
- **Symptom:** Buyer clicks "احجز الآن" / "تحديث الحجز" → nothing happens. Same result for a fresh account and an existing one. Worked before (client's earlier Lexus test).
- **Root cause:** Regression in `1e21d22` (2026-08-22, multi-color listings).
  - `app/cars/[id]/page.tsx` passes `onBidPlaced={() => loadData()}`.
  - `loadData()` calls `setIsLoading(true)`, and the page then renders only the full-page "جاري تحميل السيارة..." screen.
  - That **unmounts `<BidInput>`**, and with it `showPayModal` and the `<MoyasarCheckout>` dialog (`components/bid-input.tsx:140-142`). When the data comes back, `BidInput` mounts again with the dialog closed.
  - Before `1e21d22`, `onBidPlaced` only updated local state (`setCurrentUserBid`), so the dialog survived.
- **Ruled out:** The Moyasar SDK (v2.1.1 CDN, HTTP 200) and the test publishable key both work. The same `Moyasar.init` config renders the card form correctly in an isolated page.
- **Fix:** Refresh the data without the full-page loader (for example, a `silent` flag that skips `setIsLoading(true)`), or open the payment dialog outside the reload boundary.

### 2. Each retry creates another unpaid bid, and there is no way to pay an existing one
- `placeBid` (`lib/cars.ts:306`) always does an `INSERT`. `bids` has no unique constraint on `(buyer_id, car_configuration_id)`.
- Because of #1, every click adds another orphan unpaid bid. "تحديث الحجز" makes a new bid instead of paying or updating the current one.
- Buyer dashboard shows "غير مدفوعة" but has **no Pay action**, so an unpaid bid is a dead end.
- **Fix:** If an unpaid pending bid exists, reuse it (update the price, then open checkout). Add a "إكمال الدفع" button in the buyer dashboard. Add a partial unique index on unpaid pending bids and clean up the existing orphans.

### 3. Dealer sees "awaiting payment/approval" with no buyer action path (video 3, 01:05)
- A deal is created with `status = 'pending_payment'` (enum name). The buyer's step is actually *approval* (`approve_received_offer`), not payment.
- The labels don't match the name: the dealer sees "بانتظار موافقة المشتري", the buyer sees "بانتظار موافقتك", and admin sees the raw `pending_payment` text.
- **Fix:** Make sure the buyer's order-tracking card clearly shows the approve CTA. Align the wording on all three dashboards.

## P1 — Admin clarity (video 2)

### 4. "السيارات المعلقة" is always empty, while the dashboard shows "Pending Payment"
- `getPendingCars` (`lib/admin.ts:121`) queries the **legacy `cars` table** (`status = 'draft'`). Listings now live in `dealer_inventory` / `vehicle_listing_specs`, so this tab can never show anything.
- `approveCar` / `rejectCar` / `totalCars` also target the legacy table, so those admin numbers are stale.
- The "Pending Payment" the client saw is the Deals tab's `getStatusBadge` default branch printing the raw `pending_payment` (`components/admin-dashboard.tsx:243`).
- **Fix:** Add an Arabic label for `pending_payment`, such as "بانتظار موافقة المشتري". Repoint or remove the "Pending Cars" tab. Consider a "حجوزات غير مدفوعة" view built from `bids` where `commitment_fee_paid = false`.

## P1 — Platform / security

| # | Item | Evidence |
|---|------|----------|
| 5 | `next@16.2.4` has known advisories (1 critical, several high: DoS, middleware bypass) | `npm audit --omit=dev`: 18 vulns (1 critical, 7 high) |
| 6 | Payment key is `pk_test_…` in all local and Vercel-pulled env files. Confirm what Production uses before go-live; with a test key no real money is charged. | `.env*`, `.env.vercel.local` |
| 7 | Duplicate `NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY` lines in `.env` / `.env.local` (last one wins, easy to misconfigure) | `.env`, `.env.local` |
| 8 | No automated test covers reserve → checkout. The 28 existing tests pass but missed #1. | `tests/security`, `tests/ui` |
| 9 | Minor race in `MoyasarCheckout`: if the `<script>` tag exists but hasn't finished loading, `ready=true` is set while `window.Moyasar` is undefined, and the form never mounts | `components/moyasar-checkout.tsx:39-44` |

## P2 — Hygiene
- Debug artifacts are tracked in git: `*.sql`, `*.bat`, `*.log`, `.codex/*.log`, `.playwright-mcp/*.log` at the repo root.
- ESLint scans the untracked `.tools/` (Whisper/torch) folder. That is the only lint **error**; app code has 0 errors and 77 warnings. Add it to the ignores.
- `tsc --noEmit`: clean.
- `app/pay/page.tsx` is a second, unused payment path (hosted form without `listing_id`). Remove it or wire it up so there is only one checkout.
- On the car page, "العروض المقدمة" only shows the viewer's own bids (RLS), so the "كن أول من يقدم عرضاً" text is misleading.

## Status (2026-09-17)
- **#1 fixed:** `loadData({ silent: true })` after a bid, so the payment dialog stays mounted.
- **#2 fixed:**
  - `placeBid` reuses the buyer's unpaid pending bid for that color and updates its price instead of inserting a new one.
  - The buyer dashboard has a "إكمال الدفع" button that opens `/cars/<config>?pay_bid=<id>`, and the car page reopens checkout for that bid.
- **#0 resolved:** the Supabase project was resumed; car pages load again.
- **Orphan bids cleaned:** 11 duplicate unpaid bids (7 buyer/color pairs) set to `cancelled`, keeping the newest in each pair. None had fees or deals attached.
- **Still open:**
  - Apply `supabase/migrations/20260917120000_unique_unpaid_pending_bid.sql` (unique index; the CLI needs `SUPABASE_DB_PASSWORD`).
  - Manual buyer test: reserve → Moyasar form → test card.

## Suggested order
1. Fix #1 (small change), then #2 (reuse unpaid bid + pay button).
2. Admin labels and the pending tab (#4), buyer approve CTA (#3).
3. Upgrade Next.js, confirm live Moyasar keys, add an E2E test for reserve → Moyasar form visible → test-card callback.
4. Re-record the buyer flow and send it to the client as the "100% working" confirmation they asked for.
