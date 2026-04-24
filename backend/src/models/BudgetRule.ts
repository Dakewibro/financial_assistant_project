import { Schema, model } from "mongoose";
import type { Period, RuleType, Scope } from "../types.js";

export interface BudgetRuleRecord {
  category?: string;
  period: Period;
  threshold: number;
  ruleType: RuleType;
  enabled: boolean;
  scope?: Scope;
  createdAt?: Date;
  updatedAt?: Date;
}

const budgetRuleSchema = new Schema<BudgetRuleRecord>(
  {
    category: { type: String },
    period: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    threshold: { type: Number, required: true, min: 0 },
    ruleType: {
      type: String,
      enum: [
        "category_cap",
        "period_cap",
        "category_percentage",
        "consecutive_overspend",
        "uncategorized_warning",
        "recurring_threshold",
        "duplicate_amount",
      ],
      required: true,
    },
    enabled: { type: Boolean, required: true, default: true },
    scope: { type: String, enum: ["personal", "business"] },
  },
  { timestamps: true },
);

export const BudgetRuleModel = model<BudgetRuleRecord>("BudgetRule", budgetRuleSchema);
