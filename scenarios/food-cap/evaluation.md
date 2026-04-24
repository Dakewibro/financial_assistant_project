# Food cap scenario

## Goal

Model a **HK student–style daily food ceiling** (~HK$50/day): same-day Food spend should trip a **category_cap** alert when the daily total crosses the threshold.

## Inputs (canonical)

Use **`import.json`** for API import (`POST /api/import`). `transactions.csv` mirrors the same rows for spreadsheet-style editing.

## Outputs checked (golden)

- **`expected-summary.json`**: `totalSpending`, `perCategoryTotals`, `top3Categories` (subset of full `/api/bootstrap` summary).
- **`expected-alerts.json`**: `ruleType`, `message`, `evidence` (subset of full `Alert` objects).

Automated check: from repo root, `cd backend && npm run test:scenarios` (uses a **frozen clock**).

---

### Frozen evaluation instant

All arithmetic that depends on “today / this week / this month” for these rows is evaluated as if the current time were **2026-03-29T12:00:00Z** (see `backend/tests/scenarioGolden.test.ts`). If you load the data in the UI on a different calendar date, **daily / weekly / monthly slices** in the live summary may differ from the golden files even though lifetime totals stay the same.

## What works well

- Thresholding is easy to explain in the report and matches Topic A’s “simple grouping + caps”.
- Same-day split across two Food merchants still aggregates correctly.

## Limitations

- If Food spend is mis-tagged as another category, the cap never fires (manual entry risk).
- Does not model split bills, cash rounding, or multi-currency.

## Commercial comparison (report angle)

- **YNAB**: envelope-style; strong reconciliation; still depends on user category discipline for manual entry.
- **MoneyLover**: fast mobile entry; bank sync optional; similar cap alerts but with richer automation.
- **Spreadsheet**: maximum flexibility; no proactive alerts unless you build them.

## How this scenario could go deeper (brainstorm)

- Add a **second day** with under-cap spend to show non-alert days.
- Add a **weekly Food cap** alongside daily to discuss trade-offs (daily stress vs weekly flexibility).
- Add **one miscategorized row** (Food labeled Shopping) as a “negative test” story.
