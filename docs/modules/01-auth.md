# 01 — Auth & Onboarding

## 1. Real-life scenario
Priya downloads Fieldore, creates an account, and lands inside her business. Next time she opens the app
it remembers her and drops her straight on the Dashboard. If she forgets her password she can ask for a
reset. Her workers never log in — this account is hers (the provider's).

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Backend auth (signup/login/JWT) | ✅ | `AuthController` |
| Forgot password endpoint | ✅ | `postApiAuthForgotPassword` exists |
| Login screen | ✅ | `app/Auth/LoginScreen.tsx` |
| Sign-up screen | ✅ | `app/Auth/SignUpScreen.tsx` |
| Onboarding | ✅ | `app/Auth/Onboarding.tsx` |
| Forgot-password screen wiring | 🟡 | screen exists; confirm it calls the endpoint end-to-end |
| Auth gate / splash | ✅ | `app/index.tsx` + `app/Screens/SplashScreen.tsx` + `app/hooks/useAuth.ts` |
| **JWT expiry / refresh** | ❌ | `TokenService` sets `expires: DateTime.MaxValue` (security must-fix) |

## 3. Backend
- **Controller:** `Fieldore.API/Controllers/AuthController.cs`
- **Service:** `Fieldore.Infrastructure/Auth/AuthService.cs`, `TokenService.cs`, `PasswordHasher.cs` (PBKDF2)
- **Endpoints** (→ generated function):
  - `POST /api/Auth/login` → `postApiAuthLogin`
  - `POST /api/Auth/signup` → `postApiAuthSignup`
  - `POST /api/Auth/business-register` → `postApiAuthBusinessRegister` *(see [Business](./02-business-and-settings.md))*
  - `GET /api/Auth/get-business-details` → `getApiAuthGetBusinessDetails`
  - `POST /api/Auth/forgot-password` → `postApiAuthForgotPassword`
- **Token:** JWT carries `ClaimTypes.NameIdentifier` (the userId). Every other controller scopes by it.

## 4. Frontend
- **Service:** `src/services/authService.ts`
- **Storage:** `src/utils/storage.ts` — keys `auth_token`, `auth_user` (+ currency, see [Business](./02-business-and-settings.md)).
- **Screens:** `app/Auth/{LoginScreen,SignUpScreen,ForgotPasswordScreen,Onboarding}.tsx`
- **Gate:** `app/index.tsx` → `SplashScreen` decides Dashboard vs BusinessSetup vs Onboarding based on stored token + whether a business exists. `app/hooks/useAuth.ts` exposes a boolean from the stored token.

## 5. Step-by-step user flow
1. First launch → **Onboarding** → **Sign Up** (name, email, password) → `postApiAuthSignup` → token saved.
2. New account has no business yet → routed to **Business Setup** ([02](./02-business-and-settings.md)).
3. Returning user → **Splash** reads token → has business → **Dashboard**.
4. **Login** (email/password) → `postApiAuthLogin` → token + user saved → Dashboard.
5. **Forgot password** → enter email → `postApiAuthForgotPassword` → confirmation message.
6. **Logout** (Settings) → clear `auth_token`/`auth_user` → back to Login.

## 6. Gaps / next actions
- Verify `ForgotPasswordScreen` actually calls `postApiAuthForgotPassword` and shows success/error states.
- **Security (Phase 6):** real JWT expiry + refresh token; move JWT secret to env/secrets; add token-expiry handling on the client (auto-logout / refresh on 401).
- Route protection so deep links can't open authed screens without a token.
