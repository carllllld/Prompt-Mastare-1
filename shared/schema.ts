import { pgTable, text, serial, timestamp, jsonb, integer, date, varchar, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

export const optimizations = pgTable("optimizations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  originalPrompt: text("original_prompt").notNull(),
  improvedPrompt: text("improved_prompt").notNull(),
  socialCopy: text("social_copy"),
  headline: text("headline"),
  instagramCaption: text("instagram_caption"),
  showingInvitation: text("showing_invitation"),
  shortAd: text("short_ad"),
  category: text("category").notNull(),
  improvements: jsonb("improvements").$type<string[]>().notNull(),
  suggestions: jsonb("suggestions").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usageTracking = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  month: text("month").notNull(), // Format: '01'-'12' (month only, year is separate column)
  year: integer("year").notNull(),
  textsGenerated: integer("texts_generated").default(0).notNull(),
  areaSearchesUsed: integer("area_searches_used").default(0).notNull(),
  textEditsUsed: integer("text_edits_used").default(0).notNull(),
  personalStyleAnalyses: integer("personal_style_analyses").default(0).notNull(),
  hemnetAnalysesUsed: integer("hemnet_analyses_used").default(0).notNull(),
  planType: text("plan_type").default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userMonthYearUnique: unique("usage_tracking_user_month_year_unique").on(table.userId, table.month, table.year),
}));

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
    // New: Deep style internalization
    allowedPhrases: string[]; // Phrases broker uses successfully (e.g., "leder in till", "med utgång mot")
    forbiddenPhrases: string[]; // Custom phrases to avoid (beyond global list)
    tonePriorities: {
      useWelcoming: boolean; // Legacy field — no longer used in pipeline
      avoidAdjectives: boolean; // Minimize "fantastisk", "perfekt"
      focusFacts: boolean; // Prioritize measurements over descriptions
      personalTouch: boolean; // Add broker's unique voice elements
    };
    writingStyleDescription: string; // AI-generated description of broker's style
  }>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  teamShared: boolean("team_shared").default(false).notNull(),
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

const optimizeRequestBaseSchema = z.object({
  prompt: z.string().trim().min(1, "Please enter a prompt to optimize").max(12000, "Prompt is too long"),
  type: z.string().trim().min(1, "Type is required").max(50, "Type is too long"),
  platform: z.preprocess(
    (value) => typeof value === "string" ? value.trim().toLowerCase() : value,
    z.enum(["hemnet", "booli"])
  ),
  writingStyle: z.enum(["factual", "balanced", "selling"]).default("balanced"),
  wordCountMin: z.number().int().min(50).max(1200).optional(),
  wordCountMax: z.number().int().min(50).max(1200).optional(),
  imageUrls: z.array(z.string().url("Invalid image URL").max(2000, "Image URL too long")).max(5, "Maximum 5 images allowed").optional(),
  propertyData: z.record(z.any()).optional(),
  model: z.string().optional(),
});

export const optimizeRequestSchema = optimizeRequestBaseSchema.superRefine((data, ctx) => {
  if (
    typeof data.wordCountMin === "number"
    && typeof data.wordCountMax === "number"
    && data.wordCountMin > data.wordCountMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "wordCountMin cannot be greater than wordCountMax",
      path: ["wordCountMin"],
    });
  }

  if (data.propertyData) {
    const keys = Object.keys(data.propertyData);
    if (keys.length > 120) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "propertyData has too many fields",
        path: ["propertyData"],
      });
    }
    const serialized = JSON.stringify(data.propertyData);
    if (serialized.length > 120_000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "propertyData payload is too large",
        path: ["propertyData"],
      });
    }
  }
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
    architectural_style: z.string().optional(),
    unique_features: z.array(z.string()).optional(),
  }).optional(),
  improvement_suggestions: z.object({
    strengths: z.array(z.string()).optional(),
    text_improvements: z.array(z.string()).optional(),
  }).optional(),
  broker_audit: z.object({
    publish_ready: z.boolean().optional(),
    broker_quality_score: z.number().optional().nullable(),
    verdict: z.string().optional().nullable(),
    issues: z.array(z.string()).optional(),
  }).optional(),
  factCheck: z.object({
    fact_check_passed: z.boolean().optional().nullable(),
    local_text_clear: z.boolean().optional(),
    issues: z.array(z.object({
      quote: z.string(),
      type: z.string().optional(),
      reason: z.string().optional(),
    })).optional(),
    quality_score: z.number().optional().nullable(),
    broker_tips: z.array(z.string()).optional(),
    executed: z.boolean().optional(),
    metadata_matches_final_text: z.boolean().optional(),
  }).optional().nullable(),
  suggestions: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  headline: z.string().optional(),
  instagramCaption: z.string().optional(),
  showingInvitation: z.string().optional(),
  shortAd: z.string().optional(),
  socialCopy: z.string().optional(),
  wordCount: z.number().optional(),
  model: z.string().optional(),
  pipelineWarnings: z.array(z.string()).optional(),
  broker_improvement_suggestions: z.array(z.string()).optional(),
  broker_realism_scorecard: z.object({
    overall: z.number(),
    grade: z.enum(["A", "B", "C", "D"]),
    dimensions: z.object({
      evidens: z.number(),
      struktur: z.number(),
      sprakNaturlighet: z.number(),
      malgruppstraff: z.number(),
      marknadsredo: z.number(),
    }),
    strengths: z.array(z.string()),
    improvements: z.array(z.string()),
  }).optional(),
  blueprint_coverage: z.object({
    required: z.number(),
    matched: z.number(),
    ratio: z.number(),
    missing: z.array(z.string()),
  }).optional(),
  input_signal_coverage: z.object({
    totalSignals: z.number(),
    usedSignals: z.number(),
    ratio: z.number(),
    critical: z.array(z.object({
      path: z.string(),
      used: z.boolean(),
    })),
    topMissing: z.array(z.string()),
  }).optional(),
  fail_safe_delivery: z.boolean().optional(),
  fail_safe_stage: z.string().optional(),
  fail_safe_reason: z.string().optional(),
  fail_safe_meta: z.object({
    qualityScore: z.number().nullable().optional(),
    violationCount: z.number().nullable().optional(),
    candidateLabel: z.string().nullable().optional(),
  }).optional(),
  expertAnalysis: z.object({
    overallQuality: z.number(),
    strengths: z.array(z.string()),
    improvements: z.array(z.object({
      id: z.string(),
      issue: z.string(),
      location: z.string(),
      textSpan: z.object({ start: z.number(), end: z.number(), field: z.string() }).optional(),
      suggestion: z.string(),
      category: z.enum(['grammar', 'style', 'legal', 'broker_realism', 'clarity']),
      severity: z.enum(['critical', 'important', 'suggestion']),
      expert: z.enum(['broker', 'lawyer']),
      actionable: z.boolean(),
      autoFix: z.string().optional(),
    })),
    legalCheck: z.object({
      compliant: z.boolean(),
      notes: z.string(),
      issues: z.array(z.string()),
    }),
    duration: z.number(),
  }).optional(),
});

export const optimizeErrorSchema = z.object({
  message: z.string(),
  code: z.string().nullable().optional(),
  upstreamQuota: z.boolean().optional(),
  limitReached: z.boolean().optional(),
  upgradeRequired: z.boolean().optional(),
  currentPlan: z.enum(["free", "pro", "premium"]).optional(),
  usage: z.object({
    textsUsed: z.number(),
    textsLimit: z.number(),
  }).optional(),
  upgradeOptions: z.object({
    pro: z.object({ texts: z.number(), price: z.string() }).optional(),
    premium: z.object({ texts: z.number(), price: z.string() }).optional(),
  }).optional(),
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
  hemnetAnalysesUsed: z.number().optional().default(0),
  hemnetAnalysesRemaining: z.number().optional().default(0),
  hemnetAnalysesLimit: z.number().optional().default(0),
  isLoggedIn: z.boolean(),
  resetTime: z.string(),
  stripeCustomerId: z.string().optional().nullable(),
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export const PLAN_LIMITS = {
  free: { texts: 2, areaSearches: 0, textEdits: 0, personalStyleAnalyses: 0, hemnetAnalyses: 1 },
  pro: { texts: 10, areaSearches: 999999, textEdits: 40, personalStyleAnalyses: 999999, hemnetAnalyses: 5 },
  premium: { texts: 25, areaSearches: 999999, textEdits: 120, personalStyleAnalyses: 999999, hemnetAnalyses: 15 },
} as const;

// Model-based text edit limits
export const MODEL_TEXT_EDIT_LIMITS = {
  "gpt-5.2": {
    pro: 40,
    premium: 120,
  },
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
  premium: { min: 200, max: 600, default: { min: 400, max: 600 } },
} as const;

export const PLAN_PRICES = {
  pro: { amount: 29900, currency: "sek", display: "299kr/månad" },
  premium: { amount: 59900, currency: "sek", display: "599kr/månad" },
} as const;

export type PlanType = "free" | "pro" | "premium";
export type FeatureAccess = typeof FEATURE_ACCESS[PlanType];

// ==========================================
// ENTERPRISE: Observability Tables
// ==========================================

export const pipelineMetrics = pgTable("pipeline_metrics", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  plan: text("plan").notNull(),
  success: boolean("success").notNull(),
  totalDurationMs: integer("total_duration_ms").notNull(),
  totalAiCalls: integer("total_ai_calls").notNull(),
  totalTokensUsed: integer("total_tokens_used"),
  totalCostUsd: text("total_cost_usd"), // Store as text to avoid precision issues
  finalQualityScore: integer("final_quality_score"),
  finalWordCount: integer("final_word_count"),
  rescueAttempts: integer("rescue_attempts").default(0).notNull(),
  polishAttempts: integer("polish_attempts").default(0).notNull(),
  fastPathTaken: boolean("fast_path_taken").default(false).notNull(),
  structuredDataUsed: boolean("structured_data_used").default(false).notNull(),
  featuresUsed: jsonb("features_used").$type<string[]>().default([]).notNull(),
  errorCount: integer("error_count").default(0).notNull(),
  steps: jsonb("steps").$type<any[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPipelineMetricsSchema = createInsertSchema(pipelineMetrics).omit({ id: true, createdAt: true });
export type PipelineMetrics = typeof pipelineMetrics.$inferSelect;
export type InsertPipelineMetrics = z.infer<typeof insertPipelineMetricsSchema>;

// ==========================================
// INTEGRATIONS: Vitec CRM & Hemnet
// ==========================================

// Stores encrypted Vitec API keys per user (Pro/Premium only)
export const integrationSettings = pgTable("integration_settings", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull().unique(),
  vitecApiKey: text("vitec_api_key"), // stored encrypted
  vitecCustomerId: text("vitec_customer_id"), // broker's Vitec account ID
  vitecBaseUrl: text("vitec_base_url"), // optional custom endpoint
  vitecEnabled: boolean("vitec_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIntegrationSettingsSchema = createInsertSchema(integrationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type InsertIntegrationSettings = z.infer<typeof insertIntegrationSettingsSchema>;

// Zod schemas for integration API endpoints
export const vitecImportSchema = z.object({
  objectId: z.string().trim().min(1, "Objekt-ID krävs").max(100),
});

export const vitecSearchSchema = z.object({
  query: z.string().trim().min(1, "Sökterm krävs").max(200),
});

export const vitecApiKeySchema = z.object({
  apiKey: z.string().trim().min(10, "API-nyckeln är för kort").max(500),
  customerId: z.string().trim().min(1, "Kund-ID krävs").max(100),
  baseUrl: z.string().url("Ogiltig URL").optional().or(z.literal("")),
});

export const hemnetImportSchema = z.object({
  url: z.string().url("Ogiltig URL").refine(
    (url) => /hemnet\.se\/bostader\//.test(url),
    "URL:en måste vara en hemnet.se/bostader/-länk"
  ),
});
