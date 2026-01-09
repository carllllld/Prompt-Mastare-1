import { 
  optimizations, type InsertOptimization, type Optimization, PLAN_LIMITS, 
  users, type User, sessionUsage, type SessionUsage,
  companies, type Company, type InsertCompany,
  policies, type Policy, type InsertPolicy,
  knowledgeBlocks, type KnowledgeBlock, type InsertKnowledgeBlock,
  supportCases, type SupportCase, type InsertSupportCase
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and } from "drizzle-orm";

export interface IStorage {
  // Auth methods
  createUser(email: string, passwordHash: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  // Usage methods
  incrementUserPrompts(userId: string): Promise<void>;
  resetUserPromptsIfNewDay(user: User): Promise<User>;
  // Session usage methods (for anonymous users)
  getSessionUsage(sessionId: string): Promise<{ promptsUsedToday: number }>;
  incrementSessionPrompts(sessionId: string): Promise<void>;
  // Subscription methods
  upgradeUser(userId: string, plan: "basic" | "pro", stripeCustomerId: string, stripeSubscriptionId: string): Promise<void>;
  downgradeUserToFree(stripeSubscriptionId: string): Promise<void>;
  // Optimization history methods
  createOptimization(optimization: InsertOptimization): Promise<void>;
  getOptimizationHistory(userId: string, limit?: number): Promise<Optimization[]>;
  deleteOptimization(userId: string, optimizationId: number): Promise<void>;
  deleteAllOptimizations(userId: string): Promise<void>;
  
  // B2B Company methods
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanyById(companyId: number): Promise<Company | null>;
  getCompanyBySlug(slug: string): Promise<Company | null>;
  updateCompany(companyId: number, data: Partial<InsertCompany>): Promise<Company | null>;
  
  // Policy methods
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  getPolicyByCompanyId(companyId: number): Promise<Policy | null>;
  updatePolicy(policyId: number, data: Partial<InsertPolicy>): Promise<Policy | null>;
  
  // Knowledge Block methods
  createKnowledgeBlock(block: InsertKnowledgeBlock): Promise<KnowledgeBlock>;
  getKnowledgeBlocksByCompanyId(companyId: number, includeInactive?: boolean): Promise<KnowledgeBlock[]>;
  updateKnowledgeBlock(blockId: number, data: Partial<InsertKnowledgeBlock>): Promise<KnowledgeBlock | null>;
  deleteKnowledgeBlock(blockId: number): Promise<void>;
  
  // Support Case methods
  createSupportCase(caseData: InsertSupportCase): Promise<SupportCase>;
  getSupportCaseById(caseId: number): Promise<SupportCase | null>;
  getSupportCasesByCompanyId(companyId: number, limit?: number): Promise<SupportCase[]>;
  updateSupportCase(caseId: number, data: Partial<InsertSupportCase>): Promise<SupportCase | null>;
  
  // User-Company methods
  assignUserToCompany(userId: string, companyId: number, role: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createUser(email: string, passwordHash: string): Promise<User> {
    const [user] = await db.insert(users)
      .values({ email, passwordHash })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  }

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

  async upgradeUser(userId: string, plan: "basic" | "pro", stripeCustomerId: string, stripeSubscriptionId: string): Promise<void> {
    await db.update(users)
      .set({ 
        plan,
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

  async getSessionUsage(sessionId: string): Promise<{ promptsUsedToday: number }> {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.select().from(sessionUsage).where(eq(sessionUsage.sessionId, sessionId));
    
    if (!result[0]) {
      return { promptsUsedToday: 0 };
    }
    
    // Handle date comparison properly - PostgreSQL dates come as strings in YYYY-MM-DD format
    let lastReset = '';
    if (result[0].lastResetDate) {
      lastReset = String(result[0].lastResetDate).split('T')[0];
    }
    
    if (lastReset !== today) {
      // Reset for new day
      await db.update(sessionUsage)
        .set({ promptsUsedToday: 0, lastResetDate: today })
        .where(eq(sessionUsage.sessionId, sessionId));
      return { promptsUsedToday: 0 };
    }
    
    return { promptsUsedToday: result[0].promptsUsedToday };
  }

  async incrementSessionPrompts(sessionId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.select().from(sessionUsage).where(eq(sessionUsage.sessionId, sessionId));
    
    if (!result[0]) {
      await db.insert(sessionUsage).values({
        sessionId,
        promptsUsedToday: 1,
        lastResetDate: today,
      });
    } else {
      await db.update(sessionUsage)
        .set({ promptsUsedToday: sql`${sessionUsage.promptsUsedToday} + 1` })
        .where(eq(sessionUsage.sessionId, sessionId));
    }
  }

  // B2B Company methods
  async createCompany(company: InsertCompany): Promise<Company> {
    const [result] = await db.insert(companies).values(company).returning();
    return result;
  }

  async getCompanyById(companyId: number): Promise<Company | null> {
    const result = await db.select().from(companies).where(eq(companies.id, companyId));
    return result[0] || null;
  }

  async getCompanyBySlug(slug: string): Promise<Company | null> {
    const result = await db.select().from(companies).where(eq(companies.slug, slug));
    return result[0] || null;
  }

  async updateCompany(companyId: number, data: Partial<InsertCompany>): Promise<Company | null> {
    const [result] = await db.update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    return result || null;
  }

  // Policy methods
  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const [result] = await db.insert(policies).values(policy).returning();
    return result;
  }

  async getPolicyByCompanyId(companyId: number): Promise<Policy | null> {
    const result = await db.select().from(policies).where(eq(policies.companyId, companyId));
    return result[0] || null;
  }

  async updatePolicy(policyId: number, data: Partial<InsertPolicy>): Promise<Policy | null> {
    const [result] = await db.update(policies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(policies.id, policyId))
      .returning();
    return result || null;
  }

  // Knowledge Block methods
  async createKnowledgeBlock(block: InsertKnowledgeBlock): Promise<KnowledgeBlock> {
    const [result] = await db.insert(knowledgeBlocks).values(block).returning();
    return result;
  }

  async getKnowledgeBlocksByCompanyId(companyId: number, includeInactive: boolean = false): Promise<KnowledgeBlock[]> {
    if (includeInactive) {
      return await db.select()
        .from(knowledgeBlocks)
        .where(eq(knowledgeBlocks.companyId, companyId))
        .orderBy(desc(knowledgeBlocks.createdAt));
    }
    return await db.select()
      .from(knowledgeBlocks)
      .where(and(eq(knowledgeBlocks.companyId, companyId), eq(knowledgeBlocks.isActive, true)))
      .orderBy(desc(knowledgeBlocks.createdAt));
  }

  async updateKnowledgeBlock(blockId: number, data: Partial<InsertKnowledgeBlock>): Promise<KnowledgeBlock | null> {
    const [result] = await db.update(knowledgeBlocks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(knowledgeBlocks.id, blockId))
      .returning();
    return result || null;
  }

  async deleteKnowledgeBlock(blockId: number): Promise<void> {
    await db.update(knowledgeBlocks)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(knowledgeBlocks.id, blockId));
  }

  // Support Case methods
  async createSupportCase(caseData: InsertSupportCase): Promise<SupportCase> {
    const [result] = await db.insert(supportCases).values(caseData).returning();
    return result;
  }

  async getSupportCaseById(caseId: number): Promise<SupportCase | null> {
    const result = await db.select().from(supportCases).where(eq(supportCases.id, caseId));
    return result[0] || null;
  }

  async getSupportCasesByCompanyId(companyId: number, limit: number = 50): Promise<SupportCase[]> {
    return await db.select()
      .from(supportCases)
      .where(eq(supportCases.companyId, companyId))
      .orderBy(desc(supportCases.createdAt))
      .limit(limit);
  }

  async updateSupportCase(caseId: number, data: Partial<InsertSupportCase>): Promise<SupportCase | null> {
    const [result] = await db.update(supportCases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportCases.id, caseId))
      .returning();
    return result || null;
  }

  // User-Company methods
  async assignUserToCompany(userId: string, companyId: number, role: string): Promise<void> {
    await db.update(users)
      .set({ companyId, role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
