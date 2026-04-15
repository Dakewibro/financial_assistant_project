import type { MerchantCategoryHint } from "../types/finance";

const NOISE_TOKENS = new Set([
  "payment",
  "purchase",
  "card",
  "ref",
  "reference",
  "hk",
  "hkg",
  "ltd",
  "limited",
  "co",
  "company",
]);

const KEYWORD_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["uber", "taxi", "mtr", "train", "bus", "transport"], category: "Transport" },
  { keywords: ["netflix", "spotify", "adobe", "icloud", "stream", "subscription"], category: "Subscription" },
  { keywords: ["coffee", "restaurant", "food", "meal", "dinner", "lunch", "breakfast", "grabfood"], category: "Food" },
  { keywords: ["office", "software", "client", "domain", "hosting", "business"], category: "Business Expense" },
  { keywords: ["bill", "utility", "electric", "water", "internet"], category: "Bills" },
  { keywords: ["shop", "mart", "mall", "amazon"], category: "Shopping" },
];

export function normalizeMerchant(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[\d]+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !NOISE_TOKENS.has(token))
    .slice(0, 4)
    .join(" ")
    .trim();

  return normalized || "unknown merchant";
}

export function suggestCategory(
  description: string,
  hints: MerchantCategoryHint[],
): { category: string; source: "history" | "keyword" | "default"; confidence: "high" | "medium" | "low" } | null {
  const normalized = normalizeMerchant(description);
  if (!description.trim()) return null;

  const exactMatches = hints
    .filter((hint) => hint.normalizedMerchant === normalized)
    .sort((left, right) => right.count - left.count);

  if (exactMatches.length > 0) {
    const confidence = exactMatches[0].count >= 3 ? "high" : "medium";
    return {
      category: exactMatches[0].category,
      source: "history" as const,
      confidence,
    };
  }

  const searchText = `${description.toLowerCase()} ${normalized}`;
  const matchedRule = KEYWORD_RULES.find((rule) => rule.keywords.some((keyword) => searchText.includes(keyword)));
  if (matchedRule) {
    return {
      category: matchedRule.category,
      source: "keyword" as const,
      confidence: "low" as const,
    };
  }

  return {
    category: "Uncategorized",
    source: "default" as const,
    confidence: "low" as const,
  };
}
