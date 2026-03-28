import {
  optimizations, type InsertOptimization, type Optimization, PLAN_LIMITS,
  users, type User, sessionUsage, type SessionUsage, sessions,
  teams, type Team, type InsertTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  sharedPrompts, type SharedPrompt, type InsertSharedPrompt,
  promptComments, type PromptComment, type InsertPromptComment,
  presenceSessions, type PresenceSession,
  teamInvites, type TeamInvite,
  emailRateLimits, type EmailRateLimit,
  personalStyles, type PersonalStyle, type InsertPersonalStyle,
  usageTracking, type UsageTracking, type InsertUsageTracking,
  pipelineMetrics
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc, and, gt, gte, lt } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // Auth methods
  createUser(email: string, passwordHash: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  updateUserProfile(userId: string, data: { displayName?: string; avatarColor?: string }): Promise<User | null>;
  deleteUser(userId: string): Promise<void>;
  updateUserStripeCustomer(userId: string, stripeCustomerId: string): Promise<void>;
  // Subscription methods
  upgradeUser(userId: string, plan: "pro" | "premium", stripeCustomerId: string, stripeSubscriptionId: string): Promise<void>;
  downgradeUserToFree(stripeSubscriptionId: string): Promise<void>;
  setUserPlan(userId: string, plan: "free" | "pro" | "premium"): Promise<void>; // Admin function
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | null>;
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

  // Email verification methods
  setVerificationToken(userId: string, token: string, expires: Date): Promise<void>;
  getUserByVerificationToken(token: string): Promise<User | null>;
  markEmailVerified(userId: string): Promise<void>;

  // Password reset methods
  setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | null>;
  updatePassword(userId: string, passwordHash: string): Promise<User | null>;

  // Email rate limiting methods
  canSendEmail(email: string, emailType: string, maxPerHour: number): Promise<boolean>;
  recordEmailSent(email: string, emailType: string): Promise<void>;

  // Personal style methods
  getPersonalStyle(userId: string): Promise<PersonalStyle | null>;
  createPersonalStyle(style: InsertPersonalStyle): Promise<PersonalStyle>;
  updatePersonalStyle(userId: string, data: Partial<InsertPersonalStyle>): Promise<PersonalStyle | null>;
  deletePersonalStyle(userId: string): Promise<void>;

  // Usage tracking methods
  getMonthlyUsage(userId: string, user?: User): Promise<UsageTracking | null>;
  incrementUsage(userId: string, type: 'texts' | 'areaSearches' | 'textEdits' | 'personalStyleAnalyses'): Promise<UsageTracking>;
  resetMonthlyUsage(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private getUsagePeriodKey(user: User, now: Date = new Date()): { month: string; year: number } {
    const anchor = new Date(user.planStartAt || user.createdAt || now);
    anchor.setHours(0, 0, 0, 0);

    let periodStart = new Date(anchor);
    while (true) {
      const next = new Date(periodStart);
      next.setMonth(next.getMonth() + 1);
      next.setHours(0, 0, 0, 0);
      if (next <= now) {
        periodStart = next;
        continue;
      }
      break;
    }

    return {
      month: String(periodStart.getMonth() + 1).padStart(2, '0'),
      year: periodStart.getFullYear(),
    };
  }

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
    return result[0];
  }

  async upgradeUser(userId: string, plan: "pro" | "premium", stripeCustomerId: string, stripeSubscriptionId: string): Promise<void> {
    const existing = await db.select({
      plan: users.plan,
      planStartAt: users.planStartAt,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const current = existing[0];
    const shouldSetPlanStartAt = !current?.planStartAt || current?.plan === "free";

    await db.update(users)
      .set({
        plan,
        stripeCustomerId,
        stripeSubscriptionId,
        ...(shouldSetPlanStartAt ? { planStartAt: new Date() } : {}),
      })
      .where(eq(users.id, userId));
  }

  // Admin function to set plan directly (no Stripe required)
  async setUserPlan(userId: string, plan: "free" | "pro" | "premium"): Promise<void> {
    const existing = await db.select({
      plan: users.plan,
      planStartAt: users.planStartAt,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const current = existing[0];
    const shouldResetPlanStartAt = current?.plan !== plan && (plan === "free" || current?.plan === "free" || !current?.planStartAt);

    await db.update(users)
      .set({
        plan,
        ...(shouldResetPlanStartAt ? { planStartAt: new Date() } : {}),
      })
      .where(eq(users.id, userId));
  }

  async updateUserStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
    await db.update(users)
      .set({ stripeCustomerId })
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

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return result[0] || null;
  }

  async createOptimization(optimization: InsertOptimization): Promise<void> {
    await db.insert(optimizations).values({
      userId: optimization.userId,
      originalPrompt: optimization.originalPrompt,
      improvedPrompt: optimization.improvedPrompt,
      socialCopy: optimization.socialCopy ?? null,
      headline: (optimization as any).headline ?? null,
      instagramCaption: (optimization as any).instagramCaption ?? null,
      showingInvitation: (optimization as any).showingInvitation ?? null,
      shortAd: (optimization as any).shortAd ?? null,
      category: optimization.category,
      improvements: optimization.improvements,
      suggestions: optimization.suggestions,
    });
  }

  async getOptimizationHistory(userId: string, limit: number = 100): Promise<Optimization[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db.select()
      .from(optimizations)
      .where(
        and(
          eq(optimizations.userId, userId),
          gt(optimizations.createdAt, thirtyDaysAgo)
        )
      )
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

  async updateUserProfile(userId: string, data: { displayName?: string; avatarColor?: string }): Promise<User | null> {
    const [result] = await db.update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return result || null;
  }

  async deleteUser(userId: string): Promise<void> {
    // 1. Delete owned teams (cascade: comments, invites, presence, members, prompts)
    const ownedTeams = await db.select({ id: teams.id }).from(teams).where(eq(teams.ownerId, userId));
    for (const team of ownedTeams) {
      await this.deleteTeam(team.id);
    }
    // 2. Remove from teams where member (not owner)
    await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
    // 3. Comments on any prompt
    await db.delete(promptComments).where(eq(promptComments.userId, userId));
    // 4. Presence sessions
    await db.delete(presenceSessions).where(eq(presenceSessions.userId, userId));
    // 5. Team invites sent by user
    await db.delete(teamInvites).where(eq(teamInvites.invitedBy, userId));
    // 6. Shared prompts created by user (not in owned teams — those deleted above)
    await db.delete(sharedPrompts).where(eq(sharedPrompts.creatorId, userId));
    // 7. Optimizations history
    await db.delete(optimizations).where(eq(optimizations.userId, userId));
    // 8. Personal styles
    await db.delete(personalStyles).where(eq(personalStyles.userId, userId));
    // 9. Usage tracking
    await db.delete(usageTracking).where(eq(usageTracking.userId, userId));
    // 10. Email rate limits
    await db.delete(emailRateLimits).where(eq(emailRateLimits.email,
      (await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1).then(r => r[0]?.email || ''))
    ));
    // 11. Sessions
    await db.delete(sessions).where(sql`sess->>'userId' = ${userId}`);
    // 12. User
    await db.delete(users).where(eq(users.id, userId));
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
    const results = await db
      .select({ team: teams })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));

    return results.map(r => r.team);
  }

  async updateTeam(teamId: number, data: Partial<InsertTeam>): Promise<Team | null> {
    const [result] = await db.update(teams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teams.id, teamId))
      .returning();
    return result || null;
  }

  async deleteTeam(teamId: number): Promise<void> {
    const prompts = await db.select({ id: sharedPrompts.id }).from(sharedPrompts).where(eq(sharedPrompts.teamId, teamId));
    for (const prompt of prompts) {
      await db.delete(promptComments).where(eq(promptComments.promptId, prompt.id));
    }
    await db.delete(presenceSessions).where(eq(presenceSessions.teamId, teamId));
    await db.delete(teamInvites).where(eq(teamInvites.teamId, teamId));
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    await db.delete(sharedPrompts).where(eq(sharedPrompts.teamId, teamId));
    await db.delete(teams).where(eq(teams.id, teamId));
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [result] = await db.insert(teamMembers).values(member).returning();
    return result;
  }

  async getTeamMembers(teamId: number): Promise<(TeamMember & { user: User })[]> {
    const results = await db
      .select()
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return results.map(row => ({
      ...row.teamMembers,
      user: row.users,
    }));
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
    const results = await db
      .select()
      .from(promptComments)
      .innerJoin(users, eq(promptComments.userId, users.id))
      .where(eq(promptComments.promptId, promptId))
      .orderBy(desc(promptComments.createdAt));

    return results.map(row => ({
      ...row.promptComments,
      user: row.users,
    }));
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
    const results = await db
      .select()
      .from(presenceSessions)
      .innerJoin(users, eq(presenceSessions.userId, users.id))
      .where(and(
        eq(presenceSessions.promptId, promptId),
        gt(presenceSessions.lastSeen, threshold)
      ));

    return results.map(row => ({
      ...row.presenceSessions,
      user: row.users,
    }));
  }

  async cleanupStalePresence(): Promise<void> {
    const threshold = new Date(Date.now() - 10 * 60 * 1000);
    await db.delete(presenceSessions)
      .where(lt(presenceSessions.lastSeen, threshold));
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

  async setVerificationToken(userId: string, token: string, expires: Date): Promise<void> {
    await db.update(users)
      .set({
        verificationToken: token,
        verificationTokenExpires: expires,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserByVerificationToken(token: string): Promise<User | null> {
    const result = await db.select()
      .from(users)
      .where(eq(users.verificationToken, token));
    return result[0] || null;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await db.update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await db.update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getUserByPasswordResetToken(token: string): Promise<User | null> {
    const result = await db.select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return result[0] || null;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User | null> {
    const result = await db.update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0] || null;
  }

  async canSendEmail(email: string, emailType: string, maxPerHour: number): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await db.select()
      .from(emailRateLimits)
      .where(and(
        eq(emailRateLimits.email, email.toLowerCase()),
        eq(emailRateLimits.emailType, emailType),
        gte(emailRateLimits.sentAt, oneHourAgo)
      ));
    return result.length < maxPerHour;
  }

  async recordEmailSent(email: string, emailType: string): Promise<void> {
    await db.insert(emailRateLimits).values({
      email: email.toLowerCase(),
      emailType,
    });
  }

  async getPersonalStyle(userId: string): Promise<PersonalStyle | null> {
    const result = await db.select()
      .from(personalStyles)
      .where(eq(personalStyles.userId, userId))
      .limit(1);
    return result[0] || null;
  }

  async createPersonalStyle(style: InsertPersonalStyle): Promise<PersonalStyle> {
    const [result] = await db.insert(personalStyles)
      .values(style)
      .returning();
    return result;
  }

  async updatePersonalStyle(userId: string, data: Partial<InsertPersonalStyle>): Promise<PersonalStyle | null> {
    const [result] = await db.update(personalStyles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(personalStyles.userId, userId))
      .returning();
    return result || null;
  }

  async deletePersonalStyle(userId: string): Promise<void> {
    await db.delete(personalStyles)
      .where(eq(personalStyles.userId, userId));
  }

  async getMonthlyUsage(userId: string, user?: User): Promise<UsageTracking | null> {
    const now = new Date();
    const resolvedUser = user || await this.getUserById(userId);
    if (!resolvedUser) return null;

    const { month, year } = this.getUsagePeriodKey(resolvedUser, now);

    const result = await db.select()
      .from(usageTracking)
      .where(and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.month, month),
        eq(usageTracking.year, year)
      ))
      .limit(1);

    return result[0] || null;
  }

  async incrementUsage(userId: string, type: 'texts' | 'areaSearches' | 'textEdits' | 'personalStyleAnalyses' | 'hemnetAnalyses'): Promise<UsageTracking> {
    const now = new Date();

    // Get user's current plan
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const { month, year } = this.getUsagePeriodKey(user, now);

    // Atomic upsert — eliminates TOCTOU race condition where two concurrent
    // requests could both see "no record" and both INSERT, causing duplicate
    // key errors or double-counting.
    const [result] = await db.insert(usageTracking)
      .values({
        userId,
        month,
        year,
        planType: user.plan,
        textsGenerated: type === 'texts' ? 1 : 0,
        areaSearchesUsed: type === 'areaSearches' ? 1 : 0,
        textEditsUsed: type === 'textEdits' ? 1 : 0,
        personalStyleAnalyses: type === 'personalStyleAnalyses' ? 1 : 0,
        hemnetAnalysesUsed: type === 'hemnetAnalyses' ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: [usageTracking.userId, usageTracking.month, usageTracking.year],
        set: {
          textsGenerated: type === 'texts'
            ? sql`${usageTracking.textsGenerated} + 1`
            : sql`${usageTracking.textsGenerated}`,
          areaSearchesUsed: type === 'areaSearches'
            ? sql`${usageTracking.areaSearchesUsed} + 1`
            : sql`${usageTracking.areaSearchesUsed}`,
          textEditsUsed: type === 'textEdits'
            ? sql`${usageTracking.textEditsUsed} + 1`
            : sql`${usageTracking.textEditsUsed}`,
          personalStyleAnalyses: type === 'personalStyleAnalyses'
            ? sql`${usageTracking.personalStyleAnalyses} + 1`
            : sql`${usageTracking.personalStyleAnalyses}`,
          hemnetAnalysesUsed: type === 'hemnetAnalyses'
            ? sql`${usageTracking.hemnetAnalysesUsed} + 1`
            : sql`${usageTracking.hemnetAnalysesUsed}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  async resetMonthlyUsage(userId: string): Promise<void> {
    await db.delete(usageTracking)
      .where(eq(usageTracking.userId, userId));
  }

  // ==========================================
  // ENTERPRISE: Pipeline Observability
  // ==========================================

  async savePipelineMetrics(metrics: {
    runId: string;
    userId: string;
    plan: string;
    success: boolean;
    totalDurationMs: number;
    totalAiCalls: number;
    totalTokensUsed?: number;
    totalCostUsd?: number;
    finalQualityScore?: number;
    finalWordCount?: number;
    rescueAttempts: number;
    polishAttempts: number;
    fastPathTaken: boolean;
    structuredDataUsed: boolean;
    featuresUsed: string[];
    errorCount: number;
    steps: any[];
    createdAt: Date;
  }): Promise<void> {
    await db.insert(pipelineMetrics).values({
      ...metrics,
      totalCostUsd: metrics.totalCostUsd?.toString() || null,
      steps: sql`${JSON.stringify(metrics.steps)}::jsonb`,
      featuresUsed: sql`${JSON.stringify(metrics.featuresUsed)}::jsonb`,
    } as any);
  }

  async getPipelineMetrics(
    userId?: string,
    limit: number = 100,
    since?: Date
  ): Promise<any[]> {
    let query: any = db.select().from(pipelineMetrics);

    if (userId) {
      query = query.where(eq(pipelineMetrics.userId, userId));
    }

    if (since) {
      query = query.where(gte(pipelineMetrics.createdAt, since));
    }

    const results: any[] = await query
      .orderBy(desc(pipelineMetrics.createdAt))
      .limit(limit);

    return results.map((r: any) => ({
      ...r,
      steps: typeof r.steps === 'string' ? JSON.parse(r.steps) : r.steps,
      featuresUsed: typeof r.featuresUsed === 'string' ? JSON.parse(r.featuresUsed) : r.featuresUsed,
    }));
  }

  async getPipelineStats(since?: Date): Promise<{
    totalRuns: number;
    successRate: number;
    avgDurationMs: number;
    avgCostUsd: number;
    totalCostUsd: number;
    avgQualityScore: number;
  }> {
    let query: any = db.select().from(pipelineMetrics);

    if (since) {
      query = query.where(gte(pipelineMetrics.createdAt, since));
    }

    const results: any[] = await query;

    if (results.length === 0) {
      return {
        totalRuns: 0,
        successRate: 0,
        avgDurationMs: 0,
        avgCostUsd: 0,
        totalCostUsd: 0,
        avgQualityScore: 0,
      };
    }

    const successful = results.filter(r => r.success).length;
    const totalCost = results.reduce((sum, r) => sum + (parseFloat(r.totalCostUsd || '0') || 0), 0);
    const avgQuality = results
      .filter(r => r.finalQualityScore !== null)
      .reduce((sum, r) => sum + (r.finalQualityScore || 0), 0) /
      results.filter(r => r.finalQualityScore !== null).length || 0;

    return {
      totalRuns: results.length,
      successRate: successful / results.length,
      avgDurationMs: results.reduce((sum, r) => sum + r.totalDurationMs, 0) / results.length,
      avgCostUsd: totalCost / results.length,
      totalCostUsd: totalCost,
      avgQualityScore: avgQuality,
    };
  }

  // ==========================================
  // ENTERPRISE: A/B Testing
  // ==========================================

  async saveExperimentResult(result: {
    experimentId: string;
    variantId: string;
    userId: string;
    metrics: Record<string, number>;
    timestamp: Date;
  }): Promise<void> {
    await db.insert(experimentResults).values({
      ...result,
      metrics: sql`${JSON.stringify(result.metrics)}::jsonb`,
    } as any);
  }

  async getExperimentResults(
    experimentId: string,
    since?: Date
  ): Promise<any[]> {
    let query: any = db.select()
      .from(experimentResults)
      .where(eq(experimentResults.experimentId, experimentId));

    if (since) {
      query = query.where(gte(experimentResults.timestamp, since));
    }

    const results: any[] = await query.orderBy(experimentResults.timestamp);

    return results.map((r: any) => ({
      ...r,
      metrics: typeof r.metrics === 'string' ? JSON.parse(r.metrics) : r.metrics,
    }));
  }

  async saveUserExperimentAssignment(
    userId: string,
    experimentId: string,
    variantId: string
  ): Promise<void> {
    await db.insert(experimentAssignments)
      .values({
        userId,
        experimentId,
        variantId,
        assignedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [experimentAssignments.userId, experimentAssignments.experimentId],
        set: { variantId, assignedAt: new Date() },
      });
  }

  async getUserExperimentAssignment(
    userId: string,
    experimentId: string
  ): Promise<string | null> {
    const result = await db.select()
      .from(experimentAssignments)
      .where(and(
        eq(experimentAssignments.userId, userId),
        eq(experimentAssignments.experimentId, experimentId)
      ))
      .limit(1);

    return result[0]?.variantId || null;
  }

  async getAllUserAssignments(userId: string): Promise<Record<string, string>> {
    const results = await db.select()
      .from(experimentAssignments)
      .where(eq(experimentAssignments.userId, userId));

    const assignments: Record<string, string> = {};
    for (const r of results) {
      assignments[r.experimentId] = r.variantId;
    }
    return assignments;
  }
}

export const storage = new DatabaseStorage();
