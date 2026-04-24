# Merchant memory scenario

## Goal

Support the Group Report narrative around **manual entry trade-offs**: repeated purchases share the same **normalized merchant key** (derived from `description`). After several consistent **Food** labels, a later row left as **`Uncategorized`** should be easy to correct using the product’s **category suggestion / recent merchant** UX.

> Note: JSON import cannot omit `category` (validation requires a non-empty string). This scenario uses **`Uncategorized`** as the “user didn’t meaningfully classify yet” stand-in.

## Inputs

Canonical **`import.json`** (six rows, identical `description` string).

## Automated golden checks

`npm run test:scenarios` asserts summary totals and confirms **no budget alerts** fire with `rules: []`.

### Frozen evaluation instant

**2026-03-29T12:00:00Z** — see `backend/tests/scenarioGolden.test.ts`.

## Manual UI checks (required for the full story)

1. Import via `POST /api/import` (see `../REPRODUCIBILITY.md`).
2. Open **Transactions → Add** and start typing **CityBrew Central HK** again.
3. Confirm **category suggestion** prefers **Food** (or repeat-last helpers behave as designed).
4. (Optional) Call `POST /api/suggest-category` with the merchant string and inspect the suggested label.

## Limitations

- Suggestions depend on **history density** and heuristics; cold-start users won’t see the same strength of signal.

## Commercial comparison (report angle)

- Bank-linked apps infer categories from MCC/merchant databases; your design shows how **history-based** hints can partially close the gap **without** bank feeds.

## Brainstorm

- Add a **typo variant** description to discuss normalization robustness (`Citybrew central` vs canonical).
