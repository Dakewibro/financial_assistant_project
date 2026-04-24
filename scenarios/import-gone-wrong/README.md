# Import gone wrong (validation & policy)

These payloads are meant for **`POST /api/import`** (or `parseImportPayload` in tests). They illustrate **Topic A-style** “malformed / invalid input” handling.

| File | Intent | Expected parse result |
|------|--------|-------------------------|
| `request-bad-date.json` | `date` not matching strict `YYYY-MM-DD` format | `Invalid transaction at index 0` |
| `request-negative-amount.json` | `amount` ≤ 0 violates schema | `Invalid transaction at index 0` |
| `request-empty-category.json` | empty `category` string | `Invalid transaction at index 0` |
| `request-novel-category-valid.json` | category not in defaults | **Accepted** — app treats unknown labels as **custom categories** (design trade-off vs strict enum spreadsheets) |

## API behaviour note

The HTTP handler returns **400** with `{ "error": "<message>" }` when import parsing fails.

## Automated tests

`cd backend && npm run test:scenarios` includes assertions for the three invalid payloads + the “novel category accepted” case.
