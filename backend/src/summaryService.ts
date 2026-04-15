import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import type { Scope, Summary, Transaction } from "./types.js";

dayjs.extend(isoWeek);

function sumBy(transactions: Transaction[], predicate: (tx: Transaction) => boolean): number {
  return transactions.filter(predicate).reduce((acc, tx) => acc + tx.amount, 0);
}

function buildTrend(transactions: Transaction[], days: number): Array<{ date: string; amount: number }> {
  const out: Array<{ date: string; amount: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    const amount = transactions
      .filter((tx) => tx.date === date)
      .reduce((acc, tx) => acc + tx.amount, 0);
    out.push({ date, amount: Number(amount.toFixed(2)) });
  }
  return out;
}

function sumScope(transactions: Transaction[], scope: Scope): number {
  return transactions.filter((tx) => tx.scope === scope).reduce((acc, tx) => acc + tx.amount, 0);
}

export function computeSummary(transactions: Transaction[]): Summary {
  const today = dayjs();
  const perCategoryTotals = transactions.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.category] = Number(((acc[tx.category] ?? 0) + tx.amount).toFixed(2));
    return acc;
  }, {});

  const top3Categories = Object.entries(perCategoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const dailyTotal = sumBy(transactions, (tx) => tx.date === today.format("YYYY-MM-DD"));
  const weeklyTotal = sumBy(
    transactions,
    (tx) => dayjs(tx.date).isoWeek() === today.isoWeek() && dayjs(tx.date).year() === today.year(),
  );
  const monthlyTotal = sumBy(
    transactions,
    (tx) => dayjs(tx.date).month() === today.month() && dayjs(tx.date).year() === today.year(),
  );

  return {
    totalSpending: Number(transactions.reduce((acc, tx) => acc + tx.amount, 0).toFixed(2)),
    perCategoryTotals,
    dailyTotal: Number(dailyTotal.toFixed(2)),
    weeklyTotal: Number(weeklyTotal.toFixed(2)),
    monthlyTotal: Number(monthlyTotal.toFixed(2)),
    byScope: {
      personal: Number(sumScope(transactions, "personal").toFixed(2)),
      business: Number(sumScope(transactions, "business").toFixed(2)),
    },
    top3Categories,
    trend7Days: buildTrend(transactions, 7),
    trend30Days: buildTrend(transactions, 30),
  };
}
