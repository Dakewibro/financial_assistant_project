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
      error:
        "x-admin-token does not match ADMIN_API_TOKEN (different value, environment, or project). Use the exact secret from this API host; do not URL-encode unless you mean to.",
      status: 403,
    });
  });

  it("treats missing header as empty after normalize", () => {
    process.env.STORAGE_MODE = "mongo";
    process.env.MONGODB_URI = "mongodb://example.test/financial_assistant";
    process.env.ADMIN_API_TOKEN = "expected-secret";

    expect(validateProtectedMutationAccess(undefined)).toEqual({
      allowed: false,
      error:
        "Missing or empty x-admin-token header. Send header x-admin-token (or admin-token) with the same raw value as the server ADMIN_API_TOKEN.",
      status: 403,
    });
    expect(validateProtectedMutationAccess("   ")).toEqual({
      allowed: false,
      error:
        "Missing or empty x-admin-token header. Send header x-admin-token (or admin-token) with the same raw value as the server ADMIN_API_TOKEN.",
      status: 403,
    });
  });

  it("accepts leading BOM, wrapping quotes, and accidental URI-encoding on the client token", () => {
    process.env.STORAGE_MODE = "mongo";
    process.env.MONGODB_URI = "mongodb://example.test/financial_assistant";
    process.env.ADMIN_API_TOKEN = "expected-secret";

    expect(validateProtectedMutationAccess("\ufeffexpected-secret").allowed).toBe(true);
    expect(validateProtectedMutationAccess('"expected-secret"').allowed).toBe(true);
    expect(validateProtectedMutationAccess("'expected-secret'").allowed).toBe(true);

    process.env.ADMIN_API_TOKEN = "hello world";
    expect(validateProtectedMutationAccess(encodeURIComponent("hello world")).allowed).toBe(true);
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
          flow: "expense",
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
            date: "not-a-date",
            amount: 12,
            category: "Transport",
            description: "Bus",
            scope: "personal",
          },
        ],
        rules: [],
      }),
    ).rejects.toThrow(/Invalid transaction at index 1/);

    const transactions = await repository.listTransactions();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.description).toBe("Lunch");
  });
});
