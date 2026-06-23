# 09 — Payments / Stripe

> **Not built yet.** The `PaymentRecord` entity exists in the Domain, but there is **no payment service,
> no controller, and no public invoice/pay endpoints** (the current `PublicController` only handles quotes).

## 1. Real-life scenario
Rahul gets the invoice link, taps **Pay**, and pays by card. Seconds later his invoice shows **Paid** in
Priya's app — she didn't touch anything. If Rahul instead hands her cash, Priya taps **Record Payment**;
if he pays half now, the invoice shows **Partially Paid** with the remaining **balance due**.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| `PaymentRecord` entity (supports partial) | ✅ | Domain only — not exposed |
| Payment service + endpoints | ❌ | to build |
| Stripe integration | ❌ | `Stripe.net` not added; no keys |
| Public invoice view + pay endpoints | ❌ | `PublicController` currently quotes-only |
| Public pay page | ❌ | see [Public Pages](./13-public-pages.md) |
| Frontend payment service / UI | ❌ | no `paymentService.ts` |

## 3. Backend (to build)
- **Vertical:** `Fieldore.Application/Payments/Contracts/*` + `Fieldore.Infrastructure/Payments/PaymentService.cs`
  + add to `PublicController` (or a `PaymentsController`); register in DI.
- **Authed endpoints:**
  - `POST /api/Invoices/{invoiceId}/record-payment` (manual/cash; amount, method, date)
  - `GET /api/Invoices/{invoiceId}/payments` (list for an invoice)
  - On every payment: recompute `BalanceDueAmount` and set status `paid` / `partially_paid`.
- **Stripe + public (anonymous):**
  - Add `PublicToken` to `Invoice` (migration).
  - `GET /api/public/invoices/{token}` (view), `POST /api/public/invoices/{token}/checkout-session`
    (Stripe Checkout Session, **currency from `Business`**), `POST /api/public/stripe/webhook`
    (verify signature → on `checkout.session.completed` create `PaymentRecord` + **auto-update status**).
- **Secrets:** Stripe keys in user-secrets/env; webhook **must verify signatures**.
- After adding: **you run `npx orval`** + restore the import line. Expected generated names e.g.
  `postApiInvoicesRecordPaymentInvoiceId`, `getApiInvoicesPaymentsInvoiceId`,
  `getApiPublicInvoicesToken`, `postApiPublicInvoicesCheckoutSessionToken`.

## 4. Frontend (to build)
- **New service:** `src/services/paymentService.ts`.
- **On `InvoiceDetailScreen`:** Send (share public pay link), payments list + balance due, **Record Payment**
  (manual/partial), pull-to-refresh so status reflects after the webhook lands.

## 5. Step-by-step user flow (target)
1. Invoice detail → **Send** → share pay link.
2. Rahul opens it → **Pay** → Stripe Checkout → success.
3. Webhook → `PaymentRecord` created → invoice **Paid** (or **Partially Paid** + balance).
4. Cash path: Priya → **Record Payment** → same status math, no Stripe.

## 6. Gaps / next actions
- Build payment service + manual record endpoints first (no Stripe dependency) so cash flow works.
- Then Stripe Checkout + webhook + public pay page ([13](./13-public-pages.md)).
- Reconcile invoice statuses ([08](./08-invoices.md)) before wiring auto-status.
