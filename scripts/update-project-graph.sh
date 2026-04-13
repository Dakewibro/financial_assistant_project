#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/3] Rebuilding Graphify code graph..."
graphify update .

echo "[2/3] Capturing trimmed folder tree..."
TREE_OUTPUT="$({
  find . -maxdepth 3 \
    \( -path './.git' -o -path './backend/node_modules' -o -path './frontend/node_modules' -o -path './backend/dist' -o -path './frontend/dist' -o -path './graphify-out/cache' \) -prune -o -print \
    | sort \
    | sed 's#^\./##' \
    | awk -F'/' '{ if ($0=="." || $0=="") next; indent=NF-1; printf "%*s- %s\n", indent*2, "", $NF }'
} )"

echo "[3/3] Writing docs/PROJECT_GRAPH.md..."
cat > docs/PROJECT_GRAPH.md <<DOC
# Project Graph: financial_assistant_project

This file is the quick navigation map for the repository.
It is generated and refreshed with \`./scripts/update-project-graph.sh\`.

## Graphify Outputs

- Code graph JSON: \`graphify-out/graph.json\`
- Graph report: \`graphify-out/GRAPH_REPORT.md\`

## High-Level Module Graph

\`\`\`mermaid
flowchart LR
  A[frontend] -->|HTTP /api| B[backend]
  B --> C[MongoDB Atlas]
  B --> D[file store fallback]
  E[scenarios] --> A
  F[shared/schemas.ts] --> B
  F --> A
\`\`\`

## Folder Tree (depth <= 3, trimmed)

\`\`\`text
$TREE_OUTPUT
\`\`\`

## Refresh Commands

\`\`\`bash
# Rebuild Graphify code graph
graphify update .

# Reinstall/repair Codex Graphify hook if needed
graphify codex install

# Refresh both graphify output + this folder graph doc
./scripts/update-project-graph.sh
\`\`\`
DOC

echo "Project graph refreshed." 
