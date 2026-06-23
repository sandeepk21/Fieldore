# 10 — Expenses & Profit

> **Not built yet — no `Expense` entity exists.** This is a brand-new vertical (entity + migration).

## 1. Real-life scenario
Priya got paid ₹500 for the lawn job, but it cost her ₹120 in petrol and ₹300 for a new trimmer blade.
She logs those costs against the invoice (or the job), and the app tells her the truth:
**profit = ₹500 − ₹420 = ₹80**. Across many jobs, this is how she learns which work actually makes money.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| `Expense` entity | ❌ | does not exist — must be added |
| Expense service + endpoints | ❌ | to build |
| Profit calculation | ❌ | to build (`invoice total − Σ expenses`) |
| Frontend expense UI | ❌ | none |

## 3. Backend (to build)
- **New entity** `Expense`: `BusinessId`, `InvoiceId?`, `JobId?` (≥1 set), `Category`, `Description`,
  `Amount decimal(18,2)`, `IncurredOn`, `Vendor?`, `ReceiptPath?`, `RecordedByUserId` → DbSet + EF config
  + **migration**. (Derive the job from the invoice for job-wise rollups.)
- **Vertical:** `Fieldore.Application/Expenses/Contracts/*` + `Fieldore.Infrastructure/Expenses/ExpenseService.cs`
  + `Fieldore.API/Controllers/ExpensesController.cs`; register in DI.
- **Endpoints:**
  - `POST /api/Expenses/create-expense` (scoped to invoice/job)
  - `POST /api/Expenses/getAll-expenses` (filter by invoiceId/jobId/date)
  - `PUT /api/Expenses/update-expense/{expenseId}` · `DELETE …/delete-expense/{expenseId}`
  - `GET /api/Invoices/{invoiceId}/profit` (returns revenue, Σ expenses, profit)
  - Optional receipt upload (multipart, `/uploads/expenses/...`, mirror `JobsController.AddPhoto`).
- After adding: **you run `npx orval`** + restore the import line. Expected names e.g.
  `postApiExpensesCreateExpense`, `postApiExpensesGetAllExpenses`, `getApiInvoicesProfitInvoiceId`.

## 4. Frontend (to build)
- **New service:** `src/services/expenseService.ts`.
- **Expense section on `InvoiceDetailScreen`:** add/edit/delete expense rows per invoice + a **profit
  summary** card (Revenue / Expenses / Profit), formatted via `formatCurrency`.

## 5. Step-by-step user flow (target)
1. Invoice detail → **Expenses** → **Add expense** (category, amount, date, vendor, optional receipt).
2. Profit summary updates live: revenue (invoice total) − expenses = profit.
3. Edit/delete expenses as needed.

## 6. Gaps / next actions
- Add the `Expense` entity + migration, then the vertical, then `npx orval` (you), then UI.
- Expose rollups for [Reports](./11-reports-analytics.md) (job-wise / weekly / monthly).
