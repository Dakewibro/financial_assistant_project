import dayjs from "dayjs";
import { countsAsExpense, type Frequency, type RecurringGroup, type Transaction } from "../types.js";

function detectFrequency(intervals: number[]): Frequency | null {
  if (intervals.length === 0) return null;
  if (intervals.every((value) => value >= 6 && value <= 8)) return "weekly";
  if (intervals.every((value) => value >= 13 && value <= 16)) return "biweekly";
  if (intervals.every((value) => value >= 27 && value <= 33)) return "monthly";
  return null;
}

function classifyKind(
  count: number,
  frequency: Frequency | null,
  averageAmount: number,
  transactions: Transaction[],
): "subscription" | "habit" | null {
  const stableEnough = transactions.every((tx) => Math.abs(tx.amount - averageAmount) <= Math.max(2, averageAmount * 0.15));
  if (frequency && stableEnough) return "subscription";
  if (count >= 4) return "habit";
  return null;
}

function getNextExpectedDate(lastDate: string, frequency: Frequency): string | undefined {
  if (frequency === "irregular") return undefined;
  const days = frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 30;
  return dayjs(lastDate).add(days, "day").format("YYYY-MM-DD");
}

export function detectRecurringGroups(transactions: Transaction[]): RecurringGroup[] {
  const spending = transactions.filter(countsAsExpense);
  const grouped = spending.reduce<Map<string, Transaction[]>>((acc, tx) => {
    const key = `${tx.scope}:${tx.normalizedMerchant}`;
    const current = acc.get(key) ?? [];
    current.push(tx);
    acc.set(key, current);
    return acc;
  }, new Map());

  const last30Cutoff = dayjs().subtract(30, "day");
  const recurringGroups: RecurringGroup[] = [];

  for (const [key, group] of grouped.entries()) {
    if (group.length < 3) continue;

    const ordered = [...group].sort((a, b) => a.date.localeCompare(b.date));
    const intervals = ordered.slice(1).map((tx, index) => dayjs(tx.date).diff(dayjs(ordered[index].date), "day"));
    const frequency = detectFrequency(intervals) ?? "irregular";
    const averageAmount = ordered.reduce((sum, tx) => sum + tx.amount, 0) / ordered.length;
    const kind = classifyKind(ordered.length, frequency === "irregular" ? null : frequency, averageAmount, ordered);
    if (!kind) continue;

    const lastTransaction = ordered[ordered.length - 1];
    const totalLast30Days = ordered
      .filter((tx) => !dayjs(tx.date).isBefore(last30Cutoff, "day"))
      .reduce((sum, tx) => sum + tx.amount, 0);

    recurringGroups.push({
      id: key,
      normalizedMerchant: lastTransaction.normalizedMerchant,
      displayName: lastTransaction.description,
      averageAmount: Number(averageAmount.toFixed(2)),
      totalAmount: Number(ordered.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)),
      totalLast30Days: Number(totalLast30Days.toFixed(2)),
      count: ordered.length,
      frequency,
      kind,
      scope: lastTransaction.scope,
      lastDate: lastTransaction.date,
      nextExpectedDate: getNextExpectedDate(lastTransaction.date, frequency),
    });
  }

  return recurringGroups.sort((a, b) => b.totalAmount - a.totalAmount);
}
