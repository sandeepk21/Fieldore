# Fieldore — Complete App Specification (End-to-End)

## What is Fieldore?

Fieldore is a **field-service management mobile app** built for service providers (plumbers, electricians, cleaners, landscapers, HVAC technicians, etc.). A single business owner ("the Provider") uses the app to manage their customers, schedule jobs, track workers, send estimates and invoices, record payments, and monitor profit.

**Tech Stack:**
- Frontend: Expo ~54 / React Native 0.81 / expo-router v6 (file-based routing)
- Backend: .NET 8 Clean Architecture (separate repo at `d:\Developer\FieldoreBackend`)
- Auth: JWT (Bearer token stored in AsyncStorage)
- API: Axios instance with auto-injected Bearer token
- Routing: expo-router with `router.push({ pathname, params })`

**Color Palette:**
- Primary Blue: `#2563eb`
- Dark Text: `#0f172a`
- Muted Text: `#64748b`
- Faint Text: `#94a3b8`
- Border: `#e2e8f0`
- Background: `#f8fafc`
- Success: `#059669`
- Warning: `#d97706`
- Error: `#dc2626`

---

## NAVIGATION STRUCTURE

```
app/
├── _layout.tsx            ← Root Stack, wraps LoaderProvider
├── index.tsx              ← Auth gate: token check → Dashboard or Onboarding
├── Auth/
│   ├── Onboarding.tsx
│   ├── LoginScreen.tsx
│   ├── SignUpScreen.tsx
│   └── ForgotPasswordScreen.tsx
├── (tabs)/
│   ├── _layout.tsx        ← Bottom tab bar (5 visible + 2 hidden)
│   ├── Dashboard.tsx
│   ├── Customers.tsx
│   ├── Scheduled.tsx
│   ├── Invoices.tsx
│   ├── Settings.tsx
│   └── JobList.tsx        ← hidden tab
└── Screens/
    ├── SplashScreen.tsx
    ├── BusinessSetupScreen.tsx
    ├── BusinessUpdateScreen.tsx
    ├── AddClientScreen.tsx
    ├── UpdateCustomerProfileScreen.tsx
    ├── CustomerProfile.tsx
    ├── CreateJobScreen.tsx
    ├── JobDetailScreen.tsx
    ├── EstimateCreatorScreen.tsx
    ├── EstimateDetailScreen.tsx
    ├── CreateInvoiceScreen.tsx
    ├── InvoiceDetailScreen.tsx
    ├── InvoiceViewScreen.tsx
    ├── ServiceCatalogScreen.tsx
    ├── TeamScreen.tsx
    ├── ExpenseListScreen.tsx
    └── AnalyticsScreen.tsx
```

### Route strings used in `router.push()`
```
Tab screens:     /(tabs)/Dashboard   /(tabs)/Customers   /(tabs)/Scheduled   /(tabs)/Invoices   /(tabs)/Settings
Feature screens: ../Screens/CreateJobScreen   ../Screens/JobDetailScreen   ../Screens/CustomerProfile   etc.
Auth screens:    ./LoginScreen   ./SignUpScreen   ./ForgotPasswordScreen   (sibling relative paths)
```

### Parameter passing
```ts
router.push({ pathname: '../Screens/JobDetailScreen', params: { jobId: 'uuid' } });
// Retrieved:
const { jobId } = useLocalSearchParams<{ jobId?: string }>();
```

---

## AUTH FLOW

### index.tsx — Auth Gate
1. Checks AsyncStorage for `auth_token`
2. If token exists → navigate to `/(tabs)/Dashboard`
3. If no token → navigate to `./Auth/Onboarding`

### SplashScreen.tsx
- Shows Fieldore logo + animated spinner on cold start
- After 1.5s check: token? → Dashboard : Onboarding

---

## ONBOARDING

### `app/Auth/Onboarding.tsx`

**3-screen carousel, auto-dismiss on last screen:**

**Screen 1 — Customers**
- Illustration: 3 customer cards with avatar initials + "24 Active Leads" badge
- Title: "Manage Your Customers"
- Body: "Store all your clients and job history in one place."
- CTA: "Continue"

**Screen 2 — Schedule**
- Illustration: Calendar grid showing "March 2026" with "Emergency Repair 10:30 AM" event
- Title: "Schedule Jobs Easily"
- Body: "Plan your day with a simple calendar and smart job scheduling."
- CTA: "Continue"

**Screen 3 — Payments**
- Illustration: Credit card mockup with "$4,250.00" balance + "Recent Job +$840.00" chip
- Title: "Get Paid Faster"
- Body: "Send professional invoices and track payments in real time."
- CTA: "Get Started" → `./LoginScreen`
- Secondary: "I ALREADY HAVE AN ACCOUNT" → `./LoginScreen`

**Navigation controls:**
- Back button (screens 2 and 3 only)
- Progress pills (3 pills, active one wider/blue)
- Skip → jumps to last screen

---

## AUTHENTICATION SCREENS

### `app/Auth/LoginScreen.tsx`

**Layout:**
- Fieldore logo (blue box, Zap icon) + "FIELDORE" text
- Title: "Welcome Back."
- Email input (Mail icon, keyboard: email-address)
- Password input (Lock icon) + show/hide eye toggle
- "Forgot?" link aligned right → `./ForgotPasswordScreen`
- Login button with Arrow icon (disabled while loading)
- Divider "OR CONTINUE WITH"
- Google sign-in button (UI only, not wired)
- Footer: "New to ProSaaS? Sign Up" → `./SignUpScreen`

**Validation:**
- Email: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — inline error if invalid
- Password: minimum 6 characters — inline error

**On Submit:**
1. Call `loginApi({ email, password })` from `authService`
2. Success → `saveAuthData(token, user)` (AsyncStorage)
3. Check `user.businessId`:
   - Has businessId → `router.replace('/(tabs)/Dashboard')`
   - No businessId → `router.replace('../Screens/BusinessSetupScreen')`
4. Error → show red error banner with message from API

---

### `app/Auth/SignUpScreen.tsx`

**Form (validates field-by-field on blur):**
- First Name (2+ chars, letters/spaces only, required)
- Last Name (2+ chars, letters/spaces only, required)
- Work Email (valid email format, required)
- Password (8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char, required)
- Confirm Password (must match password, required)

**Visual:**
- Real-time password requirements checklist (green checkmarks as each rule is met)
- "Create Account" button sticky in footer, disabled until all fields valid
- "Already using ProSaaS? Log In" → `./LoginScreen`
- Legal text: "By tapping Create Account, you agree to our Terms and Privacy Policy."

**On Submit:**
1. Call `api.postApiAuthSignup(payload)` (orval generated)
2. Success → Alert "Account created!" → `router.replace('./LoginScreen')`
3. Error → red banner with server error

---

### `app/Auth/ForgotPasswordScreen.tsx`

**States:**

**State 1 — Request Form:**
- Email input (Mail icon)
- "Reset Password" button with Arrow icon

**State 2 — Success:**
- Large green checkmark icon
- "Check your email" heading
- "We've sent a reset link to [email]"
- "Open Email App" button (opens `mailto:`)
- "Back to Log In" → `./LoginScreen`

**Validation:** Email required + valid format

---

## BUSINESS SETUP

### `app/Screens/BusinessSetupScreen.tsx`

Shown after first signup when `user.businessId` is null.

**Form:**
- Business Name (required)
- Trade Type (dropdown: Plumbing, Electrical, HVAC, Cleaning, Landscaping, General Contracting, Other)
- Business Email (optional, valid email)
- Business Phone (optional, 7-15 digits)
- Website URL (optional)
- Currency (dropdown: USD, INR, GBP, EUR, AUD, CAD, AED)
- Address:
  - Street Address
  - City
  - Zip/Postal Code
  - Country (dropdown → loads from `/api/Locations/countries`)
  - State/Province (dropdown → loads from `/api/Locations/states?countryCode=XX`)

**On Save:**
1. Call `api.postApiBusinessSetupBusiness(payload)`
2. Success → `router.replace('/(tabs)/Dashboard')`
3. Error → inline error message

---

### `app/Screens/BusinessUpdateScreen.tsx`

Same form as BusinessSetupScreen but pre-filled with existing data.

**Parameters:** None (fetches business from `/api/Business/me`)

**Accessed from:** Settings screen → profile card tap

**On Save:** `router.back()`

---

## TAB SCREENS

---

### `app/(tabs)/Dashboard.tsx` — BENTO STYLE DASHBOARD

**Data:** `getDashboardSummaryApi()` → `GET /api/Dashboard/summary`

**Layout — Bento Grid:**

**Header Row:**
- Left: Greeting ("Good morning/afternoon/evening 👋") + Business Name (small, muted)
- Right: Today's date (uppercase, e.g. "MON, 29 JUN") + Refresh icon button

**Row 1 — Metrics (2 columns):**

Left (big, dark card `#0f172a`, flex-1, minHeight 180):
- Label: "REVENUE" / "this month" (uppercase, muted white)
- Number: this month paid invoices total (large, bold, white)
- SVG Sparkline: 7 bars = last 7 days daily revenue (last day = solid white, others = 28% white)
- Caption: "Last 7 days"

Right column (2 stacked, equal height):
- Top (dark blue `#1d4ed8`):
  - "TODAY" label with Calendar icon
  - Number: today's job count (big)
  - Sub: "X scheduled · X active"
- Bottom (dark violet `#5b21b6`):
  - "ACTIVE" label with Zap icon
  - Number: currently in-progress job count
  - Sub: "jobs in progress"

**Row 2 — Financial (2 equal columns):**

Left (amber `#fef3c7`):
- "OUTSTANDING" label + Wallet icon
- Number: total balance due on all unpaid invoices
- Sub: "unpaid invoices"

Right (green `#d1fae5` if profit ≥ 0, red `#fee2e2` if negative):
- "PROFIT" label + TrendingUp/Down icon
- Number: this month revenue − this month expenses (prefix "+" if positive)
- Sub: "this month"

**Quick Actions (horizontal scroll row):**
- 4 colorful square cards:
  - New Job (blue `#2563eb`) → `../Screens/CreateJobScreen`
  - Invoice (green `#059669`) → `../Screens/CreateInvoiceScreen`
  - Customer (violet `#7c3aed`) → `../Screens/AddClientScreen`
  - Estimate (amber `#d97706`) → `../Screens/EstimateCreatorScreen`

**Today's Schedule (section):**
- Section header: "Today's Schedule" + "View all" → `/(tabs)/Scheduled`
- Empty state if no jobs (Calendar icon + "No jobs today")
- Job row per today's job:
  - Colored dot (blue=in-progress, gray=scheduled, green=completed)
  - Time (Clock icon, e.g. "09:30 AM")
  - Status chip (color-coded: bg + text)
  - "In Progress" chip shows animated pulse dot
  - Customer name (bold)
  - Job type (muted, below name)
  - ChevronRight icon
  - Tap → `../Screens/JobDetailScreen` with `{ jobId }`

**Recent Invoices (section):**
- Section header: "Recent Invoices" + "View all" → `/(tabs)/Invoices`
- Empty state if none
- Invoice row per recent invoice (last 5):
  - Left: Invoice number (small, uppercase, gray) + Customer name (bold below)
  - Right: Total amount (bold) + Status chip
  - Tap → `../Screens/InvoiceDetailScreen` with `{ invoiceId }`

**FAB (bottom-right):**
- Blue, 58×58, borderRadius 18, shadow blue
- Plus icon → `../Screens/CreateJobScreen`

**Pull-to-refresh:** Reloads all data

**Error state:** AlertCircle icon + error message + Retry button

---

### `app/(tabs)/Customers.tsx`

**Data:** `postApiCustomersGetAllCustomers(request)` with pagination (10 per page)

**Layout:**

**Header:**
- "Customers" title + total count badge
- Filter icon button (shows count badge if filters active)

**Search bar:** Full-width, debounced 350ms, searches name + phone

**Filter Side Sheet (right-to-left slide):**
- Type: All / Residential / Commercial (pill toggles)
- Status: All / Active / Inactive (pill toggles)
- City: Text input
- "Apply" button

**Customer list (FlatList, infinite scroll):**
Each customer card:
- Left: Avatar circle with colored initials (color deterministic by name hash)
- Center:
  - Customer name (bold)
  - "Active" or "Idle" badge (green/gray)
  - Phone with phone icon
  - Created date with clock icon
- Right: Location text (city/state) with MapPin icon + ChevronRight

**Interactions:**
- Tap card → `../Screens/CustomerProfile` with `{ customerId, customerName }`
- Scroll to 35% from bottom → load next page
- Pull-to-refresh → reset to page 1

**Loading states:**
- Initial: skeleton placeholders (3 shimmer cards)
- Pagination: spinner at bottom
- End of list: "You have reached the end of the list"

**FAB:**
- Plus icon → `../Screens/AddClientScreen`

---

### `app/(tabs)/Scheduled.tsx`

**Data:** `getJobsApi({ ScheduledFrom, ScheduledTo, PageSize: 100 })` — fetches up to 20 pages to build the full month view

**Layout:**

**Header:**
- "< MARCH 2026 >" — left/right arrows change month, reload data for that month
- Month label format: "MONTH YEAR" uppercase

**Day selector (horizontal scroll):**
- Shows all days in current month
- Each day: day-of-week letter (M T W T F S S) + date number
- Dots below date number: orange dot = has in-progress job, gray dot = has scheduled job
- Selected day: white pill background, dark text
- Tap day → filters agenda list

**Agenda list (below day selector):**
Jobs for selected date, sorted by ScheduledStartAt:

Job card:
- Time pill: "09:00 - 10:30" (start → end, or duration-based end)
- Status pill (top-right): colored bg + icon + label
  - Scheduled: gray `#475569`
  - In Progress: orange `#ea580c` (with pulse animation)
  - Completed: green `#16a34a`
  - Cancelled: red `#dc2626`
- Job title (large, bold)
- Customer name with User icon
- Full address with MapPin icon + "Directions" button
  - Directions: opens iOS Maps / Google Maps / browser maps with address
- Job type badge + Priority badge (Low/Normal/High → different colors)
- "View Details" link → `../Screens/JobDetailScreen` with `{ jobId }`

Empty day state:
- "No jobs scheduled for [Weekday, Date]"
- "Schedule a job" button → `../Screens/CreateJobScreen`

**FAB:** Plus → `../Screens/CreateJobScreen`

---

### `app/(tabs)/Invoices.tsx`

**Data:** `getInvoicesApi(filters)` with pagination

**Layout:**

**Sticky Header Block:**

Analytics row (3 cards):
- Hero card (dark gradient, full width):
  - "TOTAL UNPAID" label
  - Large total outstanding amount
  - "X invoices pending" badge
- Grid below (2 columns):
  - Overdue (red): overdue total amount
  - Paid this month (green): paid this month total

Search bar + Filter button row

Status filter chips (horizontal scroll):
- All · Draft · Sent · Viewed · Partially Paid · Paid · Overdue · Cancelled
- Active chip: blue bg + white text
- Tap to filter

**Invoice list (FlatList, paginated 10/page):**
Each invoice card:
- Left: FileText icon in colored box (color by status)
- Center:
  - Customer name (bold)
  - Invoice number (small, gray, uppercase)
  - Due: [date] — red if overdue
- Right:
  - Total amount (bold)
  - Status badge (dot + label, color-coded)
- Swipe left:
  - Send action (Mail icon, blue bg) — sends invoice
  - Delete action (Trash icon, red bg) — confirm then delete

**Filter Sheet (bottom slide):**
- Quick presets: This Week / This Month / 3 Months (pill toggles)
- Issued From: date picker with calendar
- Issued To: date picker with calendar
- Apply / Reset buttons

**Interactions:**
- Tap invoice card → `../Screens/InvoiceDetailScreen` with `{ invoiceId }`
- Swipe: send or delete
- Status chip: filter list
- Scroll to bottom → load next page
- Pull-to-refresh

**FAB:** Plus → `../Screens/CreateInvoiceScreen`

---

### `app/(tabs)/Settings.tsx`

**Data:** `getStripeStatusApi()` on mount — checks Stripe connection status

**Layout:**

**Header:** "Settings" title + Settings icon in blue box (top-right)

**Profile Card:**
- Avatar with initials ("AT")
- Name + Role + Email
- ChevronRight → `../Screens/BusinessUpdateScreen`

**Settings Groups (grouped list):**

**BUSINESS & TEAM:**
- Users & Team (Users icon) → `../Screens/TeamScreen`
- Service Catalog (Briefcase icon) → `../Screens/ServiceCatalogScreen`
- Expenses & Profit (Receipt icon) → `../Screens/ExpenseListScreen`
- Stripe Payments (Link icon):
  - Desc text changes by state:
    - Not connected: "Connect Stripe to accept online payments"
    - Incomplete: "Complete Stripe onboarding to accept payments"
    - Connected: "Connected · Stripe Express" (green icon + text)
  - Tap → `handleStripeConnect()`:
    - Calls `startStripeOnboardingApi()` → gets `{ onboardingUrl }`
    - Opens URL in browser via `Linking.openURL(onboardingUrl)`

**PREFERENCES:**
- Notifications (Bell icon) — not wired
- Subscription (CreditCard icon) — shows "Pro Annual (Renewing)", not wired

**ACCOUNT & SAFETY:**
- Security (ShieldCheck icon) — not wired

**Sign Out button:**
- Clears AsyncStorage (`auth_token`, `auth_user`)
- Routes to `./Auth/LoginScreen`
- Shows version "2.4.0 (Stable)"

**Footer:** "POWERED BY PROSAAS" badge

---

## FEATURE SCREENS

---

### `app/Screens/AddClientScreen.tsx`

**Purpose:** Add a new customer

**Layout — scrollable form:**

**Customer Type toggle (top):**
- Residential | Commercial
- Switching type clears Company Name field

**Primary Contact section:**
- Company Name (Commercial only, required if commercial)
- First Name (required, 2+ chars)
- Last Name (required, 2+ chars)
- Email (optional, valid email)
- Mobile Phone (required, 7-15 digits)
- Alt Phone (optional)

**Service Address section:**
- Street Address (required, 5+ chars)
- City (required, 2+ chars)
- Zip/Postal Code (required, 3-10 chars)
- Country (dropdown → modal with search, loads `getApiLocationsCountries()`)
- State/Province (dropdown → modal with search, loads `getApiLocationsStates({ countryCode })`)
  - Disabled until country selected
- Toggle: "Billing address same as service address" (default ON)

**Billing Address section (shown only if toggle OFF):**
- Same fields as service address
- Separate country/state load

**Property & Access section:**
- Gate Code (optional, max 30 chars)
- Pets (dropdown: No pets / Dog-Friendly / Dog-Caution / Cat / Multiple / Other)
- Internal Notes (multiline, optional, max 500 chars)

**Save button (sticky footer):**
1. Validate all required fields → show field-level errors
2. Call `api.postApiCustomersCreateCustomer(payload)`
3. Success → Alert "Customer added!" → `router.back()`
4. Error → Alert with server message

**Modals:**
- Country/State/Pet pickers: full-screen `SelectionModal` (animated slide, searchable, shows "Selected" + checkmark on active item)

**Header:** X (close) button → `router.back()`

---

### `app/Screens/UpdateCustomerProfileScreen.tsx`

Same form as AddClientScreen but pre-filled. Loads `getCustomerByIdApi(customerId)`.

**Params:** `{ customerId }`

**Save:** Calls `api.putApiCustomersUpdateCustomerCustomerId(customerId, payload)` → `router.back()`

---

### `app/Screens/CustomerProfile.tsx`

**Params:** `{ customerId, customerName? }`

**Data loaded:**
- `getCustomerByIdApi(customerId)`
- Tab data loaded lazily on tab switch

**Layout:**

**Header:**
- Back chevron (←) + Customer name in title
- Edit (pencil) icon → `../Screens/UpdateCustomerProfileScreen` with `{ customerId }`
- More (⋮) → dropdown: "Delete Customer" (confirm, then delete, then back)

**Profile hero section:**
- Large avatar (initials, color-coded by name)
- Full name + Active/Inactive badge
- Trade type (if commercial: company name badge)
- Contact row: email (Mail icon, tappable → mail:) + phone (Phone icon, tappable → tel:)
- Address (MapPin icon)

**Tab bar (4 tabs, scrollable):**

**Tab 1 — Jobs:**
- Loads `getJobsApi({ customerId, pageSize: 20 })`
- Each job card:
  - Left: Date block (month/day number, colored bg by status)
  - Job number (small, gray) + Job title (bold)
  - Job type + Priority badge
  - Status pill (color-coded)
  - "View Details" → `../Screens/JobDetailScreen` with `{ jobId }`
- Empty state + "New Job" button

**Tab 2 — Invoices:**
- Loads `getInvoicesApi({ customerId, pageSize: 20 })`
- Header: "Total Unpaid: ₹X" if any
- Each invoice card:
  - Invoice number + Amount
  - Status badge
  - Due date (red if overdue)
  - "View Details" → `../Screens/InvoiceDetailScreen` with `{ invoiceId }`
- Empty state + "New Invoice" button

**Tab 3 — Estimates:**
- Loads estimates for this customer
- Each estimate card:
  - Estimate number + Total
  - Status badge (Draft / Sent / Approved / Rejected / Converted)
  - "View Details" → `../Screens/EstimateDetailScreen` with `{ estimateId }`
- Empty state + "New Estimate" button

**Tab 4 — Notes:**
- Customer-level notes (not job notes)
- Each note: timestamp + note text + Edit + Delete buttons
- "Add Note" button → modal with multiline TextInput → save via API
- Edit: same modal pre-filled

**Bottom action bar (3 buttons):**
- "New Job" → `../Screens/CreateJobScreen` with `{ prefillCustomerId: customerId }`
- "New Invoice" → `../Screens/CreateInvoiceScreen` with `{ prefillCustomerId: customerId }`
- "New Estimate" → `../Screens/EstimateCreatorScreen` with `{ customerId }`

---

### `app/Screens/CreateJobScreen.tsx`

**Params:** `{ jobId? (edit mode), estimateId? (prefill from estimate) }`

**Data loaded:**
- `getCustomersApi()` — for customer picker
- If `jobId`: `getJobByIdApi(jobId)` — prefill form for edit
- If `estimateId`: `getEstimateByIdApi(estimateId)` — prefill from estimate
- `getApiLocationsCountries()` — for country picker
- `getApiLocationsStates({ countryCode })` — for state picker

**Layout — sectioned scrollable form:**

**Customer section:**
- "Select Customer" button → full-screen `SelectionModal` with search
- Shows selected customer name

**Job Details section:**
- Job Title (TextInput, required, 3+ chars)
- Job Type (dropdown → SelectionModal: Repair, Installation, Maintenance, Inspection, Other)
- Priority (dropdown → SelectionModal: Low, Normal, High — colored dots)
- Status (dropdown → SelectionModal: Scheduled, In Progress, Completed, Cancelled)

**Schedule section:**
- Date (dropdown → SelectionModal with calendar picker, required)
- Time (dropdown → SelectionModal with hour:minute:meridiem pickers, required)
- Duration (dropdown → SelectionModal: 30 min / 1 hr / 1.5 hr / 2 hr / 2.5 hr / 3 hr / 3.5 hr / 4 hr)

**Service Address section:**
- Toggle: "Use customer's primary address" (default ON, shows customer address)
- If OFF: Street, City, Zip, Country, State inputs (country/state → modals)

**Description:**
- Multiline TextInput, optional

**Checklist items:**
- Pre-seeded list (drag handle + text + delete icon per item)
- "Add Item" button appends new empty item
- Minimum 1 item required

**Header:**
- X (close) → router.back() if new, router.back() if editing
- Title: "New Job" or "Edit Job"
- "Save" button (top-right)

**On Save:**
1. Validate: customer, title, date, time, at least 1 checklist item
2. If new: `createJobApi(payload)` → Alert success → `router.replace('../Screens/JobDetailScreen')` with `{ jobId: result.id }`
3. If edit: `updateJobApi(jobId, payload)` → router.back()
4. If from estimate: `markEstimateConvertedApi(estimateId)` after job creation

**All SelectionModals:** Full-screen, animated slide, title + search + scrollable option list + checkmark on selected

---

### `app/Screens/JobDetailScreen.tsx`

**Params:** `{ jobId }`

**Data loaded on mount:**
- `getJobByIdApi(jobId)` — full job
- `getServiceCatalogApi()` — for Items tab line item picker
- `getAssignableWorkersApi()` — for worker assignment

**Data loaded lazily (on tab switch):**
- Expenses tab: `getExpensesApi({ jobId })` + `getInvoiceByJobIdApi(jobId)`

**Layout:**

**Top header:**
- Back chevron (←)
- Job number + title (truncated)
- Edit (PenSquare) icon → `../Screens/CreateJobScreen` with `{ jobId }`
- More (⋮) → dropdown:
  - "Delete Job" (confirm → delete → router back)
  - "View on Map"
  - "Share"

**Job hero section:**
- Status badge (large, color-coded) — tappable → quick status change sheet
- Customer name (bold, large)
- Date + Time (formatted, e.g. "Mon 29 Jun · 09:30 AM")
- Address with MapPin icon + "Get Directions" button
  - Opens Apple Maps / Google Maps based on platform
- Assigned workers (avatar row, each showing initials)
- Job type + Priority badge row
- If linked invoice: "Invoice: INV-XXX · [Status]" chip → taps to open InvoiceDetailScreen

**"Create Invoice from this Job" button** (shown if no linked invoice):
- → `../Screens/CreateInvoiceScreen` with `{ prefillJobId: jobId, prefillCustomerId, prefillLineItems: JSON.stringify(lineItems) }`

**Quick status action buttons (horizontal row):**
- Scheduled / In Progress / Completed / Cancelled
- Active status has filled style
- Tap → confirm → `updateJobStatusApi(jobId, { status })`

**Edit Job bottom sheet (opens on Edit icon):**
- Slides up from bottom (BottomSheet component)
- Editable: Title, Job Type, Priority, Status
- Job Type → opens "Select Job Type" sub-sheet
- Priority → opens "Select Priority" sub-sheet
- Status → opens "Select Status" sub-sheet
- Date → opens calendar sub-sheet
- Time → opens time picker sub-sheet
- Duration → opens duration sub-sheet
- Address fields (Street, City, Zip + Country/State sub-sheets)
- Description (multiline)
- Workers section: worker avatars + "Add worker" button → opens worker picker sub-sheet
- "Save Changes" button → `updateJobApi(jobId, payload)` → close sheet + reload

**5-tab bar (horizontal scroll):**

**Tab 1 — Checklist:**
- List of checkbox items, each:
  - Checkbox (tap to toggle, updates via API)
  - Item text
  - Drag handle (for reorder — calls `reorderJobChecklistApi`)
  - Delete icon
- "Add Item" button → inline TextInput appended
- Progress: "X of Y done" bar at top
- Save changes button (saves all changes in bulk via `replaceJobChecklistApi`)

**Tab 2 — Items (Line Items):**
- List of service line items for invoice:
  - Service name (tap → picks from service catalog or custom)
  - Description (optional)
  - Qty × Unit Price = Line Total
  - Delete icon per row
- "Add Item" button → opens SelectionModal with service catalog items + "Custom" option
- "Save Items" button → `replaceJobLineItemsApi(jobId, items)`
- Total shown at bottom

**Tab 3 — Photos:**
- Grid layout (2 columns, square thumbnails)
- Each photo: thumbnail + date taken + delete (X) button
- "Add Photo" button → image picker (camera or gallery)
  - Camera: `expo-image-picker` camera mode
  - Gallery: `expo-image-picker` media library
  - Upload: `addJobPhotoApi(jobId, formData)` (multipart)
- Tap photo → full-screen preview modal with:
  - Pan/zoom gesture support
  - Close (X) button
  - Delete button (trash icon, confirms then calls `deleteJobPhotoApi`)

**Tab 4 — Notes:**
- Chronological list of notes:
  - Author initials avatar
  - Timestamp (relative: "2 hours ago" / absolute if old)
  - Note text
  - Edit (pen) + Delete (trash) per note
- "Add Note" button → opens BottomSheet with multiline TextInput
- Edit note → same BottomSheet pre-filled
- `addJobNoteApi` / `editJobNoteApi` / `deleteJobNoteApi`

**Tab 5 — Expenses:**
- Profit card (3 columns):
  - Revenue (from linked invoice total, green)
  - Expenses (sum of all job expenses, red)
  - Net Profit (revenue − expenses, green/red)
- "Add Expense" button → opens full-screen modal (slide up)
- Expense list rows:
  - Category color dot (Labor=blue, Materials=green, Equipment=orange, etc.)
  - Description + Category badge
  - Date + Vendor name (if set)
  - Amount (right, bold)
  - Edit (pen) + Delete (trash) per expense

**Add/Edit Expense — full-screen modal (like CreateJobScreen's SelectionModal style):**
- Title: "Add Expense" or "Edit Expense" + X close
- Description * (TextInput, required)
- Amount * (numeric keypad, required, > 0)
- Category * → tapping opens second full-screen SelectionModal:
  - Options: Fuel / Materials / Labor / Equipment / Subcontractor / Other
  - Each option: title + "Tap to choose" sub / "Selected" if active + checkmark circle
  - Pick → returns to expense form
- Date (YYYY-MM-DD, TextInput, required)
- Vendor / Supplier (optional)
- Reference / Bill No. (optional)
- "Add Expense" / "Save Changes" button (full width, blue, bottom)
- Saves via `createExpenseApi` or `updateExpenseApi`

---

### `app/Screens/EstimateCreatorScreen.tsx`

**Params:** `{ estimateId? (edit mode), customerId? (prefill) }`

**Data loaded:**
- If `estimateId`: `getEstimateByIdApi(estimateId)`
- `getCustomersApi()` — customer picker
- `getServiceCatalogApi()` — line item picker

**Form:**
- Customer (required, modal picker)
- Estimate Title (required)
- Valid Until date (date picker)
- Line items table:
  - Service name (from catalog or custom)
  - Description
  - Qty × Unit Price = Line Total
  - Add/remove rows
- Subtotal (auto-calc)
- Tax % (optional → tax amount)
- Discount $ (optional)
- Grand Total (auto-calc)
- Notes / Terms (multiline, optional)

**On Save:**
1. Validate: customer + at least 1 line item with name + amount
2. Create: `createEstimateApi(payload)` → router.replace to EstimateDetailScreen
3. Update: `updateEstimateApi(estimateId, payload)` → router.back()

**Header:** X close + "Save" button

---

### `app/Screens/EstimateDetailScreen.tsx`

**Params:** `{ estimateId }`

**Data loaded:** `getEstimateByIdApi(estimateId)`

**Layout:**

**Header:**
- Back + Estimate number (EST-XXX)
- Edit (pen) icon → `../Screens/EstimateCreatorScreen` with `{ estimateId }`
- More (⋮) → Delete option

**Status hero:**
- Status badge (Draft / Sent / Viewed / Approved / Rejected / Converted)
- Customer name + Total amount

**Action buttons row:**
- "Send" (if Draft/Sent) → `sendEstimateApi(estimateId)` → copies public URL to clipboard / share sheet
  - Public URL format: `http://[server]/public/quotes/[token]`
- "Update Status" → bottom sheet with status options
- "Convert to Job" (if Approved) → navigate to `../Screens/CreateJobScreen` with `{ estimateId }`
- "Delete" → confirm → `deleteEstimateApi` → router.back()

**Detail sections:**
- Customer info (name, address)
- Valid until date
- Line items table (read-only): service, qty, price, total
- Subtotal / Tax / Discount / Grand Total
- Notes / Terms (if any)
- Attachments (if any, tappable)

**Status history / Activity:**
- "Sent on [date]"
- "Viewed on [date]" (once customer opens public link)
- "Accepted/Rejected on [date]" (customer responds)

---

### `app/Screens/CreateInvoiceScreen.tsx`

**Params:** `{ invoiceId?, prefillCustomerId?, prefillJobId?, prefillLineItems? (JSON string) }`

**Data loaded:**
- `getCustomersApi()` — customer modal
- `getJobsApi({ customerId })` — job picker (filtered by customer)
- `getApiLocationsCountries()` — billing country
- If `invoiceId`: `getInvoiceByIdApi(invoiceId)` — edit mode prefill

**Form sections:**

**Customer:**
- Customer picker modal (required)
- Shows customer email + billing address after selection

**Job (optional):**
- Job picker modal filtered by selected customer
- If selected, job title shown

**Invoice Details:**
- Invoice number (auto-generated: `INV-XXXX`, editable)
- Invoice date (date picker, default today)
- Due date (date picker)
- Net Terms (dropdown: Due on Receipt / Net 15 / Net 30 / Net 45 / Net 60)

**Billing Address:**
- Street, City, Zip, Country (modal), State (modal)
- "Same as customer address" toggle

**Line Items:**
- Table rows: Service name | Description | Qty | Unit Price | Total
- Add from service catalog or custom
- Delete per row
- Auto-calculates line totals

**Totals:**
- Subtotal (auto)
- Tax Rate % (input) → Tax Amount (auto)
- Discount $ (input)
- Grand Total (bold, auto = subtotal + tax - discount)

**Status:** dropdown (Draft → Sent → etc.)

**Notes:** Multiline optional

**Actions:**
- Preview button → opens invoice as HTML in WebView modal
  - In preview modal: Edit button (goes back) + Email button
- Save button:
  - New: `createInvoiceApi(payload)` → router.back()
  - Edit: `updateInvoiceApi(invoiceId, payload)` → router.back()

---

### `app/Screens/InvoiceDetailScreen.tsx`

**Params:** `{ invoiceId }`

**Data loaded:** `getInvoiceByIdApi(invoiceId)`

**Layout:**

**Top header:**
- Back (←)
- Invoice number (bold, large)
- View (eye) icon → `../Screens/InvoiceViewScreen` with `{ invoiceId }`
- Edit (pen) icon → `../Screens/CreateInvoiceScreen` with `{ invoiceId }`

**Hero block:**
- Invoice number + Status badge (color-coded)
- Total amount (large) + Balance due (muted below or second col)
- Issued on + Due date

**Status action chips (horizontal):**
- Draft · Sent · Viewed · Partially Paid · Paid · Overdue · Cancelled
- Active status highlighted (blue bg)
- Tap → `updateInvoiceStatusApi(invoiceId, { status })` → reload

**Invoice Summary card:**
- Customer name
- Billing address
- PO number (if any)
- Net terms

**Line Items table:**
- Description | Qty | Unit Price | Total
- Subtotal row
- Tax (X%) row
- Discount row
- **Grand Total row (bold)**

**Payments section:**
- "Record Payment" button (+ icon in header) → opens Record Payment modal
- Payment history list:
  - Method badge (Cash/Card/Bank/Check/Other, purple for Stripe)
  - Amount (bold)
  - Date
  - Reference number (if any)
  - Notes (if any)
  - Delete (Trash icon) → confirm → `deletePaymentApi(invoiceId, paymentId)`
- Empty state: "No payments recorded yet"

**Record Payment modal (bottom sheet style):**
- Amount input (numeric, required, > 0)
- Payment date (text input YYYY-MM-DD, default today)
- Method dropdown (inline toggle, no nested modal):
  - Cash / Card / Bank Transfer / Check / Other
- Reference number (optional)
- Notes (optional)
- "Save Payment" button → `recordPaymentApi(invoiceId, payload)` → close + reload

---

### `app/Screens/InvoiceViewScreen.tsx`

**Params:** `{ invoiceId }`

Renders invoice as a styled HTML document in a `WebView`. Read-only preview.

- Back button
- Share/email button (top-right)

---

### `app/Screens/ServiceCatalogScreen.tsx`

**Data:** `getServiceCatalogApi()` — loads all services for the business

**Layout:**
- Header: "Service Catalog" + X close
- Search bar (filters list)
- "Add Service" FAB

**Service list:**
- Service name (bold)
- Description (muted)
- Unit label + Price (right side)
- Edit (pen) + Delete (trash) per item

**Add/Edit Service — bottom sheet:**
- Service name (required)
- Description (optional)
- Unit (e.g. "per hour", "per visit", "per sq ft")
- Unit price (required, > 0, decimal)
- "Save" button

**Save:** `createServiceApi(payload)` or `updateServiceApi(id, payload)` → reload list

---

### `app/Screens/TeamScreen.tsx`

**Data:** `getWorkersApi()` — loads business team members

**Layout:**
- Header: "Team" + X close
- "Add Team Member" FAB

**Team member list:**
- Avatar with initials (color-coded)
- Full name (bold)
- Role badge (Owner / Admin / Manager / Technician / Staff)
- Active / Inactive status badge
- Edit (pen) + Deactivate/Activate toggle per member

**Add/Edit Worker — full-screen modal:**
- First Name + Last Name (required)
- Role (dropdown: Technician / Manager / Staff)
- Phone (optional)
- Email (optional)
- Status toggle: Active / Inactive
- "Save" button

**Save:** `createWorkerApi(payload)` or `updateWorkerApi(workerId, payload)` → reload

---

### `app/Screens/ExpenseListScreen.tsx`

**Data:**
- `getExpensesApi({})` — all expenses (no job filter)
- `getExpenseSummaryApi()` — totals for summary cards

**Layout:**

**Summary cards (3 columns):**
- Total Expenses (TrendingDown icon, red)
- Total Revenue (TrendingUp icon, green)
- Net Profit (Wallet icon, green/red)

**Category filter chips (horizontal scroll):**
- All · Fuel · Materials · Labor · Equipment · Subcontractor · Other

**Date range filter:**
- From / To date inputs (optional)

**Expense list:**
- Color dot by category (each category has distinct color)
- Description + Category badge
- Date + Vendor name
- Amount (right, bold)
- Edit (pen) + Delete (trash) per row

**Add/Edit Expense — full-screen modal:**
Same fields as JobDetailScreen expense modal (description, amount, category → sub-modal, date, vendor, reference)
But also includes: "Link to Job?" (optional job picker) — for expenses not tied to a specific job

---

### `app/Screens/AnalyticsScreen.tsx`

> **Status: Currently mock data — backend not built yet**

**Layout (mock):**
- Time range selector: 7D / 30D / 90D / All
- Revenue summary card (hardcoded)
- SVG chart (hardcoded bars)
- Top customers section (hardcoded names)
- Revenue vs Expenses pie (hardcoded)

---

## SERVICES REFERENCE

### `dashboardService.ts`
- `getDashboardSummaryApi()` → `GET /api/Dashboard/summary`
  - Returns: `{ businessName, currency, todayJobsCount, todayJobsCompleted, todayJobsInProgress, todayJobsScheduled, thisMonthRevenue, outstandingAmount, netProfitThisMonth, activeJobsCount, todayJobs[], recentInvoices[], weeklyRevenue[] }`

### `authService.ts`
- `loginApi({ email, password })` → `POST /api/Auth/login`
- `getBusinessDetailsApi()` → `GET /api/Business/me`

### `customerService.ts`
- `getCustomersApi(params)` → `POST /api/Customers/getAll-customers` (paged)
- `getCustomerByIdApi(id)` → `GET /api/Customers/getById/{id}`
- `createCustomerApi(payload)` → `POST /api/Customers/create-customer`
- `updateCustomerApi(id, payload)` → `PUT /api/Customers/update-customer/{id}`
- Helpers: `getCustomerDisplayName`, `getCustomerInitials`, `formatCustomerAddress`

### `jobService.ts`
- `getJobsApi(params)` → `POST /api/Jobs/getAll-jobs` (paged)
- `getJobByIdApi(id)` → `GET /api/Jobs/getById/{id}`
- `createJobApi(payload)` → `POST /api/Jobs/create-job`
- `updateJobApi(id, payload)` → `PUT /api/Jobs/update-job/{id}`
- `deleteJobApi(id)` → `DELETE /api/Jobs/delete-job/{id}`
- `updateJobStatusApi(id, payload)` → `PATCH /api/Jobs/update-status/{id}`
- `replaceJobChecklistApi(id, items)` → `PUT /api/Jobs/checklist/{id}`
- `replaceJobLineItemsApi(id, items)` → `PUT /api/Jobs/line-items/{id}`
- `replaceJobAssignmentsApi(id, assignments)` → `PUT /api/Jobs/assignments/{id}`
- `addJobNoteApi(id, payload)` → `POST /api/Jobs/notes/{id}`
- `editJobNoteApi(id, noteId, payload)` → `PUT /api/Jobs/notes/{id}/{noteId}`
- `deleteJobNoteApi(id, noteId)` → `DELETE /api/Jobs/notes/{id}/{noteId}`
- `addJobPhotoApi(id, formData)` → `POST /api/Jobs/AddPhoto/{id}` (multipart)
- `deleteJobPhotoApi(id, photoId)` → `DELETE /api/Jobs/photos/{id}/{photoId}`
- `getAssignableWorkersApi()` → `GET /api/Jobs/assignable-workers`

### `invoiceService.ts`
- `getInvoicesApi(params)` → `POST /api/Invoices/getAll-invoices` (paged)
- `getInvoiceByIdApi(id)` → `GET /api/Invoices/getById/{id}`
- `getInvoiceByJobIdApi(jobId)` → `GET /api/Invoices/byJob/{jobId}`
- `createInvoiceApi(payload)` → `POST /api/Invoices/create-invoice`
- `updateInvoiceApi(id, payload)` → `PUT /api/Invoices/update-invoice/{id}`
- `updateInvoiceStatusApi(id, payload)` → `PATCH /api/Invoices/update-status/{id}`
- Helpers: `formatInvoiceCurrency`, `formatInvoiceStatusLabel`, `getInvoiceStatusTone`

### `estimateService.ts`
- `getEstimateByIdApi(id)` → `GET /api/Estimates/getById/{id}`
- `createEstimateApi(payload)` → `POST /api/Estimates/create`
- `updateEstimateApi(id, payload)` → `PUT /api/Estimates/update/{id}`
- `deleteEstimateApi(id)` → `DELETE /api/Estimates/{id}`
- `sendEstimateApi(id)` → `POST /api/Estimates/send/{id}` → returns `{ publicUrl }`
- `convertEstimateToJobApi(id)` → (navigation-based, passes estimateId to CreateJobScreen)
- `markEstimateConvertedApi(id)` → `PATCH /api/Estimates/mark-converted/{id}`
- `buildPublicQuoteUrl(token)` → `http://[server]/public/quote/[token]`

### `expenseService.ts`
- `getExpensesApi(params: { jobId?, category?, dateFrom?, dateTo? })` → `GET /api/Expenses/getAll`
- `getExpenseSummaryApi()` → `GET /api/Expenses/summary`
- `createExpenseApi(payload)` → `POST /api/Expenses/create`
- `updateExpenseApi(id, payload)` → `PUT /api/Expenses/update/{id}`
- `deleteExpenseApi(id)` → `DELETE /api/Expenses/{id}`
- Constants: `EXPENSE_CATEGORIES` (fuel/materials/labor/equipment/subcontractor/other), `CATEGORY_COLORS`

### `paymentService.ts`
- `recordPaymentApi(invoiceId, payload)` → `POST /api/Payments/record/{invoiceId}`
- `deletePaymentApi(invoiceId, paymentId)` → `DELETE /api/Payments/{invoiceId}/{paymentId}`
- `getStripeStatusApi()` → `GET /api/stripe/status`
- `startStripeOnboardingApi()` → `POST /api/stripe/connect/onboarding`
- Constants: `PAYMENT_METHODS` (cash/card/bank_transfer/check/other)

### `workerService.ts`
- `getWorkersApi()` → loads team members
- `createWorkerApi(payload)` → creates worker
- `updateWorkerApi(id, payload)` → updates worker
- Roles: Owner / Admin / Manager / Technician / Staff

### `serviceCatalogService.ts`
- `getServiceCatalogApi()` → returns all service catalog items for business
- `createServiceApi(payload)` → create service item
- `updateServiceApi(id, payload)` → update service item
- `deleteServiceApi(id)` → delete service item

---

## GLOBAL PATTERNS

### Loading
- Global: `useLoader()` hook → `showLoader()` / `hideLoader()` — full-screen spinner overlay
- Per-screen: `ActivityIndicator` or skeleton cards for initial load
- Pull-to-refresh: `RefreshControl` on ScrollView/FlatList

### Error Handling
- All service functions throw `Error` with a message from the API
- Screens catch errors and show: Alert.alert() or inline red banner or error state UI

### Auth Token
- Stored in AsyncStorage as `auth_token`
- Auto-injected by `axiosInstance.ts` interceptor as `Authorization: Bearer [token]`
- `axiosInstance` base URL: `http://192.168.29.96:5166` (hardcoded, needs env before prod)

### API Response Shape
```ts
// All endpoints return:
{ success: boolean, statusCode: number, message: string | null, data: T | null }

// Paged endpoints return data as:
{ data: T[], totalRecords: number, pageNumber: number, pageSize: number }
```

### BottomSheet Component
- Custom `src/components/BottomSheet.tsx` (not a library)
- Wraps: `Modal > Pressable backdrop > SafeAreaView > animated slide-up sheet`
- Props: `visible`, `onClose`, `title`
- Used in: JobDetailScreen for Edit Job, Quick Status, date/time/duration pickers
- Pattern: `activeSheet` state of union type controls which content renders inside

### SelectionModal Component
- Defined inside `CreateJobScreen.tsx` as a local component
- Full-screen `Modal` (not transparent, `animationType="slide"`)
- Has: title + X close + optional subtitle + searchable scrollable list + checkmark on selected
- Used for: Customer, Country, State, Job Type, Priority, Status, Duration pickers

---

## REAL-LIFE BUSINESS FLOW (End-to-End)

```
1. SIGN UP
   SignUpScreen → BusinessSetupScreen → Dashboard

2. SETUP
   Settings → Service Catalog (add services with prices)
   Settings → Team (add workers/technicians)

3. CUSTOMER
   Customers → AddClientScreen (name, phone, address, type)

4. ESTIMATE
   CustomerProfile → Estimates tab → EstimateCreatorScreen
     → Add line items from service catalog
     → Save → EstimateDetailScreen
     → "Send" → customer gets public link (no app needed)
     → Customer taps Accept on public page → status → Approved

5. JOB
   EstimateDetailScreen → "Convert to Job" → CreateJobScreen (prefilled)
     → Set date, time, assign worker
     → Save → JobDetailScreen

6. IN THE FIELD
   JobDetailScreen → status: "In Progress"
     → Photos tab: add before/after photos
     → Checklist tab: tick off tasks
     → Notes tab: add field notes
     → Expenses tab: log fuel, materials, etc.
     → Status: "Completed"

7. INVOICE
   JobDetailScreen → "Create Invoice from this Job" → CreateInvoiceScreen (prefilled)
     → Review line items, set due date
     → Save → InvoiceDetailScreen
     → Status: Sent (customer notified)

8. PAYMENT
   InvoiceDetailScreen → "Record Payment" → enter amount + method
     → Balance auto-updates
     → Status becomes Paid / Partially Paid

9. PROFIT REVIEW
   JobDetailScreen → Expenses tab → Profit card (Revenue - Expenses)
   Settings → Expenses & Profit → ExpenseListScreen (all expenses summary)
   Dashboard → Net Profit KPI card (this month)
```

---

## KNOWN GAPS / NOT YET BUILT

| Feature | Status |
|---|---|
| Analytics/Reports screen | Mock only — no backend |
| Customer online payment (Stripe Checkout) | Paused — needs public invoice page + webhook |
| Dashboard real data | ✅ Built (this session) |
| Leads module | Removed from scope |
| JWT refresh / token expiry | Not implemented |
| Push notifications | UI only |
| Production API URL | Hardcoded `192.168.29.96:5166` |
| EAS build / app store | Not started |
