import { Schema, model } from "mongoose";

export interface CategoryRecord {
  name: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new Schema<CategoryRecord>(
  {
    name: { type: String, required: true, unique: true, index: true },
    isDefault: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

export const CategoryModel = model<CategoryRecord>("Category", categorySchema);
