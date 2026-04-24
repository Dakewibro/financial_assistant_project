# Uncategorized risk scenario

## Goal

Surface **data hygiene** risk: many `Uncategorized` rows imply weak downstream reporting and weak cap rules that depend on categories.

## Inputs

Canonical **`import.json`**; `transactions.csv` mirrors rows.

## Outputs checked (golden)

Automated: `cd backend && npm run test:scenarios`.

### Frozen evaluation instant

**2026-03-29T12:00:00Z** — see `backend/tests/scenarioGolden.test.ts`.

## What works well

- The **`uncategorized_warning`** rule is easy to explain and maps cleanly to Topic A’s “miscategorization / data quality” discussion.

## Limitations

- Legitimate “unknown” purchases can trigger warnings even when harmless.
- The rule counts **rows**, not dollars (by design); discuss whether count vs amount is the right policy for your report.

## Commercial comparison (report angle)

- **YNAB / MoneyLover**: guided cleanup flows and auto-suggestions reduce uncategorized drift (ties to your **merchant memory** scenario).
- **Spreadsheet**: uncategorized is just another label unless you enforce validation.

## Brainstorm: deeper variants

- Add **mixed** categorized + uncategorized to show threshold tuning.
- Pair with **merchant-memory** scenario to show how suggestions reduce uncategorized counts over time.
