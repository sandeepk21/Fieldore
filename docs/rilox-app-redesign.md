# Rilox — Mobile App Redesign (screen by screen)

> Apply the **Rilox** brand (green + dark navy, Poppins, rounded cards, status pills, progress timelines) to the whole Expo app, matching the marketing mockups. The **web** is themed first (`d:\Developer\web`); this doc is the plan for the app.

---

## 1. Design system (build first — `src/theme/`)

**Colors** (`src/theme/colors.ts`)
| Token | Hex | Use |
|---|---|---|
| `green` | `#18C37E` | primary actions, active states |
| `green2` | `#12B76A` | gradient end, pressed |
| `teal` | `#18B4C9` | secondary accent (scheduled) |
| `ink` | `#111827` | primary text, dark surfaces, nav |
| `mist` | `#F2F4F7` | app background, chips |
| `white` | `#FFFFFF` | cards |
| muted | `#94A3B8` | secondary text |

**Gradient:** `['#18C37E', '#12B76A']` (135°) — stat cards, primary buttons, FAB.
**Typography:** Poppins (`@expo-google-fonts/poppins`) — 900 headings, 700 titles, 600 labels, 400/500 body.
**Radii:** cards 20–24, chips/pills full, buttons 14–16. **Shadow:** soft `#111827` @ 8–12% for cards; green glow on gradient buttons.

**Reusable components** (`src/components/ui/`)
- `StatCard` — green gradient, 3-up metrics (label / value / ↑%).
- `StatusPill` — `In Progress`/`Completed` = green tint; `Scheduled` = teal tint; `Cancelled` = red tint.
- `JobCard`, `Card`, `SectionHeader` (title + “View all”).
- `ProgressTimeline` — checkmark nodes + connectors (done=green fill, active=green ring, pending=grey).
- `PrimaryButton` (gradient), `GhostButton`, `FilterChips`, `SearchBar`, `Avatar`, `FAB`.
- `BottomTabBar` — Dashboard · Jobs · Customers · Invoices · More; active = green icon + label.
- `EmptyState`, `Skeleton` (reuse the Dashboard shimmer already added).

---

## 2. Screens

### Auth flow
- **Splash** — centered Rilox mark on white → subtle scale/fade; gradient wordmark. Route to Dashboard/Setup.
- **Login / Sign Up** — white bg, Rilox logo, floating-label inputs (focus ring green), gradient primary button, “Forgot password?” link in green. Social/section dividers subtle.
- **Onboarding** — 3 swipeable slides (illustration + one-line value: Save Time / Stay Organized / Grow Faster), green page dots, “Get Started” gradient CTA.
- **Business Setup** — stepped form, green progress bar, currency picker.

### Tab 1 — Dashboard  *(matches mockup 1)*
Greeting “Good morning, Alex 👋” + avatar + bell. **Green gradient stat card**: Total Jobs / Completed / Revenue with ↑% deltas. **Upcoming Jobs** list (icon tile + name + time + StatusPill) with “View all”. Quick actions row (New Job / Invoice / Customer / Estimate). Recent invoices. Pull-to-refresh; skeleton on load. FAB (gradient +).

### Tab 2 — Jobs  *(matches mockups 2 & 3)*
- **Jobs list** — title + gradient “+”, SearchBar, FilterChips (All / In Progress / Scheduled / Completed; active = green). JobCards: name, `#JOB-####`, date w/ green calendar icon, StatusPill.
- **Job Details** — back + title + StatusPill + overflow. Job title, `#JOB`, date & location rows (green icons). Tabs: Overview / Tasks / Notes / Files. Overview: Customer / Service / Assigned To / Price rows. **ProgressTimeline** (Scheduled → Arrived → In Progress → Completed). Sticky **“Mark as Complete”** gradient button. (Keep the existing subscription **job-limit gate** → upgrade dialog.)
- **Create Job** — sectioned form (customer, service, schedule via `JobSchedulePicker`, assignee, price), gradient save.

### Tab 3 — Customers
- **Customers list** — SearchBar, alphabetized cards (avatar initials on mist, name, phone, job count), gradient “+”.
- **Customer Profile** — header card (avatar, name, contact chips), tabs Jobs / Estimates / Invoices / Notes, timeline of activity, “New job/estimate” CTAs.
- **Add / Edit Client** — grouped inputs, address block, save gradient.

### Tab 4 — Invoices
- **Invoices list** — filter chips by status (reuse invoice status colors), amount + StatusPill.
- **Invoice Detail** — customer + line items card, totals, **balance due**, payments list, “Record payment”, “Send / Share pay link”. Expense section + profit summary.
- **Create Invoice** — line-item editor, live totals, gradient save. *(Delete legacy mock screens: `InvoiceView`, `InvoiceCreateWizard`, `finalcreateinvoice`.)*

### Tab 5 — More
Grid/list to: **Estimates**, **Team**, **Expenses & Profit**, **Analytics/Reports**, **Leads**, **Service Catalog**, **Subscription**, **Settings**. Each row: green icon tile + label + chevron.
- **Estimates** — list + creator (line items, deposit) + detail (accept/reject status, share public link).
- **Analytics** — green gradient KPI header; revenue/expense/profit charts (use brand palette); weekly/monthly toggle.
- **Subscription** — already built; restyle to Rilox (gradient plan header, usage bars green, feature checks). Upgrade opens web pricing.
- **Settings** — profile card, grouped rows (Business & Team, Preferences, Account & Safety), Stripe connect, sign out.

---

## 3. Rollout order
1. `src/theme/` + `src/components/ui/` primitives (StatCard, StatusPill, ProgressTimeline, BottomTabBar, PrimaryButton, FilterChips).
2. Load Poppins in `app/_layout.tsx`.
3. Re-skin tab screens: **Dashboard → Jobs list → Job Details** (highest-visibility, match mockups) → Customers → Invoices.
4. Detail/secondary screens + “More” hub.
5. Delete legacy mock invoice screens; polish empty/skeleton/error states.

Keep all existing API wiring and the subscription gating intact — this is a **visual** re-skin on top of working logic.
