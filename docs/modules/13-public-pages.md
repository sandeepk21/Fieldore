# 13 — Public Pages (Client-Facing Web)

> These pages are served by the **backend**, not the mobile app. They are **anonymous** and secured only
> by a hard-to-guess **token** in the URL. This is the only part of Fieldore the customer ever touches.

## 1. Real-life scenario
Rahul never installs anything. He just taps a link Priya texts him:
- The **quote page** — he reads the quote and taps **Accept** or **Reject**.
- The **pay page** — he reviews the invoice and taps **Pay** (Stripe).
Both pages show Priya's business name and amounts in her **currency**.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Public quote API (view/accept/reject) | ✅ | `PublicController` — `/api/public/quotes/{token}` (+ `/accept`, `/reject`) |
| Public quote **web page** | ✅ | `PublicPagesController` serves `/quote/{token}` (the link `buildPublicQuoteUrl` builds) |
| Public invoice view API | ❌ | to build (see [Payments](./09-payments-stripe.md)) |
| Public **pay page** + Stripe Checkout | ❌ | to build |
| Stripe webhook | ❌ | to build |

## 3. Backend
- **Existing:**
  - `Fieldore.API/Controllers/PublicController.cs` (`[AllowAnonymous]`, route `api/public`):
    - `GET /api/public/quotes/{token}` → `PublicEstimateResponse` (business name, line items, totals,
      currency, `canRespond`).
    - `POST /api/public/quotes/{token}/accept` · `POST /api/public/quotes/{token}/reject` → updates status
      + `RespondedAt`.
  - `Fieldore.API/Controllers/PublicPagesController.cs` — serves the client-facing **quote HTML page** at
    `/quote/{token}` with Accept/Reject buttons that call the API above.
- **To build (Payments phase):**
  - `GET /api/public/invoices/{token}` (view), `POST /api/public/invoices/{token}/checkout-session`
    (Stripe), `POST /api/public/stripe/webhook` (verify signature → record payment → auto-status).
  - A public **invoice/pay HTML page** at `/invoice/{token}` (Pay → Checkout redirect; success/cancel URLs).
- **Security:** rate-limit + validate token endpoints; never leak internal IDs beyond what the page shows
  (`PublicEstimateResponse` already does this); webhook signature verification is mandatory.

## 4. Frontend (mobile) touch points
- The app never renders these pages — it only **generates and shares the links**:
  - Quotes: `buildPublicQuoteUrl(token)` (`estimateService.ts`) → `${baseURL}/quote/{token}`.
  - Invoices (to add): a `buildPublicInvoiceUrl(token)` → `${baseURL}/invoice/{token}`.

## 5. Step-by-step user flow
1. Provider taps **Send** on a quote/invoice → public token issued → link shared (SMS/WhatsApp/email).
2. Customer opens the link in a browser — no login.
3. **Quote:** reads → **Accept/Reject** → provider sees the status change.
4. **Pay (to build):** reviews → **Pay** → Stripe Checkout → webhook → invoice **Paid**.

## 6. Gaps / next actions
- Mirror the quote pattern for invoices: public view endpoint + pay page + Stripe Checkout + webhook.
- Add `buildPublicInvoiceUrl` to the frontend once the route exists.
- Harden: rate-limiting on public endpoints, webhook signature verification, token expiry/revocation.
