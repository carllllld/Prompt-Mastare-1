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
  socialCopy: text("social_copy"),
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
  platform: z.string().default("general"),
  wordCountMin: z.number().optional(),
  wordCountMax: z.number().optional(),
  imageUrls: z.array(z.string()).optional(),
});

export const optimizeResponseSchema = z.object({
  originalPrompt: z.string(),
  improvedPrompt: z.string(),
  highlights: z.array(z.string()).optional(),
  analysis: z.object({
    identified_epoch: z.string().optional(),
    target_group: z.string().optional(),
    area_advantage: z.string().optional(),
    pricing_factors: z.string().optional(),
    association_status: z.string().optional(),
  }).optional(),
  socialCopy: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  instagramCaption: z.string().optional().nullable(),
  showingInvitation: z.string().optional().nullable(),
  shortAd: z.string().optional().nullable(),
  improvements: z.array(z.string()),
  suggestions: z.array(z.string()),
  pro_tips: z.array(z.string()).optional(),
  critical_gaps: z.array(z.string()).optional(),
  improvement_suggestions: z.object({
    tone: z.string().optional(),
    target_audience_fit: z.string().optional(),
    missing_elements: z.array(z.string()).optional(),
    strengths: z.array(z.string()).optional(),
  }).optional(),
  factCheck: z.object({
    fact_check_passed: z.boolean().optional(),
    issues: z.array(z.object({
      type: z.string().optional(),
      quote: z.string().optional(),
      reason: z.string().optional(),
    })).optional(),
    quality_score: z.number().optional(),
    broker_tips: z.array(z.string()).optional(),
  }).optional().nullable(),
  wordCount: z.number().optional(),
});

export const userStatusSchema = z.object({
  plan: z.enum(["free", "pro"]),
  promptsUsedToday: z.number(),
  promptsRemaining: z.number(),
  monthlyLimit: z.number(),
  isLoggedIn: z.boolean(),
  resetTime: z.string(),
  stripeCustomerId: z.string().optional().nullable(),
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const PLAN_LIMITS = {
  free: 2,
  pro: 20,
} as const;

// Ordgränser för objektbeskrivningar
export const WORD_LIMITS = {
  free: { min: 200, max: 300 },
  pro: { min: 200, max: 600, default: { min: 350, max: 450 } },
} as const;

export const PLAN_PRICES = {
  pro: { amount: 19900, currency: "sek", display: "199kr" },
} as const;

export type PlanType = "free" | "pro";
