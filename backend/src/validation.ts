import dayjs from "dayjs";
import { z } from "zod";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => dayjs(d, "YYYY-MM-DD", true).isValid(), { message: "Invalid calendar date" });

export const txnFlowSchema = z.enum(["expense", "income"]);

export const transactionSchema = z.object({
  id: z.string().optional(),
  date: calendarDate,
  amount: z.number().positive(),
  flow: txnFlowSchema.default("expense"),
  category: z.string().min(1),
  description: z.string().min(1),
  notes: z.string().optional(),
  scope: z.enum(["personal", "business"]).default("personal"),
});

/** Normalize API/import rows before `transactionSchema`: negative amounts → income + positive magnitude. */
export function normalizeRawTransactionForImport(tx: unknown): unknown {
  if (!tx || typeof tx !== "object") return tx;
  const o = { ...(tx as Record<string, unknown>) };
  const typeField = o.type;
  const rawFlow =
    o.flow ??
    o.kind ??
    o.txn_type ??
    (typeof typeField === "string" && (typeField === "income" || typeField === "expense") ? typeField : undefined);
  const flowStr = typeof rawFlow === "string" ? rawFlow.trim().toLowerCase() : undefined;
  const amt = o.amount;
  if (typeof amt === "number") {
    if (amt < 0) {
      o.amount = Math.abs(amt);
      if (flowStr === "expense" || flowStr === "income") o.flow = flowStr;
      else o.flow = "income";
    } else if (flowStr === "income" || flowStr === "expense") {
      o.flow = flowStr;
    } else {
      o.flow = "expense";
    }
  }
  return o;
}

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
