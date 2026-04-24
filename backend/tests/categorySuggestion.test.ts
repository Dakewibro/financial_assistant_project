import { describe, expect, it } from "vitest";
import { buildRecentEntryHelpers, suggestCategory } from "../src/services/categorySuggestionService.js";
import type { Transaction } from "../src/types.js";

const transactions: Transaction[] = [
  {
    id: "1",
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
    id: "2",
    date: "2026-04-10",
    amount: 88,
    flow: "expense",
    category: "Subscription",
    description: "Streaming A",
    normalizedMerchant: "streaming a",
    scope: "personal",
    createdAt: "2026-04-10T09:00:00Z",
    updatedAt: "2026-04-10T09:00:00Z",
  },
  {
    id: "3",
    date: "2026-04-02",
    amount: 88,
    flow: "expense",
    category: "Subscription",
    description: "Streaming A",
    normalizedMerchant: "streaming a",
    scope: "personal",
    createdAt: "2026-04-02T09:00:00Z",
    updatedAt: "2026-04-02T09:00:00Z",
  },
];

describe("categorySuggestionService", () => {
  it("prefers exact merchant history over keyword fallback", () => {
    const suggestion = suggestCategory("Streaming A 9988", transactions);
    expect(suggestion.category).toBe("Subscription");
    expect(suggestion.source).toBe("history");
    expect(suggestion.confidence).toBe("high");
  });

  it("falls back to keyword rules", () => {
    const suggestion = suggestCategory("Uber Trip Causeway Bay", []);
    expect(suggestion.category).toBe("Transport");
    expect(suggestion.source).toBe("keyword");
  });

  it("builds recent-entry helpers for the frontend", () => {
    const recent = buildRecentEntryHelpers(transactions);
    expect(recent.lastTransaction?.description).toBe("Streaming A");
    expect(recent.merchantCategoryHints[0].normalizedMerchant).toBe("streaming a");
    expect(recent.recentDescriptions[0]).toBe("Streaming A");
  });
});
