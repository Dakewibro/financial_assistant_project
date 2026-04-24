import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
const repoRoot = join(backendRoot, "..");

const DEMO_SCENARIO_IDS = [
  "food-cap",
  "transport-budget",
  "subscription-creep",
  "merchant-memory",
  "freelancer-month",
  "household-side-hustle",
];

// Under `src/` so TypeScript can import JSON (bundled on Vercel); `process.cwd()/demo-scenarios` is not deployed.
const outDir = join(backendRoot, "src", "demo-scenarios");
mkdirSync(outDir, { recursive: true });

for (const id of DEMO_SCENARIO_IDS) {
  const src = join(repoRoot, "scenarios", id, "import.json");
  const dest = join(outDir, `${id}.json`);
  copyFileSync(src, dest);
}

console.log(`Copied ${DEMO_SCENARIO_IDS.length} demo scenarios to src/demo-scenarios/`);
