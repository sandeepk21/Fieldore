# 04 — Service Catalog (Price List)

## 1. Real-life scenario
Priya offers the same handful of services over and over ("Lawn mowing — ₹500", "Hedge trimming — ₹800").
She saves them once in her **price list**. Then, every time she builds a quote or an invoice, she picks
from the catalog instead of retyping — fast, consistent pricing.

## 2. Status today
| Piece | Status | Notes |
|---|---|---|
| Backend catalog vertical | ✅ | `ServiceCatalogController` (CRUD) |
| Catalog list + create + edit + delete | ✅ | `app/Screens/ServiceCatalogScreen.tsx` |
| Used by Estimate creator (picker) | ✅ | `EstimateCreatorScreen` "From Catalog" modal |
| Used by Invoice creator (picker) | 🟡 | confirm `CreateInvoiceScreen` reuses the same picker |
| Dedicated item detail screen | 🟡 | `getApiServiceCatalogGetByIdItemId` exists but list manages inline — detail optional |

## 3. Backend
- **Controller:** `Fieldore.API/Controllers/ServiceCatalogController.cs`
- **Service:** `Fieldore.Infrastructure/ServiceCatalog/ServiceCatalogService.cs`
- **Entity:** `ServiceCatalogItem` (name, description, category, `defaultUnitPrice`, `isActive`).
- **Endpoints:**
  - `POST /api/ServiceCatalog/create-item` → `postApiServiceCatalogCreateItem`
  - `POST /api/ServiceCatalog/getAll-items` → `postApiServiceCatalogGetAllItems` (paged, `IsActive` filter)
  - `GET /api/ServiceCatalog/getById/{itemId}` → `getApiServiceCatalogGetByIdItemId`
  - `PUT /api/ServiceCatalog/update-item/{itemId}` → `putApiServiceCatalogUpdateItemItemId`
  - `DELETE /api/ServiceCatalog/delete-item/{itemId}` → `deleteApiServiceCatalogDeleteItemItemId`

## 4. Frontend
- **Service:** `src/services/serviceCatalogService.ts` — `getServiceCatalogApi`,
  `createServiceCatalogItemApi`, `updateServiceCatalogItemApi`, `deleteServiceCatalogItemApi`.
- **Screen:** `ServiceCatalogScreen` (list + add/edit/delete inline).
- **Reuse:** the catalog picker in `EstimateCreatorScreen` (`openCatalog` → modal → `addFromCatalog`)
  seeds a line item with `name`, `description`, `defaultUnitPrice`. Mirror this in invoice creation.

## 5. Step-by-step user flow
1. **Settings → Service Catalog** → list of saved services (name, category, price).
2. **Add service** → name, category, default price → `createServiceCatalogItemApi`.
3. Tap a service → edit/delete.
4. In **Estimate/Invoice creation** → **From Catalog** → search → tap → line item pre-filled.

## 6. Gaps / next actions
- Ensure the Invoice creator uses the same catalog picker component as the Estimate creator (DRY).
- Optional: a read-only item detail screen using `getApiServiceCatalogGetByIdItemId` (low priority —
  inline edit already covers it).
