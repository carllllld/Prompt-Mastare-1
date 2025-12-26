import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const optimizations = pgTable("optimizations", {
  id: serial("id").primaryKey(),
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
  type: z.enum(["General", "Business", "Programming", "Academic", "Creative", "Marketing"]).default("General"),
});

export const optimizeResponseSchema = z.object({
  improvedPrompt: z.string(),
  improvements: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
export type OptimizeResponse = z.infer<typeof optimizeResponseSchema>;
