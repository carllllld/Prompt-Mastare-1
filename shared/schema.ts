import { pgTable, text, serial, timestamp, jsonb, integer, date, varchar, boolean } from "drizzle-orm/pg-core";
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

export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  month: text("month").notNull(), // Format: '2024-02'
  year: integer("year").notNull(),
  textsGenerated: integer("texts_generated").default(0).notNull(),
  areaSearchesUsed: integer("area_searches_used").default(0).notNull(),
  textEditsUsed: integer("text_edits_used").default(0).notNull(),
  personalStyleAnalyses: integer("personal_style_analyses").default(0).notNull(),
  planType: text("plan_type").default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const personalStyles = pgTable("personal_styles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  referenceTexts: jsonb("reference_texts").$type<string[]>().notNull(),
  styleProfile: jsonb("style_profile").$type<{
    formality: number; // 1-10
    detailLevel: number; // 1-10
    emotionalTone: number; // 1-10
    sentenceLength: number; // avg words per sentence
    adjectiveUsage: number; // 1-10
    factFocus: number; // 1-10
  }>().notNull(),
  isActive: boolean("is_active", { mode: "boolean" }).default(true).notNull(),
  teamShared: boolean("team_shared", { mode: "boolean" }).default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOptimizationSchema = createInsertSchema(optimizations).omit({ id: true, createdAt: true });
export type Optimization = typeof optimizations.$inferSelect;
export type InsertOptimization = z.infer<typeof insertOptimizationSchema>;

export const insertUsageTrackingSchema = createInsertSchema(usageTracking).omit({ id: true, createdAt: true, updatedAt: true });
export type UsageTracking = typeof usageTracking.$inferSelect;
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;

export const insertPersonalStyleSchema = createInsertSchema(personalStyles).omit({ id: true, createdAt: true, updatedAt: true });
export type PersonalStyle = typeof personalStyles.$inferSelect;
export type InsertPersonalStyle = z.infer<typeof insertPersonalStyleSchema>;

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
    structure_quality: z.string().optional(),
    information_density: z.string().optional(),
    missing_elements: z.array(z.string()).optional(),
    strengths: z.array(z.string()).optional(),
    text_improvements: z.array(z.string()).optional(),
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
  plan: z.enum(["free", "pro", "premium"]),
  textsUsedThisMonth: z.number(),
  textsRemaining: z.number(),
  monthlyTextLimit: z.number(),
  areaSearchesUsed: z.number(),
  areaSearchesLimit: z.number(),
  textEditsUsed: z.number(),
  textEditsLimit: z.number(),
  personalStyleAnalyses: z.number(),
  personalStyleAnalysesLimit: z.number(),
  isLoggedIn: z.boolean(),
  resetTime: z.string(),
  stripeCustomerId: z.string().optional().nullable(),
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const PLAN_LIMITS = {
  free: { texts: 3, areaSearches: 0, textEdits: 0, personalStyleAnalyses: 0 },
  pro: { texts: 10, areaSearches: 2, textEdits: 999999, personalStyleAnalyses: 1 },
  premium: { texts: 999999, areaSearches: 999999, textEdits: 999999, personalStyleAnalyses: 999999 },
} as const;

// Feature access per plan
export const FEATURE_ACCESS = {
  free: { personalStyle: false, areaSearch: false, textEditing: false, teamFeatures: false, apiAccess: false },
  pro: { personalStyle: true, areaSearch: true, textEditing: true, teamFeatures: false, apiAccess: true },
  premium: { personalStyle: true, areaSearch: true, textEditing: true, teamFeatures: true, apiAccess: true },
} as const;

// Ordgränser för objektbeskrivningar
export const WORD_LIMITS = {
  free: { min: 200, max: 300 },
  pro: { min: 200, max: 600, default: { min: 350, max: 450 } },
  premium: { min: 200, max: 800, default: { min: 400, max: 600 } },  // Premium får högre max
} as const;

export const PLAN_PRICES = {
  pro: { amount: 29900, currency: "sek", display: "299kr/månad" },
  premium: { amount: 59900, currency: "sek", display: "599kr/månad" },
} as const;

export type PlanType = "free" | "pro" | "premium";
export type FeatureAccess = typeof FEATURE_ACCESS[PlanType];
