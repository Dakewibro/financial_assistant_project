import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("v2 contract integration checks", () => {
  let token = "";

  beforeEach(async () => {
    process.env.STORAGE_MODE = "memory";
    process.env.AUTH_ENFORCED = "false";
    process.env.V2_CONTRACTS_ENABLED = "true";
    process.env.EMERGENT_V2_ENABLED = "false";
    delete process.env.MONGODB_URI;

    const repository = await import("../src/repository.js");
    repository.resetMemoryStore();
    await repository.seedDefaultCategories();

    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: `user-${Date.now()}@example.com`,
      password: "password123",
    });
    token = registerRes.body.token;
  });

  it("supports smart-entry endpoint set", async () => {
    const parseRes = await request(app).post("/api/parse-transaction").set("authorization", `Bearer ${token}`).send({ text: "Starbucks 45 coffee" });
    expect(parseRes.status).toBe(200);
    expect(parseRes.body.merchant).toBeTruthy();

    const suggestRes = await request(app).post("/api/suggest-category").set("authorization", `Bearer ${token}`).send({ merchant: "Starbucks" });
    expect(suggestRes.status).toBe(200);
    expect(Array.isArray(suggestRes.body.suggestions)).toBe(true);

    const recentsRes = await request(app).get("/api/transactions/recents").set("authorization", `Bearer ${token}`);
    expect(recentsRes.status).toBe(200);
    expect(Array.isArray(recentsRes.body)).toBe(true);
  });

  it("supports collaborative contracts for goals and shares", async () => {
    const goalRes = await request(app)
      .post("/api/goals")
      .set("authorization", `Bearer ${token}`)
      .send({ name: "Emergency fund", kind: "savings", target_amount: 10000, current_amount: 0, monthly_contribution: 1000 });
    expect(goalRes.status).toBe(201);

    const shareRes = await request(app).post(`/api/goals/${goalRes.body.id}/share`).set("authorization", `Bearer ${token}`);
    expect(shareRes.status).toBe(200);
    expect(shareRes.body.token).toBeTruthy();

    const previewRes = await request(app).get(`/api/shares/${shareRes.body.token}`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.kind).toBe("goal");
  });

  it("returns dashboard preference payload", async () => {
    const saveRes = await request(app)
      .put("/api/preferences/dashboard")
      .set("authorization", `Bearer ${token}`)
      .send({ widgets: [{ id: "summary", size: "m" }] });
    expect(saveRes.status).toBe(200);

    const getRes = await request(app).get("/api/preferences/dashboard").set("authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.widgets).toHaveLength(1);
  });
});

