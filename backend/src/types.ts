export type Period = "daily" | "weekly" | "monthly";

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  notes?: string;
  createdAt: string;
}

export type RuleType =
  | "category_cap"
  | "period_cap"
  | "category_percentage"
  | "consecutive_overspend"
  | "uncategorized_warning";

export interface BudgetRule {
  id: string;
  category?: string;
  period: Period;
  threshold: number;
  ruleType: RuleType;
  enabled: boolean;
}

export type Severity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  ruleId: string;
  severity: Severity;
  message: string;
  evidence: string;
}

export interface Summary {
  totalSpending: number;
  perCategoryTotals: Record<string, number>;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  top3Categories: Array<{ category: string; amount: number }>;
  trend7Days: Array<{ date: string; amount: number }>;
  trend30Days: Array<{ date: string; amount: number }>;
}
