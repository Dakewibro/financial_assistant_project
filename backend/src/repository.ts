import { randomUUID } from "node:crypto";
import { getEnv } from "./config/env.js";
import { BudgetRuleModel } from "./models/BudgetRule.js";
import { CategoryModel } from "./models/Category.js";
import { TransactionModel } from "./models/Transaction.js";
import { DEFAULT_CATEGORIES, type BudgetRule, type Scope, type Transaction, type TransactionFilters } from "./types.js";

interface MemoryStore {
  transactions: Transaction[];
  rules: BudgetRule[];
  categories: Array<{ name: string; isDefault: boolean }>;
}

const memoryStore: MemoryStore = {
  transactions: [],
  rules: [],
  categories: DEFAULT_CATEGORIES.map((name) => ({ name, isDefault: true })),
};

function toIsoString(value: Date | string | undefined): string {
  if (typeof value === "string") return value;
  return (value ?? new Date()).toISOString();
}

function mapTransactionDocument(doc: {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  normalizedMerchant: string;
  scope: Scope;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}): Transaction {
  return {
    id: doc.id,
    date: doc.date,
    amount: doc.amount,
    category: doc.category,
    description: doc.description,
    normalizedMerchant: doc.normalizedMerchant,
    scope: doc.scope,
    notes: doc.notes,
    createdAt: toIsoString(doc.createdAt),
    updatedAt: toIsoString(doc.updatedAt),
  };
}

function mapBudgetRuleDocument(doc: {
  id: string;
  category?: string;
  period: BudgetRule["period"];
  threshold: number;
  ruleType: BudgetRule["ruleType"];
  enabled: boolean;
  scope?: Scope;
}): BudgetRule {
  return {
    id: doc.id,
    category: doc.category,
    period: doc.period,
    threshold: doc.threshold,
    ruleType: doc.ruleType,
    enabled: doc.enabled,
    scope: doc.scope,
  };
}

function filterTransactionsLocally(transactions: Transaction[], filters: Omit<TransactionFilters, "recurringOnly"> = {}): Transaction[] {
  return transactions.filter((tx) => {
    if (filters.category && filters.category !== "all" && tx.category !== filters.category) return false;
    if (filters.fromDate && tx.date < filters.fromDate) return false;
    if (filters.toDate && tx.date > filters.toDate) return false;
    if (filters.scope && filters.scope !== tx.scope) return false;
    if (filters.search) {
      const haystack = `${tx.description} ${tx.normalizedMerchant} ${tx.category}`.toLowerCase();
      if (!haystack.includes(filters.search.toLowerCase())) return false;
    }
    return true;
  });
}

export async function seedDefaultCategories(): Promise<string[]> {
  const env = getEnv();

  if (env.storageMode === "memory") {
    const existingNames = new Set(memoryStore.categories.map((entry) => entry.name));
    for (const category of DEFAULT_CATEGORIES) {
      if (!existingNames.has(category)) {
        memoryStore.categories.push({ name: category, isDefault: true });
      }
    }
    return memoryStore.categories.map((entry) => entry.name);
  }

  const existing = await CategoryModel.find().lean();
  const existingNames = new Set(existing.map((entry) => entry.name));
  const missing = DEFAULT_CATEGORIES.filter((category) => !existingNames.has(category));
  if (missing.length > 0) {
    await CategoryModel.insertMany(missing.map((name) => ({ name, isDefault: true })));
  }

  const categories = await CategoryModel.find().sort({ isDefault: -1, name: 1 });
  return categories.map((entry) => entry.name);
}

export async function listCategories(): Promise<string[]> {
  await seedDefaultCategories();
  const env = getEnv();

  if (env.storageMode === "memory") {
    const defaults = DEFAULT_CATEGORIES.filter((name) => memoryStore.categories.some((entry) => entry.name === name));
    const extras = memoryStore.categories
      .map((entry) => entry.name)
      .filter((name) => !DEFAULT_CATEGORIES.includes(name as (typeof DEFAULT_CATEGORIES)[number]))
      .sort((a, b) => a.localeCompare(b));
    return [...defaults, ...extras];
  }

  const categories = await CategoryModel.find().sort({ isDefault: -1, name: 1 });
  return categories.map((entry) => entry.name);
}

export async function addCategory(name: string): Promise<string[]> {
  await seedDefaultCategories();
  const trimmed = name.trim();
  if (!trimmed) return listCategories();

  const env = getEnv();
  if (env.storageMode === "memory") {
    const exists = memoryStore.categories.some((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      memoryStore.categories.push({ name: trimmed, isDefault: false });
    }
    return listCategories();
  }

  const existing = await CategoryModel.findOne({ name: new RegExp(`^${trimmed}$`, "i") });
  if (!existing) {
    await CategoryModel.create({ name: trimmed, isDefault: false });
  }
  return listCategories();
}

export async function listTransactions(filters: Omit<TransactionFilters, "recurringOnly"> = {}): Promise<Transaction[]> {
  const env = getEnv();

  if (env.storageMode === "memory") {
    return filterTransactionsLocally(memoryStore.transactions, filters).sort((a, b) => b.date.localeCompare(a.date));
  }

  const query: Record<string, unknown> = {};
  if (filters.category && filters.category !== "all") query.category = filters.category;
  if (filters.scope) query.scope = filters.scope;
  if (filters.fromDate || filters.toDate) {
    query.date = {};
    if (filters.fromDate) Object.assign(query.date as Record<string, string>, { $gte: filters.fromDate });
    if (filters.toDate) Object.assign(query.date as Record<string, string>, { $lte: filters.toDate });
  }
  if (filters.search) {
    query.$or = [
      { description: { $regex: filters.search, $options: "i" } },
      { normalizedMerchant: { $regex: filters.search, $options: "i" } },
      { category: { $regex: filters.search, $options: "i" } },
    ];
  }

  const docs = await TransactionModel.find(query).sort({ date: -1, createdAt: -1 });
  return docs.map((doc) => mapTransactionDocument(doc));
}

export async function createTransaction(
  input: Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string },
): Promise<Transaction> {
  const now = new Date().toISOString();
  const env = getEnv();

  if (env.storageMode === "memory") {
    const transaction: Transaction = {
      id: randomUUID(),
      ...input,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    memoryStore.transactions.unshift(transaction);
    return transaction;
  }

  const doc = await TransactionModel.create({
    date: input.date,
    amount: input.amount,
    category: input.category,
    description: input.description,
    normalizedMerchant: input.normalizedMerchant,
    scope: input.scope,
    notes: input.notes,
  });

  return mapTransactionDocument(doc);
}

export async function replaceTransactions(
  transactions: Array<Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }>,
): Promise<Transaction[]> {
  const env = getEnv();
  const now = new Date().toISOString();

  if (env.storageMode === "memory") {
    memoryStore.transactions = transactions.map((tx) => ({
      ...tx,
      id: randomUUID(),
      createdAt: tx.createdAt ?? now,
      updatedAt: tx.updatedAt ?? now,
    }));
    return [...memoryStore.transactions];
  }

  await TransactionModel.deleteMany({});
  if (transactions.length > 0) {
    await TransactionModel.insertMany(
      transactions.map((tx) => ({
        date: tx.date,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        normalizedMerchant: tx.normalizedMerchant,
        scope: tx.scope,
        notes: tx.notes,
        createdAt: tx.createdAt ? new Date(tx.createdAt) : undefined,
        updatedAt: tx.updatedAt ? new Date(tx.updatedAt) : undefined,
      })),
    );
  }
  return listTransactions();
}

export async function listRules(): Promise<BudgetRule[]> {
  const env = getEnv();

  if (env.storageMode === "memory") {
    return [...memoryStore.rules];
  }

  const docs = await BudgetRuleModel.find().sort({ createdAt: -1 });
  return docs.map((doc) => mapBudgetRuleDocument(doc));
}

export async function createRule(input: Omit<BudgetRule, "id">): Promise<BudgetRule> {
  const env = getEnv();

  if (env.storageMode === "memory") {
    const rule: BudgetRule = { ...input, id: randomUUID() };
    memoryStore.rules.unshift(rule);
    return rule;
  }

  const doc = await BudgetRuleModel.create(input);
  return mapBudgetRuleDocument(doc);
}

export async function replaceRules(rules: Array<Omit<BudgetRule, "id">>): Promise<BudgetRule[]> {
  const env = getEnv();

  if (env.storageMode === "memory") {
    memoryStore.rules = rules.map((rule) => ({ ...rule, id: randomUUID() }));
    return [...memoryStore.rules];
  }

  await BudgetRuleModel.deleteMany({});
  if (rules.length > 0) {
    await BudgetRuleModel.insertMany(rules);
  }
  return listRules();
}

export async function replaceStore(payload: {
  transactions: Array<Omit<Transaction, "id" | "createdAt" | "updatedAt"> & { createdAt?: string; updatedAt?: string }>;
  rules: Array<Omit<BudgetRule, "id">>;
  categories: string[];
}): Promise<void> {
  const env = getEnv();
  const categoryNames = [...new Set([...DEFAULT_CATEGORIES, ...payload.categories])];

  if (env.storageMode === "memory") {
    memoryStore.categories = categoryNames.map((name) => ({
      name,
      isDefault: DEFAULT_CATEGORIES.includes(name as (typeof DEFAULT_CATEGORIES)[number]),
    }));
    await replaceTransactions(payload.transactions);
    await replaceRules(payload.rules);
    return;
  }

  await CategoryModel.deleteMany({});
  if (categoryNames.length > 0) {
    await CategoryModel.insertMany(
      categoryNames.map((name) => ({
        name,
        isDefault: DEFAULT_CATEGORIES.includes(name as (typeof DEFAULT_CATEGORIES)[number]),
      })),
    );
  }
  await replaceTransactions(payload.transactions);
  await replaceRules(payload.rules);
}

export function resetMemoryStore(): void {
  memoryStore.transactions = [];
  memoryStore.rules = [];
  memoryStore.categories = DEFAULT_CATEGORIES.map((name) => ({ name, isDefault: true }));
}
