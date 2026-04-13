import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { loadStore, saveStore } from "./repository.js";
import { evaluateAlerts } from "./alertService.js";
import { computeSummary } from "./summaryService.js";
import { budgetRuleSchema, categorySchema, transactionSchema } from "./validation.js";

export const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/bootstrap", async (_req, res) => {
  const store = await loadStore();
  const summary = computeSummary(store.transactions);
  const alerts = evaluateAlerts(store.transactions, store.rules);
  res.json({ ...store, summary, alerts });
});

app.post("/api/transactions", async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const store = await loadStore();
  const tx = { ...parsed.data, id: parsed.data.id ?? randomUUID(), createdAt: new Date().toISOString() };
  store.transactions.push(tx);
  await saveStore(store);
  return res.status(201).json(tx);
});

app.get("/api/transactions", async (req, res) => {
  const { category, fromDate, toDate } = req.query;
  const store = await loadStore();
  const filtered = store.transactions.filter((tx) => {
    if (typeof category === "string" && category.length > 0 && tx.category !== category) return false;
    if (typeof fromDate === "string" && tx.date < fromDate) return false;
    if (typeof toDate === "string" && tx.date > toDate) return false;
    return true;
  });
  res.json(filtered);
});

app.post("/api/rules", async (req, res) => {
  const parsed = budgetRuleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const store = await loadStore();
  const rule = { ...parsed.data, id: parsed.data.id ?? randomUUID() };
  store.rules.push(rule);
  await saveStore(store);
  return res.status(201).json(rule);
});

app.get("/api/rules", async (_req, res) => {
  const store = await loadStore();
  res.json(store.rules);
});

app.get("/api/summary", async (_req, res) => {
  const store = await loadStore();
  res.json(computeSummary(store.transactions));
});

app.get("/api/alerts", async (_req, res) => {
  const store = await loadStore();
  res.json(evaluateAlerts(store.transactions, store.rules));
});

app.post("/api/categories", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const store = await loadStore();
  if (!store.categories.includes(parsed.data.name)) {
    store.categories.push(parsed.data.name);
    await saveStore(store);
  }
  return res.status(201).json(store.categories);
});

app.get("/api/export", async (_req, res) => {
  const store = await loadStore();
  res.json(store);
});

app.post("/api/import", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Malformed import payload" });
  }
  const transactions: unknown[] = Array.isArray(req.body.transactions) ? req.body.transactions : [];
  const rules: unknown[] = Array.isArray(req.body.rules) ? req.body.rules : [];
  const categories: unknown[] = Array.isArray(req.body.categories) ? req.body.categories : [];

  const cleanTransactions = transactions
    .map((tx: unknown) => transactionSchema.safeParse(tx))
    .filter((r) => r.success)
    .map((r) => ({ ...r.data, id: r.data.id ?? randomUUID(), createdAt: new Date().toISOString() }));
  const cleanRules = rules
    .map((rule: unknown) => budgetRuleSchema.safeParse(rule))
    .filter((r) => r.success)
    .map((r) => ({ ...r.data, id: r.data.id ?? randomUUID() }));

  const store = await loadStore();
  store.transactions = cleanTransactions;
  store.rules = cleanRules;
  store.categories = categories.filter((c: unknown): c is string => typeof c === "string");
  await saveStore(store);
  return res.json({ importedTransactions: cleanTransactions.length, importedRules: cleanRules.length });
});

app.post("/api/generate-test-data", async (req, res) => {
  const count = typeof req.body?.count === "number" ? req.body.count : 30;
  const store = await loadStore();
  const categories = store.categories.length ? store.categories : ["Meals", "Transport", "Uncategorized"];
  const generated = Array.from({ length: count }).map((_, idx) => {
    const daysAgo = count - idx;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      id: randomUUID(),
      date: date.toISOString().slice(0, 10),
      amount: Number((Math.random() * 120).toFixed(2)),
      category: categories[idx % categories.length],
      description: `Generated transaction ${idx + 1}`,
      notes: idx % 7 === 0 ? "Edge-case note" : undefined,
      createdAt: new Date().toISOString(),
    };
  });
  store.transactions = generated;
  await saveStore(store);
  res.json({ generated: generated.length });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});
