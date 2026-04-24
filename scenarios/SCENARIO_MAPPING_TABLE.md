# Scenario → inputs → rules → outputs → limits → tools (report table)

Copy this table into the **Group Final Report** (you may trim wording). **YNAB** and **MoneyLover** are illustrative; replace with the exact apps you surveyed if your research table differs.

| Scenario folder | Primary inputs (artefacts) | Rule types exercised | Golden outputs checked (`expected-*.json`) | Key limitation (honest) | How YNAB tends to differ | How MoneyLover tends to differ | Spreadsheet analogy |
|-----------------|----------------------------|----------------------|----------------------------------------------|---------------------------|--------------------------|-------------------------------|----------------------|
| `food-cap/` | `import.json` + CSV: same-day Food spend over daily cap | `category_cap` (daily) | Summary totals + top categories; alert: **Food daily cap exceeded** | Miscategorization bypasses caps | Envelope targets + reconciliation culture | Quick mobile entry + templates | Easy `SUMIF`; weak proactive alerts |
| `transport-budget/` | March Transport-heavy mix + small Food | `period_cap` (monthly) + `category_percentage` | Totals; alerts: **monthly cap** + **Transport share too high** | One-off travel spikes dominate month | Targets + rollovers; still user-labelled | Charts + category budgets | `%` column is trivial; automation is not |
| `subscription-creep/` | Multiple Subscription lines + Food | `category_percentage` (+ unused headroom under `period_cap`) | Totals; alert: **Subscription share too high** | Annual billing / merchant ambiguity | Subscription target workflows | Recurring reminders | Needs a dedicated “subscriptions” area |
| `uncategorized-risk/` | Several Uncategorized rows | `uncategorized_warning` | Totals; alert: **too many uncategorized** | Count-based signal can be noisy | Guided cleanup + bank match | Suggestions + icons | No warnings unless you build them |
| `empty-month/` | Empty `transactions`, enabled rules | `period_cap` + `category_cap` (enabled but inert) | Zero totals; **no alerts** | Does not explore contradictory rule configs | Empty states + onboarding | Empty month views | Blank sheet |
| `merchant-memory/` | Repeated identical `description`, last row `Uncategorized` | _(none)_ | Totals; **no alerts** (alerts not the point) | Import cannot omit category; uses `Uncategorized` as proxy | Strong merchant databases when linked | Merchant rules after habit | `VLOOKUP` merchant → category |
| `micro-all-uncategorized/` | 5× Uncategorized | `uncategorized_warning` | Alert count/message evidence | Extreme edge; not realistic steady state | Same as above | Same as above | Same as above |
| `import-gone-wrong/` | Invalid JSON rows (bad date / negative / empty category) | _(import fails)_ | Parser error strings (`Invalid transaction…`) | “Unknown category string” is **accepted** by design (custom category) | Bank import validation differs | Similar | Data validation is DIY |

### Frozen evaluation instant (all rows above)

**`2026-03-29T12:00:00Z`** — see `EVALUATION_DATE.md` and `backend/tests/scenarioGolden.test.ts`.
