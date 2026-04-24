import { Schema, model } from "mongoose";

export interface UserRecord {
  name: string;
  email: string;
  passwordHash: string;
  onboarded: boolean;
  monthlyIncome: number;
  primaryUse: "personal" | "freelancer" | "mixed";
}

const userSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    onboarded: { type: Boolean, default: false },
    monthlyIncome: { type: Number, default: 0 },
    primaryUse: { type: String, enum: ["personal", "freelancer", "mixed"], default: "mixed" },
  },
  { timestamps: true },
);

export const UserModel = model<UserRecord>("User", userSchema);
