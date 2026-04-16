import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectRecurringGroups } from "../src/services/recurringService.js";
import type { Transaction } from "../src/types.js";

describe("recurringService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects subscription-like and habit-like recurring spending", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        date: "2026-02-16",
        amount: 88,
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
        category: "Subscription",
        description: "Streaming A",
        normalizedMerchant: "streaming a",
        scope: "personal",
        createdAt: "2026-04-16T09:00:00Z",
        updatedAt: "2026-04-16T09:00:00Z",
      },
      {
        id: "4",
        date: "2026-04-10",
        amount: 5.5,
        category: "Food",
        description: "Coffee House",
        normalizedMerchant: "coffee house",
        scope: "personal",
        createdAt: "2026-04-10T08:00:00Z",
        updatedAt: "2026-04-10T08:00:00Z",
      },
      {
        id: "5",
        date: "2026-04-11",
        amount: 5.8,
        category: "Food",
        description: "Coffee House",
        normalizedMerchant: "coffee house",
        scope: "personal",
        createdAt: "2026-04-11T08:00:00Z",
        updatedAt: "2026-04-11T08:00:00Z",
      },
      {
        id: "6",
        date: "2026-04-13",
        amount: 6.1,
        category: "Food",
        description: "Coffee House",
        normalizedMerchant: "coffee house",
        scope: "personal",
        createdAt: "2026-04-13T08:00:00Z",
        updatedAt: "2026-04-13T08:00:00Z",
      },
      {
        id: "7",
        date: "2026-04-14",
        amount: 5.6,
        category: "Food",
        description: "Coffee House",
        normalizedMerchant: "coffee house",
        scope: "personal",
        createdAt: "2026-04-14T08:00:00Z",
        updatedAt: "2026-04-14T08:00:00Z",
      },
    ];

    const recurring = detectRecurringGroups(transactions);
    expect(recurring.some((item) => item.normalizedMerchant === "streaming a" && item.kind === "subscription")).toBe(true);
    expect(recurring.some((item) => item.normalizedMerchant === "coffee house" && item.kind === "habit")).toBe(true);
  });
});
