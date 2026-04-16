import { beforeEach, describe, expect, it } from "vitest";
import { importPayload, validateProtectedMutationAccess } from "../src/app.js";

describe("protected mutation access", () => {
  beforeEach(() => {
    process.env.STORAGE_MODE = "memory";
    delete process.env.MONGODB_URI;
    delete process.env.ADMIN_API_TOKEN;
  });

  it("rejects protected mutations in mongo mode when no admin token is configured", () => {
    process.env.STORAGE_MODE = "mongo";
    process.env.MONGODB_URI = "mongodb://example.test/financial_assistant";

    expect(validateProtectedMutationAccess(undefined)).toEqual({
      allowed: false,
      error: "ADMIN_API_TOKEN must be configured for protected mutation endpoints",
      status: 503,
    });
  });

  it("rejects protected mutations with an invalid admin token", () => {
    process.env.STORAGE_MODE = "mongo";
    process.env.MONGODB_URI = "mongodb://example.test/financial_assistant";
    process.env.ADMIN_API_TOKEN = "expected-secret";

    expect(validateProtectedMutationAccess("wrong-secret")).toEqual({
      allowed: false,
      error: "Protected mutation endpoint requires a valid x-admin-token header",
      status: 403,
    });
  });
});

describe("import payload processing", () => {
  beforeEach(async () => {
    process.env.STORAGE_MODE = "memory";
    delete process.env.MONGODB_URI;
    delete process.env.ADMIN_API_TOKEN;

    const repository = await import("../src/repository.js");
    repository.resetMemoryStore();
    await repository.replaceStore({
      categories: ["Food", "Transport"],
      transactions: [
        {
          date: "2026-04-16",
          amount: 30,
          category: "Food",
          description: "Lunch",
          normalizedMerchant: "lunch",
          scope: "personal",
        },
      ],
      rules: [],
    });
  });

  it("fails invalid imports without overwriting existing data", async () => {
    const repository = await import("../src/repository.js");

    await expect(
      importPayload({
        categories: ["Food", "Transport"],
        transactions: [
          {
            date: "2026-04-18",
            amount: 55,
            category: "Food",
            description: "Dinner",
            scope: "personal",
          },
          {
            date: "2026-04-19",
            amount: -4,
            category: "Transport",
            description: "Bus",
            scope: "personal",
          },
        ],
        rules: [],
      }),
    ).rejects.toThrow("Invalid transaction at index 1");

    const transactions = await repository.listTransactions();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.description).toBe("Lunch");
  });
});
