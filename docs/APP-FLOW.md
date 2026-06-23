# Fieldore — The Real-Life App Flow

This is the single source of truth for **what actually happens** when someone uses Fieldore — in
plain language, end to end. Read this first; then dive into a specific [module doc](./modules/README.md).

## Who is who

| Term | Who they are | Do they install the app? |
|---|---|---|
| **Provider** | The paying subscriber — a small field-service business (lawn care, cleaning, plumbing, sod install, landscaping…). The owner, or a manager. | ✅ Yes — this is the mobile app. |
| **Worker / Technician** | A member of the provider's team who does the actual on-site work. | ❌ No login. The provider manages them as lightweight profiles and assigns them to jobs. |
| **Customer / Client** | The homeowner or business who hired the provider. | ❌ No app, no login. They only ever tap a **web link** (quote page, pay page). |

> The whole product is built around one person (the provider) running their business from their phone,
> and their customers interacting only through **public links** the provider sends them.

---

## The end-to-end story (a real job, start to finish)

> **Scenario:** "Priya's Lawn Care" gets a call from a homeowner, Rahul, whose lawn is overgrown.

### 1. Priya sets up her business (once)
She signs up, names her business "Priya's Lawn Care", picks her trade and her **currency** (₹), and
adds her two workers (Amit, Sunil) as team profiles. She saves her common services in a **price list**
("Lawn mowing — ₹500/visit", "Hedge trimming — ₹800").
→ Modules: [Auth](./modules/01-auth.md), [Business & Settings](./modules/02-business-and-settings.md), [Workers](./modules/07-workers-team.md), [Service Catalog](./modules/04-service-catalog.md)

### 2. Rahul calls — Priya adds him as a customer
Priya taps **Add Client**, enters Rahul's name, phone, and service address.
→ Module: [Customers](./modules/03-customers.md) · (optional first step: [Leads](./modules/12-leads.md))

### 3. Priya sends Rahul a quote
From Rahul's profile she taps **New Estimate**, adds line items from her price list, sets a tax rate and
an optional deposit, and taps **Send**. Rahul instantly gets a **web link** (SMS/WhatsApp/email).
→ Module: [Estimates / Quotes](./modules/05-estimates.md)

### 4. Rahul opens the link and accepts
On his phone, Rahul opens the link — no app, no login. He sees a clean quote page with the line items,
the total, and **Accept / Reject** buttons. He taps **Accept**. Back in Priya's app, the quote flips to
**Approved**. *(If Rahul instead says yes over the phone, Priya can mark it Approved herself from the
estimate detail screen.)*
→ Module: [Public Pages](./modules/13-public-pages.md)

### 5. Priya turns the approved quote into a scheduled job
On the estimate, Priya taps **Convert to Job**. A job is created from the quote (same customer, same line
items). She schedules it for Saturday and **assigns Amit**.
→ Modules: [Estimates](./modules/05-estimates.md) → [Jobs & Scheduling](./modules/06-jobs-scheduling.md), [Workers](./modules/07-workers-team.md)

### 6. The work happens — Amit does it, Priya marks it done
Saturday, Amit mows the lawn. Priya marks the job **Complete** and adds a couple of "after" photos.
→ Module: [Jobs & Scheduling](./modules/06-jobs-scheduling.md)

### 7. Priya invoices Rahul
On the completed job she taps **Create Invoice from this Job** — the invoice is pre-filled from the job/quote.
She taps **Send** → Rahul gets a **pay link**.
→ Module: [Invoices](./modules/08-invoices.md)

### 8. Rahul pays online
Rahul opens the pay link, taps **Pay**, and pays by card via **Stripe**. The webhook tells the backend the
money landed, and the invoice auto-flips to **Paid**. *(If Rahul pays cash, Priya records the payment
manually instead, and a partial payment shows the remaining balance due.)*
→ Modules: [Payments / Stripe](./modules/09-payments-stripe.md), [Public Pages](./modules/13-public-pages.md)

### 9. Priya tracks her profit
Against that invoice Priya logs her costs (petrol ₹120, trimmer blade ₹300). The app shows
**profit = invoice total − expenses**.
→ Module: [Expenses & Profit](./modules/10-expenses-profit.md)

### 10. Priya sees how the business is doing
At month end she opens **Analytics**: revenue, expenses and profit by **week / month / per job** — so she
knows which jobs and which weeks actually make money.
→ Module: [Reports / Analytics](./modules/11-reports-analytics.md)

---

## The flow as a pipeline

```
Lead ─▶ Customer ─▶ Estimate ──send──▶ [public quote link] ──Rahul accepts──▶ Approved
                                                                                  │
                                                                          convert to job
                                                                                  ▼
                                              Job (schedule + assign worker) ─▶ Complete
                                                                                  │
                                                                      create invoice from job
                                                                                  ▼
                                   Invoice ──send──▶ [public pay link] ──Stripe──▶ Paid
                                                                                  │
                                                                    log expenses ─┘
                                                                                  ▼
                                                          Profit ─▶ Reports (week/month/job)
```

## Status legend used in every module doc

- ✅ **Built** — implemented and wired end to end.
- 🟡 **Partial** — some of it exists (e.g. create works, but the detail/view screen is missing).
- ❌ **Missing** — not started.

> **The recurring gap that makes the app feel unfinished:** several modules can *create* a record but
> have no *detail* screen to open it afterwards. The Estimates detail screen
> ([05-estimates](./modules/05-estimates.md)) was the first to be filled; the same pattern is the to-do
> across the other 🟡 modules.
