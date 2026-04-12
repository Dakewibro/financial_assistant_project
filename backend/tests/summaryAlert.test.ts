import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import { computeSummary } from "../src/summaryService.js";
import { evaluateAlerts } from "../src/alertService.js";
import { BudgetRule, Transaction } from "../src/types.js";

const today = dayjs().format("YYYY-MM-DD");
const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

const transactions: Transaction[] = [
  { id: "1", date: today, amount: 70, category: "Meals", description: "Lunch", createdAt: today },
  { id: "2", date: today, amount: 40, category: "Transport", description: "Taxi", createdAt: today },
  { id: "3", date: yesterday, amount: 30, category: "Meals", description: "Dinner", createdAt: today },
  { id: "4", date: yesterday, amount: 10, category: "Uncategorized", description: "Misc", createdAt: today },
];

describe("summaryService", () => {
  it("computes totals and top categories", () => {
    const summary = computeSummary(transactions);
    expect(summary.totalSpending).toBe(150);
    expect(summary.perCategoryTotals.Meals).toBe(100);
    expect(summary.top3Categories[0].category).toBe("Meals");
    expect(summary.trend7Days).toHaveLength(7);
  });
});

describe("alertService", () => {
  it("triggers expected rules", () => {
    const rules: BudgetRule[] = [
      { id: "r1", period: "daily", threshold: 50, ruleType: "category_cap", category: "Meals", enabled: true },
      { id: "r2", period: "monthly", threshold: 20, ruleType: "category_percentage", category: "Transport", enabled: true },
      { id: "r3", period: "daily", threshold: 0, ruleType: "uncategorized_warning", enabled: true },
    ];
    const alerts = evaluateAlerts(transactions, rules);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some((a) => a.ruleId === "r1")).toBe(true);
    expect(alerts.some((a) => a.ruleId === "r3")).toBe(true);
  });
});
