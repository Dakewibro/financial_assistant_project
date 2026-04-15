import mongoose from "mongoose";
import { getEnv } from "./env.js";

export async function connectDatabase(): Promise<void> {
  const env = getEnv();
  if (env.storageMode === "memory") return;
  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDb,
  });
}

export async function disconnectDatabase(): Promise<void> {
  const env = getEnv();
  if (env.storageMode === "memory") return;
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}
