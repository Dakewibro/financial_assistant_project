import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import { randomUUID } from "node:crypto";
import type { Alert, BudgetRule, RecurringGroup, Transaction } from "./types.js";

dayjs.extend(isoWeek);

function createAlert(
  rule: BudgetRule,
  message: string,
  evidence: string,
  severity: Alert["severity"],
  status: Alert["status"],
): Alert {
  return {
    id: randomUUID(),
    ruleId: rule.id,
    ruleType: rule.ruleType,
    message,
    evidence,
    severity,
    status,
  };
}

function filterByScope(transactions: Transaction[], rule: BudgetRule): Transaction[] {
  if (!rule.scope) return transactions;
  return transactions.filter((tx) => tx.scope === rule.scope);
}

function filterByPeriod(transactions: Transaction[], period: BudgetRule["period"]): Transaction[] {
  const today = dayjs();
  return transactions.filter((tx) => {
    const date = dayjs(tx.date);
    if (period === "daily") return tx.date === today.format("YYYY-MM-DD");
    if (period === "weekly") return date.isoWeek() === today.isoWeek() && date.year() === today.year();
    return date.month() === today.month() && date.year() === today.year();
  });
}

function buildCapAlerts(rule: BudgetRule, amount: number, label: string): Alert[] {
  if (rule.threshold <= 0) return [];
  if (amount >= rule.threshold) {
    return [
      createAlert(
        rule,
        `${label} cap exceeded`,
        `HK$${amount.toFixed(2)} of HK$${rule.threshold.toFixed(2)}`,
        "critical",
        "exceeded",
      ),
    ];
  }

  if (amount >= rule.threshold * 0.8) {
    return [
      createAlert(
        rule,
        `${label} cap nearly reached`,
        `HK$${amount.toFixed(2)} of HK$${rule.threshold.toFixed(2)}`,
        "warning",
        "near_limit",
      ),
    ];
  }

  return [];
}

function getStreakLength(transactions: Transaction[], dailyThreshold: number): number {
  if (transactions.length === 0 || dailyThreshold <= 0) return 0;
  const dateTotals = transactions.reduce<Record<string, number>>((acc, tx) => {
    acc[tx.date] = (acc[tx.date] ?? 0) + tx.amount;
    return acc;
  }, {});

  const dates = Object.keys(dateTotals).sort((a, b) => b.localeCompare(a));
  let streak = 0;

  for (let index = 0; index < dates.length; index += 1) {
    const current = dates[index];
    const previous = dates[index + 1];

    if (dateTotals[current] > dailyThreshold) {
      streak += 1;
    } else {
      break;
    }

    if (previous) {
      const gap = dayjs(current).diff(dayjs(previous), "day");
      if (gap > 1) break;
    }
  }

  return streak;
}

export function evaluateAlerts(transactions: Transaction[], rules: BudgetRule[], recurringGroups: RecurringGroup[]): Alert[] {
  const alerts: Alert[] = [];

  for (const rule of rules.filter((item) => item.enabled)) {
    const scopedTransactions = filterByScope(transactions, rule);
    const periodTransactions = filterByPeriod(scopedTransactions, rule.period);

    if (rule.ruleType === "category_cap" && rule.category) {
      const categoryAmount = periodTransactions
        .filter((tx) => tx.category === rule.category)
        .reduce((sum, tx) => sum + tx.amount, 0);
      alerts.push(...buildCapAlerts(rule, categoryAmount, `${rule.category} ${rule.period}`));
    }

    if (rule.ruleType === "period_cap") {
      const periodAmount = periodTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      alerts.push(...buildCapAlerts(rule, periodAmount, `${rule.period} spending`));
    }

    if (rule.ruleType === "category_percentage" && rule.category) {
      const periodAmount = periodTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      if (periodAmount > 0) {
        const categoryAmount = periodTransactions
          .filter((tx) => tx.category === rule.category)
          .reduce((sum, tx) => sum + tx.amount, 0);
        const ratio = (categoryAmount / periodAmount) * 100;
        if (ratio >= rule.threshold) {
          alerts.push(
            createAlert(
              rule,
              `${rule.category} share is too high`,
              `${ratio.toFixed(1)}% of ${rule.period} spending`,
              "warning",
              "detected",
            ),
          );
        } else if (ratio >= rule.threshold * 0.8) {
          alerts.push(
            createAlert(
              rule,
              `${rule.category} share is nearing threshold`,
              `${ratio.toFixed(1)}% of ${rule.period} spending`,
              "info",
              "near_limit",
            ),
          );
        }
      }
    }

    if (rule.ruleType === "uncategorized_warning") {
      const uncategorizedCount = periodTransactions.filter((tx) => tx.category === "Uncategorized").length;
      if (uncategorizedCount > rule.threshold) {
        alerts.push(
          createAlert(
            rule,
            "Too many uncategorized entries",
            `${uncategorizedCount} uncategorized transactions this ${rule.period}`,
            "info",
            "detected",
          ),
        );
      }
    }

    if (rule.ruleType === "consecutive_overspend") {
      const streak = getStreakLength(periodTransactions, rule.threshold);
      if (streak >= 3) {
        alerts.push(
          createAlert(
            rule,
            "Consecutive overspend streak detected",
            `${streak} days above HK$${rule.threshold.toFixed(2)}`,
            "critical",
            "detected",
          ),
        );
      }
    }

    if (rule.ruleType === "recurring_threshold") {
      const recurringTotal = recurringGroups
        .filter((item) => item.kind === "subscription")
        .reduce((sum, item) => sum + item.totalLast30Days, 0);

      alerts.push(...buildCapAlerts(rule, recurringTotal, "Recurring spend"));
    }
  }

  const duplicateWindow = dayjs().subtract(45, "day");
  const recentForDup = transactions.filter((tx) => !dayjs(tx.date).isBefore(duplicateWindow, "day"));
  const dupGroups = new Map<string, Transaction[]>();
  for (const tx of recentForDup) {
    const key = `${tx.normalizedMerchant}::${Number(tx.amount).toFixed(2)}`;
    const list = dupGroups.get(key) ?? [];
    list.push(tx);
    dupGroups.set(key, list);
  }
  for (const list of dupGroups.values()) {
    if (list.length < 3) continue;
    const sample = list[0];
    const severity: Alert["severity"] = list.length >= 5 ? "critical" : "warning";
    alerts.push({
      id: randomUUID(),
      ruleId: "duplicate-amount",
      ruleType: "duplicate_amount",
      message: `Same HK$${sample.amount.toFixed(2)} charge ${list.length} times (${sample.description})`,
      evidence: `${list.length} matching transactions in the last 45 days`,
      severity,
      status: "detected",
    });
  }

  const severityRank: Record<Alert["severity"], number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return alerts.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
}
