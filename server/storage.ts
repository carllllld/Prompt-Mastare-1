import { 
  optimizations, type InsertOptimization, type Optimization, PLAN_LIMITS, 
  users, type User, sessionUsage, type SessionUsage,
  teams, type Team, type InsertTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  sharedPrompts, type SharedPrompt, type InsertSharedPrompt,
  promptComments, type PromptComment, type InsertPromptComment,
  presenceSessions, type PresenceSession,
  teamInvites, type TeamInvite
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, gt } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // Auth methods
  createUser(email: string, passwordHash: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  updateUserProfile(userId: string, data: { displayName?: string; avatarColor?: string }): Promise<User | null>;
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

  // Team methods
  createTeam(team: InsertTeam): Promise<Team>;
  getTeamById(teamId: number): Promise<Team | null>;
  getTeamBySlug(slug: string): Promise<Team | null>;
  getUserTeams(userId: string): Promise<Team[]>;
  updateTeam(teamId: number, data: Partial<InsertTeam>): Promise<Team | null>;
  deleteTeam(teamId: number): Promise<void>;

  // Team member methods
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: number): Promise<(TeamMember & { user: User })[]>;
  getUserTeamMembership(userId: string, teamId: number): Promise<TeamMember | null>;
  updateTeamMemberRole(memberId: number, role: string): Promise<TeamMember | null>;
  removeTeamMember(memberId: number): Promise<void>;

  // Shared prompt methods
  createSharedPrompt(prompt: InsertSharedPrompt): Promise<SharedPrompt>;
  getSharedPromptById(promptId: number): Promise<SharedPrompt | null>;
  getTeamSharedPrompts(teamId: number): Promise<SharedPrompt[]>;
  updateSharedPrompt(promptId: number, data: Partial<InsertSharedPrompt>): Promise<SharedPrompt | null>;
  deleteSharedPrompt(promptId: number): Promise<void>;
  lockPrompt(promptId: number, userId: string): Promise<SharedPrompt | null>;
  unlockPrompt(promptId: number): Promise<SharedPrompt | null>;

  // Comment methods
  createComment(comment: InsertPromptComment): Promise<PromptComment>;
  getPromptComments(promptId: number): Promise<(PromptComment & { user: User })[]>;
  deleteComment(commentId: number): Promise<void>;

  // Presence methods
  updatePresence(userId: string, teamId: number | null, promptId: number | null, cursorPosition?: number): Promise<void>;
  getTeamPresence(teamId: number): Promise<PresenceSession[]>;
  getPromptPresence(promptId: number): Promise<(PresenceSession & { user: User })[]>;
  cleanupStalePresence(): Promise<void>;

  // Invite methods
  createTeamInvite(teamId: number, email: string, invitedBy: string): Promise<TeamInvite>;
  getInviteByToken(token: string): Promise<TeamInvite | null>;
  deleteInvite(inviteId: number): Promise<void>;
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
    await db.insert(optimizations).values({
      userId: optimization.userId,
      originalPrompt: optimization.originalPrompt,
      improvedPrompt: optimization.improvedPrompt,
      socialCopy: optimization.socialCopy ?? "",
      category: optimization.category,
      improvements: optimization.improvements,
      suggestions: optimization.suggestions,
    });
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

    let lastReset = '';
    if (result[0].lastResetDate) {
      lastReset = String(result[0].lastResetDate).split('T')[0];
    }

    if (lastReset !== today) {
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

  async updateUserProfile(userId: string, data: { displayName?: string; avatarColor?: string }): Promise<User | null> {
    const [result] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result || null;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [result] = await db.insert(teams).values(team).returning();
    return result;
  }

  async getTeamById(teamId: number): Promise<Team | null> {
    const result = await db.select().from(teams).where(eq(teams.id, teamId));
    return result[0] || null;
  }

  async getTeamBySlug(slug: string): Promise<Team | null> {
    const result = await db.select().from(teams).where(eq(teams.slug, slug));
    return result[0] || null;
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const memberships = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    if (memberships.length === 0) return [];

    const teamIds = memberships.map(m => m.teamId);
    const result: Team[] = [];
    for (const teamId of teamIds) {
      const team = await this.getTeamById(teamId);
      if (team) result.push(team);
    }
    return result;
  }

  async updateTeam(teamId: number, data: Partial<InsertTeam>): Promise<Team | null> {
    const [result] = await db.update(teams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teams.id, teamId))
      .returning();
    return result || null;
  }

  async deleteTeam(teamId: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await db.delete(sharedPrompts).where(eq(sharedPrompts.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [result] = await db.insert(teamMembers).values(member).returning();
    return result;
  }

  async getTeamMembers(teamId: number): Promise<(TeamMember & { user: User })[]> {
    const members = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    const results: (TeamMember & { user: User })[] = [];
    for (const member of members) {
      const user = await this.getUserById(member.userId);
      if (user) {
        results.push({ ...member, user });
      }
    }
    return results;
  }

  async getUserTeamMembership(userId: string, teamId: number): Promise<TeamMember | null> {
    const result = await db.select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)));
    return result[0] || null;
  }

  async updateTeamMemberRole(memberId: number, role: string): Promise<TeamMember | null> {
    const [result] = await db.update(teamMembers)
      .set({ role })
      .where(eq(teamMembers.id, memberId))
      .returning();
    return result || null;
  }

  async removeTeamMember(memberId: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, memberId));
  }

  async createSharedPrompt(prompt: InsertSharedPrompt): Promise<SharedPrompt> {
    const [result] = await db.insert(sharedPrompts).values(prompt).returning();
    return result;
  }

  async getSharedPromptById(promptId: number): Promise<SharedPrompt | null> {
    const result = await db.select().from(sharedPrompts).where(eq(sharedPrompts.id, promptId));
    return result[0] || null;
  }

  async getTeamSharedPrompts(teamId: number): Promise<SharedPrompt[]> {
    return await db.select()
      .from(sharedPrompts)
      .where(eq(sharedPrompts.teamId, teamId))
      .orderBy(desc(sharedPrompts.updatedAt));
  }

  async updateSharedPrompt(promptId: number, data: Partial<InsertSharedPrompt>): Promise<SharedPrompt | null> {
    const [result] = await db.update(sharedPrompts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sharedPrompts.id, promptId))
      .returning();
    return result || null;
  }

  async deleteSharedPrompt(promptId: number): Promise<void> {
    await db.delete(promptComments).where(eq(promptComments.promptId, promptId));
    await db.delete(sharedPrompts).where(eq(sharedPrompts.id, promptId));
  }

  async lockPrompt(promptId: number, userId: string): Promise<SharedPrompt | null> {
    const [result] = await db.update(sharedPrompts)
      .set({ isLocked: true, lockedBy: userId, lockedAt: new Date(), updatedAt: new Date() })
      .where(eq(sharedPrompts.id, promptId))
      .returning();
    return result || null;
  }

  async unlockPrompt(promptId: number): Promise<SharedPrompt | null> {
    const [result] = await db.update(sharedPrompts)
      .set({ isLocked: false, lockedBy: null, lockedAt: null, updatedAt: new Date() })
      .where(eq(sharedPrompts.id, promptId))
      .returning();
    return result || null;
  }

  async createComment(comment: InsertPromptComment): Promise<PromptComment> {
    const [result] = await db.insert(promptComments).values(comment).returning();
    return result;
  }

  async getPromptComments(promptId: number): Promise<(PromptComment & { user: User })[]> {
    const comments = await db.select()
      .from(promptComments)
      .where(eq(promptComments.promptId, promptId))
      .orderBy(desc(promptComments.createdAt));

    const results: (PromptComment & { user: User })[] = [];
    for (const comment of comments) {
      const user = await this.getUserById(comment.userId);
      if (user) {
        results.push({ ...comment, user });
      }
    }
    return results;
  }

  async deleteComment(commentId: number): Promise<void> {
    await db.delete(promptComments).where(eq(promptComments.id, commentId));
  }

  async updatePresence(userId: string, teamId: number | null, promptId: number | null, cursorPosition?: number): Promise<void> {
    const existing = await db.select()
      .from(presenceSessions)
      .where(eq(presenceSessions.userId, userId));

    if (existing.length > 0) {
      await db.update(presenceSessions)
        .set({ teamId, promptId, lastSeen: new Date(), cursorPosition })
        .where(eq(presenceSessions.userId, userId));
    } else {
      await db.insert(presenceSessions).values({
        userId,
        teamId,
        promptId,
        lastSeen: new Date(),
        cursorPosition,
      });
    }
  }

  async getTeamPresence(teamId: number): Promise<PresenceSession[]> {
    const threshold = new Date(Date.now() - 5 * 60 * 1000);
    return await db.select()
      .from(presenceSessions)
      .where(and(
        eq(presenceSessions.teamId, teamId),
        gt(presenceSessions.lastSeen, threshold)
      ));
  }

  async getPromptPresence(promptId: number): Promise<(PresenceSession & { user: User })[]> {
    const threshold = new Date(Date.now() - 2 * 60 * 1000);
    const sessions = await db.select()
      .from(presenceSessions)
      .where(and(
        eq(presenceSessions.promptId, promptId),
        gt(presenceSessions.lastSeen, threshold)
      ));

    const results: (PresenceSession & { user: User })[] = [];
    for (const session of sessions) {
      const user = await this.getUserById(session.userId);
      if (user) {
        results.push({ ...session, user });
      }
    }
    return results;
  }

  async cleanupStalePresence(): Promise<void> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    await db.delete(presenceSessions)
      .where(gt(presenceSessions.lastSeen, threshold));
  }

  async createTeamInvite(teamId: number, email: string, invitedBy: string): Promise<TeamInvite> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [result] = await db.insert(teamInvites).values({
      teamId,
      email,
      invitedBy,
      token,
      expiresAt,
    }).returning();
    return result;
  }

  async getInviteByToken(token: string): Promise<TeamInvite | null> {
    const result = await db.select()
      .from(teamInvites)
      .where(eq(teamInvites.token, token));
    return result[0] || null;
  }

  async deleteInvite(inviteId: number): Promise<void> {
    await db.delete(teamInvites).where(eq(teamInvites.id, inviteId));
  }
}

export const storage = new DatabaseStorage();