# 02 — Business & Settings

## 1. Real-life scenario
Right after signing up, Priya names her business ("Priya's Lawn Care"), picks her trade and her
**currency (₹)**, and adds contact details. Later she returns to **Settings** to update the business,
manage her service price list, manage her team, and log out. The currency she picks drives how every
amount is shown across the whole app.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Business register endpoint | ✅ | `postApiAuthBusinessRegister` |
| Get business details endpoint | ✅ | `getApiAuthGetBusinessDetails` |
| Business setup screen | ✅ | `app/Screens/BusinessSetupScreen.tsx` |
| Business update screen (detail/edit) | ✅ | `app/Screens/BusinessUpdateScreen.tsx` |
| Settings hub | ✅ | `app/(tabs)/Settings.tsx` |
| **Currency** stored + formatted everywhere | 🟡 | `src/utils/currency.ts` exists; confirm `Business.Currency` is set on register and hydrated at app start |
| Team management entry (in Settings) | ❌ | depends on [Workers](./07-workers-team.md) |

## 3. Backend
- **Lives in Auth vertical** (no separate `BusinessController`): `AuthController` + `AuthService`.
- **Endpoints:**
  - `POST /api/Auth/business-register` → `postApiAuthBusinessRegister`
  - `GET /api/Auth/get-business-details` → `getApiAuthGetBusinessDetails` (returns `BusinessDetailsResponse`, incl. currency)
- **Entity:** `Business` (Domain). All other services derive `businessId` from `AuthUserId == userId`.
- **Currency (locked decision):** stored on `Business`; every money value formats from it. Confirm the
  `Currency` field exists on the entity + `BusinessDetailsResponse` and is captured in register/update.

## 4. Frontend
- **Currency helper:** `src/utils/currency.ts` — `formatCurrency(amount, code?)`, `setActiveCurrency()`,
  `initCurrencyFromStorage()`, `getActiveCurrency()`. Holds the active ISO code in memory (default `USD`),
  persists to AsyncStorage, and pairs a locale (e.g. INR→en-IN). **All screens must format money via this**
  — never a hardcoded `$`.
- **Storage:** currency key in `src/utils/storage.ts` (`getStoredCurrency`/`saveCurrency`).
- **Screens:** `BusinessSetupScreen` (create), `BusinessUpdateScreen` (detail/edit), `Settings` (hub).

## 5. Step-by-step user flow
1. After signup with no business → **Business Setup**: name, trade/industry, currency, contact, address →
   `postApiAuthBusinessRegister` → on success `setActiveCurrency(business.currency)` → Dashboard.
2. **Settings** lists: Business profile, Service Catalog, Team, (Account / Logout).
3. Tap **Business profile** → `BusinessUpdateScreen` (pre-filled from `getApiAuthGetBusinessDetails`) → edit → save.
4. App start: `initCurrencyFromStorage()` then refresh from `getApiAuthGetBusinessDetails` so amounts render in the business currency immediately.

## 6. Gaps / next actions
- Confirm `Business.Currency` round-trips: set on register, returned by get-details, and `setActiveCurrency`
  is called after both login and business fetch.
- Add a **Team management** entry in Settings once [Workers](./07-workers-team.md) ships.
- Replace any remaining ad-hoc `$`/`toFixed` money formatting with `formatCurrency` (e.g. audit
  `invoiceService.formatInvoiceCurrency`).
