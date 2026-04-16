import { beforeEach, describe, expect, it } from "vitest";

describe("bootstrap aggregation", () => {
  beforeEach(async () => {
    process.env.STORAGE_MODE = "memory";
    delete process.env.MONGODB_URI;

    const [repository] = await Promise.all([import("../src/repository.js")]);
    repository.resetMemoryStore();
    await repository.replaceStore({
      categories: ["Food", "Subscription", "Transport", "Uncategorized"],
      transactions: [
        {
          date: "2026-02-16",
          amount: 88,
          category: "Subscription",
          description: "Streaming A",
          normalizedMerchant: "streaming a",
          scope: "personal",
        },
        {
          date: "2026-03-16",
          amount: 88,
          category: "Subscription",
          description: "Streaming A",
          normalizedMerchant: "streaming a",
          scope: "personal",
        },
        {
          date: "2026-04-16",
          amount: 88,
          category: "Subscription",
          description: "Streaming A",
          normalizedMerchant: "streaming a",
          scope: "personal",
        },
        {
          date: "2026-04-15",
          amount: 45,
          category: "Food",
          description: "Lunch",
          normalizedMerchant: "lunch",
          scope: "business",
        },
      ],
      rules: [
        {
          period: "monthly",
          threshold: 80,
          ruleType: "recurring_threshold",
          enabled: true,
        },
      ],
    });
  });

  it("returns a complete bootstrap payload", async () => {
    const { buildBootstrapPayload } = await import("../src/app.js");
    const payload = (await buildBootstrapPayload()) as {
      transactions: unknown[];
      rules: unknown[];
      categories: string[];
      alerts: unknown[];
      recurring: unknown[];
      insights: unknown[];
      recent: { recentDescriptions: string[] };
      summary: { byScope: { business: number } };
    };

    expect(payload.categories).toContain("Food");
    expect(payload.transactions).toHaveLength(4);
    expect(payload.rules).toHaveLength(1);
    expect(payload.recurring.length).toBeGreaterThan(0);
    expect(payload.alerts.length).toBeGreaterThan(0);
    expect(payload.insights.length).toBeGreaterThan(0);
    expect(payload.recent.recentDescriptions[0]).toBe("Streaming A");
    expect(payload.summary.byScope.business).toBe(45);
  });
});
