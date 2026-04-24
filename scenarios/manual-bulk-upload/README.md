# Manual bulk-upload fixtures (Quick Add → Import)

Use these files **from your computer** in the app: **Quick add** → **Import** → choose file → review → **Import**.

They target **`POST /api/bulk-import/preview`** / **`apply`**, not the older full-store **`POST /api/import`** scenario payloads.

| File | Intent |
|------|--------|
| `csv-01-minimal-template-headers.csv` | Happy path: canonical columns, all valid. |
| `csv-02-dd-mm-yyyy-and-amounts.csv` | DD/MM/YYYY dates; comma-separated thousands in amounts. |
| `csv-03-hk-bank-style-columns.csv` | “Bank export” style headers (`Transaction Date`, `Debit`, `Details`, …) to test auto column guess. |
| `csv-04-european-amount-style.csv` | `1.234,56` style amount (thousands `.`, decimal `,`). |
| `csv-05-mixed-quality.csv` | Mix of OK, warnings, errors, and in-file duplicate (second row skipped). |
| `csv-06-three-columns-only.csv` | Only date / amount / payee columns (no category → **Uncategorized** + warnings). |
| `csv-07-utf8-bom.csv` | UTF-8 **BOM** + CJK text in descriptions (encoding smoke test). |
| `csv-08-quoted-fields-with-commas.csv` | Quoted CSV fields containing commas (parser robustness). |
| `json-01-transactions-wrapper.json` | `{ "transactions": [ … ] }` shape. |
| `json-02-bare-array.json` | Top-level JSON array (supported). |
| `json-03-mixed-quality.json` | Valid rows + invalid objects (preview errors / “import valid only”). |
| `json-04-unknown-categories-business.json` | Non-default category names + `business` scope. |
| `json-05-merchant-field-alias.json` | Uses **`merchant`** / **`payee`** instead of `description` (supported aliases). |

**Tips**

- After import, open **Transactions** and filter/sort by date to see new rows.
- For `csv-05` / `json-03`, use **Import valid rows only** if the UI shows rows that need a fix.
- **Replace all transactions** is destructive; prefer **Add to my transactions** when experimenting.
