import dayjs from "dayjs";
import type { Alert, BudgetRule, Insight, RecurringGroup, Summary } from "../types.js";

function createInsight(id: string, severity: Insight["severity"], title: string, message: string): Insight {
  return { id, severity, title, message };
}

export function generateInsights(
  summary: Summary,
  alerts: Alert[],
  recurring: RecurringGroup[],
  rules: BudgetRule[],
): Insight[] {
  const insights: Insight[] = [];

  const topCritical = alerts.find((alert) => alert.status === "exceeded");
  if (topCritical) {
    insights.push(createInsight("over-limit", "critical", "Budget exceeded", `${topCritical.message}. ${topCritical.evidence}.`));
  }

  const nearLimit = alerts.find((alert) => alert.status === "near_limit");
  if (nearLimit) {
    insights.push(createInsight("near-limit", "warning", "Budget at risk", `${nearLimit.message}. ${nearLimit.evidence}.`));
  }

  const recurringTotal = recurring.reduce((sum, item) => sum + item.totalLast30Days, 0);
  if (summary.monthlyTotal > 0 && recurringTotal > 0) {
    const recurringShare = (recurringTotal / summary.monthlyTotal) * 100;
    if (recurringShare >= 15) {
      insights.push(
        createInsight(
          "recurring-share",
          recurringShare >= 25 ? "warning" : "info",
          "Recurring spend is meaningful",
          `Recurring charges account for ${recurringShare.toFixed(0)}% of this month's spending.`,
        ),
      );
    }
  }

  const topCategory = summary.top3Categories[0];
  if (topCategory && summary.totalSpending > 0) {
    const ratio = (topCategory.amount / summary.totalSpending) * 100;
    if (ratio >= 40) {
      insights.push(
        createInsight(
          "category-dominance",
          "info",
          "One category is dominating spend",
          `${topCategory.category} makes up ${ratio.toFixed(0)}% of recorded spending.`,
        ),
      );
    }
  }

  const uncategorizedTotal = summary.perCategoryTotals.Uncategorized ?? 0;
  if (uncategorizedTotal > 0) {
    insights.push(
      createInsight(
        "uncategorized-cleanup",
        "info",
        "Clean up uncategorized entries",
        `You have HK$${uncategorizedTotal.toFixed(2)} in Uncategorized transactions, which reduces suggestion accuracy.`,
      ),
    );
  }

  const weeklyCap = rules.find((rule) => rule.enabled && rule.ruleType === "period_cap" && rule.period === "weekly");
  if (weeklyCap && weeklyCap.threshold > 0) {
    const remaining = weeklyCap.threshold - summary.weeklyTotal;
    const daysLeft = Math.max(1, 7 - dayjs().day());
    insights.push(
      createInsight(
        "safe-to-spend",
        remaining < 0 ? "warning" : "info",
        "Safe-to-spend guidance",
        `You can spend about HK$${(remaining / daysLeft).toFixed(2)} per day for the rest of this week.`,
      ),
    );
  }

  const deduped = new Map<string, Insight>();
  for (const insight of insights) {
    if (!deduped.has(insight.id)) deduped.set(insight.id, insight);
  }

  const severityRank: Record<Insight["severity"], number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return [...deduped.values()].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]).slice(0, 3);
}
