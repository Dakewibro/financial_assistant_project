import { Schema, model } from "mongoose";

export interface WorkspaceSnapshotRecord {
  key: string;
  payload: string;
}

const workspaceSnapshotSchema = new Schema<WorkspaceSnapshotRecord>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    payload: { type: String, required: true, default: "{}" },
  },
  { timestamps: true },
);

export const WorkspaceSnapshotModel = model<WorkspaceSnapshotRecord>("WorkspaceSnapshot", workspaceSnapshotSchema);
