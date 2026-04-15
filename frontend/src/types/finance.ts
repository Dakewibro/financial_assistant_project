export type CurrencyCode = "HKD";
export type Scope = "personal" | "business";
export type Period = "daily" | "weekly" | "monthly";

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  normalizedMerchant: string;
  scope: Scope;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Rule = {
  id: string;
  category?: string;
  period: Period;
  threshold: number;
  ruleType:
    | "category_cap"
    | "period_cap"
    | "category_percentage"
    | "consecutive_overspend"
    | "uncategorized_warning"
    | "recurring_threshold";
  enabled: boolean;
  scope?: Scope;
};

export type Alert = {
  id: string;
  ruleId: string;
  ruleType: Rule["ruleType"];
  message: string;
  evidence: string;
  severity: "info" | "warning" | "critical";
  status: "detected" | "near_limit" | "exceeded";
};

export type Summary = {
  totalSpending: number;
  perCategoryTotals: Record<string, number>;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  byScope: Record<Scope, number>;
  top3Categories: Array<{ category: string; amount: number }>;
  trend7Days: Array<{ date: string; amount: number }>;
  trend30Days: Array<{ date: string; amount: number }>;
};

export type RecurringGroup = {
  id: string;
  normalizedMerchant: string;
  displayName: string;
  averageAmount: number;
  totalAmount: number;
  totalLast30Days: number;
  count: number;
  frequency: "weekly" | "biweekly" | "monthly" | "irregular";
  kind: "subscription" | "habit";
  scope: Scope;
  lastDate: string;
  nextExpectedDate?: string;
};

export type Insight = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
};

export type MerchantCategoryHint = {
  normalizedMerchant: string;
  description: string;
  category: string;
  count: number;
};

export type RecentEntryHelpers = {
  recentDescriptions: string[];
  recentCategories: string[];
  lastTransaction: Transaction | null;
  merchantCategoryHints: MerchantCategoryHint[];
};

export type Bootstrap = {
  currency: CurrencyCode;
  transactions: Transaction[];
  rules: Rule[];
  categories: string[];
  alerts: Alert[];
  summary: Summary;
  recurring: RecurringGroup[];
  insights: Insight[];
  recent: RecentEntryHelpers;
};

export type TransactionFormState = {
  date: string;
  amount: string;
  category: string;
  description: string;
  notes: string;
  scope: Scope;
};

export type RuleFormState = {
  category: string;
  period: Rule["period"];
  threshold: string;
  ruleType: Rule["ruleType"];
};

export type TransactionFiltersState = {
  category: string;
  fromDate: string;
  toDate: string;
  scope: Scope | "all";
  recurringOnly: boolean;
  search: string;
};
