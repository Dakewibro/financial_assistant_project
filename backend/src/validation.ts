import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().nonnegative(),
  category: z.string().min(1),
  description: z.string().min(1),
  notes: z.string().optional(),
});

export const budgetRuleSchema = z.object({
  id: z.string().optional(),
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
  enabled: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(1),
});
