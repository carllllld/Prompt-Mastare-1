import { sql } from "drizzle-orm";
import { jsonb, pgTable, timestamp, varchar, integer, date, serial, text, boolean } from "drizzle-orm/pg-core";

// Session storage table for express-session with connect-pg-simple
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// B2B Companies table (multi-tenant)
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company Policy Configuration
export const policies = pgTable("policies", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  tone: varchar("tone").notNull().default("professional"),
  addressForm: varchar("address_form").notNull().default("du"),
  emojiUsage: varchar("emoji_usage").notNull().default("never"),
  forbiddenActions: jsonb("forbidden_actions").$type<string[]>().default([]),
  forbiddenLanguage: jsonb("forbidden_language").$type<string[]>().default([]),
  maxResponseLength: integer("max_response_length").default(300),
  mandatoryClosing: text("mandatory_closing"),
  responseStructure: jsonb("response_structure").$type<string[]>().default([
    "greeting",
    "acknowledge_issue", 
    "resolution_or_next_step",
    "closing"
  ]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Knowledge Blocks (company-specific knowledge base)
export const knowledgeBlocks = pgTable("knowledge_blocks", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  category: varchar("category"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support Cases
export const supportCases = pgTable("support_cases", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  agentId: varchar("agent_id").references(() => users.id),
  customerMessage: text("customer_message").notNull(),
  caseType: varchar("case_type"),
  classification: jsonb("classification").$type<{
    category: string;
    confidence: "high" | "low";
    riskLevel: "low" | "medium" | "high";
    missingInfo: boolean;
    aiAllowed: boolean;
  }>(),
  decision: varchar("decision"),
  generatedResponse: text("generated_response"),
  status: varchar("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  companyId: integer("company_id").references(() => companies.id),
  role: varchar("role").notNull().default("agent"),
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

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = typeof policies.$inferInsert;

export type KnowledgeBlock = typeof knowledgeBlocks.$inferSelect;
export type InsertKnowledgeBlock = typeof knowledgeBlocks.$inferInsert;

export type SupportCase = typeof supportCases.$inferSelect;
export type InsertSupportCase = typeof supportCases.$inferInsert;

export type CaseClassification = {
  category: string;
  confidence: "high" | "low";
  riskLevel: "low" | "medium" | "high";
  missingInfo: boolean;
  aiAllowed: boolean;
};

export type CaseDecision = "respond" | "ask_more_info" | "escalate";
export type CaseStatus = "pending" | "ready" | "needs_info" | "escalated" | "sent";
