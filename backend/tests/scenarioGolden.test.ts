import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseImportPayload } from "../src/app.js";
import { evaluateAlerts } from "../src/alertService.js";
import { detectRecurringGroups } from "../src/services/recurringService.js";
import { computeSummary } from "../src/summaryService.js";
import type { BudgetRule, Transaction } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const scenariosDir = path.join(repoRoot, "scenarios");

const FROZEN_NOW = "2026-03-29T12:00:00.000Z";

function loadJson(rel: string): unknown {
  return JSON.parse(readFileSync(path.join(scenariosDir, rel), "utf8")) as unknown;
}

function hydrateFromImport(body: unknown): { transactions: Transaction[]; rules: BudgetRule[] } {
  const parsed = parseImportPayload(body);
  if (!parsed.payload) {
    throw new Error(parsed.error ?? "parse failed");
  }
  const { transactions: rows, rules: ruleRows } = parsed.payload;
  const transactions: Transaction[] = rows.map((row, i) => ({
    ...row,
    id: `scenario-tx-${i}`,
    createdAt: "2026-03-29T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
  })) as Transaction[];
  const rules: BudgetRule[] = ruleRows.map((row, i) => ({
    ...row,
    id: `scenario-rule-${i}`,
  })) as BudgetRule[];
  return { transactions, rules };
}

function assertSummarySubset(actual: ReturnType<typeof computeSummary>, expected: Record<string, unknown>) {
  expect(actual.totalSpending).toBe(expected.totalSpending);
  expect(actual.perCategoryTotals).toEqual(expected.perCategoryTotals);
  expect(actual.top3Categories).toEqual(expected.top3Categories);
}

function assertAlertsSubset(
  actual: ReturnType<typeof evaluateAlerts>,
  expected: Array<{ ruleType: string; message: string; evidence?: string }>,
) {
  expect(actual.length).toBeGreaterThanOrEqual(expected.length);
  for (const want of expected) {
    const hit = actual.find((a) => a.ruleType === want.ruleType && a.message === want.message);
    expect(hit, `missing alert: ${want.ruleType} / ${want.message}`).toBeTruthy();
    if (want.evidence !== undefined && hit) {
      expect(hit.evidence).toBe(want.evidence);
    }
  }
}

describe("scenario golden files (frozen evaluation instant)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FROZEN_NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("food-cap matches expected-summary and expected-alerts", () => {
    const body = loadJson("food-cap/import.json");
    const expectedSummary = loadJson("food-cap/expected-summary.json") as Record<string, unknown>;
    const expectedAlerts = loadJson("food-cap/expected-alerts.json") as Array<{
      ruleType: string;
      message: string;
      evidence: string;
    }>;

    const { transactions, rules } = hydrateFromImport(body);
    const recurring = detectRecurringGroups(transactions);
    assertSummarySubset(computeSummary(transactions), expectedSummary);
    assertAlertsSubset(evaluateAlerts(transactions, rules, recurring), expectedAlerts);
  });

  it("transport-budget matches expected-summary and expected-alerts", () => {
    const body = loadJson("transport-budget/import.json");
    const expectedSummary = loadJson("transport-budget/expected-summary.json") as Record<string, unknown>;
    const expectedAlerts = loadJson("transport-budget/expected-alerts.json") as Array<{
      ruleType: string;
      message: string;
      evidence?: string;
    }>;

    const { transactions, rules } = hydrateFromImport(body);
    const recurring = detectRecurringGroups(transactions);
    assertSummarySubset(computeSummary(transactions), expectedSummary);
    assertAlertsSubset(evaluateAlerts(transactions, rules, recurring), expectedAlerts);
  });

  it("subscription-creep matches expected-summary and expected-alerts", () => {
    const body = loadJson("subscription-creep/import.json");
    const expectedSummary = loadJson("subscription-creep/expected-summary.json") as Record<string, unknown>;
    const expectedAlerts = loadJson("subscription-creep/expected-alerts.json") as Array<{
      ruleType: string;
      message: string;
    }>;

    const { transactions, rules } = hydrateFromImport(body);
    const recurring = detectRecurringGroups(transactions);
    assertSummarySubset(computeSummary(transactions), expectedSummary);
    assertAlertsSubset(evaluateAlerts(transactions, rules, recurring), expectedAlerts);
  });

  it("uncategorized-risk matches expected-summary and expected-alerts", () => {
    const body = loadJson("uncategorized-risk/import.json");
    const expectedSummary = loadJson("uncategorized-risk/expected-summary.json") as Record<string, unknown>;
    const expectedAlerts = loadJson("uncategorized-risk/expected-alerts.json") as Array<{
      ruleType: string;
      message: string;
      evidence: string;
    }>;

    const { transactions, rules } = hydrateFromImport(body);
    const recurring = detectRecurringGroups(transactions);
    assertSummarySubset(computeSummary(transactions), expectedSummary);
    assertAlertsSubset(evaluateAlerts(transactions, rules, recurring), expectedAlerts);
  });

  it("empty-month matches expected-summary and expected-alerts", () => {
    const body = loadJson("empty-month/import.json");
    const expectedSummary = loadJson("empty-month/expected-summary.json") as Record<string, unknown>;
    const expectedAlerts = loadJson("empty-month/expected-alerts.json") as unknown[];

    const { transactions, rules } = hydrateFromImport(body);
    const recurring = detectRecurringGroups(transactions);
    assertSummarySubset(computeSummary(transactions), expectedSummary);
    expect(evaluateAlerts(transactions, rules, recurring)).toHaveLength(expectedAlerts.length);
  });

  it("merchant-memory matches expected-summary and has no budget alerts", () => {
    const body = loadJson("merchant-memory/import.json");
    const expectedSummary = loadJson("merchant-memory/expected-summary.json") as Record<string, unknown>;
    const { transactions, rules } = hydrateFromImport(body);
    const recurring = detectRecurringGroups(transactions);
    assertSummarySubset(computeSummary(transactions), expectedSummary);
    expect(evaluateAlerts(transactions, rules, recurring)).toHaveLength(0);
  });

  it("micro-all-uncategorized matches expected-alerts", () => {
    const body = loadJson("micro-all-uncategorized/import.json");
    const expectedAlerts = loadJson("micro-all-uncategorized/expected-alerts.json") as Array<{
      ruleType: string;
      message: string;
      evidence: string;
    }>;

    const { transactions, rules } = hydrateFromImport(body);
    const recurring = detectRecurringGroups(transactions);
    assertAlertsSubset(evaluateAlerts(transactions, rules, recurring), expectedAlerts);
  });
});

describe("import-gone-wrong payloads (validation)", () => {
  it("rejects bad date", () => {
    const body = loadJson("import-gone-wrong/request-bad-date.json");
    const r = parseImportPayload(body);
    expect(r.payload).toBeUndefined();
    expect(r.error).toMatch(/Invalid transaction at index 0/);
  });

  it("coerces negative amount to income with positive magnitude", () => {
    const body = loadJson("import-gone-wrong/request-negative-amount.json");
    const r = parseImportPayload(body);
    expect(r.payload).toBeDefined();
    expect(r.payload?.transactions[0]?.amount).toBe(25);
    expect(r.payload?.transactions[0]?.flow).toBe("income");
  });

  it("rejects empty category", () => {
    const body = loadJson("import-gone-wrong/request-empty-category.json");
    const r = parseImportPayload(body);
    expect(r.payload).toBeUndefined();
    expect(r.error).toMatch(/Invalid transaction at index 0/);
  });

  it("accepts novel category strings (enum not enforced at import)", () => {
    const body = loadJson("import-gone-wrong/request-novel-category-valid.json");
    const r = parseImportPayload(body);
    expect(r.payload).toBeDefined();
    expect(r.payload?.transactions[0]?.category).toBe("GymPopUpClass");
  });
});
