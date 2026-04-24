import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeSummary } from "../src/summaryService.js";
import { evaluateAlerts } from "../src/alertService.js";
import { detectRecurringGroups } from "../src/services/recurringService.js";
import type { BudgetRule, Transaction } from "../src/types.js";

describe("summaryService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes totals, trends, and scope split", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        date: "2026-04-16",
        amount: 70,
        flow: "expense",
        category: "Food",
        description: "Lunch",
        normalizedMerchant: "lunch",
        scope: "personal",
        createdAt: "2026-04-16T09:00:00Z",
        updatedAt: "2026-04-16T09:00:00Z",
      },
      {
        id: "2",
        date: "2026-04-15",
        amount: 40,
        flow: "expense",
        category: "Transport",
        description: "Taxi",
        normalizedMerchant: "taxi",
        scope: "business",
        createdAt: "2026-04-15T09:00:00Z",
        updatedAt: "2026-04-15T09:00:00Z",
      },
      {
        id: "3",
        date: "2026-04-10",
        amount: 30,
        flow: "expense",
        category: "Food",
        description: "Dinner",
        normalizedMerchant: "dinner",
        scope: "personal",
        createdAt: "2026-04-10T09:00:00Z",
        updatedAt: "2026-04-10T09:00:00Z",
      },
    ];

    const summary = computeSummary(transactions);
    expect(summary.totalSpending).toBe(140);
    expect(summary.perCategoryTotals.Food).toBe(100);
    expect(summary.byScope.personal).toBe(100);
    expect(summary.byScope.business).toBe(40);
    expect(summary.top3Categories[0].category).toBe("Food");
    expect(summary.trend7Days).toHaveLength(7);
    expect(summary.trend30Days).toHaveLength(30);
  });

  it("excludes income flows from spending totals", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        date: "2026-04-16",
        amount: 50,
        flow: "expense",
        category: "Food",
        description: "Lunch",
        normalizedMerchant: "lunch",
        scope: "personal",
        createdAt: "2026-04-16T09:00:00Z",
        updatedAt: "2026-04-16T09:00:00Z",
      },
      {
        id: "2",
        date: "2026-04-16",
        amount: 5000,
        flow: "income",
        category: "Bills",
        description: "Salary",
        normalizedMerchant: "salary",
        scope: "personal",
        createdAt: "2026-04-16T09:00:00Z",
        updatedAt: "2026-04-16T09:00:00Z",
      },
    ];
    const summary = computeSummary(transactions);
    expect(summary.totalSpending).toBe(50);
    expect(summary.monthlyTotal).toBe(50);
    expect(summary.perCategoryTotals.Food).toBe(50);
    expect(summary.perCategoryTotals.Bills).toBeUndefined();
  });
});

describe("alertService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("triggers near-limit, exceeded, share, and recurring alerts", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        date: "2026-02-16",
        amount: 88,
        flow: "expense",
        category: "Subscription",
        description: "Streaming A",
        normalizedMerchant: "streaming a",
        scope: "personal",
        createdAt: "2026-02-16T09:00:00Z",
        updatedAt: "2026-02-16T09:00:00Z",
      },
      {
        id: "2",
        date: "2026-03-16",
        amount: 88,
        flow: "expense",
        category: "Subscription",
        description: "Streaming A",
        normalizedMerchant: "streaming a",
        scope: "personal",
        createdAt: "2026-03-16T09:00:00Z",
        updatedAt: "2026-03-16T09:00:00Z",
      },
      {
        id: "3",
        date: "2026-04-16",
        amount: 88,
        flow: "expense",
        category: "Subscription",
        description: "Streaming A",
        normalizedMerchant: "streaming a",
        scope: "personal",
        createdAt: "2026-04-16T09:00:00Z",
        updatedAt: "2026-04-16T09:00:00Z",
      },
      {
        id: "4",
        date: "2026-04-15",
        amount: 70,
        flow: "expense",
        category: "Food",
        description: "Lunch",
        normalizedMerchant: "lunch",
        scope: "personal",
        createdAt: "2026-04-15T09:00:00Z",
        updatedAt: "2026-04-15T09:00:00Z",
      },
      {
        id: "5",
        date: "2026-04-15",
        amount: 10,
        flow: "expense",
        category: "Uncategorized",
        description: "Misc",
        normalizedMerchant: "misc",
        scope: "personal",
        createdAt: "2026-04-15T10:00:00Z",
        updatedAt: "2026-04-15T10:00:00Z",
      },
    ];

    const rules: BudgetRule[] = [
      { id: "r1", period: "monthly", threshold: 100, ruleType: "period_cap", enabled: true },
      { id: "r2", period: "monthly", threshold: 50, ruleType: "category_cap", category: "Food", enabled: true },
      { id: "r3", period: "monthly", threshold: 20, ruleType: "category_percentage", category: "Subscription", enabled: true },
      { id: "r4", period: "monthly", threshold: 80, ruleType: "recurring_threshold", enabled: true },
      { id: "r5", period: "monthly", threshold: 0, ruleType: "uncategorized_warning", enabled: true },
    ];

    const recurring = detectRecurringGroups(transactions);
    const alerts = evaluateAlerts(transactions, rules, recurring);

    expect(alerts.some((alert) => alert.ruleId === "r1" && alert.status === "exceeded")).toBe(true);
    expect(alerts.some((alert) => alert.ruleId === "r2" && alert.status === "exceeded")).toBe(true);
    expect(alerts.some((alert) => alert.ruleId === "r3")).toBe(true);
    expect(alerts.some((alert) => alert.ruleId === "r4")).toBe(true);
    expect(alerts.some((alert) => alert.ruleId === "r5")).toBe(true);
  });
});
