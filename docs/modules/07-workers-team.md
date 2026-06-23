# 07 — Workers / Team

> **New vertical — not built yet.** Lightweight team profiles managed entirely by the provider.
> **No worker login, no worker app** (locked decision).

## 1. Real-life scenario
Priya has two people who do the actual work: Amit and Sunil. They don't get their own logins — Priya just
keeps a simple profile for each (name, phone, role) so she can **assign them to jobs** and later see who
did what. If Sunil leaves, she deactivates him.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Backend workers vertical | ❌ | no `WorkersController` / `IWorkerService` yet |
| Assignment plumbing | ✅ | `putApiJobsReplaceAssignmentsJobId` already exists on Jobs |
| Domain building blocks | ✅ | `AppUserProfile` + `BusinessMembership` (roles incl. `technician`/`staff`) + `JobAssignment` exist |
| Frontend team screen | ❌ | none |
| Frontend worker service | ❌ | none |
| Worker picker on jobs | ❌ | see [Jobs](./06-jobs-scheduling.md) |

## 3. Backend (to build — mirror the Invoice vertical)
- **New:** `Fieldore.Application/Workers/Contracts/*` + `Fieldore.Infrastructure/Workers/WorkerService.cs`
  + `Fieldore.API/Controllers/WorkersController.cs`; register in `ServiceCollectionExtensions`.
- Manage `AppUserProfile` + `BusinessMembership` (role `technician`/`staff`) **without** creating an
  `AuthUser` login.
- **Endpoints (planned):**
  - `POST /api/Workers/create-worker` (name, phone, role)
  - `POST /api/Workers/getAll-workers` (list, optional `isActive`)
  - `GET /api/Workers/getById/{workerId}`
  - `PUT /api/Workers/update-worker/{workerId}`
  - `PATCH /api/Workers/deactivate/{workerId}` (soft-disable; keep history)
  - `GET /api/Workers/assignable` (active workers for the job picker)
- After adding these: **you run `npx orval`** + restore the import line. Expected generated names:
  `postApiWorkersCreateWorker`, `postApiWorkersGetAllWorkers`, `getApiWorkersGetByIdWorkerId`,
  `putApiWorkersUpdateWorkerWorkerId`, `patchApiWorkersDeactivateWorkerId`, `getApiWorkersAssignable`.

## 4. Frontend (to build)
- **New service:** `src/services/workerService.ts` (mirror `invoiceService.ts`).
- **Team screen** under Settings: list workers, add/edit, deactivate.
- **Worker picker** component reused on `JobDetailScreen`/`CreateJobScreen` → `replaceJobAssignmentsApi`.

## 5. Step-by-step user flow (target)
1. **Settings → Team** → list of workers (name, role, active).
2. **Add worker** → name, phone, role → saved.
3. Open a worker → edit, or **Deactivate**.
4. On a job → **Assign** → pick from active workers → saved via job assignments.

## 6. Gaps / next actions
- Build the backend vertical + migration-free reuse of existing entities (no schema change expected).
- Then `npx orval` (you), then `workerService.ts` + Team screen + job worker picker.
