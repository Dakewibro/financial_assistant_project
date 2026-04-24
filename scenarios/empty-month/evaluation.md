# Empty month / zero spending scenario

## Goal

Topic A edge case: **no transactions** while **budget rules remain enabled**. The system should remain stable (no crashes, no misleading “exceeded” alerts driven by empty denominators).

## Inputs

Canonical **`import.json`** with `transactions: []` and two enabled rules.

## Outputs checked (golden)

- **Summary**: `totalSpending === 0`, empty category totals, empty `top3Categories`.
- **Alerts**: empty array at the frozen evaluation instant.

Automated: `cd backend && npm run test:scenarios`.

### Frozen evaluation instant

**2026-03-29T12:00:00Z** — see `backend/tests/scenarioGolden.test.ts`.

## What works well

- Demonstrates **graceful degradation** for an empty ledger — important for reproducible TA demos after a reset/import.

## Limitations

- Does not test “rules with invalid thresholds when empty” beyond basic enabled caps.

## Commercial comparison (report angle)

- Apps still show **empty states** and onboarding; spreadsheets simply show blank rows — your scenario makes the UX expectation explicit.

## Brainstorm

- Add a second month with a burst spend to contrast “zero baseline” vs “first spend day”.
