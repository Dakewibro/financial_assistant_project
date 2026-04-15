# Graph Report - .  (2026-04-16)

## Corpus Check
- 22 files · ~5,936 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 44 nodes · 43 edges · 17 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
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
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `request()` - 5 edges
2. `load()` - 4 edges
3. `ensureStore()` - 3 edges
4. `computeSummary()` - 3 edges
5. `addTransaction()` - 2 edges
6. `addRule()` - 2 edges
7. `runScenario()` - 2 edges
8. `fetchBootstrap()` - 2 edges
9. `createTransaction()` - 2 edges
10. `createRule()` - 2 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.33
Nodes (2): createAlert(), evaluateAlerts()

### Community 1 - "Community 1"
Cohesion: 0.53
Nodes (4): addRule(), addTransaction(), load(), runScenario()

### Community 2 - "Community 2"
Cohesion: 0.6
Nodes (5): createRule(), createTransaction(), fetchBootstrap(), importScenario(), request()

### Community 3 - "Community 3"
Cohesion: 0.5
Nodes (0): 

### Community 4 - "Community 4"
Cohesion: 0.83
Nodes (3): ensureStore(), loadStore(), saveStore()

### Community 5 - "Community 5"
Cohesion: 0.83
Nodes (3): buildTrend(), computeSummary(), sumBy()

### Community 6 - "Community 6"
Cohesion: 1.0
Nodes (0): 

### Community 7 - "Community 7"
Cohesion: 1.0
Nodes (0): 

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 6`** (2 nodes): `ScenariosPage.tsx`, `ScenariosPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (2 nodes): `DashboardPage()`, `DashboardPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (1 nodes): `finance.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (1 nodes): `ReportsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (1 nodes): `BudgetsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `TransactionsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `summaryAlert.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `generate-test-data.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._