export type Transaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  notes?: string;
};

export type Rule = {
  id: string;
  category?: string;
  period: "daily" | "weekly" | "monthly";
  threshold: number;
  ruleType: "category_cap" | "period_cap" | "category_percentage" | "consecutive_overspend" | "uncategorized_warning";
  enabled: boolean;
};

export type Alert = { id: string; message: string; evidence: string; severity: string };

export type Summary = {
  totalSpending: number;
  perCategoryTotals: Record<string, number>;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  top3Categories: Array<{ category: string; amount: number }>;
};

export type Bootstrap = { transactions: Transaction[]; rules: Rule[]; categories: string[]; alerts: Alert[]; summary: Summary };

export type TransactionFormState = {
  date: string;
  amount: string;
  category: string;
  description: string;
  notes: string;
};

export type RuleFormState = {
  category: string;
  period: Rule["period"];
  threshold: string;
  ruleType: Rule["ruleType"];
};
