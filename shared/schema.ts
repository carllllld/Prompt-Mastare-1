import { pgTable, text, serial, timestamp, jsonb, integer, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

import { users } from "./models/auth";

// Session usage tracking for anonymous users
export const sessionUsage = pgTable("session_usage", {
  sessionId: varchar("session_id").primaryKey(),
  promptsUsedToday: integer("prompts_used_today").notNull().default(0),
  lastResetDate: date("last_reset_date").defaultNow(),
});

export type SessionUsage = typeof sessionUsage.$inferSelect;
export type InsertSessionUsage = typeof sessionUsage.$inferInsert;

export const optimizations = pgTable("optimizations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  originalPrompt: text("original_prompt").notNull(),
  improvedPrompt: text("improved_prompt").notNull(),
  category: text("category").notNull(),
  improvements: jsonb("improvements").$type<string[]>().notNull(),
  suggestions: jsonb("suggestions").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOptimizationSchema = createInsertSchema(optimizations).omit({ id: true, createdAt: true });
export type Optimization = typeof optimizations.$inferSelect;
export type InsertOptimization = z.infer<typeof insertOptimizationSchema>;

export const optimizeRequestSchema = z.object({
  prompt: z.string().min(1, "Please enter a prompt to optimize"),
  type: z.string().default("General"),
});

export const optimizeResponseSchema = z.object({
  originalPrompt: z.string(),
  improvedPrompt: z.string(),
  improvements: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const userStatusSchema = z.object({
  plan: z.enum(["free", "pro"]),
  promptsUsedToday: z.number(),
  promptsRemaining: z.number(),
  dailyLimit: z.number(),
  isLoggedIn: z.boolean(),
  resetTime: z.string(), // ISO timestamp of next reset
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const PLAN_LIMITS = {
  free: 3,
  pro: 100,
} as const;
