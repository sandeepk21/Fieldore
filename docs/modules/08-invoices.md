# 08 — Invoices

## 1. Real-life scenario
The lawn is mowed and the job is done — time to get paid. Priya creates an **invoice** (ideally straight
from the completed job, so it's pre-filled) and taps **Send**. Rahul gets a **pay link**. As money comes
in (online or cash), the invoice tracks **Paid / Partially Paid** and the **balance due**.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Backend invoices vertical | ✅ | `InvoicesController` — CRUD + status |
| Invoices list | ✅ | `app/(tabs)/Invoices.tsx` + `app/Screens/InvoicesListScreen.tsx` |
| Create invoice | ✅ | `app/Screens/CreateInvoiceScreen.tsx` |
| Invoice detail | ✅ | `app/Screens/InvoiceDetailScreen.tsx` |
| Create-from-job prefill | ❌ | see [Jobs](./06-jobs-scheduling.md) |
| Payments / public pay page | ❌ | see [Payments / Stripe](./09-payments-stripe.md) |
| **Mock duplicate screens** | 🟡 | `InvoiceViewScreen`, `InvoiceCreateWizardScreen`, `finalcreateinvoice.tsx` overlap the real screens — **delete/consolidate** |
| Status enum reconciliation | 🟡 | backend vs frontend mismatch (below) |

## 3. Backend (this is the **mirror donor** for every new vertical)
- **Controller:** `Fieldore.API/Controllers/InvoicesController.cs`
- **Service:** `Fieldore.Infrastructure/Invoices/InvoiceService.cs` (`GetBusinessIdAsync`, static `Validate…`,
  `CalculateTotals`, `Generate…NumberAsync`, batch `Build…ResponsesAsync`).
- **Endpoints → generated:**
  - `POST /api/Invoices/create-invoice` → `postApiInvoicesCreateInvoice`
  - `POST /api/Invoices/getAll-invoices` → `postApiInvoicesGetAllInvoices`
  - `GET /api/Invoices/getById/{invoiceId}` → `getApiInvoicesGetByIdInvoiceId`
  - `PUT /api/Invoices/update-invoice/{invoiceId}` → `putApiInvoicesUpdateInvoiceInvoiceId`
  - `PATCH /api/Invoices/update-status/{invoiceId}` → `patchApiInvoicesUpdateStatusInvoiceId`
  - `DELETE /api/Invoices/delete-invoice/{invoiceId}` → `deleteApiInvoicesDeleteInvoiceInvoiceId`
- **To add (Payments phase):** `PublicToken` on `Invoice` (migration), public view/pay endpoints, and
  recompute `BalanceDueAmount` + status when a payment lands.

## 4. Frontend
- **Service:** `src/services/invoiceService.ts` — `formatInvoiceCurrency`, `formatInvoiceStatusLabel`,
  `getInvoiceStatusTone`; currently hacks `PartiallyPaid ↔ Partially Paid` to bridge the enum mismatch.
- **Validation:** `src/utils/invoiceValidation.ts`.
- **Real screens:** `Invoices` (tab), `InvoicesListScreen`, `CreateInvoiceScreen`, `InvoiceDetailScreen`.
- **Mock/dupes to remove:** `InvoiceViewScreen.tsx`, `InvoiceCreateWizardScreen.tsx`, `finalcreateinvoice.tsx`.

## 5. Step-by-step user flow
1. **Create invoice** — from a completed job (prefilled, *to build*) or from scratch on a customer.
2. Add/adjust line items (catalog picker), tax, due date → save **Draft** or **Send**.
3. **Invoice detail** → totals, status badge, due date.
4. **Send** → share the public pay link (Payments phase) → customer pays → status auto-updates.
5. Record a **manual/partial payment** → balance due recalculates (Payments phase).

## 6. Gaps / next actions
- **Reconcile the status enum** to one set: `draft, sent, viewed, partially_paid, paid, overdue, void`
  (update `InvoiceStatuses.cs`, `invoiceValidation.ts`, `invoiceService.ts`; remove the PartiallyPaid hack).
- **Delete the mock duplicates** (`InvoiceViewScreen`, `InvoiceCreateWizardScreen`, `finalcreateinvoice`).
- **"Create invoice from job"** prefill (see [Jobs](./06-jobs-scheduling.md)).
- Then build [Payments / Stripe](./09-payments-stripe.md) + the [public pay page](./13-public-pages.md).
