import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { getEnv } from "./config/env.js";
import { UserModel, type UserRecord } from "./models/User.js";

export type AuthUserShape = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  onboarded: boolean;
  monthlyIncome: number;
  primaryUse: "personal" | "freelancer" | "mixed";
};

function mapUser(doc: UserRecord & { _id: mongoose.Types.ObjectId }): AuthUserShape {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    passwordHash: doc.passwordHash,
    onboarded: doc.onboarded,
    monthlyIncome: doc.monthlyIncome,
    primaryUse: doc.primaryUse,
  };
}

export async function findUserById(id: string): Promise<AuthUserShape | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await UserModel.findById(id).lean();
  if (!doc) return null;
  return mapUser(doc as UserRecord & { _id: mongoose.Types.ObjectId });
}

export async function findUserByEmail(email: string): Promise<AuthUserShape | null> {
  const doc = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
  if (!doc) return null;
  return mapUser(doc as UserRecord & { _id: mongoose.Types.ObjectId });
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  onboarded?: boolean;
  monthlyIncome?: number;
  primaryUse?: AuthUserShape["primaryUse"];
}): Promise<AuthUserShape> {
  const doc = await UserModel.create({
    name: input.name,
    email: input.email.trim().toLowerCase(),
    passwordHash: input.passwordHash,
    onboarded: input.onboarded ?? false,
    monthlyIncome: input.monthlyIncome ?? 0,
    primaryUse: input.primaryUse ?? "mixed",
  });
  const plain = doc.toObject({ flattenMaps: true }) as UserRecord & { _id: mongoose.Types.ObjectId };
  return mapUser(plain);
}

export async function updateUserById(
  id: string,
  patch: Partial<Pick<AuthUserShape, "onboarded" | "monthlyIncome" | "primaryUse">>,
): Promise<AuthUserShape | null> {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const doc = await UserModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
  if (!doc) return null;
  return mapUser(doc as UserRecord & { _id: mongoose.Types.ObjectId });
}

const DEMO_EMAIL = "demo@finassist.app";
const DEMO_PASSWORD = "demo1234";

/** Ensures demo account exists for shared-workspace Mongo deployments. */
export async function ensureDemoUserSeeded(): Promise<void> {
  if (getEnv().storageMode !== "mongo") return;
  const existing = await UserModel.findOne({ email: DEMO_EMAIL }).lean();
  if (existing) return;
  await UserModel.create({
    name: "Demo User",
    email: DEMO_EMAIL,
    passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    onboarded: true,
    monthlyIncome: 24000,
    primaryUse: "mixed",
  });
}

export async function getDefaultOwnerUserId(): Promise<string> {
  const demo = await UserModel.findOne({ email: DEMO_EMAIL }).select("_id").lean();
  if (demo?._id) return demo._id.toString();
  const any = await UserModel.findOne().sort({ createdAt: 1 }).select("_id").lean();
  if (any?._id) return any._id.toString();
  return "demo-user";
}
