import dayjs from "dayjs";
import { z } from "zod";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => dayjs(d, "YYYY-MM-DD", true).isValid(), { message: "Invalid calendar date" });

export const transactionSchema = z.object({
  id: z.string().optional(),
  date: calendarDate,
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().min(1),
  notes: z.string().optional(),
  scope: z.enum(["personal", "business"]).default("personal"),
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
    "recurring_threshold",
    "duplicate_amount",
  ]),
  enabled: z.boolean().default(true),
  scope: z.enum(["personal", "business"]).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1),
});
