import { pgTable, text, serial, timestamp, jsonb, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  email: text("email"),
  plan: text("plan").notNull().default("free"),
  promptsUsedToday: integer("prompts_used_today").notNull().default(0),
  lastResetDate: date("last_reset_date").notNull().defaultNow(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const optimizations = pgTable("optimizations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
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
  prompt: z.string().min(1, "Prompten får inte vara tom"),
  type: z.string().default("General"),
});

export const optimizeResponseSchema = z.object({
  improvedPrompt: z.string(),
  improvements: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const userStatusSchema = z.object({
  plan: z.enum(["free", "pro"]),
  promptsUsedToday: z.number(),
  promptsRemaining: z.number(),
  dailyLimit: z.number(),
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const PLAN_LIMITS = {
  free: 3,
  pro: 100,
} as const;
