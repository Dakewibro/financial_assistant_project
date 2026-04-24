import type { BudgetRule, Scope } from "./types.js";

export type BudgetRuleRef = { ruleType: BudgetRule["ruleType"]; period: BudgetRule["period"] };

export type BudgetResource = {
  id: string;
  ownerId: string;
  name: string;
  category: string;
  account: Scope;
  limit: number;
  memberIds: string[];
  shareToken?: string;
  ruleRef?: BudgetRuleRef;
};

export type GoalResource = {
  id: string;
  ownerId: string;
  name: string;
  kind: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  memberIds: string[];
  shareToken?: string;
};

export type DashboardWidget = { id: string; size: "s" | "m" | "l" };

export const budgets: BudgetResource[] = [];
export const goals: GoalResource[] = [];
export const shareIndex = new Map<string, { kind: "budget" | "goal"; resourceId: string; ownerId: string }>();
export const dashboardPrefs = new Map<string, { widgets: DashboardWidget[] }>();
