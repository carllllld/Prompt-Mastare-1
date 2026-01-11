import { pgTable, text, serial, timestamp, jsonb, integer, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
import { users } from "./models/auth";

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

// UPPDATERAT SCHEMA MED PLATFORM
export const optimizeRequestSchema = z.object({
  prompt: z.string().min(1, "Vänligen fyll i information om bostaden"),
  type: z.enum(["apartment", "house"]).default("apartment"),
  platform: z.enum(["hemnet", "general"]).default("hemnet"),
});

export const optimizeResponseSchema = z.object({
  originalPrompt: z.string(),
  improvedPrompt: z.string(),
  improvements: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const userStatusSchema = z.object({
  plan: z.enum(["free", "basic", "pro"]),
  promptsUsedToday: z.number(),
  promptsRemaining: z.number(),
  dailyLimit: z.number(),
  isLoggedIn: z.boolean(),
  resetTime: z.string(),
  stripeCustomerId: z.string().optional().nullable(),
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const PLAN_LIMITS = { free: 2, basic: 20, pro: 50 } as const;
export const CHARACTER_LIMITS = { free: 500, basic: 1000, pro: 2000 } as const;
export const PLAN_PRICES = {
  basic: { amount: 399, currency: "usd", display: "$3.99" },
  pro: { amount: 699, currency: "usd", display: "$6.99" },
} as const;

export type PlanType = "free" | "basic" | "pro";