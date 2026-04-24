import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import { countsAsExpense, type Scope, type Summary, type Transaction } from "./types.js";

dayjs.extend(isoWeek);

function sumExpenseBy(transactions: Transaction[], predicate: (tx: Transaction) => boolean): number {
  return transactions.filter(predicate).filter(countsAsExpense).reduce((acc, tx) => acc + tx.amount, 0);
}

function buildTrend(transactions: Transaction[], days: number): Array<{ date: string; amount: number }> {
  const spending = transactions.filter(countsAsExpense);
  const out: Array<{ date: string; amount: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
    const amount = spending.filter((tx) => tx.date === date).reduce((acc, tx) => acc + tx.amount, 0);
    out.push({ date, amount: Number(amount.toFixed(2)) });
  }
  return out;
}

/** When nothing landed in the rolling “today” window (e.g. demo data in an older month), anchor the trend on the latest transaction date. */
function buildTrendAnchored(transactions: Transaction[], anchor: dayjs.Dayjs, days: number): Array<{ date: string; amount: number }> {
  const spending = transactions.filter(countsAsExpense);
  const out: Array<{ date: string; amount: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = anchor.subtract(i, "day").format("YYYY-MM-DD");
    const amount = spending.filter((tx) => tx.date === date).reduce((acc, tx) => acc + tx.amount, 0);
    out.push({ date, amount: Number(amount.toFixed(2)) });
  }
  return out;
}

function sumExpenseScope(transactions: Transaction[], scope: Scope): number {
  return transactions.filter((tx) => tx.scope === scope).filter(countsAsExpense).reduce((acc, tx) => acc + tx.amount, 0);
}

export function computeSummary(transactions: Transaction[]): Summary {
  const today = dayjs();
  const spendingOnly = transactions.filter(countsAsExpense);
  const perCategoryTotals = spendingOnly.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.category] = Number(((acc[tx.category] ?? 0) + tx.amount).toFixed(2));
    return acc;
  }, {});

  const top3Categories = Object.entries(perCategoryTotals)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const trend30FromToday = buildTrend(transactions, 30);
  const trend30Sum = trend30FromToday.reduce((sum, row) => sum + row.amount, 0);
  let trend30Days = trend30FromToday;
  let trend7Days = buildTrend(transactions, 7);
  if (transactions.length > 0) {
    const latestStr = transactions.reduce((max, tx) => (tx.date > max ? tx.date : max), transactions[0].date);
    const ledgerStale = dayjs(latestStr).isBefore(dayjs().subtract(28, "day"), "day");
    if (trend30Sum < 0.001 || ledgerStale) {
      const anchor = dayjs(latestStr);
      trend30Days = buildTrendAnchored(transactions, anchor, 30);
      trend7Days = buildTrendAnchored(transactions, anchor, 7);
    }
  }

  const dailyTotal = sumExpenseBy(transactions, (tx) => tx.date === today.format("YYYY-MM-DD"));
  const weeklyTotal = sumExpenseBy(
    transactions,
    (tx) => dayjs(tx.date).isoWeek() === today.isoWeek() && dayjs(tx.date).year() === today.year(),
  );
  const monthlyTotal = sumExpenseBy(
    transactions,
    (tx) => dayjs(tx.date).month() === today.month() && dayjs(tx.date).year() === today.year(),
  );

  return {
    totalSpending: Number(spendingOnly.reduce((acc, tx) => acc + tx.amount, 0).toFixed(2)),
    perCategoryTotals,
    dailyTotal: Number(dailyTotal.toFixed(2)),
    weeklyTotal: Number(weeklyTotal.toFixed(2)),
    monthlyTotal: Number(monthlyTotal.toFixed(2)),
    byScope: {
      personal: Number(sumExpenseScope(transactions, "personal").toFixed(2)),
      business: Number(sumExpenseScope(transactions, "business").toFixed(2)),
    },
    top3Categories,
    trend7Days,
    trend30Days,
  };
}
