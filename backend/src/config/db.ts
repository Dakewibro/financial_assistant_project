import mongoose from "mongoose";
import { getEnv } from "./env.js";
import { ensureDemoUserSeeded } from "../userRepository.js";
import { hydrateWorkspaceFromMongo } from "../workspacePersistence.js";

let databaseReady = false;

export function isDatabaseReady(): boolean {
  return databaseReady;
}

export async function connectDatabase(): Promise<void> {
  const env = getEnv();
  if (env.storageMode === "memory") {
    databaseReady = true;
    return;
  }
  if (mongoose.connection.readyState === 1) {
    databaseReady = true;
    return;
  }

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDb,
  });
  await ensureDemoUserSeeded();
  await hydrateWorkspaceFromMongo();
  databaseReady = true;
}

export async function disconnectDatabase(): Promise<void> {
  const env = getEnv();
  if (env.storageMode === "memory") return;
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  databaseReady = false;
}
