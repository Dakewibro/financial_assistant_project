export const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Subscription",
  "Business Expense",
  "Uncategorized",
] as const;

export type CurrencyCode = "HKD";
export type Scope = "personal" | "business";
export type Period = "daily" | "weekly" | "monthly";
export type Frequency = "weekly" | "biweekly" | "monthly" | "irregular";

/** Ledger direction: positive `amount` magnitude; income vs outflow is explicit (not signed amount). */
export type TxnFlow = "expense" | "income";

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  flow: TxnFlow;
  category: string;
  description: string;
  normalizedMerchant: string;
  scope: Scope;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function countsAsExpense(tx: Pick<Transaction, "flow">): boolean {
  return tx.flow !== "income";
}

export type RuleType =
  | "category_cap"
  | "period_cap"
  | "category_percentage"
  | "consecutive_overspend"
  | "uncategorized_warning"
  | "recurring_threshold"
  | "duplicate_amount";

export interface BudgetRule {
  id: string;
  category?: string;
  period: Period;
  threshold: number;
  ruleType: RuleType;
  enabled: boolean;
  scope?: Scope;
}

export type Severity = "info" | "warning" | "critical";
export type AlertStatus = "detected" | "near_limit" | "exceeded";

export interface Alert {
  id: string;
  ruleId: string;
  ruleType: RuleType;
  severity: Severity;
  status: AlertStatus;
  message: string;
  evidence: string;
}

export interface Summary {
  totalSpending: number;
  perCategoryTotals: Record<string, number>;
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  byScope: Record<Scope, number>;
  top3Categories: Array<{ category: string; amount: number }>;
  trend7Days: Array<{ date: string; amount: number }>;
  trend30Days: Array<{ date: string; amount: number }>;
}

export interface RecurringGroup {
  id: string;
  normalizedMerchant: string;
  displayName: string;
  averageAmount: number;
  totalAmount: number;
  totalLast30Days: number;
  count: number;
  frequency: Frequency;
  kind: "subscription" | "habit";
  scope: Scope;
  lastDate: string;
  nextExpectedDate?: string;
}

export interface Insight {
  id: string;
  severity: Severity;
  title: string;
  message: string;
}

export interface MerchantCategoryHint {
  normalizedMerchant: string;
  description: string;
  category: string;
  count: number;
}

export interface RecentEntryHelpers {
  recentDescriptions: string[];
  recentCategories: string[];
  lastTransaction: Transaction | null;
  merchantCategoryHints: MerchantCategoryHint[];
}

export interface BootstrapResponse {
  currency: CurrencyCode;
  transactions: Transaction[];
  rules: BudgetRule[];
  categories: string[];
  alerts: Alert[];
  summary: Summary;
  recurring: RecurringGroup[];
  insights: Insight[];
  recent: RecentEntryHelpers;
}

export interface TransactionFilters {
  category?: string;
  fromDate?: string;
  toDate?: string;
  scope?: Scope;
  /** When set, only return rows with this flow (Mongo + memory). */
  flow?: TxnFlow;
  recurringOnly?: boolean;
  search?: string;
}
