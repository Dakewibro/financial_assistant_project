# Reproducibility: clone → run → import → expect

These steps match **academic / TA** expectations: a marker can verify behaviour without private accounts beyond what you document.

## A) Automated (recommended)

1. **Clone** the GitHub repository.
2. **Install** backend deps: `cd backend && npm ci`
3. **Run golden tests** (no Mongo required for these tests):

   ```bash
   npm run test:scenarios
   ```

4. **Expect**: all tests in `tests/scenarioGolden.test.ts` pass. This validates `expected-*.json` against `import.json` at the frozen instant in `EVALUATION_DATE.md`.

## B) Manual API import (optional, closer to “full stack”)

Prereqs: backend running locally or deployed, and **protected mutations** satisfied if your deployment requires `x-admin-token` / `ADMIN_API_TOKEN` (see backend `.env.example`).

1. **Clone** + install backend deps (`npm ci` in `backend/`).
2. **Start** backend (example): `cd backend && npm run dev`
3. **Pick a scenario folder**, e.g. `scenarios/food-cap/import.json`.
4. **POST** the JSON to import:

   ```bash
   curl -sS -X POST "http://localhost:4000/api/import" \
     -H "Content-Type: application/json" \
     -H "x-admin-token: $ADMIN_API_TOKEN" \
     --data-binary @scenarios/food-cap/import.json
   ```

   If your local setup does not enforce admin token, omit the header (depends on env flags).

5. **GET** bootstrap or alerts and compare **messages / totals** qualitatively to `expected-*.json`.  
   Note: on a different **real calendar date**, some **monthly/daily slice** fields may differ from golden files; the automated test avoids that by freezing time.

## C) What to cite in the Group Final Report

- **Primary evidence path**: `npm run test:scenarios` + screenshot of terminal success.
- **Secondary evidence path**: one screenshot of the UI after importing `food-cap/import.json`, with a caption referencing the same frozen-date caveat.
