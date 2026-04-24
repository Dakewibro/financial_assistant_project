import cors from "cors";
import express from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as helmetModule from "helmet";
import type { HelmetOptions } from "helmet";
import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { slowDown } from "express-slow-down";
import { evaluateAlerts } from "./alertService.js";
import { isDatabaseReady } from "./config/db.js";
import { getEnv } from "./config/env.js";
import {
  addCategory,
  appendTransactions,
  countTransactions,
  createRule,
  createTransaction,
  deleteTransaction,
  listCategories,
  listRules,
  listTransactions,
  replaceStore,
  replaceTransactions,
  seedDefaultCategories,
} from "./repository.js";
import { buildRecentEntryHelpers } from "./services/categorySuggestionService.js";
import { suggestCategory as suggestCategoryFromHistory } from "./services/categorySuggestionService.js";
import { generateInsights } from "./services/insightService.js";
import { detectRecurringGroups } from "./services/recurringService.js";
import { computeSummary } from "./summaryService.js";
import { DEFAULT_CATEGORIES, type BootstrapResponse, type BudgetRule, type Scope, type Transaction, type TransactionFilters } from "./types.js";
import { normalizeMerchant } from "./utils/normalizeMerchant.js";
import { previewBulkImport, type BulkColumnMap } from "./services/bulkImportService.js";
import { budgetRuleSchema, categorySchema, transactionSchema } from "./validation.js";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";

dayjs.extend(isoWeek);

const DEMO_SCENARIO_IDS = [
  "food-cap",
  "transport-budget",
  "subscription-creep",
  "merchant-memory",
  "freelancer-month",
  "household-side-hustle",
] as const;

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

type AuthUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  onboarded: boolean;
  monthlyIncome: number;
  primaryUse: "personal" | "freelancer" | "mixed";
};

type BudgetRuleRef = { ruleType: BudgetRule["ruleType"]; period: BudgetRule["period"] };

type BudgetResource = {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  account: Scope;
  limit: number;
  memberIds: string[];
  shareToken?: string;
  /** Present when this row mirrors an imported budget rule (drives period math on GET /budgets). */
  ruleRef?: BudgetRuleRef;
};

type GoalResource = {
  id: string;
  ownerId: string;
  name: string;
  kind: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  memberIds: string[];
  shareToken?: string;
};

const users: AuthUser[] = [
  {
    id: "demo-user",
    name: "Demo User",
    email: "demo@finassist.app",
    passwordHash: bcrypt.hashSync("demo1234", 10),
    onboarded: true,
    monthlyIncome: 24000,
    primaryUse: "mixed",
  },
];
const acknowledgedAlertIds = new Set<string>();
const budgets: BudgetResource[] = [];
const goals: GoalResource[] = [];
const shareIndex = new Map<string, { kind: "budget" | "goal"; resourceId: string; ownerId: string }>();
const dashboardPrefs = new Map<string, { widgets: Array<{ id: string; size: "s" | "m" | "l" }> }>();

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const { allowedOrigins } = getEnv();
  return allowedOrigins.some((allowed) => {
    if (allowed.includes("*") && process.env.NODE_ENV !== "production") {
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

function getJwtSecret() {
  return getEnv().jwtSecret;
}

function getBearerToken(header: string | undefined) {
  if (!header) return null;
  const [prefix, token] = header.split(" ");
  if (prefix !== "Bearer" || !token) return null;
  return token;
}

function createAuthToken(user: AuthUser) {
  return jwt.sign({ sub: user.id, email: user.email }, getJwtSecret(), { expiresIn: "7d" });
}

function getAuthUser(req: express.Request) {
  const token = getBearerToken(req.header("authorization"));
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as { sub?: string };
    if (!payload.sub) return null;
    return users.find((entry) => entry.id === payload.sub) ?? null;
  } catch {
    return null;
  }
}

function maybeRequireAuth(req: express.Request, res: express.Response) {
  const { authEnforced } = getEnv();
  if (!authEnforced) return { user: null, required: false } as const;
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ detail: "Unauthorized" });
    return { user: null, required: true } as const;
  }
  return { user, required: true } as const;
}

function requireAuth(req: express.Request, res: express.Response) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ detail: "Unauthorized" });
    return null;
  }
  return user;
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

  await refreshBudgetsFromRules();

  return { importedTransactions: transactions.length, importedRules: rules.length };
}

async function refreshBudgetsFromRules(): Promise<void> {
  budgets.splice(0, budgets.length);
  const rules = await listRules();
  const ownerId = users[0]?.id ?? "demo-user";
  const memberIds = users.length ? users.map((u) => u.id) : [ownerId];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const account: Scope = rule.scope ?? "personal";
    if (rule.ruleType === "category_cap" && rule.category) {
      budgets.push({
        id: rule.id,
        ownerId,
        name: `${rule.category} ${rule.period} cap`,
        category: rule.category,
        account,
        limit: rule.threshold,
        memberIds,
        ruleRef: { ruleType: rule.ruleType, period: rule.period },
      });
    } else if (rule.ruleType === "period_cap") {
      const periodLabel = rule.period === "daily" ? "Daily" : rule.period === "weekly" ? "Weekly" : "Monthly";
      budgets.push({
        id: rule.id,
        ownerId,
        name: `${periodLabel} spending cap`,
        category: "__period__",
        account,
        limit: rule.threshold,
        memberIds,
        ruleRef: { ruleType: rule.ruleType, period: rule.period },
      });
    }
  }
}

function txMatchesBudgetPeriod(tx: Transaction, period: BudgetRule["period"]): boolean {
  const today = dayjs();
  const d = dayjs(tx.date);
  if (period === "daily") return tx.date === today.format("YYYY-MM-DD");
  if (period === "weekly") return d.isoWeek() === today.isoWeek() && d.year() === today.year();
  return d.month() === today.month() && d.year() === today.year();
}

function scopedForRule(transactions: Transaction[], rule: BudgetRule | undefined): Transaction[] {
  if (!rule || !rule.scope) return transactions;
  return transactions.filter((tx) => tx.scope === rule.scope);
}

function spentAndPctForBudget(
  b: BudgetResource,
  transactions: Transaction[],
  rules: BudgetRule[],
): { spent: number; pct: number } {
  const rule = rules.find((r) => r.id === b.id);
  if (b.ruleRef?.ruleType === "period_cap" && rule) {
    const scoped = scopedForRule(transactions, rule);
    const periodTxs = scoped.filter((tx) => txMatchesBudgetPeriod(tx, rule.period));
    const spent = periodTxs.reduce((sum, tx) => sum + tx.amount, 0);
    return { spent: Number(spent.toFixed(2)), pct: b.limit > 0 ? (spent / b.limit) * 100 : 0 };
  }
  if (b.ruleRef?.ruleType === "category_cap" && rule?.category) {
    const scoped = scopedForRule(transactions, rule);
    const periodTxs = scoped.filter(
      (tx) => txMatchesBudgetPeriod(tx, rule.period) && tx.category === rule.category,
    );
    const spent = periodTxs.reduce((sum, tx) => sum + tx.amount, 0);
    return { spent: Number(spent.toFixed(2)), pct: b.limit > 0 ? (spent / b.limit) * 100 : 0 };
  }
  const monthTxs = transactions.filter(
    (tx) => tx.scope === b.account && txMatchesBudgetPeriod(tx, "monthly") && tx.category === b.category,
  );
  const spent = monthTxs.reduce((sum, tx) => sum + tx.amount, 0);
  return { spent: Number(spent.toFixed(2)), pct: b.limit > 0 ? (spent / b.limit) * 100 : 0 };
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

function buildInsightsPayload(transactions: Transaction[], rules: BudgetRule[]) {
  const recurring = detectRecurringGroups(transactions);
  const alerts = evaluateAlerts(transactions, rules, recurring);
  const summary = computeSummary(transactions);
  const now = new Date();
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const monthPct = (daysElapsed / monthDays) * 100;
  const monthlyLimits = rules.filter((rule) => rule.period === "monthly").reduce((sum, rule) => sum + rule.threshold, 0);
  const remainingBudget = Math.max(0, monthlyLimits - summary.monthlyTotal);
  const daysRemaining = Math.max(1, monthDays - daysElapsed);
  const safeToSpendDaily = remainingBudget / daysRemaining;
  const byCategory = Object.entries(summary.perCategoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const byAccount = (Object.entries(summary.byScope) as Array<[Scope, number]>).map(([account, amount]) => ({ account, amount }));

  const pacingBudgets: Array<{
    budget_id: string;
    name: string;
    status: "on_track" | "slightly_fast" | "fast" | "over" | "under";
    used_pct: number;
    over_amount: number;
  }> = [];

  for (const rule of rules.filter((r) => r.enabled)) {
    if (rule.ruleType === "category_cap" && rule.category) {
      const scoped = scopedForRule(transactions, rule);
      const periodTxs = scoped.filter((tx) => txMatchesBudgetPeriod(tx, rule.period));
      const spent = periodTxs.filter((tx) => tx.category === rule.category).reduce((sum, tx) => sum + tx.amount, 0);
      const usedPct = rule.threshold > 0 ? (spent / rule.threshold) * 100 : 0;
      const delta = usedPct - monthPct;
      const status = delta > 25 ? "over" : delta > 10 ? "fast" : delta > 4 ? "slightly_fast" : delta < -8 ? "under" : "on_track";
      pacingBudgets.push({
        budget_id: rule.id,
        name: rule.category,
        status,
        used_pct: Number(usedPct.toFixed(2)),
        over_amount: status === "over" ? Number((spent - rule.threshold).toFixed(2)) : 0,
      });
    }
    if (rule.ruleType === "period_cap") {
      const scoped = scopedForRule(transactions, rule);
      const periodTxs = scoped.filter((tx) => txMatchesBudgetPeriod(tx, rule.period));
      const spent = periodTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const usedPct = rule.threshold > 0 ? (spent / rule.threshold) * 100 : 0;
      const delta = usedPct - monthPct;
      const status = delta > 25 ? "over" : delta > 10 ? "fast" : delta > 4 ? "slightly_fast" : delta < -8 ? "under" : "on_track";
      const periodLabel = rule.period === "daily" ? "Daily" : rule.period === "weekly" ? "Weekly" : "Monthly";
      pacingBudgets.push({
        budget_id: rule.id,
        name: `${periodLabel} total`,
        status,
        used_pct: Number(usedPct.toFixed(2)),
        over_amount: status === "over" ? Number((spent - rule.threshold).toFixed(2)) : 0,
      });
    }
    if (rule.ruleType === "category_percentage" && rule.category) {
      const scoped = scopedForRule(transactions, rule);
      const periodTxs = scoped.filter((tx) => txMatchesBudgetPeriod(tx, rule.period));
      const periodAmount = periodTxs.reduce((sum, tx) => sum + tx.amount, 0);
      if (periodAmount > 0) {
        const categoryAmount = periodTxs
          .filter((tx) => tx.category === rule.category)
          .reduce((sum, tx) => sum + tx.amount, 0);
        const ratio = (categoryAmount / periodAmount) * 100;
        const usedPct = ratio;
        const delta = usedPct - monthPct;
        const status = delta > 25 ? "over" : delta > 10 ? "fast" : delta > 4 ? "slightly_fast" : delta < -8 ? "under" : "on_track";
        pacingBudgets.push({
          budget_id: rule.id,
          name: `${rule.category} % of spend`,
          status,
          used_pct: Number(usedPct.toFixed(2)),
          over_amount: 0,
        });
      }
    }
  }

  return {
    alerts,
    recurring,
    summary,
    monthPct,
    daysRemaining,
    remainingBudget,
    safeToSpendDaily,
    byCategory,
    byAccount,
    pacingBudgets,
  };
}

export const app = express();

/** Helmet default interop: TS 6 + NodeNext types `default` as the module object; assert via `unknown` (TS2352). */
const helmet = helmetModule.default as unknown as (options?: Readonly<HelmetOptions>) => RequestHandler;
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use((req, res, next) => {
  const requestId = req.get("x-request-id")?.trim() || randomUUID();
  res.setHeader("x-request-id", requestId);
  res.locals.requestId = requestId;
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      callback(null, originAllowed(origin));
    },
  }),
);

const bulkImportRouter = express.Router();
const bulkImportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});
bulkImportRouter.use(bulkImportLimiter);
bulkImportRouter.use(express.json({ limit: "5mb" }));

bulkImportRouter.post("/preview", (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const format = req.body?.format === "json" ? "json" : "csv";
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  const columnMap = (req.body?.columnMap ?? null) as BulkColumnMap | null;
  if (!text.trim()) {
    return res.status(400).json({ error: "text is required (raw file contents)" });
  }
  try {
    const out = previewBulkImport({ format, text, columnMap });
    return res.json(out);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Preview failed" });
  }
});

bulkImportRouter.post("/apply", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const mode = req.body?.mode === "replace" ? "replace" : "append";
  const skipDuplicates = Boolean(req.body?.skipDuplicates);
  const rawRows = Array.isArray(req.body?.transactions) ? req.body.transactions : [];

  const validated: Array<{
    date: string;
    amount: number;
    category: string;
    description: string;
    scope: Scope;
    notes?: string;
  }> = [];

  for (const row of rawRows) {
    const parsed = transactionSchema.safeParse(row);
    if (parsed.success) validated.push(parsed.data);
  }

  if (validated.length === 0) {
    return res.status(400).json({ error: "No valid transactions to import" });
  }

  let toWrite = validated;
  let skippedDuplicates = 0;
  if (skipDuplicates) {
    const existing = await listTransactions();
    const seen = new Set(
      existing.map((tx) =>
        `${tx.date}|${Number(tx.amount).toFixed(2)}|${normalizeMerchant(tx.description)}`,
      ),
    );
    const before = toWrite.length;
    toWrite = toWrite.filter(
      (tx) => !seen.has(`${tx.date}|${Number(tx.amount).toFixed(2)}|${normalizeMerchant(tx.description)}`),
    );
    skippedDuplicates = before - toWrite.length;
  }

  if (mode === "replace") {
    await replaceTransactions(
      toWrite.map((tx) => ({
        ...tx,
        normalizedMerchant: normalizeMerchant(tx.description),
      })),
    );
  } else {
    await appendTransactions(
      toWrite.map((tx) => ({
        ...tx,
        normalizedMerchant: normalizeMerchant(tx.description),
      })),
    );
  }

  const uniqueCats = [...new Set(toWrite.map((tx) => tx.category))];
  for (const c of uniqueCats) {
    await addCategory(c);
  }

  return res.json({
    ok: true,
    mode,
    imported: toWrite.length,
    skipped_duplicates: skippedDuplicates,
  });
});

app.use("/api/bulk-import", bulkImportRouter);

app.use(express.json({ limit: "1mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});
const shareLimiter = slowDown({
  windowMs: 5 * 60 * 1000,
  delayAfter: 10,
  delayMs: () => 250,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/shares", shareLimiter);

app.get("/health", (_req, res) => {
  const { storageMode, emergentV2Enabled, authEnforced, v2ContractsEnabled } = getEnv();
  const ready = isDatabaseReady();
  res.status(ready ? 200 : 503).json({
    ok: ready,
    storageMode,
    flags: { emergentV2Enabled, authEnforced, v2ContractsEnabled },
    requestId: res.locals.requestId,
  });
});

app.get("/api/bootstrap", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
  const payload = await buildBootstrapPayload();
  res.json(payload);
});

app.post("/api/auth/register", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!name || !email || password.length < 8) {
    return res.status(400).json({ detail: "name, email, and password (>=8 chars) are required" });
  }
  if (users.some((entry) => entry.email === email)) {
    return res.status(409).json({ detail: "Email already registered" });
  }

  const created: AuthUser = {
    id: randomUUID(),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    onboarded: false,
    monthlyIncome: 0,
    primaryUse: "mixed",
  };
  users.push(created);
  const token = createAuthToken(created);
  return res.status(201).json({
    token,
    user: {
      id: created.id,
      name: created.name,
      email: created.email,
      onboarded: created.onboarded,
      monthly_income: created.monthlyIncome,
      primary_use: created.primaryUse,
    },
  });
});

app.post("/api/auth/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const user = users.find((entry) => entry.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ detail: "Invalid credentials" });
  }
  const token = createAuthToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      onboarded: user.onboarded,
      monthly_income: user.monthlyIncome,
      primary_use: user.primaryUse,
    },
  });
});

app.get("/api/auth/me", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    onboarded: user.onboarded,
    monthly_income: user.monthlyIncome,
    primary_use: user.primaryUse,
  });
});

app.post("/api/onboarding/complete", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const monthlyIncome = typeof req.body?.monthly_income === "number" ? req.body.monthly_income : user.monthlyIncome;
  const primaryUse =
    req.body?.primary_use === "personal" || req.body?.primary_use === "freelancer" || req.body?.primary_use === "mixed"
      ? req.body.primary_use
      : user.primaryUse;
  user.onboarded = true;
  user.monthlyIncome = Number.isFinite(monthlyIncome) ? Math.max(0, monthlyIncome) : user.monthlyIncome;
  user.primaryUse = primaryUse;
  return res.json({ ok: true, onboarded: true, monthly_income: user.monthlyIncome, primary_use: user.primaryUse });
});

app.post("/api/transactions", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const tx = await createTransaction({
    ...parsed.data,
    normalizedMerchant: normalizeMerchant(parsed.data.description),
  });
  return res.status(201).json(tx);
});

app.get("/api/transactions", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const filters = parseTransactionFilters(req.query as Record<string, unknown>);
  const transactions = await listTransactions(filters);

  if (filters.recurringOnly) {
    const recurring = detectRecurringGroups(transactions);
    const recurringKeys = new Set(recurring.map((item) => `${item.scope}:${item.normalizedMerchant}`));
    return res.json(transactions.filter((tx) => recurringKeys.has(`${tx.scope}:${tx.normalizedMerchant}`)));
  }

  const limit = Number(req.query.limit);
  if (Number.isFinite(limit) && limit > 0) {
    return res.json(transactions.slice(0, limit));
  }
  return res.json(transactions);
});

app.get("/api/transactions/count", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
  res.json({ count: await countTransactions() });
});

app.delete("/api/transactions/:id", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const deleted = await deleteTransaction(req.params.id);
  if (!deleted) return res.status(404).json({ detail: "Transaction not found" });
  return res.json({ ok: true });
});

app.get("/api/transactions/recents", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const tx = await listTransactions();
  const recents = buildRecentEntryHelpers(tx).recentDescriptions.map((merchant) => {
    const match = tx.find((item) => item.description === merchant);
    return {
      merchant,
      typical_amount: match?.amount ?? 0,
      category: match?.category ?? "Uncategorized",
      account: match?.scope ?? "personal",
    };
  });
  return res.json(recents.slice(0, 6));
});

app.get("/api/transactions/usual", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const merchant = typeof req.query.merchant === "string" ? req.query.merchant.trim() : "";
  if (!merchant) return res.json({ typical: 0, count: 0 });
  const tx = await listTransactions();
  const matches = tx.filter((item) => item.description.toLowerCase() === merchant.toLowerCase());
  if (matches.length === 0) return res.json({ typical: 0, count: 0 });
  const typical = matches.reduce((sum, item) => sum + item.amount, 0) / matches.length;
  return res.json({
    typical: Number(typical.toFixed(2)),
    count: matches.length,
    category: matches[0]?.category,
  });
});

app.post("/api/parse-transaction", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ detail: "text is required" });

  const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)/);
  const amount = amountMatch ? Number(amountMatch[1]) : undefined;
  const merchant = text.replace(/(\d+(?:\.\d{1,2})?)/, "").trim() || text;
  const tx = await listTransactions();
  const suggested = suggestCategoryFromHistory(merchant, tx);
  return res.json({
    merchant,
    amount,
    category: suggested.category,
    note: "",
    suggestions: [suggested.category],
    source: suggested.source,
    confidence: suggested.confidence,
  });
});

app.post("/api/suggest-category", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const merchant = typeof req.body?.merchant === "string" ? req.body.merchant : "";
  const note = typeof req.body?.note === "string" ? req.body.note : "";
  const tx = await listTransactions();
  const suggested = suggestCategoryFromHistory(`${merchant} ${note}`.trim(), tx);
  return res.json({
    suggestions: [suggested.category],
    category: suggested.category,
    source: suggested.source,
    confidence: suggested.confidence,
  });
});

app.post("/api/rules", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const parsed = budgetRuleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const rule = await createRule(parsed.data);
  return res.status(201).json(rule);
});

app.get("/api/rules", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
  res.json(await listRules());
});

app.get("/api/budgets", async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const [visible, transactions, rules] = await Promise.all([
    Promise.resolve(budgets.filter((item) => item.memberIds.includes(user.id))),
    listTransactions(),
    listRules(),
  ]);
  res.json(
    visible.map((item) => {
      const { spent, pct } = spentAndPctForBudget(item, transactions, rules);
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        account: item.account,
        limit: item.limit,
        spent,
        pct: Math.min(200, Number(pct.toFixed(2))),
        is_owner: item.ownerId === user.id,
        is_shared: item.memberIds.length > 1 || Boolean(item.shareToken),
        member_count: item.memberIds.length,
        share_token: item.ownerId === user.id ? item.shareToken ?? null : null,
      };
    }),
  );
});

app.post("/api/budgets", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
  const account = req.body?.account === "business" ? "business" : "personal";
  const limit = typeof req.body?.limit === "number" ? req.body.limit : 0;
  if (!name || !category || limit <= 0) return res.status(400).json({ detail: "name, category, and positive limit are required" });
  const created: BudgetResource = {
    id: randomUUID(),
    ownerId: user.id,
    name,
    category,
    account,
    limit,
    memberIds: [user.id],
  };
  budgets.unshift(created);
  res.status(201).json(created);
});

app.delete("/api/budgets/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const index = budgets.findIndex((entry) => entry.id === req.params.id);
  if (index < 0) return res.status(404).json({ detail: "Budget not found" });
  const budget = budgets[index];
  if (budget.ownerId === user.id) {
    if (budget.shareToken) shareIndex.delete(budget.shareToken);
    budgets.splice(index, 1);
    return res.json({ ok: true });
  }
  if (!budget.memberIds.includes(user.id)) return res.status(404).json({ detail: "Budget not found" });
  budget.memberIds = budget.memberIds.filter((entry) => entry !== user.id);
  return res.json({ ok: true });
});

app.post("/api/budgets/:id/share", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const budget = budgets.find((entry) => entry.id === req.params.id && entry.ownerId === user.id);
  if (!budget) return res.status(404).json({ detail: "Budget not found" });
  if (!budget.shareToken) {
    budget.shareToken = randomUUID().replace(/-/g, "");
    shareIndex.set(budget.shareToken, { kind: "budget", resourceId: budget.id, ownerId: user.id });
  }
  res.json({ token: budget.shareToken });
});

app.delete("/api/budgets/:id/share", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const budget = budgets.find((entry) => entry.id === req.params.id && entry.ownerId === user.id);
  if (!budget) return res.status(404).json({ detail: "Budget not found" });
  if (budget.shareToken) shareIndex.delete(budget.shareToken);
  budget.shareToken = undefined;
  budget.memberIds = [user.id];
  res.json({ ok: true });
});

app.get("/api/categories", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
  res.json(await listCategories());
});

app.post("/api/categories", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.status(201).json(await addCategory(parsed.data.name));
});

app.get("/api/goals", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const visible = goals.filter((item) => item.memberIds.includes(user.id));
  res.json(
    visible.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      target_amount: item.targetAmount,
      current_amount: item.currentAmount,
      monthly_contribution: item.monthlyContribution,
      is_owner: item.ownerId === user.id,
      is_shared: item.memberIds.length > 1 || Boolean(item.shareToken),
      member_count: item.memberIds.length,
      share_token: item.ownerId === user.id ? item.shareToken ?? null : null,
    })),
  );
});

app.post("/api/goals", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const kind = typeof req.body?.kind === "string" ? req.body.kind : "savings";
  const targetAmount = typeof req.body?.target_amount === "number" ? req.body.target_amount : 0;
  const currentAmount = typeof req.body?.current_amount === "number" ? req.body.current_amount : 0;
  const monthlyContribution = typeof req.body?.monthly_contribution === "number" ? req.body.monthly_contribution : 0;
  if (!name || targetAmount <= 0) return res.status(400).json({ detail: "name and positive target_amount are required" });
  const created: GoalResource = {
    id: randomUUID(),
    ownerId: user.id,
    name,
    kind,
    targetAmount,
    currentAmount: Math.max(0, currentAmount),
    monthlyContribution: Math.max(0, monthlyContribution),
    memberIds: [user.id],
  };
  goals.unshift(created);
  res.status(201).json(created);
});

app.patch("/api/goals/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const goal = goals.find((entry) => entry.id === req.params.id && entry.ownerId === user.id);
  if (!goal) return res.status(404).json({ detail: "Goal not found" });
  if (typeof req.body?.name === "string") goal.name = req.body.name.trim() || goal.name;
  if (typeof req.body?.kind === "string") goal.kind = req.body.kind;
  if (typeof req.body?.target_amount === "number" && req.body.target_amount > 0) goal.targetAmount = req.body.target_amount;
  if (typeof req.body?.current_amount === "number") goal.currentAmount = Math.max(0, req.body.current_amount);
  if (typeof req.body?.monthly_contribution === "number") goal.monthlyContribution = Math.max(0, req.body.monthly_contribution);
  res.json({ ok: true, goal });
});

app.delete("/api/goals/:id", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const index = goals.findIndex((entry) => entry.id === req.params.id);
  if (index < 0) return res.status(404).json({ detail: "Goal not found" });
  const goal = goals[index];
  if (goal.ownerId === user.id) {
    if (goal.shareToken) shareIndex.delete(goal.shareToken);
    goals.splice(index, 1);
    return res.json({ ok: true });
  }
  if (!goal.memberIds.includes(user.id)) return res.status(404).json({ detail: "Goal not found" });
  goal.memberIds = goal.memberIds.filter((entry) => entry !== user.id);
  res.json({ ok: true });
});

app.post("/api/goals/:id/contribute", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const goal = goals.find((entry) => entry.id === req.params.id && entry.memberIds.includes(user.id));
  if (!goal) return res.status(404).json({ detail: "Goal not found" });
  const amount = typeof req.body?.amount === "number" ? req.body.amount : 0;
  if (amount === 0) return res.status(400).json({ detail: "amount cannot be 0" });
  goal.currentAmount = Math.max(0, goal.currentAmount + amount);
  res.json({ ok: true, current_amount: goal.currentAmount });
});

app.post("/api/goals/:id/leave", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const goal = goals.find((entry) => entry.id === req.params.id);
  if (!goal || !goal.memberIds.includes(user.id)) return res.status(404).json({ detail: "Goal not found" });
  if (goal.ownerId === user.id) return res.status(400).json({ detail: "Owner cannot leave own goal" });
  goal.memberIds = goal.memberIds.filter((entry) => entry !== user.id);
  res.json({ ok: true });
});

app.post("/api/goals/:id/share", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const goal = goals.find((entry) => entry.id === req.params.id && entry.ownerId === user.id);
  if (!goal) return res.status(404).json({ detail: "Goal not found" });
  if (!goal.shareToken) {
    goal.shareToken = randomUUID().replace(/-/g, "");
    shareIndex.set(goal.shareToken, { kind: "goal", resourceId: goal.id, ownerId: user.id });
  }
  res.json({ token: goal.shareToken });
});

app.delete("/api/goals/:id/share", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const goal = goals.find((entry) => entry.id === req.params.id && entry.ownerId === user.id);
  if (!goal) return res.status(404).json({ detail: "Goal not found" });
  if (goal.shareToken) shareIndex.delete(goal.shareToken);
  goal.shareToken = undefined;
  goal.memberIds = [user.id];
  res.json({ ok: true });
});

app.get("/api/shares/:token", (req, res) => {
  const token = req.params.token;
  const entry = shareIndex.get(token);
  if (!entry) return res.status(404).json({ detail: "Share not found" });
  const owner = users.find((candidate) => candidate.id === entry.ownerId);
  if (entry.kind === "goal") {
    const goal = goals.find((candidate) => candidate.id === entry.resourceId);
    if (!goal) return res.status(404).json({ detail: "Share not found" });
    return res.json({
      kind: "goal",
      name: goal.name,
      owner_name: owner?.name ?? "Owner",
      member_count: goal.memberIds.length,
      kind_tag: goal.kind,
      current_amount: goal.currentAmount,
      target_amount: goal.targetAmount,
      already_member: false,
    });
  }
  const budget = budgets.find((candidate) => candidate.id === entry.resourceId);
  if (!budget) return res.status(404).json({ detail: "Share not found" });
  return res.json({
    kind: "budget",
    name: budget.name,
    owner_name: owner?.name ?? "Owner",
    member_count: budget.memberIds.length,
    category: budget.category,
    limit: budget.limit,
    already_member: false,
  });
});

app.post("/api/shares/:token/join", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const token = req.params.token;
  const entry = shareIndex.get(token);
  if (!entry) return res.status(404).json({ detail: "Share not found" });
  if (entry.kind === "goal") {
    const goal = goals.find((candidate) => candidate.id === entry.resourceId);
    if (!goal) return res.status(404).json({ detail: "Share not found" });
    if (!goal.memberIds.includes(user.id)) goal.memberIds.push(user.id);
    return res.json({ ok: true, kind: "goal" });
  }
  const budget = budgets.find((candidate) => candidate.id === entry.resourceId);
  if (!budget) return res.status(404).json({ detail: "Share not found" });
  if (!budget.memberIds.includes(user.id)) budget.memberIds.push(user.id);
  return res.json({ ok: true, kind: "budget" });
});

app.get("/api/preferences/dashboard", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  res.json(dashboardPrefs.get(user.id) ?? { widgets: [] });
});

app.put("/api/preferences/dashboard", (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  const widgets =
    Array.isArray(req.body?.widgets)
      ? req.body.widgets
          .filter((entry: unknown) => typeof entry === "object" && entry !== null)
          .map((entry: unknown) => {
            const widget = entry as { id?: unknown; size?: unknown };
            return {
              id: typeof widget.id === "string" ? widget.id : "",
              size: widget.size === "s" || widget.size === "m" || widget.size === "l" ? widget.size : "m",
            };
          })
          .filter((entry: { id: string; size: "s" | "m" | "l" }) => entry.id.length > 0)
      : [];
  const payload = { widgets };
  dashboardPrefs.set(user.id, payload);
  res.json(payload);
});

app.get("/api/summary", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
  res.json(computeSummary(await listTransactions()));
});

app.get("/api/alerts", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
  const [transactions, rules] = await Promise.all([listTransactions(), listRules()]);
  const recurring = detectRecurringGroups(transactions);
  res.json(
    evaluateAlerts(transactions, rules, recurring).map((alert) => ({
      ...alert,
      acknowledged: acknowledgedAlertIds.has(alert.id),
      category: "all",
      account: "all",
    })),
  );
});

app.post("/api/alerts/:id/ack", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  acknowledgedAlertIds.add(req.params.id);
  res.json({ ok: true, id: req.params.id });
});

app.get("/api/recurring", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
  res.json(detectRecurringGroups(await listTransactions()));
});

app.get("/api/insights", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
  const [transactions, rules] = await Promise.all([listTransactions(), listRules()]);
  const model = buildInsightsPayload(transactions, rules);
  const today = dayjs();
  const txnCountThisMonth = transactions.filter(
    (tx) => dayjs(tx.date).month() === today.month() && dayjs(tx.date).year() === today.year(),
  ).length;
  res.json({
    txn_count_this_month: txnCountThisMonth,
    total_transactions: transactions.length,
    income_this_month: 0,
    expense_this_month: Number(model.summary.monthlyTotal.toFixed(2)),
    mom_pct: 0,
    safe_to_spend_daily: Number(model.safeToSpendDaily.toFixed(2)),
    days_remaining: model.daysRemaining,
    remaining_budget: Number(model.remainingBudget.toFixed(2)),
    daily_series: model.summary.trend30Days.map((item) => ({ date: item.date, amount: item.amount })),
    by_category: Array.isArray(model.byCategory) ? model.byCategory : [],
    by_account: Array.isArray(model.byAccount) ? model.byAccount : [],
  });
});

app.get("/api/insights/headline", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const [transactions, rules] = await Promise.all([listTransactions(), listRules()]);
  const model = buildInsightsPayload(transactions, rules);
  const top = model.summary.top3Categories[0];
  if (!top) {
    return res.json({ headline: null, drill_down: [], action: null });
  }
  const today = dayjs();
  const spentThisMonth = transactions
    .filter(
      (tx) =>
        tx.category === top.category &&
        dayjs(tx.date).month() === today.month() &&
        dayjs(tx.date).year() === today.year(),
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
  const byMerchant = transactions
    .filter((tx) => tx.category === top.category)
    .reduce<Record<string, number>>((acc, tx) => {
      acc[tx.description] = (acc[tx.description] ?? 0) + tx.amount;
      return acc;
    }, {});
  const drillDown = Object.entries(byMerchant)
    .map(([merchant, amount]) => ({ merchant, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const thisMonthLabel = spentThisMonth > 0.001;
  return res.json({
    headline: {
      title: thisMonthLabel
        ? `${top.category} is your highest category this month`
        : `${top.category} is your largest category in loaded data`,
      detail: thisMonthLabel
        ? `You've spent HK$ ${spentThisMonth.toFixed(0)} on ${top.category} this month.`
        : `HK$ ${top.amount.toFixed(0)} total on ${top.category} in the ledger (nothing in the current calendar month yet).`,
      tone: model.alerts.some((alert) => alert.severity !== "info") ? "warning" : "info",
    },
    drill_down: drillDown,
    action: {
      label: `Review ${top.category} transactions`,
      cta: "Review transactions",
      link: `/transactions?category=${encodeURIComponent(top.category)}`,
    },
  });
});

app.get("/api/insights/pacing", async (req, res) => {
  const auth = maybeRequireAuth(req, res);
  if (auth.required && !auth.user) return;
  const [transactions, rules] = await Promise.all([listTransactions(), listRules()]);
  const model = buildInsightsPayload(transactions, rules);
  return res.json({
    month_pct: Number(model.monthPct.toFixed(2)),
    budgets: model.pacingBudgets,
  });
});

app.get("/api/export", async (_req, res) => {
  const auth = maybeRequireAuth(_req, res);
  if (auth.required && !auth.user) return;
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

app.post("/api/demo/clear", async (req, res) => {
  if (!requireProtectedMutationAccess(req, res)) return;
  await replaceStore({ transactions: [], rules: [], categories: [...DEFAULT_CATEGORIES] });
  await refreshBudgetsFromRules();
  goals.splice(0, goals.length);
  acknowledgedAlertIds.clear();
  shareIndex.clear();
  dashboardPrefs.clear();
  res.json({ ok: true });
});

app.get("/api/demo/scenarios", (_req, res) => {
  const labels: Record<string, string> = {
    "food-cap": "Food daily cap (HK$50)",
    "transport-budget": "Transport-heavy month (total + Transport caps on Budgets)",
    "subscription-creep": "Subscription share",
    "merchant-memory": "Merchant repeat + suggestion",
    "freelancer-month": "Freelancer month (budgets + alerts + recurring + goals)",
    "household-side-hustle": "Household + side hustle (scopes + goals)",
  };
  res.json({
    scenarios: DEMO_SCENARIO_IDS.map((id) => ({ id, label: labels[id] ?? id })),
  });
});

/** Shift all scenario transaction dates so the newest row lands on `targetLast` (preserves gaps). Rules unchanged. */
function alignScenarioFileDatesForDemoLoad(body: unknown, targetLast: string): unknown {
  if (!body || typeof body !== "object") return body;
  const record = body as { transactions?: Array<{ date?: unknown } & Record<string, unknown>> };
  const txs = Array.isArray(record.transactions) ? record.transactions : [];
  if (txs.length === 0) return body;
  const dates = txs
    .map((t) => (typeof t.date === "string" ? t.date : ""))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (dates.length === 0) return body;
  const max = dates.reduce((m, d) => (d > m ? d : m), dates[0]);
  const shiftDays = dayjs(targetLast).diff(dayjs(max), "day");
  if (shiftDays === 0) return body;
  return {
    ...record,
    transactions: txs.map((t) => {
      if (typeof t.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return t;
      return { ...t, date: dayjs(t.date).add(shiftDays, "day").format("YYYY-MM-DD") };
    }),
  };
}

function clearGoalShareTokens(): void {
  for (const [token, meta] of [...shareIndex.entries()]) {
    if (meta.kind === "goal") shareIndex.delete(token);
  }
}

function seedDemoGoalsForScenario(scenarioId: string): void {
  const ownerId = users[0]?.id ?? "demo-user";
  const memberIds = users.length > 0 ? users.map((u) => u.id) : [ownerId];
  if (scenarioId === "freelancer-month") {
    goals.push(
      {
        id: randomUUID(),
        ownerId,
        name: "Tax reserve (IR56)",
        kind: "savings",
        targetAmount: 12000,
        currentAmount: 3200,
        monthlyContribution: 1500,
        memberIds,
      },
      {
        id: randomUUID(),
        ownerId,
        name: "New laptop fund",
        kind: "savings",
        targetAmount: 15000,
        currentAmount: 2800,
        monthlyContribution: 800,
        memberIds,
      },
    );
    return;
  }
  if (scenarioId === "household-side-hustle") {
    goals.push(
      {
        id: randomUUID(),
        ownerId,
        name: "Japan trip (household)",
        kind: "savings",
        targetAmount: 45000,
        currentAmount: 12800,
        monthlyContribution: 3500,
        memberIds,
      },
      {
        id: randomUUID(),
        ownerId,
        name: "Business equipment cushion",
        kind: "savings",
        targetAmount: 25000,
        currentAmount: 9200,
        monthlyContribution: 2200,
        memberIds,
      },
    );
  }
}

app.post("/api/demo/load-scenario", async (req, res) => {
  if (!requireProtectedMutationAccess(req, res)) return;
  const id = typeof req.body?.scenario === "string" ? req.body.scenario.trim() : "";
  if (!DEMO_SCENARIO_IDS.includes(id as (typeof DEMO_SCENARIO_IDS)[number])) {
    return res.status(400).json({ error: "Unknown scenario" });
  }
  try {
    const file = join(process.cwd(), "..", "scenarios", id, "import.json");
    const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
    const targetLast = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const body = alignScenarioFileDatesForDemoLoad(raw, targetLast);
    await importPayload(body);
    acknowledgedAlertIds.clear();
    if (id === "freelancer-month" || id === "household-side-hustle") {
      clearGoalShareTokens();
      goals.splice(0, goals.length);
      seedDemoGoalsForScenario(id);
    }
    res.json({ ok: true, scenario: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load scenario";
    return res.status(500).json({ error: message });
  }
});

app.post("/api/demo/seed", async (req, res) => {
  if (!requireProtectedMutationAccess(req, res)) return;
  const categories = await listCategories();
  const now = new Date().toISOString().slice(0, 10);
  await replaceStore({
    categories,
    rules: [],
    transactions: [
      {
        date: now,
        amount: 58.5,
        category: "Food",
        description: "Cafe lunch",
        normalizedMerchant: normalizeMerchant("Cafe lunch"),
        scope: "personal",
      },
      {
        date: now,
        amount: 120,
        category: "Transport",
        description: "MTR refill",
        normalizedMerchant: normalizeMerchant("MTR refill"),
        scope: "personal",
      },
    ],
  });
  await refreshBudgetsFromRules();
  res.json({ ok: true });
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
  await refreshBudgetsFromRules();
  res.json({ generated: generated.length });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});
