# POS Phase 3 — Settings: Quick Charges + type pricing/credit

**Goal:** Org-configurable Quick Charges; customer-type discount/credit defaults with per-customer overrides; POS applies discount on new lines; skip-approval completes over-limit credit without a request.

**Repos:** `core-apis` + `ERP-Client`

## File map

| Path | Intent |
|---|---|
| `core-apis` entities + migration | `quick_charges`, `customer_type_rules`; customer override columns |
| `core-apis` billing-settings module | CRUD charges; list/patch type rules (ensure 4 rows) |
| `bill-completion.service.ts` | Honor effective skip-approval |
| Customer create/update DTOs | Overrides; default credit limit from type rule |
| ERP-Client Billing Settings page | Charges editor + type-rules table |
| `ProductSearchPanel` / POS | API charges; discount on new lines; skip-approval on Complete |

## Verification

- Settings: add/edit/remove a charge; only enabled ones show on Sales POS.
- Big Customer 10% discount → new lines at 90% of list; edited Rate sticks.
- Big Customer skip-approval → over-limit Completes with no request.
- Regular skip-approval false → over-limit still Send for Approval.
- Customer override discount/skip beats the type row.
