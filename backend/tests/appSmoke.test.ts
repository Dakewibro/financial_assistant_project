import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { connectDatabase } from "../src/config/db.js";

describe("baseline smoke checks", () => {
  beforeEach(async () => {
    process.env.STORAGE_MODE = "memory";
    process.env.EMERGENT_V2_ENABLED = "false";
    process.env.AUTH_ENFORCED = "false";
    process.env.V2_CONTRACTS_ENABLED = "false";
    delete process.env.MONGODB_URI;
    await connectDatabase();

    const repository = await import("../src/repository.js");
    repository.resetMemoryStore();
    await repository.seedDefaultCategories();
  });

  it("returns health status with migration flags and request id", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.flags).toEqual({
      emergentV2Enabled: false,
      authEnforced: false,
      v2ContractsEnabled: false,
    });
    expect(typeof res.body.requestId).toBe("string");
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("returns baseline bootstrap payload", async () => {
    const res = await request(app).get("/api/bootstrap");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(Array.isArray(res.body.rules)).toBe(true);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.currency).toBe("HKD");
  });
});

