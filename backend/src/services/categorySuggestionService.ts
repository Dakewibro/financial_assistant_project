import { normalizeMerchant } from "../utils/normalizeMerchant.js";
import type { MerchantCategoryHint, RecentEntryHelpers, Transaction } from "../types.js";

const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["uber", "taxi", "mtr", "train", "bus", "transport"], category: "Transport" },
  { keywords: ["netflix", "spotify", "adobe", "icloud", "stream", "subscription"], category: "Subscription" },
  { keywords: ["coffee", "restaurant", "food", "meal", "dinner", "lunch", "breakfast", "grabfood"], category: "Food" },
  { keywords: ["office", "software", "client", "domain", "hosting", "business"], category: "Business Expense" },
  { keywords: ["bill", "utility", "electric", "water", "internet"], category: "Bills" },
  { keywords: ["shop", "mart", "mall", "amazon"], category: "Shopping" },
];

function toFrequencyMap(transactions: Transaction[], normalizedMerchant: string): Map<string, number> {
  return transactions.reduce((acc, tx) => {
    if (tx.normalizedMerchant !== normalizedMerchant) return acc;
    acc.set(tx.category, (acc.get(tx.category) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
}

export function suggestCategory(
  description: string,
  transactions: Transaction[],
): { category: string; source: "history" | "keyword" | "default"; confidence: "high" | "medium" | "low" } {
  const normalizedMerchant = normalizeMerchant(description);
  const frequencyMap = toFrequencyMap(transactions, normalizedMerchant);

  if (frequencyMap.size > 0) {
    const [category, count] = [...frequencyMap.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      category,
      source: "history",
      confidence: count >= 3 ? "high" : "medium",
    };
  }

  const merchantText = `${description.toLowerCase()} ${normalizedMerchant}`;
  const matchedRule = KEYWORD_RULES.find((rule) => rule.keywords.some((keyword) => merchantText.includes(keyword)));
  if (matchedRule) {
    return {
      category: matchedRule.category,
      source: "keyword",
      confidence: "low",
    };
  }

  return {
    category: "Uncategorized",
    source: "default",
    confidence: "low",
  };
}

export function buildMerchantHints(transactions: Transaction[]): MerchantCategoryHint[] {
  const buckets = new Map<string, MerchantCategoryHint>();

  for (const tx of transactions) {
    const key = `${tx.normalizedMerchant}:${tx.category}`;
    const current = buckets.get(key);
    if (current) {
      current.count += 1;
      continue;
    }

    buckets.set(key, {
      normalizedMerchant: tx.normalizedMerchant,
      description: tx.description,
      category: tx.category,
      count: 1,
    });
  }

  return [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 12);
}

export function buildRecentEntryHelpers(transactions: Transaction[]): RecentEntryHelpers {
  const byRecency = [...transactions].sort((a, b) => {
    const left = new Date(b.updatedAt).getTime();
    const right = new Date(a.updatedAt).getTime();
    return left - right;
  });

  const recentDescriptions = [...new Set(byRecency.map((tx) => tx.description))].slice(0, 8);
  const recentCategories = [...new Set(byRecency.map((tx) => tx.category))].slice(0, 8);
  const lastTransaction = byRecency[0] ?? null;

  return {
    recentDescriptions,
    recentCategories,
    lastTransaction,
    merchantCategoryHints: buildMerchantHints(byRecency),
  };
}
