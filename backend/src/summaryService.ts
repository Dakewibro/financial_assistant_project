import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import { Summary, Transaction } from "./types.js";

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
    out.push({ date, amount });
  }
  return out;
}

export function computeSummary(transactions: Transaction[]): Summary {
  const today = dayjs();
  const perCategoryTotals = transactions.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.category] = (acc[tx.category] ?? 0) + tx.amount;
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
    totalSpending: transactions.reduce((acc, tx) => acc + tx.amount, 0),
    perCategoryTotals,
    dailyTotal,
    weeklyTotal,
    monthlyTotal,
    top3Categories,
    trend7Days: buildTrend(transactions, 7),
    trend30Days: buildTrend(transactions, 30),
  };
}
