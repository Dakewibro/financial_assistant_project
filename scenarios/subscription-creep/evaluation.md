# Subscription creep scenario

## Goal

Demonstrate **subscription crowd-out**: recurring-like Subscription lines consume a large share of a monthly budget, even when total spend remains under an overall monthly cap.

## Inputs

Canonical **`import.json`**; `transactions.csv` mirrors the same rows.

## Outputs checked (golden)

- Summary subset in **`expected-summary.json`**.
- Alerts subset in **`expected-alerts.json`** (here, **category_percentage** fires; **period_cap** does not because monthly total < threshold).

Automated: `cd backend && npm run test:scenarios`.

### Frozen evaluation instant

**2026-03-29T12:00:00Z** — see `backend/tests/scenarioGolden.test.ts`.

## What works well

- Highlights **composition** risk (share) vs only checking **totals**.
- Pairs naturally with the app’s **recurring detection** UI for the Group Report narrative (manual checklist step 8).

## Limitations

- Irregular annual renewals can look like spikes; merchant normalization may merge/split patterns depending on descriptions you choose.
- “Subscription” here is a **user label**, not bank-confirmed recurring.

## Commercial comparison (report angle)

- **YNAB**: explicit subscription targets; strong manual planning culture.
- **MoneyLover**: recurring reminders + templates; depends on categorization consistency.
- **Spreadsheet**: easy sum-by-category; weak unless you maintain your own “recurring” tab.

## Brainstorm: deeper variants

- Add a **`recurring_threshold`** rule row to showcase the sixth rule type alongside `%` share.
- Add a **new subscription line mid-month** to narrate “silent creep”.
