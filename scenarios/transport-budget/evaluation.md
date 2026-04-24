# Transport budget scenario

## Goal

Show **two complementary guardrails** for the same month:

1. **period_cap** — total spend ceiling (all categories).
2. **category_percentage** — concentration risk when one category dominates (here, Transport share of monthly spend).

## Inputs

Canonical **`import.json`** for `POST /api/import`; `transactions.csv` mirrors rows (includes `scope` for alignment with the app’s personal/business model).

## Outputs checked (golden)

Subset assertions in **`expected-summary.json`** / **`expected-alerts.json`**. Automated: `cd backend && npm run test:scenarios`.

### Frozen evaluation instant

Evaluated as **2026-03-29T12:00:00Z** so March 2026 monthly windows match the coursework narrative. See `backend/tests/scenarioGolden.test.ts`.

## What works well

- Surfaces both **overspend** and **composition** risk — a strong story for the Group Final Report.

## Limitations

- One-off spikes (airport train + taxi) dominate; the app does not auto-classify “travel anomaly” vs “commute baseline”.
- Percent rule uses **monthly** totals in-window; short months / partial months are a modeling assumption you should state in the report.

## Commercial comparison (report angle)

- **YNAB**: targets monthly targets by category; similar “over budget” signaling; relies on user judgment for irregular travel.
- **MoneyLover**: strong charts + category budgets; may offer templates for commuting vs travel.
- **Spreadsheet**: easy to compute `% Transport`; weaker at proactive alerts unless scripted.

## Brainstorm: deeper variants

- Split **commute** vs **travel** sub-merchants to discuss labeling strategy.
- Add **business scope** rows to show alerts when `scope` filtering is enabled on rules.
