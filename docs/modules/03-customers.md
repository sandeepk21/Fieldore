# 03 — Customers (Clients)

## 1. Real-life scenario
A homeowner, Rahul, calls Priya. She taps **Add Client** and saves his name, phone, email and service
address. From then on, Rahul has a **profile** that gathers everything about him in one place: his jobs,
his invoices, his estimates, and Priya's private notes. This profile is the launch pad for quoting and
billing him.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Backend customers vertical | ✅ | `CustomersController` (CRUD) |
| Customers list | ✅ | `app/(tabs)/Customers.tsx` |
| Add client (create) | ✅ | `app/Screens/AddClientScreen.tsx` |
| Customer profile (detail) | ✅ | `app/Screens/CustomerProfile.tsx` — Jobs/Invoices/Estimates/Notes tabs |
| Update customer (edit) | ✅ | `app/Screens/UpdateCustomerProfileScreen.tsx` |
| Estimate cards tappable → detail | ✅ | **fixed** — cards now open `EstimateDetailScreen` |

## 3. Backend
- **Controller:** `Fieldore.API/Controllers/CustomersController.cs`
- **Service:** `Fieldore.Infrastructure/Customers/CustomerService.cs`
- **Endpoints:**
  - `POST /api/Customers/create-customer` → `postApiCustomersCreateCustomer`
  - `POST /api/Customers/getAll-customers` → `postApiCustomersGetAllCustomers` (paged + search)
  - `GET /api/Customers/getById/{customerId}` → `getApiCustomersGetByIdCustomerId`
  - `PUT /api/Customers/update-customer/{customerId}` → `putApiCustomersUpdateCustomerCustomerId`
  - `DELETE /api/Customers/delete-customer/{customerId}` → `deleteApiCustomersDeleteCustomerCustomerId`
- **`CustomerResponse`** embeds summary lists: `jobs[]`, `invoices[]`, `estimates[]`, `notes[]`
  (`CustomerJobSummaryResponse`, `CustomerInvoiceSummaryResponse`, `CustomerEstimateSummaryResponse`,
  `CustomerNoteResponse`) — so the profile screen loads everything in one call.
- Addresses use `EstimateAddressResponse`-style fields; country/state options come from
  `Locations` (`getApiLocationsCountries` / `getApiLocationsStates`).

## 4. Frontend
- **Service:** `src/services/customerService.ts` — incl. display helpers (`getCustomerDisplayName`,
  `getCustomerInitials`, `formatCustomerAddress`, `getPrimaryCustomerAddress`, `getBillingCustomerAddress`).
- **Screens:** `Customers` (list), `AddClientScreen` (create), `CustomerProfile` (detail, tabbed),
  `UpdateCustomerProfileScreen` (edit).
- **Navigation:** list row → `CustomerProfile?customerId=…`; profile tabs deep-link to
  `JobDetailScreen`, `InvoiceDetailScreen`, `EstimateDetailScreen`, and `EstimateCreatorScreen`.

## 5. Step-by-step user flow
1. **Customers** tab → search/scroll the list → tap a client.
2. **Customer profile** shows header (avatar, contact, call/email actions) + tabs:
   - **Jobs** → tap → `JobDetailScreen`
   - **Invoices** → tap → `InvoiceDetailScreen`
   - **Estimates** → **New Estimate** → `EstimateCreatorScreen`; tap a card → `EstimateDetailScreen`
   - **Notes** → internal + team notes
3. **Add Client** (from the list) → form → `postApiCustomersCreateCustomer` → back to list.
4. **Edit** (profile → More/Edit) → `UpdateCustomerProfileScreen` → save.

## 6. Gaps / next actions
- Keep the profile the single hub: as new modules land (payments, expenses), surface them here too.
- Confirm delete-customer guards against deleting a client with open jobs/invoices (or soft-delete).
