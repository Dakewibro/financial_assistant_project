# Feature logic (full reference)

This document maps **all major product features** to their implementation: auth, data model, transactions, budgets vs rules, alerts, recurring, summaries, insights, dashboard, goals, sharing, imports/exports, operator tools, and guardrails. It complements `README.md`.

**Primary backend:** `backend/src/app.ts` (routes), `backend/src/repository.ts` (Mongo + in-memory store), `backend/src/workspaceRuntime.ts` / `workspacePersistence.ts` (workspace bundle).

---

## Table of contents

1. [Platform: auth, gates, health, limits, storage](#1-platform-auth-gates-health-limits-storage)  
2. [Bootstrap payload](#2-bootstrap-payload)  
3. [Transactions: CRUD, filters, list shape](#3-transactions-crud-filters-list-shape)  
4. [Quick Add: single entry, natural language, suggestions](#4-quick-add-single-entry-natural-language-suggestions)  
5. [Bulk import (CSV/JSON) via Quick Add](#5-bulk-import-csvjson-via-quick-add)  
6. [Full JSON import, export, generated data](#6-full-json-import-export-generated-data)  
7. [Categories](#7-categories)  
8. [Budgets vs budget rules (two representations)](#8-budgets-vs-budget-rules-two-representations)  
9. [Summaries](#9-summaries)  
10. [Alerts](#10-alerts)  
11. [Recurring detection](#11-recurring-detection)  
12. [Insights: bootstrap text vs API vs UI](#12-insights-bootstrap-text-vs-api-vs-ui)  
13. [Dashboard: widgets, layout, pacing](#13-dashboard-widgets-layout-pacing)  
14. [Goals](#14-goals)  
15. [Sharing (budgets & goals)](#15-sharing-budgets--goals)  
16. [Alerts UI & acknowledgement](#16-alerts-ui--acknowledgement)  
17. [Settings, onboarding, demo](#17-settings-onboarding-demo)  
18. [File index](#18-file-index)

---

## 1. Platform: auth, gates, health, limits, storage

### Authentication

- **Register** `POST /api/auth/register`: name, email (lower-cased), password ≥ 8 chars; bcrypt hash (10 rounds); rejects duplicate email (`409`). Returns JWT + user profile (`onboarded`, `monthly_income`, `primary_use`).
- **Login** `POST /api/auth/login`: email + password; `401` on mismatch. JWT payload `{ sub, email }`, expires **7 days** (`createAuthToken` in `app.ts`).
- **Me** `GET /api/auth/me`: requires Bearer token when auth is enforced; returns user fields for the SPA (`AuthContext.js` stores token in `localStorage` key `fa_token`).

### Auth enforcement (`AUTH_ENFORCED`)

- From `backend/src/config/env.ts`: in production-like hosts, auth defaults **on** unless `AUTH_ENFORCED=false`. When enforced, unauthenticated calls to protected routes get `401` via `maybeRequireAuth` / `requireAuth`.

### Rate limiting / slowdown

- **Auth:** `express-rate-limit` on `/api/auth/login` and `/api/auth/register` (40 requests / 15 minutes per IP).
- **Bulk import:** separate limiter on `/api/bulk-import/*` (40 / 15 minutes).
- **Shares:** `express-slow-down` on `/api/shares` (progressive delay after 10 requests / 5 minutes).

### Admin and demo gates

- **`ADMIN_API_TOKEN`:** Required on Mongo/production for **protected mutations** (`/api/import`, `/api/generate-test-data`, etc.): client sends `x-admin-token` (or `admin-token`) matching server secret. **Skipped when `STORAGE_MODE=memory`** for local dev (`validateProtectedMutationAccess` in `app.ts`).
- **Demo mutations** (`/api/demo/clear`, `/api/demo/load-scenario`, `/api/demo/seed`): when `DEMO_MUTATIONS_ENABLED` is true (default), a **logged-in** user may run them on Mongo; if false, same admin token as above is required. Memory mode allows without token (`requireProtectedDemoAccess`).

### Health

- **`GET /health`:** returns `ok` when DB is ready (`503` until Mongo connects in mongo mode), plus `storageMode` and feature flags.

### Storage modes

- **Memory:** no `MONGODB_URI`; single-process in-memory store (`memoryStore` in `repository.ts`); workspace goals/budgets/shares also in memory (`workspaceRuntime.ts`).
- **Mongo:** transactions, rules, categories, users in collections; workspace fields persisted via `workspacePersistence.ts` on response finish (`installWorkspacePersistOnFinish` middleware).

---

## 2. Bootstrap payload

**`GET /api/bootstrap`** (optional auth depending on env) returns one object used to hydrate client state:

- `transactions`, `rules`, `categories`
- `alerts` = `evaluateAlerts(...)`
- `summary` = `computeSummary(...)`
- `recurring` = `detectRecurringGroups(...)`
- `insights` = `generateInsights(...)` (short text cards, max 3)
- `recent` = `buildRecentEntryHelpers(...)` (recent descriptions/categories, last tx, merchant→category hints)

Implemented in `buildBootstrapPayload()` in `app.ts`.

---

## 3. Transactions: CRUD, filters, list shape

### Create

**`POST /api/transactions`:** body validated with `transactionSchema`; `normalizedMerchant` set from `normalizeMerchant(description)`; persisted via `createTransaction`.

### List

**`GET /api/transactions`:** query parsed by `parseTransactionFilters` in `app.ts`:

| Query | Effect |
|--------|--------|
| `search` or `q` | Case-insensitive substring on description, normalizedMerchant, category (memory: simple `includes`; Mongo: regex on those fields). |
| `category` | Exact category match (ignore if `all`). |
| `scope` or `account` | `personal` \| `business`. |
| `flow` / `kind` / `type` | `expense` or `income`. For Mongo **expense** also matches documents with missing `flow` (legacy). |
| `fromDate`, `toDate` | Inclusive date range on `tx.date`. |
| `recurringOnly=true` | After fetch: keep rows whose `(scope, normalizedMerchant)` appears in `detectRecurringGroups` results. |
| `limit` | Positive number: return only first N rows (after sort). |

Default sort: **newest `date` first** (then `createdAt` on Mongo).

### Count

**`GET /api/transactions/count`:** total rows (unfiltered).

### Delete

**`DELETE /api/transactions/:id`:** removes one row; `404` if missing.

### Frontend shape

**`frontend/src/pages/Transactions.js`** loads `/transactions` and normalizes via `normalizeTransactionList` (`transactionShape.js`): UI uses fields like `merchant`, `type` (`income`/`expense`), `account` (scope), etc.

---

## 4. Quick Add: single entry, natural language, suggestions

### Natural-language parse

**`POST /api/parse-transaction`:** accepts `text`. Extracts first number as `amount` (optional); remainder (or full string) as `merchant`; calls `suggestCategoryFromHistory` (alias for `suggestCategory` in `categorySuggestionService.ts`) with full ledger. Returns `category`, `suggestions`, `source`, `confidence`.

### Category suggestion

**`POST /api/suggest-category`:** `merchant` + optional `note`; same suggestion pipeline on `merchant + note`.

**`suggestCategory` logic** (`categorySuggestionService.ts`):

1. **History:** group past txs by `normalizedMerchant(description)`; pick most frequent `category` for that key; confidence `high` if count ≥ 3 else `medium`; `source: "history"`.
2. Else **keywords:** static `KEYWORD_RULES` (e.g. uber/mtr → Transport, netflix → Subscription); `source: "keyword"`, `confidence: "low"`.
3. Else **`Uncategorized`**, `source: "default"`.

### Recents for chips

**`GET /api/transactions/recents`:** builds `buildRecentEntryHelpers`, maps first 6 unique recent **descriptions** to `{ merchant, typical_amount, category, account }` (amount from first matching tx).

### “Usual” amount for a merchant string

**`GET /api/transactions/usual?merchant=`:** case-insensitive match on **description** equals merchant; returns mean amount, count, and first row’s category.

---

## 5. Bulk import (CSV/JSON) via Quick Add

From **Transactions** (or elsewhere), **Quick add → Import** opens `QuickAddImportPanel` (`QuickAddDialog.js`).

- **`POST /api/bulk-import/preview`:** `{ format: "csv"|"json", text, columnMap? }` → `previewBulkImport` in `bulkImportService.ts` (Papa Parse for CSV; JSON array or `{ transactions: [] }`; column guessing; coercion; per-row `ok`/`warning`/`error`/`skipped_duplicate`; in-file duplicate fingerprints).
- **`POST /api/bulk-import/apply`:** `{ mode: "append"|"replace", transactions: [...], skipDuplicates? }`; validates each row; optional dedupe against existing ledger; `appendTransactions` or `replaceTransactions`; adds novel categories.

Row-level parsing, coercion, and status semantics are implemented in `bulkImportService.ts` (see **Appendix** at the end of this file for a concise recap).

---

## 6. Full JSON import, export, generated data

### Workspace import (operator / admin)

**`POST /api/import`:** **admin-gated** on Mongo. Body must parse via `parseImportPayload`: `transactions[]`, `rules[]`, `categories[]` (each tx/rule validated; categories non-empty strings). **`replaceStore`:** replaces transactions, rules, and rebuilds category list from defaults + payload + derived tx categories. Then **`refreshBudgetsFromRules()`** rebuilds the **derived** `budgets[]` entries from enabled `category_cap` and `period_cap` rules only.

### Export

**`GET /api/export`:** returns JSON `{ transactions, rules, categories }` for backup.

### Generate test data

**`POST /api/generate-test-data`:** admin-gated; optional `count` (default 30); synthetic expense rows over last N days, random categories from current list, mixed `scope`; clears rules; calls `refreshBudgetsFromRules` after.

---

## 7. Categories

- **Defaults:** `DEFAULT_CATEGORIES` in `types.ts` (Food, Transport, Shopping, Bills, Subscription, Business Expense, Uncategorized).
- **`GET /api/categories`:** `listCategories()` after `seedDefaultCategories()` ensures defaults exist.
- **`POST /api/categories`:** add custom name (case-insensitive dedupe on Mongo).

---

## 8. Budgets vs budget rules (two representations)

### Budget rules (`BudgetRule`)

Stored in `rules` / `memoryStore.rules`. Created with **`POST /api/rules`** (`budgetRuleSchema`). Types: `category_cap`, `period_cap`, `category_percentage`, `consecutive_overspend`, `uncategorized_warning`, `recurring_threshold` (see [Alerts](#10-alerts)). Used by **`evaluateAlerts`**, **`buildInsightsPayload`**, and **`spentAndPctForBudget`** when a dashboard budget row is tied to a rule (`ruleRef`).

**Important:** `POST /api/rules` **does not** call `refreshBudgetsFromRules` in the current code. **Derived** budget cards (from rules) are refreshed when **`importPayload`**, **demo clear**, or **`generate-test-data`** runs. So rules added only via `/api/rules` may exist in **`GET /api/rules`** before the next full refresh path—**`/api/budgets`** might not list them until a refresh occurs.

### Budget resources (`budgets[]` — “Budgets” UI)

**`GET /api/budgets`:** rows visible if `memberIds` contains current user. Each row includes **spent** and **pct** from `spentAndPctForBudget`:

- If `ruleRef` ties to **`period_cap`:** scoped expenses in that rule’s **period** vs `limit`.
- If **`category_cap`:** scoped expenses in period **and** `tx.category === rule.category`.
- Else (manual budget from **`POST /api/budgets`**): legacy path — **calendar month** expenses matching `budget.category` and `budget.account` (scope).

**`pct`** sent to client is capped at **200%** for display stability.

**`POST /api/budgets`:** manual budget: name, category, account (`personal`|`business`), positive limit; new UUID; owner-only members initially.

**Delete / share / leave:** same pattern as goals—owner deletes or revokes share; non-owner can leave membership (`DELETE /api/budgets/:id`).

**`refreshBudgetsFromRules`:** clears `budgets[]` and repushes one entry per **enabled** `category_cap` and `period_cap` rule (name/limit/account from rule); assigns `ownerId` / `memberIds` from default owner or all memory users.

---

## 9. Summaries

**`computeSummary`** in `backend/src/summaryService.ts`; **`GET /api/summary`** returns it for the current ledger.

- Spending = non-income flows (`countsAsExpense`).
- **Trend anchoring:** if the rolling 30-day trend from **today** sums to ~0 **or** the latest txn date is **>28 days** ago, 7- and 30-day series are built backward from **that latest date** instead of today.

| Field | Meaning |
|--------|---------|
| `totalSpending` | Sum of all expense txs (full ledger). |
| `perCategoryTotals` | Expense sum per `category`. |
| `dailyTotal` / `weeklyTotal` / `monthlyTotal` | Expenses in **today’s calendar day**, **current ISO week**, **current calendar month**. |
| `byScope` | Expense totals for `personal` and `business`. |
| `top3Categories` | Top three categories by expense amount. |
| `trend7Days` / `trend30Days` | `{ date, amount }` per day (expense sum on that date) over the window, possibly anchored as above. |

---

## 10. Alerts

**Source:** `backend/src/alertService.ts`. **Inputs:** full ledger, **enabled** rules only, and `recurringGroups` from `detectRecurringGroups`. **`GET /api/alerts`** (`app.ts`) merges each alert with `acknowledged` from an in-memory `Set` (cleared on demo workspace reset).

### Scoping and period (rule-driven alerts)

For each enabled rule: (1) **scope** — if `rule.scope` is set, filter `tx.scope`; else all txs. (2) **period** — `daily` = today’s date; `weekly` = same ISO week + year as today; `monthly` = same calendar month + year. (3) Only **expenses** (`countsAsExpense`).

### Rule types

| `ruleType` | Logic | Alert outcome |
|------------|--------|----------------|
| `category_cap` | Sum expenses in `rule.category` within scope+period vs `threshold`. | `buildCapAlerts`: **≥100%** threshold → critical `exceeded`; **≥80%** → warning `near_limit`. |
| `period_cap` | Sum **all** scoped expenses in period vs `threshold`. | Same 80%/100% cap ladder; label uses period (e.g. “monthly spending”). |
| `category_percentage` | `categorySpend / periodSpend * 100` vs `threshold` (threshold is a **percent**). | If period spend > 0: **≥threshold** → warning `detected`; **≥80% of threshold** → info `near_limit`. |
| `uncategorized_warning` | Count of expenses with `category === "Uncategorized"` in period vs integer `threshold`. | If count **>** threshold → info `detected`. |
| `consecutive_overspend` | Daily totals in period; streak of consecutive **calendar days** (newest first) each over `threshold`; gap >1 day ends streak. | Streak **≥3** → critical `detected`. |
| `recurring_threshold` | Sum `totalLast30Days` for recurring groups with `kind === "subscription"`. | Same 80%/100% cap ladder as caps. |

### Duplicate charges (heuristic, not a stored rule)

Expenses in the last **45 days** grouped by `normalizedMerchant` + amount (2 dp). If a group has **≥3** txs: severity **critical** if ≥5 else **warning**; `ruleType` is `duplicate_amount`, `ruleId` is `"duplicate-amount"`.

### Sort order

`critical` > `warning` > `info`.

---

## 11. Recurring detection

**`detectRecurringGroups`** in `backend/src/services/recurringService.ts`:

1. Group **expenses** by composite key `"{scope}:{normalizedMerchant}"` (see `recurringService.ts`).
2. Require **≥ 3** txs in a group.
3. Sort by date; compute day gaps between consecutive txs.
4. **Frequency:** if all gaps in 6–8 → `weekly`; 13–16 → `biweekly`; 27–33 → `monthly`; else `irregular`.
5. **Kind:** if frequency not irregular **and** amounts within **max(2, 15% of average)** of average → `subscription`; else if count ≥ 4 → `habit`; else group **discarded**.
6. **totalLast30Days:** sum in rolling 30 days from **today**.
7. **nextExpectedDate:** from last date + 7 / 14 / 30 days when not irregular.

**`GET /api/recurring`** returns this array. **Recurring page** (`Recurring.js`) consumes it.

---

## 12. Insights: bootstrap text vs API vs UI

### A. `generateInsights` (bootstrap only)

**`insightService.ts`:** builds up to several candidates, **dedupes by `id`**, sorts by severity, returns **at most 3**.

1. First alert with `status === "exceeded"` → `over-limit` (critical).  
2. Else first `near_limit` alert → `near-limit` (warning).  
3. If `monthlyTotal > 0` and recurring `totalLast30Days` sum > 0: recurring share **≥25%** → warning `recurring-share`; **≥15%** → info.  
4. If top category ≥ **40%** of `totalSpending` → `category-dominance` (info).  
5. If `Uncategorized` total > 0 → `uncategorized-cleanup` (info).  
6. If an **enabled** weekly `period_cap` exists with positive threshold → text insight `safe-to-spend` using `(threshold - weeklyTotal) / max(1, 7 - dayjs().day())` (not the dashboard monthly number).

### B. `buildInsightsPayload` + HTTP

Used by **`GET /api/insights`**, **`/insights/headline`**, **`/insights/pacing`**:

- **Monthly safe-to-spend / day:** `remainingBudget = max(0, sum(threshold) for enabled monthly rules - summary.monthlyTotal)`, `daysRemaining = max(1, days left in month)`, `safeToSpendDaily = remainingBudget / daysRemaining`.
- **Pacing budgets:** for enabled `category_cap`, `period_cap`, `category_percentage`, compares spend % vs **calendar month elapsed %** (`monthPct`); status buckets (`on_track`, `slightly_fast`, `fast`, `over`, `under`).
- **`mom_pct`:** in `GET /api/insights` response is hard-coded **`0`** (placeholder).

### C. Insights page

**`Insights.js`:** fetches insights + headline; charts for `daily_series`, `by_category` (top 8), `by_account` pie; empty state uses `hasLedgerInsights`. **Headline** mirrors server: top category copy + drill-down by **description** + link to `/transactions?category=...`.

### User monthly income vs safe-to-spend

**`monthly_income`** from onboarding / Settings is stored on the user (`/auth/me`, onboarding complete) but **is not used** in `buildInsightsPayload` or `GET /api/insights` today. Dashboard **safe-to-spend / day** comes only from **sum of enabled monthly rule thresholds** minus **calendar-month expenses** (plus the fixed `mom_pct` placeholder).

---

## 13. Dashboard: widgets, layout, pacing

**`Dashboard.js`** loads in parallel: `/insights`, `/alerts`, `/transactions?limit=10`, `/insights/headline`, `/insights/pacing`, `/goals`, `/preferences/dashboard`.

**Widget registry** (`frontend/src/components/widgets/registry.js`):

| Widget id | Data used | Role |
|-----------|-----------|------|
| `headline` | `data.headline` | Top insight + drill + CTA |
| `safe-to-spend` | `data.insights` (`/insights` JSON) | Big number, remaining, spent, mom %, optional 30-day sparkline (size L) |
| `alerts` | `data.alerts` | Unacked alerts only; cap 1/3/5 by size |
| `pacing` | `data.pacing` | Month % + budget bars vs “today” marker |
| `categories` | `data.insights.by_category` | Horizontal bars, % of shown slice |
| `recent` | `data.transactions` | Last N normalized txs |
| `goals` | `data.goals` | Progress bars toward target |

**Layout:** `@dnd-kit` drag-and-drop reorder; sizes `s` / `m` / `l` map to grid column spans (`SIZE_TO_COLS`). **Persist:** `PUT /api/preferences/dashboard` with `{ widgets: [{ id, size }] }` per user (`dashboardPrefs` in workspace).

**Empty dashboard:** shown when no `txn_count_this_month` and no alerts (`hasAnyData` heuristic).

---

## 14. Goals

Already documented: `POST` / `PATCH` / `DELETE` / `contribute` / share / leave; persisted in workspace `goals` array. **Goals widget** shows `min(100, current/target*100)%`.

---

## 15. Sharing (budgets & goals)

- **Create share token:** `POST /api/goals/:id/share` or `POST /api/budgets/:id/share` (owner only); stores token in `shareIndex` map (`kind`, `resourceId`, `ownerId`).
- **Public preview:** `GET /api/shares/:token` — metadata for join page (no auth).
- **Join:** `POST /api/shares/:token/join` (auth required) — appends user id to `memberIds` if not already present.
- **Revoke:** `DELETE .../share` clears token and resets `memberIds` to owner only.

**Frontend:** `frontend/src/pages/JoinShare.js` (`/join/:token`); `frontend/src/components/ShareDialog.js` on Budgets/Goals.

---

## 16. Alerts UI & acknowledgement

**`Alerts.js`:** loads `/alerts`; filters **active** (not acknowledged) / **all** / **acknowledged**. **`POST /api/alerts/:id/ack`** adds id to server `acknowledgedAlertIds` (in-memory set; cleared on demo reset). Dashboard widget hides acknowledged rows.

---

## 17. Settings, onboarding, demo

### Onboarding

**`POST /api/onboarding/complete`:** authenticated; sets `onboarded: true`, `monthly_income` (≥ 0), `primary_use` in `personal` | `freelancer` | `mixed`. The frontend also sends `seed_demo` and `name`; **`/api/onboarding/complete` ignores `seed_demo` and `name`**—stored fields are income + primary use + onboarded only. Jump-start data is loaded separately (e.g. Settings **Load test data** or calling **`POST /api/demo/seed`**, which replaces the store with two sample expenses for today and clears rules, then refreshes budgets-from-rules).

### Settings

**`Settings.js`:** update income (same onboarding endpoint), **Reset data** (`POST /api/demo/clear`), **Load test data** (`POST /api/demo/load-scenario` with bundled scenario JSON, date-shifted so latest tx is yesterday), localStorage keys for scenario id / import overrides.

### Demo seed

**`POST /api/demo/seed`:** small fixed pair of txs for today (cafe + MTR); clears rules first in that handler path (read `app.ts` around demo routes for exact store writes).

### Scenario list

**`GET /api/demo/scenarios`:** static ids + human labels (no disk read at runtime—payloads are bundled JSON).

---

## 18. File index

| Area | Key files |
|------|-----------|
| Routes & orchestration | `backend/src/app.ts` |
| Persistence & filters | `backend/src/repository.ts` |
| Env, DB | `backend/src/config/env.ts`, `db.ts` |
| Summary | `backend/src/summaryService.ts` |
| Alerts | `backend/src/alertService.ts` |
| Recurring | `backend/src/services/recurringService.ts` |
| Category suggest + recent helpers | `backend/src/services/categorySuggestionService.ts` |
| Bulk import parse | `backend/src/services/bulkImportService.ts` |
| Validation schemas | `backend/src/validation.ts` |
| Text insights | `backend/src/services/insightService.ts` |
| Workspace | `backend/src/workspaceRuntime.ts`, `workspacePersistence.ts` |
| Auth token | JWT in `app.ts` (`createAuthToken`, `attachAuthUser`) |
| SPA routes | `frontend/src/App.js` |
| Auth context | `frontend/src/contexts/AuthContext.js` |
| Pages | `frontend/src/pages/*.js` |
| Quick add + import | `frontend/src/components/QuickAddDialog.js`, `QuickAddImportPanel.js` |
| Dashboard | `frontend/src/pages/Dashboard.js`, `widgets/registry.js`, `SortableWidget.js` |
| Navigation | `frontend/src/components/AppShell.js` |
| Join share link | `frontend/src/pages/JoinShare.js` |
| API client | `frontend/src/lib/api.js` |
| Demo scenario bundles | `backend/src/demoScenarioPayloads.ts`, `backend/src/demo-scenarios/*.json` (generated from `scenarios/*/import.json`) |

---

## Appendix: bulk import row rules (concise)

- **CSV:** Papa Parse `header: true`; `guessColumnMap`; `coerceDate` / `coerceAmount`; empty description → `"Imported transaction"`; empty category → `Uncategorized`; unknown category allowed with warning; **JSON:** array or `{ transactions }`; field aliases for date/amount/merchant/category/scope/flow.
- **Apply:** `append` vs `replace`; `skipDuplicates` vs existing using `fingerprintTransaction(date, amount, description, flow)` with normalized merchant.
- **Rate limit:** `/api/bulk-import` 40 / 15 min.

If you need the long-form tables for coercion only, they live in `bulkImportService.ts` (`coerceAmount`, `coerceDate`, `rowFromCsvRecord`, `rowFromJsonObject`).
