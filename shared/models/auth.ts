import { sql } from "drizzle-orm";
import { jsonb, pgTable, timestamp, varchar, integer, date, serial, text, boolean } from "drizzle-orm/pg-core";

// Session storage table for express-session with connect-pg-simple
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// User storage table with email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  plan: varchar("plan").notNull().default("free"),
  promptsUsedToday: integer("prompts_used_today").notNull().default(0),
  lastResetDate: date("last_reset_date").defaultNow(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Anonymous session usage tracking
export const sessionUsage = pgTable("session_usage", {
  sessionId: varchar("session_id").primaryKey(),
  promptsUsedToday: integer("prompts_used_today").notNull().default(0),
  lastResetDate: date("last_reset_date").defaultNow(),
});

// Teams for collaboration
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team memberships
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Shared prompts within teams
export const sharedPrompts = pgTable("shared_prompts", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category").default("General"),
  optimizedContent: text("optimized_content"),
  status: varchar("status").notNull().default("draft"),
  isLocked: boolean("is_locked").default(false),
  lockedBy: varchar("locked_by").references(() => users.id),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments on shared prompts
export const promptComments = pgTable("prompt_comments", {
  id: serial("id").primaryKey(),
  promptId: integer("prompt_id").references(() => sharedPrompts.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Presence tracking for real-time collaboration
export const presenceSessions = pgTable("presence_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  teamId: integer("team_id").references(() => teams.id),
  promptId: integer("prompt_id").references(() => sharedPrompts.id),
  lastSeen: timestamp("last_seen").defaultNow(),
  cursorPosition: integer("cursor_position"),
});

// Team invitations
export const teamInvites = pgTable("team_invites", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  email: varchar("email").notNull(),
  invitedBy: varchar("invited_by").references(() => users.id).notNull(),
  token: varchar("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type SessionUsage = typeof sessionUsage.$inferSelect;

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

export type SharedPrompt = typeof sharedPrompts.$inferSelect;
export type InsertSharedPrompt = typeof sharedPrompts.$inferInsert;

export type PromptComment = typeof promptComments.$inferSelect;
export type InsertPromptComment = typeof promptComments.$inferInsert;

export type PresenceSession = typeof presenceSessions.$inferSelect;
export type InsertPresenceSession = typeof presenceSessions.$inferInsert;

export type TeamInvite = typeof teamInvites.$inferSelect;
export type InsertTeamInvite = typeof teamInvites.$inferInsert;

export type TeamRole = "owner" | "admin" | "member";
export type PromptStatus = "draft" | "in_progress" | "optimized" | "archived";
