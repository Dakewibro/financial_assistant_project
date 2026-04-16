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
