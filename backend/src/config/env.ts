export type StorageMode = "mongo" | "memory";

const DEV_DEFAULT_JWT_SECRET = "dev-local-jwt-secret";

function isDeployProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

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

function parseAuthEnforced(): boolean {
  const raw = process.env.AUTH_ENFORCED?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  return isDeployProduction();
}

/** Demo load/clear/seed: off by default on Vercel/production unless explicitly enabled (shared Mongo safety). */
function parseDemoMutationsEnabled(): boolean {
  const raw = process.env.DEMO_MUTATIONS_ENABLED?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return !isDeployProduction();
}

export function getEnv() {
  const mongodbUri = process.env.MONGODB_URI?.trim() ?? "";
  const requestedStorageMode = process.env.STORAGE_MODE === "memory" ? "memory" : "mongo";
  const adminApiToken = process.env.ADMIN_API_TOKEN?.trim() ?? "";

  if (requestedStorageMode === "mongo" && process.env.STORAGE_MODE === "mongo" && mongodbUri.length === 0) {
    throw new Error("MONGODB_URI is required when STORAGE_MODE=mongo");
  }

  const storageMode: StorageMode = mongodbUri.length > 0 ? requestedStorageMode : "memory";

  const jwtSecretRaw = process.env.JWT_SECRET?.trim() ?? "";
  const jwtSecret = jwtSecretRaw.length > 0 ? jwtSecretRaw : DEV_DEFAULT_JWT_SECRET;
  if (isDeployProduction()) {
    if (jwtSecretRaw.length === 0) {
      throw new Error("JWT_SECRET is required in production (set a long random secret in your host environment).");
    }
    if (jwtSecret === DEV_DEFAULT_JWT_SECRET) {
      throw new Error("JWT_SECRET must not use the development default in production.");
    }
  }

  return {
    port: parsePort(process.env.PORT),
    mongodbUri,
    mongodbDb: process.env.MONGODB_DB?.trim() || "financial_assistant",
    allowedOrigins: parseOrigins(process.env.ALLOWED_ORIGINS),
    adminApiToken,
    jwtSecret,
    storageMode,
    emergentV2Enabled: process.env.EMERGENT_V2_ENABLED === "true",
    authEnforced: parseAuthEnforced(),
    demoMutationsEnabled: parseDemoMutationsEnabled(),
    v2ContractsEnabled: process.env.V2_CONTRACTS_ENABLED === "true",
  };
}
