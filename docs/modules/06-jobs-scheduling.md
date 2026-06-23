# 06 — Jobs & Scheduling

## 1. Real-life scenario
The quote is approved, so now there's real work to do. Priya has a **job**: mow Rahul's lawn Saturday
morning. She schedules it, **assigns Amit** to it, and tracks it through Scheduled → In Progress →
Completed. On site, photos and a checklist keep proof of work. When it's done, she bills it.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Backend jobs vertical | ✅ | `JobsController` — rich (CRUD, status, assignments, checklist, notes, photos) |
| Jobs list | ✅ | `app/(tabs)/JobList.tsx` + `app/(tabs)/Scheduled.tsx` |
| Create job | ✅ | `app/Screens/CreateJobScreen.tsx` |
| Job detail | ✅ | `app/Screens/JobDetailScreen.tsx` |
| Worker assignment in UI | 🟡 | endpoint exists (`replaceAssignmentsJobId`); needs a worker picker (depends on [Workers](./07-workers-team.md)) |
| **Create invoice from job** | ❌ | button + prefill into `CreateInvoiceScreen` not wired yet |

## 3. Backend
- **Controller:** `Fieldore.API/Controllers/JobsController.cs`
- **Service:** `Fieldore.Infrastructure/Jobs/JobService.cs`
- **Endpoints → generated:**
  - CRUD: `postApiJobsCreateJob`, `postApiJobsGetAllJobs`, `getApiJobsGetByIdJobId`, `putApiJobsUpdateJobJobId`, `deleteApiJobsDeleteJobJobId`
  - Status: `patchApiJobsUpdateStatusJobId` (Scheduled / In Progress / Completed / Cancelled)
  - **Assignments:** `putApiJobsReplaceAssignmentsJobId` (assign/replace workers on a job)
  - Checklist: `putApiJobsReplaceChecklistJobId`, `putApiJobsReorderChecklistJobId`
  - Notes: `postApiJobsAddNoteJobId`, `putApiJobsEditNoteJobIdNoteId`, `deleteApiJobsDeleteNoteJobIdNoteId`
  - Photos (multipart, `/uploads`): `postApiJobsAddPhotoJobId`, `deleteApiJobsDeletePhotoJobIdPhotoId`
- Jobs link back to their source estimate (`convert-to-job` sets `ConvertedJobId` on the estimate).

## 4. Frontend
- **Service:** `src/services/jobService.ts` (incl. status normalization + display helpers).
- **Validation:** `src/utils/jobValidation.ts`.
- **Components:** `src/components/JobSchedulePicker`, `JobsViewSwitcher`, `SideFilterSheet`.
- **Screens:** `JobList`, `Scheduled` (calendar/agenda view), `CreateJobScreen`, `JobDetailScreen`.

## 5. Step-by-step user flow
1. From an approved estimate → **Convert to Job** (see [05](./05-estimates.md)) → `JobDetailScreen`,
   **or** create manually from a customer / the Jobs tab.
2. **Schedule** start/end via `JobSchedulePicker`.
3. **Assign worker(s)** → picker → `replaceJobAssignmentsApi`.
4. On site: tick **checklist**, add **photos** and **notes**, move status **In Progress** → **Completed**.
5. On a completed job: **Create Invoice from this Job** → `CreateInvoiceScreen` prefilled (customer +
   line items from the job/estimate). *(to build)*

## 6. Gaps / next actions
- **Worker picker** on `JobDetailScreen`/`CreateJobScreen` → `replaceJobAssignmentsApi` (blocked on [Workers](./07-workers-team.md) providing the assignable list).
- **"Create Invoice from this Job"** button → navigate to `CreateInvoiceScreen` with `jobId`, customer, and seeded line items (see [08](./08-invoices.md)).
- Confirm job→customer linkage shows the originating estimate on the detail screen.
