import { optimizations, users, type InsertOptimization, type User, type Optimization, PLAN_LIMITS } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and } from "drizzle-orm";

export interface IStorage {
  getOrCreateUser(sessionId: string): Promise<User>;
  getUserBySessionId(sessionId: string): Promise<User | null>;
  incrementUserPrompts(userId: number): Promise<void>;
  resetUserPromptsIfNewDay(user: User): Promise<User>;
  upgradeUserToPro(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<void>;
  downgradeUserToFree(stripeSubscriptionId: string): Promise<void>;
  createOptimization(optimization: InsertOptimization): Promise<void>;
  getOptimizationHistory(userId: number, limit?: number): Promise<Optimization[]>;
  deleteOptimization(userId: number, optimizationId: number): Promise<void>;
  deleteAllOptimizations(userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getOrCreateUser(sessionId: string): Promise<User> {
    let user = await this.getUserBySessionId(sessionId);
    
    if (!user) {
      const [newUser] = await db.insert(users).values({
        sessionId,
        plan: "free",
        promptsUsedToday: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
      }).returning();
      user = newUser;
    }
    
    return this.resetUserPromptsIfNewDay(user);
  }

  async getUserBySessionId(sessionId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.sessionId, sessionId));
    return result[0] || null;
  }

  async incrementUserPrompts(userId: number): Promise<void> {
    await db.update(users)
      .set({ promptsUsedToday: sql`${users.promptsUsedToday} + 1` })
      .where(eq(users.id, userId));
  }

  async resetUserPromptsIfNewDay(user: User): Promise<User> {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = String(user.lastResetDate);
    
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

  async upgradeUserToPro(userId: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<void> {
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

  async getOptimizationHistory(userId: number, limit: number = 20): Promise<Optimization[]> {
    const result = await db.select()
      .from(optimizations)
      .where(eq(optimizations.userId, userId))
      .orderBy(desc(optimizations.createdAt))
      .limit(limit);
    return result;
  }

  async deleteOptimization(userId: number, optimizationId: number): Promise<void> {
    await db.delete(optimizations)
      .where(
        and(
          eq(optimizations.id, optimizationId),
          eq(optimizations.userId, userId)
        )
      );
  }

  async deleteAllOptimizations(userId: number): Promise<void> {
    await db.delete(optimizations)
      .where(eq(optimizations.userId, userId));
  }
}

export const storage = new DatabaseStorage();
