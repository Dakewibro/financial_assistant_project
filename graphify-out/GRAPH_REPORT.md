# Graph Report - financial_assistant_project  (2026-04-24)

## Corpus Check
- 97 files · ~50,526 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 251 nodes · 322 edges · 10 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 12|Community 12]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 25 edges
2. `getEnv()` - 21 edges
3. `useAuth()` - 11 edges
4. `buildBootstrapPayload()` - 10 edges
5. `HKD()` - 9 edges
6. `evaluateAlerts()` - 8 edges
7. `listTransactions()` - 6 edges
8. `computeSummary()` - 6 edges
9. `detectRecurringGroups()` - 6 edges
10. `seedDefaultCategories()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `MenubarShortcut()` --calls--> `cn()`  [INFERRED]
  frontend/src/components/ui/menubar.jsx → frontend/src/lib/utils.js
- `SafeToSpend()` --calls--> `HKD()`  [INFERRED]
  frontend/src/components/widgets/registry.js → frontend/src/lib/format.js
- `Protected()` --calls--> `useAuth()`  [INFERRED]
  frontend/src/App.js → frontend/src/contexts/AuthContext.js
- `RootRedirect()` --calls--> `useAuth()`  [INFERRED]
  frontend/src/App.js → frontend/src/contexts/AuthContext.js
- `OnboardingGuard()` --calls--> `useAuth()`  [INFERRED]
  frontend/src/App.js → frontend/src/contexts/AuthContext.js

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (24): AlertDialogFooter(), AlertDialogHeader(), Badge(), BreadcrumbEllipsis(), BreadcrumbSeparator(), Calendar(), CommandShortcut(), ContextMenuShortcut() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (23): buildBootstrapPayload(), connectDatabase(), disconnectDatabase(), getEnv(), parseOrigins(), parsePort(), escapeRegex(), addCategory() (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (19): createAuthToken(), getAuthUser(), getBearerToken(), getJwtSecret(), importPayload(), maybeRequireAuth(), origin(), originAllowed() (+11 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (15): buildCapAlerts(), createAlert(), evaluateAlerts(), filterByPeriod(), filterByScope(), getStreakLength(), buildInsightsPayload(), classifyKind() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (11): OnboardingGuard(), Protected(), RootRedirect(), AppShell(), useAuth(), Dashboard(), greeting(), Login() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (10): fullDate(), HKD(), GoalCard(), Goals(), Insights(), JoinShare(), QuickAddDialog(), timeBiasedDefault() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (7): Toaster(), addToRemoveQueue(), dispatch(), genId(), reducer(), toast(), useToast()

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (1): SafeToSpend()

### Community 9 - "Community 9"
Cohesion: 0.29
Nodes (1): MenubarShortcut()

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (2): createInsight(), generateInsights()

## Knowledge Gaps
- **Thin community `Community 7`** (9 nodes): `registry.js`, `Alerts()`, `Categories()`, `GoalsWidget()`, `Headline()`, `Metric()`, `Pacing()`, `Recent()`, `SafeToSpend()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (7 nodes): `menubar.jsx`, `MenubarGroup()`, `MenubarMenu()`, `MenubarPortal()`, `MenubarRadioGroup()`, `MenubarShortcut()`, `MenubarSub()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (3 nodes): `insightService.ts`, `createInsight()`, `generateInsights()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Community 0` to `Community 9`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `HKD()` connect `Community 5` to `Community 7`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 4` to `Community 5`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `cn()` (e.g. with `DialogHeader()` and `DialogFooter()`) actually correct?**
  _`cn()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `getEnv()` (e.g. with `seedDefaultCategories()` and `listCategories()`) actually correct?**
  _`getEnv()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `useAuth()` (e.g. with `Protected()` and `RootRedirect()`) actually correct?**
  _`useAuth()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `buildBootstrapPayload()` (e.g. with `seedDefaultCategories()` and `listTransactions()`) actually correct?**
  _`buildBootstrapPayload()` has 9 INFERRED edges - model-reasoned connections that need verification._