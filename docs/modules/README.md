# Fieldore — Module Docs

Detailed, step-by-step specs for every module, so each one ships as a **serious, complete vertical**
(list → create → **detail** → edit → actions) instead of half-finished create-only flows.

Start with the big picture: **[../APP-FLOW.md](../APP-FLOW.md)** — what the provider and customer
actually do, end to end.

## How to read a module doc

Every doc follows the same 6 sections:

1. **Real-life scenario** — what the provider/customer is doing, in plain words.
2. **Status today** — ✅ built / 🟡 partial / ❌ missing, for the backend and each screen.
3. **Backend** — entity, endpoints (existing vs to-build), service file, key request/response fields.
4. **Frontend** — screens, `src/services/<x>.ts`, validation util, navigation entry points.
5. **Step-by-step user flow** — tap-by-tap.
6. **Gaps / next actions** — the concrete to-build list.

## The modules (in flow order)

| # | Module | Backend | Detail screen | One-liner |
|---|---|---|---|---|
| 01 | [Auth & Onboarding](./01-auth.md) | ✅ | – | Sign up / log in, gate into the app |
| 02 | [Business & Settings](./02-business-and-settings.md) | ✅ | ✅ | Business profile, **currency**, settings hub |
| 03 | [Customers](./03-customers.md) | ✅ | ✅ | The client list + profile (jobs/invoices/estimates/notes) |
| 04 | [Service Catalog](./04-service-catalog.md) | ✅ | 🟡 | Reusable price list of services |
| 05 | [Estimates / Quotes](./05-estimates.md) | ✅ | ✅ | Quote a customer, send a public link, convert to job |
| 06 | [Jobs & Scheduling](./06-jobs-scheduling.md) | ✅ | ✅ | Scheduled work, assign workers, complete with photos |
| 07 | [Workers / Team](./07-workers-team.md) | ❌ | ❌ | Lightweight team profiles (no login) |
| 08 | [Invoices](./08-invoices.md) | ✅ | ✅ | Bill the customer, from a job or from scratch |
| 09 | [Payments / Stripe](./09-payments-stripe.md) | ❌ | ❌ | Public pay page + manual/partial payments + auto-status |
| 10 | [Expenses & Profit](./10-expenses-profit.md) | ❌ | ❌ | Costs per invoice/job → profit |
| 11 | [Reports / Analytics](./11-reports-analytics.md) | ❌ | – | Revenue/expense/profit by week/month/job |
| 12 | [Leads](./12-leads.md) | 🟡 | ❌ | Capture an inquiry → convert to customer |
| 13 | [Public Pages](./13-public-pages.md) | 🟡 | – | The web pages customers see (quote, pay) |

## Token-saving build rule (important)

**Claude does not run `npx orval`.** When a backend endpoint is added/changed, Claude writes the code
against orval's predictable names and then asks **you** to run:

```bash
npx orval
```

…and then restore **line 1** of `src/api/generated.ts` to:

```ts
import { axiosInstance as axios } from './axiosInstance';
```

(orval resets it to `import axios from 'axios'`, which drops the baseURL + auth interceptor and breaks
every call). See the root [CLAUDE.md](../../CLAUDE.md).

## The orval naming convention (so frontend code compiles after you regen)

Generated client functions follow `{httpMethod}Api{Controller}{ActionName}{RouteParams}`. Examples from
the already-generated estimate client:

| Backend route | Generated function |
|---|---|
| `POST /api/Estimates/create-estimate` | `postApiEstimatesCreateEstimate` |
| `GET /api/Estimates/getById/{estimateId}` | `getApiEstimatesGetByIdEstimateId` |
| `PATCH /api/Estimates/update-status/{estimateId}` | `patchApiEstimatesUpdateStatusEstimateId` |
| `POST /api/Estimates/convert-to-job/{estimateId}` | `postApiEstimatesConvertToJobEstimateId` |
