# 05 — Estimates / Quotes

> This is the **entry point of the money flow** and the first module to get a full detail screen.

## 1. Real-life scenario
Priya quotes Rahul for the lawn job. She builds line items (from her catalog or by hand), adds a tax rate
and an optional deposit, and taps **Send**. Rahul gets a **public web link**, opens it with no app/login,
and taps **Accept**. Priya sees the quote flip to **Approved**, then taps **Convert to Job** — the whole
job is created from the quote. If Rahul accepted over the phone instead, Priya marks it Approved herself.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Backend estimates vertical | ✅ | `EstimatesController` — CRUD + status + send + convert + attachments |
| Public quote endpoints | ✅ | `PublicController` (view/accept/reject by token) — see [13](./13-public-pages.md) |
| Frontend service | ✅ | `src/services/estimateService.ts` (complete) |
| Create estimate | ✅ | `app/Screens/EstimateCreatorScreen.tsx` |
| **Estimate detail (view)** | ✅ | **`app/Screens/EstimateDetailScreen.tsx` — built; cards in `CustomerProfile` now open it** |
| Estimates list (standalone) | 🟡 | listed inside `CustomerProfile` Estimates tab; no global list screen |
| Edit estimate | ❌ | `EstimateCreatorScreen` is create-only; needs an edit mode (prefill + `updateEstimateApi`) |

## 3. Backend
- **Controller:** `Fieldore.API/Controllers/EstimatesController.cs`
- **Service:** `Fieldore.Infrastructure/Estimates/EstimateService.cs`
- **Entity:** `Estimate` + `EstimateLineItem` (statuses `draft/sent/approved/rejected/expired/converted`),
  plus `PublicToken`, `SentAt`, `RespondedAt`, `ConvertedJobId`, attachments.
- **Endpoints (authed) → generated:**
  - `POST /api/Estimates/create-estimate` → `postApiEstimatesCreateEstimate`
  - `POST /api/Estimates/getAll-estimates` → `postApiEstimatesGetAllEstimates`
  - `GET /api/Estimates/getById/{estimateId}` → `getApiEstimatesGetByIdEstimateId`
  - `PUT /api/Estimates/update-estimate/{estimateId}` → `putApiEstimatesUpdateEstimateEstimateId`
  - `PATCH /api/Estimates/update-status/{estimateId}` → `patchApiEstimatesUpdateStatusEstimateId`
  - `POST /api/Estimates/send/{estimateId}` → `postApiEstimatesSendEstimateId` (marks sent + issues `PublicToken`)
  - `POST /api/Estimates/convert-to-job/{estimateId}` → `postApiEstimatesConvertToJobEstimateId` (returns `jobId`)
  - `DELETE /api/Estimates/delete-estimate/{estimateId}` → `deleteApiEstimatesDeleteEstimateEstimateId`
  - `POST /api/Estimates/add-attachment/{estimateId}` (multipart) · `DELETE …/delete-attachment/{estimateId}/{attachmentId}`
- **Money math:** tax is applied **after** discount; deposit resolves off the grand total. (The creator
  screen mirrors this exactly.)
- **Key response fields** (`EstimateResponse`): `estimateNumber`, `status`, `issuedOn`/`expiresOn`
  (DateOnly), `subtotalAmount`/`discountAmount`/`taxRate`/`taxAmount`/`totalAmount`, `depositAmount`,
  `lineItems[]` (`serviceName`, `quantity`, `unitPrice`, `lineTotal`), `attachments[]`, `publicToken`,
  `sentAt`/`respondedAt`, `convertedJobId`, `customer` summary.

## 4. Frontend
- **Service:** `src/services/estimateService.ts` — `getEstimatesApi`, `getEstimateByIdApi`,
  `createEstimateApi`, `updateEstimateApi`, `updateEstimateStatusApi`, `sendEstimateApi`,
  `convertEstimateToJobApi`, `deleteEstimateApi`, attachments; helpers `formatEstimateStatusLabel`,
  `getEstimateStatusTone`, `formatEstimateCurrency`, `buildPublicQuoteUrl`, `buildAttachmentUrl`.
- **Validation:** `src/utils/estimateValidation.ts` (line items, tax, discount, deposit, dates).
- **Screens:** `EstimateCreatorScreen` (create), **`EstimateDetailScreen` (detail + actions)**.
- **Detail screen actions:** Send/Resend (share `buildPublicQuoteUrl`), Share link, Approve/Reject
  (when sent), Convert to Job (when approved → `JobDetailScreen`), View Job (when converted), Delete,
  open attachments.

## 5. Step-by-step user flow
1. Customer profile → **Estimates** tab → **New Estimate** → `EstimateCreatorScreen`.
2. Add line items (catalog or blank), set dates, tax, discount, optional deposit, message → **Save Draft** or **Send Estimate**.
3. Back on the profile, the new estimate appears → **tap it → `EstimateDetailScreen`**.
4. From detail: **Send** → share the public link; customer accepts on the web → status becomes **Approved**
   (or Priya taps **Approve**).
5. **Convert to Job** → backend creates the job → app opens `JobDetailScreen` for it; estimate shows **Converted** + **View Job**.

## 6. Gaps / next actions
- **Edit mode:** add `estimateId` param support to `EstimateCreatorScreen` to prefill from
  `getEstimateByIdApi` and submit via `updateEstimateApi`; wire an **Edit** button on the detail screen
  (enable for draft/sent). *(No orval needed — endpoints already generated.)*
- Optional global **Estimates list** screen (filter by status) reusing `getEstimatesApi`.
- Attachments: allow adding files from the detail screen (not only at creation).
