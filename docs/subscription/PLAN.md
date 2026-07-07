# Fieldore — Subscription & Website Architecture — Master Plan

> Status: **Planning complete, execution not started.**
> Owner: Fieldore team · Created: 2026-07-03 · Web stack decision: **Next.js (single app)**.
> This is the working spec. Keep the "Progress tracker" at the bottom updated as phases land.

---

## 1. Goal

Build a complete, **admin-configurable SaaS subscription system** for Fieldore, where:

- **All payments happen on the website** (Stripe) — the **mobile app never processes payments** (avoids App Store / Play commission for B2B SaaS; still must comply with current platform review guidelines).
- Provider downloads app → logs in → API checks subscription → if none/expired, app sends them to the **website pricing page** → they buy on web (Stripe) → return to app → **refresh subscription** → premium features unlock.
- **Nothing is hardcoded**: plans, prices, billing cycles, limits, features, badges, trial days, order, visibility — all read from the database and editable from the **Admin panel**.

## 2. Platform surfaces

| Surface | Stack | Purpose |
|---|---|---|
| **Marketing website** | Next.js `app/(marketing)` | Landing, features, pricing (dynamic), industries, testimonials, FAQ, contact, SEO. |
| **Customer portal** | Next.js `app/(portal)` | Provider self-serve: view plan/usage, upgrade/downgrade, cancel/renew, invoices, update card. |
| **Admin panel** | Next.js `app/(admin)` | Manage plans/features/subscriptions, analytics, manual actions. |
| **Mobile app** | Existing Expo / RN | Uses subscription **gating** only; redirects to web for purchase. No payment UI. |
| **Backend API** | Existing .NET 8 | Source of truth: entitlements, usage, Stripe billing webhooks, admin + portal + app APIs. |
| **Stripe Billing** | Stripe (platform account) | Products/Prices/Customers/Subscriptions/Checkout/Billing Portal + webhooks. |

**System flow:** `Landing → Pricing → Stripe Checkout → Payment success → Subscription activated → Mobile app login → API checks subscription → Access granted.`

---

## 3. Decisions locked

- **Web stack:** one **Next.js** app, route groups `(marketing)` / `(portal)` / `(admin)`; talks to the existing .NET API via JWT; Stripe.js + Stripe Billing Portal on the client, Stripe.net on the server.
- **Two separate Stripe integrations** live side by side and must not be confused:
  1. **Stripe Connect (existing)** — providers get paid by *their* customers for invoices (`Business.StripeAccountId`, `StripeService`, `StripeConnectController`). **Unchanged.**
  2. **Stripe Billing (NEW)** — providers pay *Fieldore* for the subscription (platform account, `Stripe.Customer`/`Subscription`). Built fresh in a new `Billing/` vertical.
- **Entitlements are feature-based, not hardcoded limits.** A plan is a bag of features + numeric limits stored in DB; code asks `entitlements.Can(feature)` / `entitlements.LimitFor(key)`.
- **Only `completed` jobs count** toward the job limit (draft/scheduled/in-progress/cancelled do **not**).
- **Billing cycles:** `monthly` and `half_yearly` at launch; schema must allow adding `quarterly`/`yearly`/custom **without redesign**.
- **Platform admin** is a new concept — Fieldore staff, distinct from a business's `owner`/`admin` membership role (which is per-business). Introduce a platform-level role/claim.

## 4. Current state (grounded in code)

**Already exists (build on these):**
- `Fieldore.Domain/Entities/BusinessSubscription.cs` — minimal: `BusinessId, Provider, ProviderSubscriptionId, PlanName (string), BillingCycle, Status, RenewsOn, TrialEndsOn`. **Extend, don't replace.**
- `Fieldore.Domain/Constants/SubscriptionStatuses.cs` — `trial, active, past_due, cancelled, expired`. **Add** `pending, suspended, failed`.
- `Fieldore.Domain/Constants/JobStatuses.cs` — `draft, scheduled, inprogress, completed, cancelled` (used by job-limit logic).
- Stripe **Connect** vertical: `IStripeService`/`StripeService`, `StripeConnectController`, `Business.StripeAccountId/StripeOnboardingComplete`.
- `Business`, `AuthUser` (no role field — `IsActive` only), `BusinessMembership` + `BusinessMembershipRoles`.

**Missing (to build):**
- `SubscriptionPlan` + `PlanFeature`/entitlements entities; plan seeding.
- Extended `BusinessSubscription` (FK to plan, Stripe customer/sub ids, current-period dates, cancel-at-period-end).
- **Usage tracking** (completed-jobs counter per period) + limit enforcement.
- **Stripe Billing** service + webhooks (separate from Connect).
- Customer-portal APIs, **Admin** APIs, analytics, notifications.
- **Next.js** web app (marketing + portal + admin).
- Mobile **gating** + upgrade redirect + job-limit block.

---

## 5. Data model (backend)

New entities under `Fieldore.Domain/Entities` (+ EF config + migration each):

### `SubscriptionPlan`
```
Id, Name, Slug, Description,
Currency (default USD),
IsActive, IsArchived, IsRecommended, Visibility (public/hidden),
DisplayOrder, Badge (null | "Popular" | "Best Value" | ...),
ButtonText, Color, TrialDays,
CreatedAt/UpdatedAt (AuditableEntity)
```

### `PlanPrice`  (one plan → many prices, one per billing cycle)
```
Id, PlanId (FK), BillingCycle (monthly|half_yearly|...),
Amount (decimal(18,2)), Currency,
StripePriceId (nullable — synced to Stripe), IsActive
```

### `PlanFeature`  (dynamic feature/limit config per plan)
```
Id, PlanId (FK),
FeatureKey (e.g. job_limit, unlimited_customers, pdf_export, gps_tracking, custom_branding, reports, offline_mode…),
IsEnabled (bool),
LimitValue (int?, null = unlimited; e.g. job_limit = 5),
DisplayLabel, DisplayOrder, ShowOnPricing (bool)
```
> `FeatureKey` values come from a `FeatureKeys` constants class so app + admin + API agree. Adding a feature = add a key + rows, **no schema change**.

### `BusinessSubscription`  (EXTEND existing)
Add: `PlanId (FK?)`, `PlanPriceId (FK?)`, `StripeCustomerId`, `StripeSubscriptionId`, `CurrentPeriodStart`, `CurrentPeriodEnd`, `CancelAtPeriodEnd (bool)`, `CancelledAt`, `EndedAt`. Keep legacy `PlanName` string for display fallback.

### `SubscriptionUsage`  (per business, per billing period)
```
Id, BusinessId, PeriodStart, PeriodEnd,
CompletedJobsCount, InvoicesCreatedCount, CustomersAddedCount, EmployeesCount, StorageUsedBytes,
UpdatedAt
```

### `BillingEvent` (audit/webhook log — idempotency)
```
Id, BusinessId?, StripeEventId (unique), Type, Payload (json), ProcessedAt, Status
```

### `Coupon` (future-proofing, ship schema now)
```
Id, Code, PercentOff?, AmountOff?, Currency, MaxRedemptions?, RedeemBy?, StripeCouponId, IsActive
```

Also add `SubscriptionStatuses`: `Pending, Suspended, Failed`; new `BillingCycles`, `FeatureKeys`, `PlatformRoles` constants classes.

**Platform admin:** add `AuthUser.IsPlatformAdmin (bool)` (simplest) or a `PlatformRole` table; gate `/api/admin/**` with a policy checking it.

---

## 6. Entitlement engine (backend)

`Fieldore.Application/Billing/Entitlements/`:
- `IEntitlementService.GetForBusinessAsync(businessId)` → returns a resolved **`EntitlementSet`**: `{ planSlug, status, features: { key → {enabled, limit} }, usage, isActive }`.
- Helpers: `Can(featureKey)`, `LimitFor(featureKey)`, `Remaining(featureKey, usage)`.
- Resolution: active subscription → its plan's `PlanFeature` rows → merged with live `SubscriptionUsage`. No subscription/expired → **free/locked** entitlement (read-only-ish, blocks gated actions).
- Cache per request; invalidate on subscription/plan change + webhook.

**Enforcement points** (server-side, never trust client):
- **Job completion** (`JobsController` / `JobService.UpdateStatus` → `completed`): check `Remaining(job_limit)`; if 0 → return a typed `403 SUBSCRIPTION_LIMIT_REACHED { feature: job_limit, upgradeUrl }`.
- Any premium feature endpoint (pdf_export, reports, gps…) guarded by `Can(...)`.

---

## 7. Stripe Billing (platform) — NEW vertical

`Fieldore.Application/Billing/` + `Fieldore.Infrastructure/Billing/BillingService.cs` + `Fieldore.API/Controllers/BillingController.cs` + `BillingWebhookController.cs`. Mirrors the Invoice-vertical pattern; **separate from Connect `StripeService`**.

- **Sync plans → Stripe**: create/update Product per `SubscriptionPlan`, Price per `PlanPrice` (store `StripePriceId`). Admin "save plan" triggers sync.
- **Checkout** (web only): `POST /api/billing/checkout-session { planPriceId }` → creates/reuses `Stripe.Customer` for the business, `mode: subscription` Checkout Session, `success_url`/`cancel_url` back to portal. Return `url`.
- **Billing Portal**: `POST /api/billing/portal-session` → Stripe Billing Portal URL (update card, cancel, invoices).
- **Webhook** `POST /api/billing/webhook` (`[AllowAnonymous]`, verify signature, idempotent via `BillingEvent.StripeEventId`). Handle:
  `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_succeeded`.
  → upsert `BusinessSubscription` (status, plan, period dates, cancel-at-period-end), reset/roll `SubscriptionUsage` on new period, enqueue notification emails.
- Keys in **user-secrets / env** (never appsettings in repo). Test with **Stripe CLI** (`stripe listen --forward-to .../api/billing/webhook`, test card `4242…`).

---

## 8. Web app — Next.js (`web/`)

Single app, route groups. Talks to .NET API (JWT in httpOnly cookie for web). Stripe.js for redirect to Checkout / Portal.

### `(marketing)` — public, SEO-first
Header (Logo, Features, Solutions, Pricing, Resources, About, Contact, Login, Get Started) · Hero (headline, sub, **Start Free Trial** / **Book Demo**, animation, screenshots, stats) · Trusted (logos/ratings) · Features grid · How-It-Works · **Pricing** (Monthly / Half-Yearly toggle, cards rendered **dynamically from `/api/plans`**, recommended badge, per-feature list) · Industries · Testimonials carousel · FAQ accordion · Contact (form + map) · Footer.

### `(portal)` — provider self-serve (auth: business owner/admin)
Current plan · **Usage** (completed/remaining jobs, invoices, customers, employees, storage) · Upgrade/Downgrade · Cancel/Renew · Billing history + **download invoices** · Next billing date + renewal amount · **Update card / billing address** (via Stripe Billing Portal).

### `(admin)` — platform admin (auth: `IsPlatformAdmin`)
- **Dashboard**: Total subscribers, Monthly/Half-yearly revenue, Cancelled, Expired, Active, Trial, Renewals this month.
- **Plan management**: create/edit/delete/disable/enable/archive/duplicate/reorder, highlight recommended, badges. Fully dynamic config (name, desc, price, currency, cycle, job limit, trial days, button text, badge, order, recommended, visibility, color, features).
- **Feature config**: toggle each `FeatureKey` per plan, set limits.
- **Subscriptions**: list + manual actions — pause, resume, cancel, force renew, extend, downgrade, upgrade, assign manually, expire manually, refund.
- **Analytics**: charts — Monthly revenue, Active subscribers, Revenue growth, Plan distribution, MRR, ARR, Renewal rate, Churn, Conversion, Trial conversion, Top countries, Top payment methods.

> Reuse **dataviz skill** palette for admin charts.

---

## 9. Mobile app (Expo / RN) — gating only

- On launch after login: call `GET /api/subscription/me` → `{ status, plan, features, usage, isActive }`. Store in a `SubscriptionContext`.
- **If active** → normal Dashboard. **If inactive/expired** → **Subscription screen** (status + "Upgrade Now") → opens **website pricing** via `Linking.openURL(webPricingUrl)` → on return, **pull-to-refresh** re-checks. **No payment screen in the app.**
- **Job-limit block**: when tapping "Complete" on the 6th job on Starter, API returns `SUBSCRIPTION_LIMIT_REACHED` → show **Upgrade dialog** → open website pricing.
- Replace the static `Settings.tsx` "Subscription: Pro Annual" with real plan/usage from the context.
- Feature gates in UI (e.g. hide/lock PDF export, reports) driven by `features` from the same payload.

---

## 10. Notifications (email)

Event-driven emails (queued from webhook/lifecycle): trial started, trial ending, subscription activated, payment succeeded, payment failed, card expiring, renewed, cancelled, expired, invoice generated, receipt available. Template + provider (e.g. SMTP / SendGrid) behind an `INotificationSender`; respect existing `UserNotificationPreference`.

---

## 11. Future-proofing (design in now, don't build yet)

Schema already supports: extra billing intervals, unlimited plans, feature-based entitlements, coupons/discounts, trials/limited offers, multi-currency (per-plan `Currency`), regional pricing (add `PlanPrice.Region` later), tax/VAT/GST (Stripe Tax), enterprise custom plans, add-ons (extra `PlanFeature` rows), multiple payment providers (`BusinessSubscription.Provider`), white-label. **No redesign required** to add these.

---

## 12. Phased roadmap + todos

Each phase ends **buildable & verifiable**. Backend follows the Invoice-vertical pattern; regenerate the RN client with `npx orval` after backend changes (user runs orval manually).

### Phase 0 — Foundations
- [ ] Confirm Stripe **platform** account + test keys in user-secrets/env (separate from Connect keys).
- [ ] Add constants: extend `SubscriptionStatuses`; new `BillingCycles`, `FeatureKeys`, `PlatformRoles`.
- [ ] Add `AuthUser.IsPlatformAdmin` + admin authorization policy + seed one platform admin.
- [ ] Scaffold Next.js app in `web/` (App Router, TS, Tailwind, shadcn/ui, Stripe.js) + API client + auth.

### Phase 1 — Data model & entitlement engine
- [ ] Entities: `SubscriptionPlan`, `PlanPrice`, `PlanFeature`, `SubscriptionUsage`, `BillingEvent`, `Coupon`; extend `BusinessSubscription`. EF configs + **migration**.
- [ ] Seed **Starter** ($29/mo, $159/6mo, `job_limit=5`) and **Professional** ($39/mo, $219/6mo, unlimited) with their `PlanFeature` rows.
- [ ] `IEntitlementService` + `EntitlementSet`; unit tests for resolution + limits.

### Phase 2 — Public plan + subscription APIs
- [ ] `GET /api/plans` (public, dynamic pricing for marketing).
- [ ] `GET /api/subscription/me` (business's plan/status/usage/features).
- [ ] Usage tracking: increment `CompletedJobsCount` when a job → `completed`; enforce `job_limit` at completion (typed 403).

### Phase 3 — Stripe Billing + webhooks
- [ ] `BillingService` (plan→Stripe sync, checkout-session, portal-session).
- [ ] `BillingController` + `BillingWebhookController` (signature verify, idempotent, all listed events).
- [ ] Lifecycle → `BusinessSubscription` upsert + usage period roll. Verify with Stripe CLI + test card.

### Phase 4 — Admin APIs
- [ ] Plan CRUD + enable/disable/archive/duplicate/reorder/recommend/badge (+ Stripe sync on save).
- [ ] Feature config per plan.
- [ ] Subscription admin actions (pause/resume/cancel/force-renew/extend/up-down-grade/assign/expire/refund).
- [ ] Analytics endpoints (MRR, ARR, churn, renewal, conversion, distribution, etc.).

### Phase 5 — Mobile app gating
- [ ] `subscriptionService.ts` + `SubscriptionContext`; wire launch check.
- [ ] Subscription/upgrade screen → open web pricing; refresh on return.
- [ ] Job-limit `SUBSCRIPTION_LIMIT_REACHED` → upgrade dialog.
- [ ] Replace static Settings subscription card with real data; feature-gate UI.

### Phase 6 — Web: marketing site
- [ ] Layout + all marketing sections; **dynamic pricing** from `/api/plans`; monthly/half-yearly toggle; SEO/meta; responsive; animations.

### Phase 7 — Web: customer portal
- [ ] Auth; plan + usage dashboards; upgrade/downgrade/cancel/renew; billing history + invoice download; Stripe Billing Portal (card/address).

### Phase 8 — Web: admin panel
- [ ] Admin auth + shell; plan & feature management UI (fully dynamic); subscriptions table + actions; analytics dashboard (charts via dataviz palette).

### Phase 9 — Notifications
- [ ] `INotificationSender` + templates; wire all lifecycle emails; honor preferences.

### Phase 10 — Hardening & launch
- [ ] Idempotency + ret/backoff on webhooks; rate-limit public endpoints; secrets in env; role/tenant scoping audit.
- [ ] Coupons/trials wiring; Stripe Tax toggle; basic tests on billing + entitlement + admin flows.
- [ ] E2E walk of the full system flow (below).

---

## 13. Verification (definition of done)

**End-to-end:** Web pricing (dynamic, toggle works) → Stripe Checkout (test card) → webhook activates subscription → open **mobile app** → login → `GET /api/subscription/me` = active → use app → on Starter complete 5 jobs → 6th completion **blocked** with upgrade prompt → open web pricing → upgrade to Professional → webhook updates → return to app → refresh → unlimited jobs. Portal shows correct usage/next-billing; admin can create/edit/reorder plans and see the change reflected on the marketing pricing page **without a deploy**; analytics populate; lifecycle emails fire.

**Backend:** `dotnet build`; migrations apply; each endpoint exercised in Swagger; Stripe CLI forwards webhooks. **Mobile:** `npx orval` regenerates cleanly; full flow on device. **Web:** `next build`; Lighthouse on marketing; auth guards on portal/admin.

---

## 14. Critical files / where things go

- **Backend new:** `Fieldore.Application/Billing/**`, `Fieldore.Infrastructure/Billing/BillingService.cs`, `Fieldore.API/Controllers/{Plans,Subscription,Billing,BillingWebhook,Admin/*}Controller.cs`, `Fieldore.Domain/Entities/{SubscriptionPlan,PlanPrice,PlanFeature,SubscriptionUsage,BillingEvent,Coupon}.cs`, new constants, migration under `Fieldore.Infrastructure/Migrations`. Register services in `ServiceCollectionExtensions`.
- **Backend extend:** `BusinessSubscription.cs`, `SubscriptionStatuses.cs`, `AuthUser.cs`, `JobService` (usage increment + limit).
- **Do NOT touch:** Connect `StripeService`/`StripeConnectController` (different concern).
- **Web new:** `web/` (Next.js).
- **Mobile:** `src/services/subscriptionService.ts`, `src/context/SubscriptionContext.tsx`, new subscription/upgrade screen, `app/(tabs)/Settings.tsx`, job-completion handling in `JobDetailScreen.tsx`.

---

## 15. Progress tracker

| Phase | Status | Notes |
|---|---|---|
| 0 Foundations | ✅ | constants, `AuthUser.IsPlatformAdmin` + JWT claim + `PlatformAdmin` policy |
| 1 Data model + entitlements | ✅ | 6 entities + extended `BusinessSubscription`, migration applied, seeder, `IEntitlementService` |
| 2 Public + subscription APIs | ✅ | `GET /api/plans`, `GET /api/subscription/me`, usage tracking + job-limit gate |
| 3 Stripe Billing + webhooks | ✅ | sync/checkout/portal + signature-verified idempotent webhook; needs `BillingWebhookSecret` to run |
| 4 Admin APIs | ✅ | plan CRUD/reorder/duplicate/state/sync, feature config, subscription actions, analytics dashboard |
| 5 Mobile gating | ✅ | `subscriptionService` + `SubscriptionContext` + upgrade screen + job-limit dialog + real Settings card (type-checks) |
| 6 Web marketing | ✅ | Next.js `web/`: landing + dynamic pricing (monthly/half-yearly) + SEO metadata |
| 7 Web portal | ✅ | `/portal`: plan, usage, Stripe Billing Portal, change plan |
| 8 Web admin | ✅ | `/admin`: dashboard (MRR/ARR/distribution), plan management, subscription actions |
| 9 Notifications | ✅ | `INotificationSender` (SMTP/log) + `SubscriptionNotifier` templates wired into webhook, honors prefs |
| 10 Hardening & launch | 🟡 | webhook idempotent ✅, rate limiting on public endpoints ✅; **TODO ops:** secrets→env, real JWT expiry, coupons/tax wiring, automated tests, full E2E on Stripe test mode |

Legend: ⬜ not started · 🟡 in progress · ✅ done.
