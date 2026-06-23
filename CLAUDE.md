# Fieldore — Frontend (Expo / React Native)

Field-service app for service providers (cleaning, landscaping, plumbing, etc.). This repo is the **mobile frontend only**. The backend is a separate .NET 8 solution at `D:\Developer\FieldoreBackend` (Swagger at the API base URL). See that repo's `CLAUDE.md` for the server side.

## Stack
- **Expo** (~54) + **React Native** 0.81, **expo-router** v6 (file-based routing under `app/`).
- **axios** via `src/api/axiosInstance.ts` (injects `Bearer` token from AsyncStorage).
- **orval** generates the typed API client `src/api/generated.ts` from the backend's live Swagger (`orval.config.js`). Run `npx orval` after backend changes. ⚠️ **After every regen, restore the first import line** to `import { axiosInstance as axios } from './axiosInstance';` (orval defaults it to bare `import axios from 'axios'`, which drops the baseURL + auth-token interceptor and breaks every call).
- Manual form validation (`src/utils/*Validation.ts`); no form library, no React Query/Redux.
- Global loading overlay via `src/context/LoaderContext.tsx` (`useLoader().showLoader/hideLoader`).
- Fonts: DM Serif Display, Inter, Lato (`@expo-google-fonts/*`).

## Layout
- `app/_layout.tsx` — root Stack wrapped in `LoaderProvider`.
- `app/index.tsx` + `app/Screens/SplashScreen.tsx` — auth gate → Dashboard / BusinessSetup / Onboarding.
- `app/(tabs)/` — Dashboard, Customers, Scheduled, Invoices, Settings (+ hidden JobList).
- `app/Auth/` — Login, SignUp, ForgotPassword, Onboarding.
- `app/Screens/` — feature screens (AddClient, CreateJob, JobDetail, CreateInvoice, InvoiceDetail, EstimateCreator, Analytics, BusinessSetup/Update, etc.).
- `app/hooks/useAuth.ts` — boolean auth state from stored token.
- `src/services/*` — thin wrappers over `getFieldoreAPI()` that unwrap `ApiResponse`/paged data, normalize statuses, and expose display helpers. **Add new features here** (e.g. `estimateService.ts`).
- `src/utils/storage.ts` — AsyncStorage keys `auth_token`, `auth_user`.
- `src/components/` — `JobSchedulePicker`, `JobsViewSwitcher`, `SideFilterSheet`.
- `src/demo/mockFieldData.ts` — demo data still used by Dashboard and some unfinished screens.

## Conventions
- API base URL is currently **hardcoded** in `src/api/axiosInstance.ts` and `orval.config.js` (`http://192.168.29.96:5166`) — needs env config before deployment.
- Backend wraps everything in `ApiResponse<T> { success, statusCode, message, data }`; paged lists in `PagedResponse<T> { data, totalRecords, pageNumber, pageSize }`. Services unwrap `.data`.
- Backend scopes all data by the authenticated user's business; the JWT is all the client needs to send.
- Currency is **configurable per business** — format money from the business currency, not a hardcoded `$`.
- Styling is per-screen `StyleSheet` (palette: primary `#2563eb`, text `#0f172a`, muted `#64748b`, borders `#e2e8f0`, bg `#f8fafc`). A shared `src/theme/` module is being introduced — prefer it for new screens.

## Commands
- `npx expo start` (also `--android` / `--ios` / `--web`); `npm run lint`; `npx orval` to regenerate the API client.

## Roadmap & memory
Active production roadmap: `C:\Users\sande\.claude\plans\please-scan-my-app-abundant-elephant.md`. Project facts/decisions live in Claude memory (`MEMORY.md` index).
