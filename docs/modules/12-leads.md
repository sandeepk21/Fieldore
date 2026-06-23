# 12 — Leads

> Lower priority (optional). The `Lead` entity exists in the Domain, but there are **no lead endpoints**
> and the screen is mock-only.

## 1. Real-life scenario
Before someone is a real customer, they're just an inquiry: "Saw your flyer — how much to clean my
gutters?" Priya jots them down as a **lead**. When they're ready to commit, she **converts the lead to a
customer** and quotes them. Leads keep the top of the funnel from getting lost.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| `Lead` entity | ✅ | Domain only — not exposed via a service/controller |
| Lead endpoints | ❌ | no `LeadsController` |
| Lead list screen | 🟡 | `app/Screens/LeadListScreen.tsx` exists but mock-driven |
| Lead detail / convert | ❌ | none |
| Frontend lead service | ❌ | none |

## 3. Backend (to build, when prioritized)
- **Vertical:** `Fieldore.Application/Leads/Contracts/*` + `Fieldore.Infrastructure/Leads/LeadService.cs`
  + `Fieldore.API/Controllers/LeadsController.cs`; register in DI.
- **Endpoints:**
  - `POST /api/Leads/capture-lead`, `POST /api/Leads/getAll-leads`, `GET /api/Leads/getById/{leadId}`,
    `PUT /api/Leads/update-lead/{leadId}`, `PATCH /api/Leads/update-status/{leadId}`,
    `POST /api/Leads/convert-to-customer/{leadId}` (creates a `Customer`, marks the lead converted).
- After adding: **you run `npx orval`** + restore the import line.

## 4. Frontend (to build)
- **New service:** `src/services/leadService.ts`.
- Wire `LeadListScreen` to real data; add a **lead detail** screen with **Convert to Customer** →
  `AddClientScreen`/`CustomerProfile`, then straight into an [Estimate](./05-estimates.md).

## 5. Step-by-step user flow (target)
1. **Leads** → list of inquiries with status (new / contacted / qualified / lost).
2. Tap a lead → detail → update status or **Convert to Customer**.
3. Converted → opens the new customer profile → **New Estimate**.

## 6. Gaps / next actions
- Build the backend vertical + `leadService.ts`; replace the mock list; add detail + convert.
- This is the optional pre-step at the very top of the [app flow](../APP-FLOW.md).
