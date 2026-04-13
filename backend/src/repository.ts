import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose, { Schema } from "mongoose";
import { BudgetRule, Transaction } from "./types.js";

interface DataStore {
  transactions: Transaction[];
  rules: BudgetRule[];
  categories: string[];
}

const defaultStore: DataStore = {
  transactions: [],
  rules: [],
  categories: ["Meals", "Transport", "Subscription", "Shopping", "Uncategorized"],
};

const singletonStoreKey = "singleton";
let mongoConnectPromise: Promise<typeof mongoose> | null = null;

const transactionSchema = new Schema<Transaction>(
  {
    id: { type: String, required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    notes: { type: String, required: false },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const budgetRuleSchema = new Schema<BudgetRule>(
  {
    id: { type: String, required: true },
    category: { type: String, required: false },
    period: { type: String, required: true },
    threshold: { type: Number, required: true },
    ruleType: { type: String, required: true },
    enabled: { type: Boolean, required: true },
  },
  { _id: false }
);

const storeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    transactions: { type: [transactionSchema], default: [] },
    rules: { type: [budgetRuleSchema], default: [] },
    categories: { type: [String], default: defaultStore.categories },
  },
  { versionKey: false }
);

const StoreModel = mongoose.models.Store ?? mongoose.model("Store", storeSchema);

function shouldUseMongoStore(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

async function ensureMongoConnected(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required when MongoDB storage is enabled");
  }
  if (!mongoConnectPromise) {
    mongoConnectPromise = mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB,
    });
  }
  try {
    await mongoConnectPromise;
  } catch (error) {
    mongoConnectPromise = null;
    throw error;
  }
}

async function ensureMongoStore(): Promise<void> {
  await ensureMongoConnected();
  const existing = await StoreModel.findOne({ key: singletonStoreKey }).lean().exec();
  if (!existing) {
    await StoreModel.create({
      key: singletonStoreKey,
      ...defaultStore,
    });
  }
}

function resolveDataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return "/tmp/financial-assistant-data";
  if (process.env.RENDER) return "/tmp/financial-assistant-data";
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) return "/tmp/financial-assistant-data";
  return path.resolve(process.cwd(), "..", "shared", "data");
}

const dataDir = resolveDataDir();
const dataFile = path.join(dataDir, "store.json");

async function ensureStore(): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

export async function loadStore(): Promise<DataStore> {
  if (shouldUseMongoStore()) {
    await ensureMongoStore();
    const doc = await StoreModel.findOne({ key: singletonStoreKey }).lean().exec();
    return {
      transactions: doc?.transactions ?? [],
      rules: doc?.rules ?? [],
      categories: doc?.categories?.length ? doc.categories : defaultStore.categories,
    };
  }

  await ensureStore();
  const raw = await readFile(dataFile, "utf8");
  try {
    const parsed = JSON.parse(raw) as DataStore;
    return {
      transactions: parsed.transactions ?? [],
      rules: parsed.rules ?? [],
      categories: parsed.categories ?? defaultStore.categories,
    };
  } catch {
    return defaultStore;
  }
}

export async function saveStore(store: DataStore): Promise<void> {
  if (shouldUseMongoStore()) {
    await ensureMongoStore();
    await StoreModel.updateOne(
      { key: singletonStoreKey },
      {
        $set: {
          transactions: store.transactions,
          rules: store.rules,
          categories: store.categories?.length ? store.categories : defaultStore.categories,
        },
      },
      { upsert: true }
    ).exec();
    return;
  }

  await ensureStore();
  await writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}
