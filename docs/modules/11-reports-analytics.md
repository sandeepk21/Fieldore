# 11 — Reports / Analytics

> **Not built yet.** `AnalyticsScreen.tsx` and the `Dashboard` cards currently use mock data
> (`src/demo/mockFieldData.ts`). No reports endpoints exist.

## 1. Real-life scenario
At the end of the month Priya wants the real picture: how much money came in, how much went out, and what
she actually kept — this week, this month, and per job. She opens **Analytics** and sees revenue,
expenses, and profit she can trust, so she knows which jobs and weeks are worth her time.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Reports endpoints | ❌ | no `ReportsController` / service |
| Analytics screen | 🟡 | `app/Screens/AnalyticsScreen.tsx` exists but mock-driven |
| Dashboard cards | 🟡 | `app/(tabs)/Dashboard.tsx` uses `mockFieldData` |
| Frontend report service | ❌ | none |

## 3. Backend (to build)
- **Vertical:** `Fieldore.Application/Reports/Contracts/*` + `Fieldore.Infrastructure/Reports/ReportsService.cs`
  + `Fieldore.API/Controllers/ReportsController.cs`; register in DI. Read-only aggregation, scoped by `businessId`.
- **Endpoints:**
  - `GET /api/Reports/summary?from=&to=` (revenue, expenses, profit totals + counts)
  - `GET /api/Reports/timeseries?from=&to=&groupBy=week|month` (for charts)
  - `GET /api/Reports/by-job?from=&to=` (per-job revenue/expense/profit)
- Depends on [Payments](./09-payments-stripe.md) (revenue from paid invoices) and
  [Expenses](./10-expenses-profit.md) (cost rollups) being in place for meaningful numbers.
- After adding: **you run `npx orval`** + restore the import line. Expected names e.g.
  `getApiReportsSummary`, `getApiReportsTimeseries`, `getApiReportsByJob`.

## 4. Frontend (to build)
- **New service:** `src/services/reportService.ts`.
- **`AnalyticsScreen`:** revenue/expense/profit charts, **weekly/monthly toggle**, per-job breakdown —
  replace mock data with the reports API; all money via `formatCurrency`.
- **`Dashboard`:** swap the mock summary cards for the same `summary` endpoint.

## 5. Step-by-step user flow (target)
1. **Analytics** → pick a range + **Week / Month** toggle.
2. See totals (revenue, expenses, profit) + a trend chart.
3. Scroll to **per-job** breakdown to spot the winners and losers.

## 6. Gaps / next actions
- Build the reports vertical (after Payments + Expenses), `npx orval` (you), then wire `AnalyticsScreen`
  and `Dashboard`; finally delete `src/demo/mockFieldData.ts` once nothing references it.
