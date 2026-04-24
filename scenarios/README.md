# Case study scenarios (COMP1110 Topic A)

For **Quick add → Import** (bulk CSV/JSON from your machine), see **`manual-bulk-upload/`** — diverse fixtures meant for the Transactions UI import flow, separate from the API `import.json` payloads below.

Each primary scenario folder contains:

- **`import.json`** — canonical payload for `POST /api/import` (`transactions`, `rules`, `categories`).
- **`transactions.csv`** — human-editable mirror **when present** (same logical rows as `import.json`; may include `scope`).
- **`rules.json`** — mirror of budget rules for quick reading (duplicates `import.json` → `rules`).
- **`expected-summary.json`** — **subset** golden fields: `totalSpending`, `perCategoryTotals`, `top3Categories`.
- **`expected-alerts.json`** — **subset** golden fields: `ruleType`, `message`, and usually `evidence` (not full API alert objects).
- **`evaluation.md`** — narrative for the Group Final Report (goal, limits, commercial comparison).

## Reproducible checks (automated)

From repo root:

```bash
cd backend && npm run test:scenarios
```

Or:

```bash
bash scenarios/scripts/run-golden.sh
```

Tests freeze the clock at **`2026-03-29T12:00:00Z`** — see `EVALUATION_DATE.md`.

## Reproducible checks (manual / TA)

See **`REPRODUCIBILITY.md`** for clone → env → import → what to expect.

## Do not assume a GUI “scenario runner”

Older wording referenced an in-app runner. **Reproduction is:** import JSON via the API (or clear UI + import flow) and compare outputs, **or** run `npm run test:scenarios` for the golden subset.
