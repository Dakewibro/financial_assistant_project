# Brainstorm: how each scenario could become *more* thorough

This file is **not** required coursework; it is internal design notes you can mine for the Group Final Report “future work” section.

## `food-cap/`

- Add a **second calendar day** with under-cap spend to contrast alert vs non-alert days under the same rule.
- Add a **mislabeled** row (Food spend tagged `Shopping`) as a deliberate “negative test” for miscategorization.
- Add a **weekly cap** alongside daily to discuss guideline trade-off: daily stress vs weekly flexibility.

## `transport-budget/`

- Split merchants into **commute** vs **travel** descriptions to discuss whether `%` rules should apply to a *subset* of Transport.
- Add **business scope** rows + scoped rules to tie to the app’s personal/business split.

## `subscription-creep/`

- Add a **`recurring_threshold`** rule to showcase the sixth alert type explicitly (not only `%` share).
- Add a **new subscription** line mid-month to narrate “silent creep”.

## `uncategorized-risk/`

- Mix categorized + uncategorized to show tuning `threshold`.
- Pair with **`merchant-memory/`** as a two-step narrative: “warning appears → user fixes labels → warning clears”.

## `empty-month/`

- Follow with a **second import** that introduces the first spend day and shows alerts “turning on” from a cold start month.

## `merchant-memory/`

- Add a **typo variant** (`Citybrew` vs `CityBrew`) to discuss normalization strength/limits.
- Quantify suggestion quality in the report (e.g., “after N consistent labels…”).

## `import-gone-wrong/`

- Add examples for **invalid rules** (bad `ruleType`, negative threshold) if you extend docs/tests similarly.
- Discuss strict enum vs open category taxonomy as a design trade-off (already hinted by `request-novel-category-valid.json`).

## `micro-all-uncategorized/`

- Provide a second file showing **post-cleanup** imports to demonstrate alert disappearance (paired scenario).
