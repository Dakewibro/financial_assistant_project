import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const categories = ["Meals", "Transport", "Subscription", "Shopping", "Uncategorized"];
const outDir = resolve(process.cwd(), "shared", "data");
mkdirSync(outDir, { recursive: true });

const transactions = Array.from({ length: 60 }).map((_, idx) => {
  const date = new Date();
  date.setDate(date.getDate() - (60 - idx));
  return {
    id: `gen-${idx + 1}`,
    date: date.toISOString().slice(0, 10),
    amount: Number((Math.random() * 120).toFixed(2)),
    category: categories[idx % categories.length],
    description: `Generated expense ${idx + 1}`,
    notes: idx % 15 === 0 ? "Edge-case marker" : undefined,
    createdAt: new Date().toISOString(),
  };
});

const rules = [
  { id: "r1", ruleType: "category_cap", category: "Meals", period: "daily", threshold: 50, enabled: true },
  { id: "r2", ruleType: "period_cap", period: "weekly", threshold: 350, enabled: true },
  { id: "r3", ruleType: "category_percentage", category: "Transport", period: "monthly", threshold: 30, enabled: true },
  { id: "r4", ruleType: "consecutive_overspend", period: "daily", threshold: 80, enabled: true },
  { id: "r5", ruleType: "uncategorized_warning", period: "monthly", threshold: 4, enabled: true },
];

writeFileSync(
  resolve(outDir, "store.json"),
  JSON.stringify({ transactions, rules, categories }, null, 2),
  "utf8",
);

console.log("Generated shared/data/store.json with realistic test data.");
