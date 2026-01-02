import { optimizations, type InsertOptimization, type Optimization, PLAN_LIMITS, users, type User } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and } from "drizzle-orm";

export interface IStorage {
  getUserById(userId: string): Promise<User | null>;
  incrementUserPrompts(userId: string): Promise<void>;
  resetUserPromptsIfNewDay(user: User): Promise<User>;
  upgradeUserToPro(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<void>;
  downgradeUserToFree(stripeSubscriptionId: string): Promise<void>;
  createOptimization(optimization: InsertOptimization): Promise<void>;
  getOptimizationHistory(userId: string, limit?: number): Promise<Optimization[]>;
  deleteOptimization(userId: string, optimizationId: number): Promise<void>;
  deleteAllOptimizations(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(userId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, userId));
    if (!result[0]) return null;
    return this.resetUserPromptsIfNewDay(result[0]);
  }

  async incrementUserPrompts(userId: string): Promise<void> {
    await db.update(users)
      .set({ promptsUsedToday: sql`${users.promptsUsedToday} + 1` })
      .where(eq(users.id, userId));
  }

  async resetUserPromptsIfNewDay(user: User): Promise<User> {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = user.lastResetDate ? String(user.lastResetDate) : '';
    
    if (lastReset !== today) {
      const [updated] = await db.update(users)
        .set({ 
          promptsUsedToday: 0, 
          lastResetDate: today 
        })
        .where(eq(users.id, user.id))
        .returning();
      return updated;
    }
    
    return user;
  }

  async upgradeUserToPro(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<void> {
    await db.update(users)
      .set({ 
        plan: "pro",
        stripeCustomerId,
        stripeSubscriptionId,
      })
      .where(eq(users.id, userId));
  }

  async downgradeUserToFree(stripeSubscriptionId: string): Promise<void> {
    await db.update(users)
      .set({ 
        plan: "free",
        stripeSubscriptionId: null,
      })
      .where(eq(users.stripeSubscriptionId, stripeSubscriptionId));
  }

  async createOptimization(optimization: InsertOptimization): Promise<void> {
    await db.insert(optimizations).values(optimization);
  }

  async getOptimizationHistory(userId: string, limit: number = 20): Promise<Optimization[]> {
    const result = await db.select()
      .from(optimizations)
      .where(eq(optimizations.userId, userId))
      .orderBy(desc(optimizations.createdAt))
      .limit(limit);
    return result;
  }

  async deleteOptimization(userId: string, optimizationId: number): Promise<void> {
    await db.delete(optimizations)
      .where(
        and(
          eq(optimizations.id, optimizationId),
          eq(optimizations.userId, userId)
        )
      );
  }

  async deleteAllOptimizations(userId: string): Promise<void> {
    await db.delete(optimizations)
      .where(eq(optimizations.userId, userId));
  }
}

export const storage = new DatabaseStorage();
