import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().nonnegative(),
  category: z.string().min(1),
  description: z.string().min(1),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export const budgetRuleSchema = z.object({
  id: z.string(),
  category: z.string().optional(),
  period: z.enum(["daily", "weekly", "monthly"]),
  threshold: z.number().nonnegative(),
  ruleType: z.enum([
    "category_cap",
    "period_cap",
    "category_percentage",
    "consecutive_overspend",
    "uncategorized_warning",
  ]),
  enabled: z.boolean(),
});

export const summarySchema = z.object({
  totalSpending: z.number(),
  perCategoryTotals: z.record(z.string(), z.number()),
  dailyTotal: z.number(),
  weeklyTotal: z.number(),
  monthlyTotal: z.number(),
  top3Categories: z.array(z.object({ category: z.string(), amount: z.number() })),
  trend7Days: z.array(z.object({ date: z.string(), amount: z.number() })),
  trend30Days: z.array(z.object({ date: z.string(), amount: z.number() })),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type BudgetRule = z.infer<typeof budgetRuleSchema>;
export type Summary = z.infer<typeof summarySchema>;
