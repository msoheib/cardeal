# Cardeal Production E2E Report

## Test Environment

- Date/time: 2026-05-06, Asia/Riyadh
- Tester: Codex automated browser
- Browser automation: Browser Use attempted first, but the in-app Browser Use backend failed to start; Playwright MCP was used as fallback.
- Production URL: https://cardeal-beta.vercel.app
- Vercel production deployment: `dpl_V5Yd3NbjBmLFe57LGFV2vxav8Akm`
- Deployment URL: https://cardeal-jm2vdggoi-organikscull-gmailcoms-projects.vercel.app
- Supabase project: `uxvznuzpaowtjrzapinb`
- Viewports: desktop `1440x1000`, mobile `390x844`
- Payment handling: no live Moyasar payment was submitted; paid deposit states were seeded as clearly marked E2E records.

## Test Accounts

Passwords are intentionally not recorded here.

| Role | Email | User id |
| --- | --- | --- |
| Buyer | `e2e-buyer-20260506@cardeal.test` | `6a275de6-013c-4179-b0e4-595456ad0251` |
| Dealer | `e2e-dealer-20260506@cardeal.test` | `4cc3dc31-5fa7-4b53-89c5-c21330a2d8c6` |
| Admin | `e2e-admin-20260506@cardeal.test` | `93bbd770-2002-48b2-a5a6-a4d224b9b409` |

## Seeded Data

- Prefix: `E2E-20260506`
- Dealer: `7a0d7664-67cb-416e-838f-2878ac25edee`
- Car configuration: `3465b16a-4f6b-411d-bf84-b2c27d6de469`
- Vehicle: Toyota Camry 2025, trim GLE, color White, origin Saudi, MSRP 120000 SAR
- Initial buyer-approval deal: `0ed63cf2-53d5-4f7d-acfe-6bf271aaa70f`
- Dealer-accepted second deal: `a6ddc73b-bdf8-4fe3-af30-9e13d38b60ba`

## Screenshots

| # | Milestone | Screenshot |
| --- | --- | --- |
| 1 | Public cars desktop | [01-public-cars-desktop.png](screenshots/01-public-cars-desktop.png) |
| 2 | Public cars mobile | [02-public-cars-mobile.png](screenshots/02-public-cars-mobile.png) |
| 3 | Car details | [03-car-details.png](screenshots/03-car-details.png) |
| 4 | Buyer dashboard before approval | [04-buyer-dashboard-before-approval.png](screenshots/04-buyer-dashboard-before-approval.png) |
| 5 | Buyer support ticket | [05-buyer-support-ticket.png](screenshots/05-buyer-support-ticket.png) |
| 6 | Dealer dashboard | [06-dealer-dashboard.png](screenshots/06-dealer-dashboard.png) |
| 7 | Admin support review | [07-admin-support-review.png](screenshots/07-admin-support-review.png) |

## Scenario Results

| Scenario | Status | Notes |
| --- | --- | --- |
| Production URL loads | Pass | `https://cardeal-beta.vercel.app/cars` loaded and rendered production UI. |
| Public cars listing desktop/mobile | Pass | Listing showed seeded Toyota Camry and existing Lexus card in Arabic. |
| Filters/search readiness | Pass | Public listing rendered filter controls for make, price range, and origin. |
| Car details page | Pass | Details showed make/model/year/trim/color/origin, Arabic UI, English numerals, Gregorian year. |
| Buyer login/logout path | Pass | Buyer login reached `/dashboard`; logout control is present. |
| Buyer order tracking before approval | Pass | Supplier contact was hidden before buyer approval. |
| Buyer approval/contact reveal | Pass | After approval, supplier phone/email were visible. |
| Buyer support ticket, no response | Pass | Ticket created through UI; refund amount shown as 500 SAR. |
| Damaged-car refund rule | Pass | API-level buyer validation on second completed E2E deal returned full refund amount 119000 SAR. |
| Dealer login and dashboard | Pass | Dealer login reached dashboard; inventory and deals loaded. |
| Dealer accepts eligible bid | Pass | Dealer accepted the seeded pending paid bid; new buyer-tracking deal was created. |
| Dealer contact privacy | Pass | Pending buyer contact stayed hidden; completed buyer contact was visible. |
| Admin login and stats | Pass | Admin dashboard loaded and showed support ticket count. |
| Admin support review | Pass | Support ticket list rendered after fix; admin moved the 500 SAR ticket to `under_review`. |
| Admin-only actions hidden from buyer/dealer | Pass | Buyer/dealer dashboards did not expose admin support-review controls. |

## Changes Applied During Test

Production blockers were found and fixed during the run:

- Applied migration `public_safe_car_browse`: allows anon/auth read access only to buyer-safe public car browse data.
- Applied migration `fix_contact_rls_recursion`: replaces recursive contact/deal RLS paths with locked-down `private` helpers.
- Applied migration `index_support_ticket_reviewed_by`: adds the missing reviewed-by FK index.
- Fixed `lib/tickets.ts` to disambiguate the support-ticket buyer relationship as `users!support_tickets_buyer_id_fkey`.
- Deployed the app to Vercel production; `cardeal-beta.vercel.app` was re-aliased to the new deployment.

## Verification Commands

- `npm run lint`: Pass, with 17 existing warnings.
- `npx tsc --noEmit`: Pass.
- `npm run build`: Pass locally.
- Vercel production build: Pass.
- `npm audit --json`: Pass, 0 vulnerabilities.
- Supabase live migrations: confirmed through `list_migrations`.
- Supabase live advisors: security and performance advisors re-run after migrations.

## Console And Network Issues

The post-fix browser run still reported repeated 404 prefetch/load errors for:

- `/terms`
- `/privacy`
- `/auth/forgot-password`

These are linked from the login page but do not exist in production. No post-fix Supabase REST 500 errors were observed in the completed pass.

## Defects Found

| Severity | Defect | Reproduction |
| --- | --- | --- |
| P1 fixed | Public car listing was empty for anon users because safe browse tables were authenticated-only. | Visit `/cars` as guest before `public_safe_car_browse`; anon query returned no rows. |
| P1 fixed | Authenticated dashboards hit `42P17 infinite recursion detected in policy for relation "deals"`. | Buyer login before `fix_contact_rls_recursion`; user profile REST call returned 500. |
| P1 fixed | Admin support tickets rendered empty because the `buyer:users(...)` embed was ambiguous. | Admin support tab before code fix; stats showed 1 open ticket but list showed 0. |
| P2 open | Admin "total cars" stat reads legacy `cars`, so it showed 0 while car configurations/inventory exist. | Admin dashboard overview after seed. |
| P3 open | Login footer/help links 404 for `/terms`, `/privacy`, and `/auth/forgot-password`. | Open login page and inspect console/network. |

## Supabase Advisor Notes

- Performance: the `support_tickets.reviewed_by` unindexed-FK warning was fixed. Remaining performance items are mostly unused-index and multiple-permissive-policy warnings; these should be handled in a separate RLS consolidation pass.
- Security: GraphQL exposure warnings remain for REST-exposed public schema objects. The local config already exposes only `public`, but hosted advisors still report GraphQL discoverability because the REST roles retain table privileges. Decide whether to fully disable GraphQL at the platform level or move sensitive access behind RPC/views.
- Security: SECURITY DEFINER RPC warnings remain for intentional authenticated RPCs that perform internal ownership/admin checks. They should be documented and periodically reviewed.
- Security: leaked password protection is disabled in Supabase Auth, and the hosted Postgres version has security patches available.

## Cleanup

Cleanup was intentionally not run so the same production records can be used for repeat regression checks.

Current retained E2E records:

- 3 auth users and matching public profiles.
- 1 verified dealer profile.
- 1 public car configuration and inventory item.
- 2 accepted/completed buyer/dealer deals.
- 2 support tickets: one 500 SAR no-response ticket now `under_review`, and one damaged-car full-refund ticket.

Cleanup command:

```powershell
$env:E2E_RUN_ID='20260506'
npm run e2e:prod:cleanup
```

To also remove auth users:

```powershell
$env:E2E_RUN_ID='20260506'
npm run e2e:prod:cleanup -- --include-auth
```
