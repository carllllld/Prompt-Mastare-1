import { db } from "../db";
import { formTemplates, type FormTemplate, type InsertFormTemplate } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Form Templates Library
 * 
 * Allows users to save and reuse form data (BRF info, common fields, etc.)
 * to speed up listing creation for similar properties.
 */

export async function createTemplate(
  userId: string,
  data: InsertFormTemplate
): Promise<FormTemplate> {
  const [template] = await db
    .insert(formTemplates)
    .values({
      userId,
      name: data.name,
      description: data.description,
      templateData: data.templateData,
    })
    .returning();

  return template;
}

export async function getUserTemplates(userId: string): Promise<FormTemplate[]> {
  return db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.userId, userId))
    .orderBy(desc(formTemplates.updatedAt));
}

export async function getTemplateById(
  userId: string,
  templateId: number
): Promise<FormTemplate | null> {
  const [template] = await db
    .select()
    .from(formTemplates)
    .where(
      and(
        eq(formTemplates.id, templateId),
        eq(formTemplates.userId, userId)
      )
    );

  return template || null;
}

export async function updateTemplate(
  userId: string,
  templateId: number,
  updates: Partial<InsertFormTemplate>
): Promise<FormTemplate | null> {
  const [template] = await db
    .update(formTemplates)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(formTemplates.id, templateId),
        eq(formTemplates.userId, userId)
      )
    )
    .returning();

  return template || null;
}

export async function deleteTemplate(
  userId: string,
  templateId: number
): Promise<boolean> {
  const result = await db
    .delete(formTemplates)
    .where(
      and(
        eq(formTemplates.id, templateId),
        eq(formTemplates.userId, userId)
      )
    );

  return result.rowCount > 0;
}

export async function incrementTemplateUsage(
  userId: string,
  templateId: number
): Promise<void> {
  const template = await getTemplateById(userId, templateId);
  if (!template) return;

  await db
    .update(formTemplates)
    .set({
      usedCount: template.usedCount + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(formTemplates.id, templateId),
        eq(formTemplates.userId, userId)
      )
    );
}

/**
 * Get template usage statistics
 */
export async function getTemplateStats(userId: string): Promise<{
  totalTemplates: number;
  totalUsage: number;
  mostUsed: FormTemplate | null;
}> {
  const templates = await getUserTemplates(userId);
  
  const totalTemplates = templates.length;
  const totalUsage = templates.reduce((sum, t) => sum + t.usedCount, 0);
  const mostUsed = templates.length > 0
    ? templates.reduce((max, t) => t.usedCount > max.usedCount ? t : max)
    : null;

  return {
    totalTemplates,
    totalUsage,
    mostUsed,
  };
}
