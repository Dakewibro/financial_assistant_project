import { getEnv } from "./config/env.js";
import { WorkspaceSnapshotModel } from "./models/WorkspaceSnapshot.js";
import { budgets, goals, shareIndex, dashboardPrefs } from "./workspaceRuntime.js";

const KEY = "default";

let dirty = false;

/** Mark shared workspace RAM as changed; Mongo deployments persist on response `finish`. */
export function touchWorkspace(): void {
  if (getEnv().storageMode === "mongo") dirty = true;
}

export function installWorkspacePersistOnFinish(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  res.on("finish", () => {
    if (getEnv().storageMode !== "mongo" || !dirty) return;
    dirty = false;
    void persistWorkspaceToMongo();
  });
  next();
}

export async function hydrateWorkspaceFromMongo(): Promise<void> {
  if (getEnv().storageMode !== "mongo") return;
  const doc = await WorkspaceSnapshotModel.findOne({ key: KEY }).lean();
  if (!doc?.payload) return;
  try {
    const data = JSON.parse(doc.payload) as {
      budgets?: typeof budgets;
      goals?: typeof goals;
      shareEntries?: [string, { kind: "budget" | "goal"; resourceId: string; ownerId: string }][];
      dashboardPrefsEntries?: [string, { widgets: Array<{ id: string; size: "s" | "m" | "l" }> }][];
    };
    budgets.splice(0, budgets.length, ...(data.budgets ?? []));
    goals.splice(0, goals.length, ...(data.goals ?? []));
    shareIndex.clear();
    for (const row of data.shareEntries ?? []) {
      if (row && row[0]) shareIndex.set(row[0], row[1]);
    }
    dashboardPrefs.clear();
    for (const row of data.dashboardPrefsEntries ?? []) {
      if (row && row[0]) dashboardPrefs.set(row[0], row[1]);
    }
  } catch {
    // leave defaults
  }
}

export async function persistWorkspaceToMongo(): Promise<void> {
  if (getEnv().storageMode !== "mongo") return;
  const payload = JSON.stringify({
    budgets: [...budgets],
    goals: [...goals],
    shareEntries: [...shareIndex.entries()],
    dashboardPrefsEntries: [...dashboardPrefs.entries()],
  });
  await WorkspaceSnapshotModel.findOneAndUpdate({ key: KEY }, { $set: { payload } }, { upsert: true });
}
