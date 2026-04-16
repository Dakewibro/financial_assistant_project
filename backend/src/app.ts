import cors from "cors";
import express from "express";
import { evaluateAlerts } from "./alertService.js";
import { isDatabaseReady } from "./config/db.js";
import { getEnv } from "./config/env.js";
import {
  addCategory,
  createRule,
  createTransaction,
  listCategories,
  listRules,
  listTransactions,
  replaceStore,
  seedDefaultCategories,
} from "./repository.js";
import { buildRecentEntryHelpers } from "./services/categorySuggestionService.js";
import { generateInsights } from "./services/insightService.js";
import { detectRecurringGroups } from "./services/recurringService.js";
import { computeSummary } from "./summaryService.js";
import { DEFAULT_CATEGORIES, type BootstrapResponse, type BudgetRule, type Scope, type Transaction, type TransactionFilters } from "./types.js";
import { normalizeMerchant } from "./utils/normalizeMerchant.js";
import { budgetRuleSchema, categorySchema, transactionSchema } from "./validation.js";

interface ImportPayload {
  transactions: Array<Omit<Transaction, "id" | "createdAt" | "updatedAt">>;
  rules: Array<Omit<BudgetRule, "id">>;
  categories: string[];
}

interface ProtectedMutationAccessResult {
  allowed: boolean;
  error?: string;
  status?: number;
}

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const { allowedOrigins } = getEnv();
  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*")) {
      const pattern = new RegExp(`^${allowed.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
      return pattern.test(origin);
    }
    return allowed === origin;
  });
}

function parseScope(value: unknown): Scope | undefined {
  return value === "personal" || value === "business" ? value : undefined;
}

function parseTransactionFilters(query: Record<string, unknown>): TransactionFilters {
  return {
    category: typeof query.category === "string" ? query.category : undefined,
    fromDate: typeof query.fromDate === "string" ? query.fromDate : undefined,
    toDate: typeof query.toDate === "string" ? query.toDate : undefined,
    scope: parseScope(query.scope),
    recurringOnly: query.recurringOnly === "true",
    search: typeof query.search === "string" && query.search.length > 0 ? query.search : undefined,
  };
}

export function validateProtectedMutationAccess(providedToken: string | undefined): ProtectedMutationAccessResult {
  const { adminApiToken, storageMode } = getEnv();
  if (storageMode === "memory") return { allowed: true };

  if (!adminApiToken) {
    return {
      allowed: false,
      error: "ADMIN_API_TOKEN must be configured for protected mutation endpoints",
      status: 503,
    };
  }

  if (providedToken?.trim() !== adminApiToken) {
    return {
      allowed: false,
      error: "Protected mutation endpoint requires a valid x-admin-token header",
      status: 403,
    };
  }

  return { allowed: true };
}

function requireProtectedMutationAccess(req: express.Request, res: express.Response): boolean {
  const access = validateProtectedMutationAccess(req.get("x-admin-token"));
  if (access.allowed) return true;
  res.status(access.status ?? 403).json({ error: access.error });
  return false;
}

export function parseImportPayload(body: unknown): { payload?: ImportPayload; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Malformed import payload" };
  }

  const candidate = body as { transactions?: unknown; rules?: unknown; categories?: unknown };
  const transactions = Array.isArray(candidate.transactions) ? candidate.transactions : [];
  const rules = Array.isArray(candidate.rules) ? candidate.rules : [];
  const categories = Array.isArray(candidate.categories) ? candidate.categories : [];

  const cleanTransactions: Array<Omit<Transaction, "id" | "createdAt" | "updatedAt">> = [];
  for (const [index, tx] of transactions.entries()) {
    const result = transactionSchema.safeParse(tx);
    if (!result.success) {
      return { error: `Invalid transaction at index ${index}` };
    }
    cleanTransactions.push({
      ...result.data,
      normalizedMerchant: normalizeMerchant(result.data.description),
    });
  }

  const cleanRules: Array<Omit<BudgetRule, "id">> = [];
  for (const [index, rule] of rules.entries()) {
    const result = budgetRuleSchema.safeParse(rule);
    if (!result.success) {
      return { error: `Invalid budget rule at index ${index}` };
    }
    cleanRules.push(result.data);
  }

  const cleanCategories: string[] = [];
  for (const [index, entry] of categories.entries()) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      return { error: `Invalid category at index ${index}` };
    }
    cleanCategories.push(entry.trim());
  }

  return {
    payload: {
      transactions: cleanTransactions,
      rules: cleanRules,
      categories: cleanCategories,
    },
  };
}

export async function importPayload(body: unknown): Promise<{ importedTransactions: number; importedRules: number }> {
  const parsed = parseImportPayload(body);
  if (!parsed.payload) {
    throw new Error(parsed.error ?? "Malformed import payload");
  }

  const { categories, rules, transactions } = parsed.payload;
  const derivedCategories = transactions.map((tx) => tx.category);
  await replaceStore({
    transactions,
    rules,
    categories: [...new Set([...DEFAULT_CATEGORIES, ...categories, ...derivedCategories])],
  });

  return { importedTransactions: transactions.length, importedRules: rules.length };
}

export async function buildBootstrapPayload(): Promise<BootstrapResponse> {
  await seedDefaultCategories();
  const [transactions, rules, categories] = await Promise.all([listTransactions(), listRules(), listCategories()]);
  const recurring = detectRecurringGroups(transactions);
  const alerts = evaluateAlerts(transactions, rules, recurring);
  const summary = computeSummary(transactions);
  const insights = generateInsights(summary, alerts, recurring, rules);

  return {
    currency: "HKD",
    transactions,
    rules,
    categories,
    alerts,
    summary,
    recurring,
    insights,
    recent: buildRecentEntryHelpers(transactions),
  };
}

export const app = express();
app.use(
  cors({
    origin(origin, callback) {
      callback(null, originAllowed(origin));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  const { storageMode } = getEnv();
  const ready = isDatabaseReady();
  res.status(ready ? 200 : 503).json({ ok: ready, storageMode });
});

app.get("/api/bootstrap", async (_req, res) => {
  const payload = await buildBootstrapPayload();
  res.json(payload);
});

app.post("/api/transactions", async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const tx = await createTransaction({
    ...parsed.data,
    normalizedMerchant: normalizeMerchant(parsed.data.description),
  });
  return res.status(201).json(tx);
});

app.get("/api/transactions", async (req, res) => {
  const filters = parseTransactionFilters(req.query as Record<string, unknown>);
  const transactions = await listTransactions(filters);

  if (filters.recurringOnly) {
    const recurring = detectRecurringGroups(transactions);
    const recurringKeys = new Set(recurring.map((item) => `${item.scope}:${item.normalizedMerchant}`));
    return res.json(transactions.filter((tx) => recurringKeys.has(`${tx.scope}:${tx.normalizedMerchant}`)));
  }

  return res.json(transactions);
});

app.post("/api/rules", async (req, res) => {
  const parsed = budgetRuleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const rule = await createRule(parsed.data);
  return res.status(201).json(rule);
});

app.get("/api/rules", async (_req, res) => {
  res.json(await listRules());
});

app.get("/api/categories", async (_req, res) => {
  res.json(await listCategories());
});

app.post("/api/categories", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.status(201).json(await addCategory(parsed.data.name));
});

app.get("/api/summary", async (_req, res) => {
  res.json(computeSummary(await listTransactions()));
});

app.get("/api/alerts", async (_req, res) => {
  const [transactions, rules] = await Promise.all([listTransactions(), listRules()]);
  const recurring = detectRecurringGroups(transactions);
  res.json(evaluateAlerts(transactions, rules, recurring));
});

app.get("/api/recurring", async (_req, res) => {
  res.json(detectRecurringGroups(await listTransactions()));
});

app.get("/api/insights", async (_req, res) => {
  const [transactions, rules] = await Promise.all([listTransactions(), listRules()]);
  const recurring = detectRecurringGroups(transactions);
  const alerts = evaluateAlerts(transactions, rules, recurring);
  const summary = computeSummary(transactions);
  res.json(generateInsights(summary, alerts, recurring, rules));
});

app.get("/api/export", async (_req, res) => {
  const [transactions, rules, categories] = await Promise.all([listTransactions(), listRules(), listCategories()]);
  res.json({ transactions, rules, categories });
});

app.post("/api/import", async (req, res) => {
  if (!requireProtectedMutationAccess(req, res)) return;

  try {
    const result = await importPayload(req.body);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Malformed import payload" });
  }
});

app.post("/api/generate-test-data", async (req, res) => {
  if (!requireProtectedMutationAccess(req, res)) return;

  const count = typeof req.body?.count === "number" ? req.body.count : 30;
  const categories = await listCategories();
  const generated: Array<Omit<Transaction, "id" | "createdAt" | "updatedAt">> = Array.from({ length: count }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - index));
    const description = `Generated transaction ${index + 1}`;
    const scope: Scope = index % 4 === 0 ? "business" : "personal";
    return {
      date: date.toISOString().slice(0, 10),
      amount: Number((Math.random() * 120 + 10).toFixed(2)),
      category: categories[index % categories.length],
      description,
      normalizedMerchant: normalizeMerchant(description),
      notes: index % 7 === 0 ? "Edge-case note" : undefined,
      scope,
    };
  });

  await replaceStore({
    transactions: generated,
    rules: [],
    categories,
  });
  res.json({ generated: generated.length });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});
