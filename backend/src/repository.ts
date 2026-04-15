import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BudgetRule, Transaction } from "./types.js";

interface DataStore {
  transactions: Transaction[];
  rules: BudgetRule[];
  categories: string[];
}

const dataDir = path.resolve(process.cwd(), "..", "shared", "data");
const dataFile = path.join(dataDir, "store.json");

const defaultStore: DataStore = {
  transactions: [],
  rules: [],
  categories: ["Meals", "Transport", "Subscription", "Shopping", "Uncategorized"],
};

async function ensureStore(): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

export async function loadStore(): Promise<DataStore> {
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
  await ensureStore();
  await writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}
