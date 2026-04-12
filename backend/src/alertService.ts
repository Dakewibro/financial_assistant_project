import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import { randomUUID } from "node:crypto";
import { Alert, BudgetRule, Transaction } from "./types.js";

dayjs.extend(isoWeek);

const createAlert = (ruleId: string, message: string, evidence: string, severity: Alert["severity"]): Alert => ({
  id: randomUUID(),
  ruleId,
  message,
  evidence,
  severity,
});

export function evaluateAlerts(transactions: Transaction[], rules: BudgetRule[]): Alert[] {
  const enabledRules = rules.filter((rule) => rule.enabled);
  const today = dayjs().format("YYYY-MM-DD");
  const thisWeek = dayjs().isoWeek();
  const thisMonth = dayjs().month();
  const thisYear = dayjs().year();
  const total = transactions.reduce((acc, tx) => acc + tx.amount, 0);
  const alerts: Alert[] = [];

  for (const rule of enabledRules) {
    if (rule.ruleType === "category_cap" && rule.category) {
      const categoryAmount = transactions
        .filter((tx) => tx.category === rule.category && tx.date === today)
        .reduce((acc, tx) => acc + tx.amount, 0);
      if (categoryAmount > rule.threshold) {
        alerts.push(
          createAlert(
            rule.id,
            `${rule.category} daily cap exceeded`,
            `${categoryAmount.toFixed(2)} > ${rule.threshold.toFixed(2)} today`,
            "critical",
          ),
        );
      }
    }

    if (rule.ruleType === "period_cap") {
      const periodAmount = transactions
        .filter((tx) => {
          const date = dayjs(tx.date);
          if (rule.period === "daily") return tx.date === today;
          if (rule.period === "weekly") return date.isoWeek() === thisWeek && date.year() === thisYear;
          return date.month() === thisMonth && date.year() === thisYear;
        })
        .reduce((acc, tx) => acc + tx.amount, 0);
      if (periodAmount > rule.threshold) {
        alerts.push(
          createAlert(
            rule.id,
            `${rule.period} spending cap exceeded`,
            `${periodAmount.toFixed(2)} > ${rule.threshold.toFixed(2)}`,
            "warning",
          ),
        );
      }
    }

    if (rule.ruleType === "category_percentage" && rule.category && total > 0) {
      const categoryTotal = transactions
        .filter((tx) => tx.category === rule.category)
        .reduce((acc, tx) => acc + tx.amount, 0);
      const ratio = (categoryTotal / total) * 100;
      if (ratio > rule.threshold) {
        alerts.push(
          createAlert(
            rule.id,
            `${rule.category} share is too high`,
            `${ratio.toFixed(1)}% > ${rule.threshold}% of total spending`,
            "warning",
          ),
        );
      }
    }

    if (rule.ruleType === "uncategorized_warning") {
      const uncategorizedCount = transactions.filter((tx) => tx.category === "Uncategorized").length;
      if (uncategorizedCount > rule.threshold) {
        alerts.push(
          createAlert(
            rule.id,
            "Too many uncategorized entries",
            `${uncategorizedCount} uncategorized transactions`,
            "info",
          ),
        );
      }
    }

    if (rule.ruleType === "consecutive_overspend") {
      let streak = 0;
      for (let i = 0; i < 30; i += 1) {
        const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");
        const dayTotal = transactions
          .filter((tx) => tx.date === date)
          .reduce((acc, tx) => acc + tx.amount, 0);
        if (dayTotal > rule.threshold) {
          streak += 1;
        } else {
          break;
        }
      }
      if (streak >= 3) {
        alerts.push(
          createAlert(
            rule.id,
            "Consecutive overspend streak detected",
            `${streak} days above ${rule.threshold.toFixed(2)}`,
            "critical",
          ),
        );
      }
    }
  }

  return alerts;
}
