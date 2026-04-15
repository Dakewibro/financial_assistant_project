import { Schema, model } from "mongoose";
import type { Scope } from "../types.js";

export interface TransactionRecord {
  date: string;
  amount: number;
  category: string;
  description: string;
  normalizedMerchant: string;
  scope: Scope;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const transactionSchema = new Schema<TransactionRecord>(
  {
    date: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true },
    normalizedMerchant: { type: String, required: true, index: true },
    scope: { type: String, enum: ["personal", "business"], required: true, default: "personal", index: true },
    notes: { type: String },
  },
  { timestamps: true },
);

export const TransactionModel = model<TransactionRecord>("Transaction", transactionSchema);
