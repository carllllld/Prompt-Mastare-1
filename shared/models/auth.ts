import { sql } from "drizzle-orm";
import { jsonb, pgTable, timestamp, varchar, integer, date } from "drizzle-orm/pg-core";

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

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type SessionUsage = typeof sessionUsage.$inferSelect;
