export type StorageMode = "mongo" | "memory";

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? 4000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4000;
}

function parseOrigins(value: string | undefined): string[] {
  return (value ?? "http://localhost:5173")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getEnv() {
  const mongodbUri = process.env.MONGODB_URI?.trim() ?? "";
  const requestedStorageMode = process.env.STORAGE_MODE === "memory" ? "memory" : "mongo";
  const storageMode: StorageMode = mongodbUri.length > 0 ? requestedStorageMode : "memory";

  return {
    port: parsePort(process.env.PORT),
    mongodbUri,
    mongodbDb: process.env.MONGODB_DB?.trim() || "financial_assistant",
    allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
    storageMode,
  };
}
