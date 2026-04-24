# Graph Report - financial_assistant_project  (2026-04-24)

## Corpus Check
- 113 files · ~92,225 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 335 nodes · 470 edges · 13 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 106 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `getEnv()` - 33 edges
2. `cn()` - 28 edges
3. `useAuth()` - 11 edges
4. `HKD()` - 10 edges
5. `buildBootstrapPayload()` - 10 edges
6. `evaluateAlerts()` - 8 edges
7. `computeSummary()` - 7 edges
8. `toIsoString()` - 6 edges
9. `listTransactions()` - 6 edges
10. `refreshBudgetsFromRules()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `todayIsoDate()` --calls--> `toIsoString()`  [INFERRED]
  frontend/src/components/QuickAddDialog.js → backend/src/repository.ts
- `QuickAddImportPanel()` --calls--> `cn()`  [INFERRED]
  frontend/src/components/QuickAddImportPanel.js → frontend/src/lib/utils.js
- `MenubarShortcut()` --calls--> `cn()`  [INFERRED]
  frontend/src/components/ui/menubar.jsx → frontend/src/lib/utils.js
- `SafeToSpend()` --calls--> `HKD()`  [INFERRED]
  frontend/src/components/widgets/registry.js → frontend/src/lib/format.js
- `persistWorkspaceToMongo()` --calls--> `getEnv()`  [INFERRED]
  backend/src/workspacePersistence.ts → backend/src/config/env.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (29): AlertDialogFooter(), AlertDialogHeader(), Badge(), BreadcrumbEllipsis(), BreadcrumbSeparator(), Calendar(), CommandShortcut(), ContextMenuShortcut() (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (24): attachAuthUser(), createAuthToken(), getAuthUser(), getBearerToken(), getJwtSecret(), importPayload(), maybeRequireAuth(), origin() (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (29): buildBootstrapPayload(), connectDatabase(), getEnv(), isDeployProduction(), parseAuthEnforced(), parseDemoMutationsEnabled(), parseOrigins(), parsePort() (+21 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): buildCapAlerts(), createAlert(), evaluateAlerts(), filterByPeriod(), filterByScope(), getStreakLength(), buildInsightsPayload(), scopedForRule() (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (12): OnboardingGuard(), Protected(), RootRedirect(), AppShell(), useAuth(), Dashboard(), greeting(), JoinShare() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (13): dayShort(), fullDate(), HKD(), parseCalendarDate(), shortDate(), GoalCard(), Goals(), Insights() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (15): coerceAmount(), coerceDate(), fingerprintTransaction(), guessColumnMap(), isKnownCategory(), normalizeHeader(), previewBulkImport(), rowFromCsvRecord() (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (7): Toaster(), addToRemoveQueue(), dispatch(), genId(), reducer(), toast(), useToast()

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (1): SafeToSpend()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (1): QuickAddImportPanel()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (1): MenubarShortcut()

### Community 12 - "Community 12"
Cohesion: 0.48
Nodes (5): createUser(), findUserByEmail(), findUserById(), mapUser(), updateUserById()

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (2): createInsight(), generateInsights()

## Knowledge Gaps
- **Thin community `Community 8`** (9 nodes): `registry.js`, `Alerts()`, `Categories()`, `GoalsWidget()`, `Headline()`, `Metric()`, `Pacing()`, `Recent()`, `SafeToSpend()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (7 nodes): `QuickAddImportPanel.js`, `headerFingerprint()`, `loadColumnOverrides()`, `QuickAddImportPanel()`, `saveColumnOverrides()`, `sniffFormat()`, `StatusIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (7 nodes): `menubar.jsx`, `MenubarGroup()`, `MenubarMenu()`, `MenubarPortal()`, `MenubarRadioGroup()`, `MenubarShortcut()`, `MenubarSub()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (3 nodes): `insightService.ts`, `createInsight()`, `generateInsights()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `toIsoString()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.280) - this node is a cross-community bridge._
- **Why does `todayIsoDate()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.280) - this node is a cross-community bridge._
- **Why does `QuickAddDialog()` connect `Community 0` to `Community 5`?**
  _High betweenness centrality (0.264) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `getEnv()` (e.g. with `seedDefaultCategories()` and `listCategories()`) actually correct?**
  _`getEnv()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `cn()` (e.g. with `CategoryPicker()` and `QuickAddDialog()`) actually correct?**
  _`cn()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `useAuth()` (e.g. with `Protected()` and `RootRedirect()`) actually correct?**
  _`useAuth()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `HKD()` (e.g. with `QuickAddDialog()` and `SafeToSpend()`) actually correct?**
  _`HKD()` has 9 INFERRED edges - model-reasoned connections that need verification._