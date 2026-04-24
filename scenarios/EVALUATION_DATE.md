# Frozen evaluation clock (case studies)

All **`expected-summary.json`** / **`expected-alerts.json`** pairs under `scenarios/*` are written to match backend logic as if **“now”** were:

**`2026-03-29T12:00:00Z`**

That instant is enforced in automated checks by:

`backend/tests/scenarioGolden.test.ts` (`vi.setSystemTime`).

If you compare outputs manually in the UI on a different real-world date, **calendar-relative fields** (daily / weekly / monthly slices, trend arrays) may differ from the golden subset files even when the underlying imported rows are identical.
