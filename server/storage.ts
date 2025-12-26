import { optimizations, type InsertOptimization } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createOptimization(optimization: InsertOptimization): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createOptimization(optimization: InsertOptimization): Promise<void> {
    await db.insert(optimizations).values(optimization);
  }
}

export const storage = new DatabaseStorage();
