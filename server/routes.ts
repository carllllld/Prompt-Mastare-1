import type { Express } from "express";
import type { Server } from "http";
import { randomUUID, timingSafeEqual } from "crypto";
import * as path from "path";
import * as fs from "fs";
import Stripe from "stripe";
import { createClient, type RedisClientType } from "redis";
import { storage } from "./storage";
import { pool, db } from "./db";
import { optimizations } from "@shared/schema";
import { analyzeMarketPosition, getMarketTrends2025 } from "./market-intelligence";
import { analyzeArchitecturalValue } from "./architectural-intelligence";
import { optimizeRequestSchema, PLAN_LIMITS, WORD_LIMITS, FEATURE_ACCESS, MODEL_TEXT_EDIT_LIMITS, type PlanType, type User, type PersonalStyle, type InsertPersonalStyle } from "@shared/schema";
import { requireAuth, requirePro } from "./auth";
import { sendTeamInviteEmail } from "./email";
import OpenAI from "openai";
import { FORBIDDEN_PHRASES, buildBrokerLanguagePolicyPrompt, countEvidenceBackedBlockedPhrases, getBrokerLanguageEvidenceSnapshot, shouldBlockPhraseForStyle, type WritingStyle } from "./lib/text-rules";
import { findRuleViolations, validateOptimizationResult } from "./lib/text-validation";
import { PerfectSwedishOrchestrator } from "./lib/perfect-swedish-orchestrator";
import { buildDeterministicFallbackDescription } from "./lib/perfect-swedish-fallback";

const MAX_INVITE_EMAILS_PER_HOUR = 5;
const CACHE_DIR = path.join(process.cwd(), ".image-cache");

// No-op observability stub — the old listing-pipeline-observability module was removed.
// All calls are silently ignored; real metrics flow through Sentry and the DB.
const pipelineObservability = {
  startRun: (_opts: any) => {},
  endRun: (_success: boolean, _metrics?: any) => {},
  startStep: (_step: string, _phase?: string) => {},
  endStep: (_opts: any) => {},
  recordFastPath: () => {},
  recordFeature: (_feature: string) => {},
  recordRescueAttempt: () => {},
  recordError: (_location: string, _err: any, _fatal?: boolean, _action?: string) => {},
};

// Rate limiting for /api/optimize (per user, per minute)
const optimizeRateLimits = new Map<string, { count: number; resetAt: number }>();

async function checkOptimizeRateLimit(userId: string): Promise<boolean> {
  const now = Date.now();
  let limit = optimizeRateLimits.get(userId);

  if (!limit) {
    // First request - set up new limit
    optimizeRateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  // Check if minute window has expired
  if (now > limit.resetAt) {
    // Reset for new minute
    optimizeRateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  // Check if limit exceeded (10 requests per minute)
  if (limit.count >= 10) {
    return false;
  }

  // Increment and allow
  limit.count++;
  return true;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

import { extractFirstJsonObject, safeJsonParse, extractGeneratedMarketingText, extractImprovedPromptFromLooseJson } from "./lib/json-guards";

function isValidAdminKey(provided: unknown, expected: string | undefined): boolean {
  if (!expected || typeof provided !== "string" || !provided) return false;
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

let stripeWebhookTableEnsured = false;

async function ensureStripeWebhookTable(): Promise<void> {
  if (stripeWebhookTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stripe_webhook_events (
      event_id text PRIMARY KEY,
      status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      processed_at timestamptz
    )
  `);
  stripeWebhookTableEnsured = true;
}

async function acquireStripeWebhookEventLock(eventId: string): Promise<boolean> {
  await ensureStripeWebhookTable();
  const result = await pool.query(
    `INSERT INTO stripe_webhook_events (event_id, status)
     VALUES ($1, 'processing')
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [eventId]
  );
  return (result.rowCount ?? 0) > 0;
}

async function finalizeStripeWebhookEvent(eventId: string): Promise<void> {
  await pool.query(
    `UPDATE stripe_webhook_events
     SET status = 'processed', processed_at = NOW()
     WHERE event_id = $1`,
    [eventId]
  );
}

async function releaseStripeWebhookEventLock(eventId: string): Promise<void> {
  await pool.query(
    `DELETE FROM stripe_webhook_events
     WHERE event_id = $1 AND status = 'processing'`,
    [eventId]
  );
}

function isOpenAIInsufficientQuotaError(error: unknown): boolean {
  const err = error as any;
  const code = String(err?.error?.code || err?.code || "").toLowerCase();
  const type = String(err?.error?.type || err?.type || "").toLowerCase();
  const message = String(err?.error?.message || err?.message || "").toLowerCase();
  return (
    code.includes("insufficient_quota") ||
    message.includes("insufficient_quota") ||
    message.includes("quota") ||
    (type.includes("rate_limit") && (err?.status === 429 || err?.statusCode === 429))
  );
}

function createUpstreamQuotaError(stage: string, cause: unknown): Error & { statusCode: number; code: string; upstreamQuota: true; stage: string } {
  const error = new Error(`OpenAI-kvoten är slut uppströms under ${stage}. Försök igen om en stund.`) as Error & {
    statusCode: number;
    code: string;
    upstreamQuota: true;
    stage: string;
  };
  error.statusCode = 503;
  error.code = "OPENAI_UPSTREAM_QUOTA";
  error.upstreamQuota = true;
  error.stage = stage;
  (error as any).cause = cause;
  return error;
}

function formatFallbackValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
}

function toSentenceCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeFallbackLocationItem(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildFallbackLocationSentence(area: string | null, municipality: string | null, transport: string | null, amenities: string[], services: string[]): string {
  const cleanedAmenities = amenities
    .map(normalizeFallbackLocationItem)
    .filter(Boolean)
    .slice(0, 2);
  const cleanedServices = services
    .map(normalizeFallbackLocationItem)
    .filter(Boolean)
    .slice(0, 2);

  const areaLabel = area || municipality;
  const locationSentences: string[] = [];

  if (areaLabel && transport) {
    locationSentences.push(`${toSentenceCase(areaLabel)} har ${transport.charAt(0).toLowerCase() + transport.slice(1)}.`);
  } else if (transport) {
    locationSentences.push(`Kommunikationerna nås med ${transport.charAt(0).toLowerCase() + transport.slice(1)}.`);
  } else if (areaLabel) {
    locationSentences.push(`${toSentenceCase(areaLabel)} ger ett vardagsnära läge med service inom bekvämt räckhåll.`);
  }

  const nearby = [...cleanedAmenities, ...cleanedServices].filter(Boolean).slice(0, 3);
  if (nearby.length === 1) {
    locationSentences.push(`I närområdet finns bland annat ${nearby[0]}.`);
  } else if (nearby.length === 2) {
    locationSentences.push(`I närområdet finns bland annat ${nearby[0]} och ${nearby[1]}.`);
  } else if (nearby.length >= 3) {
    locationSentences.push(`I närområdet finns bland annat ${nearby.slice(0, -1).join(", ")} och ${nearby[nearby.length - 1]}.`);
  }

  if (municipality && municipality !== areaLabel) {
    locationSentences.push(`${municipality} bidrar med ytterligare service och utbud i vardagen.`);
  }

  return locationSentences.join(" ").trim();
}

function isTooThinForDelivery(text: string, minimumPublishableWordMin: number, qualityScore?: number, violations?: string[]): boolean {
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Smart logic: if quality is high, be more lenient on length
  const hasHighQuality = qualityScore && qualityScore >= 0.80;
  const hasFewViolations = violations && violations.length <= 2;

  // Base minimum: 90 words OR 70% of target, whichever is lower
  const minRequired = Math.min(90, Math.floor(minimumPublishableWordMin * 0.7));

  // If high quality AND few violations, allow shorter text
  if (hasHighQuality && hasFewViolations) {
    const lenientMin = Math.min(75, Math.floor(minimumPublishableWordMin * 0.6));
    if (wordCount >= lenientMin) return false;
  }

  if (wordCount < minRequired) return true;

  const shortLineCount = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.split(/\s+/).filter(Boolean).length <= 6).length;

  // If high quality, allow more short lines
  const shortLineThreshold = hasHighQuality ? 4 : 3;
  if (shortLineCount >= shortLineThreshold) return true;

  // Only check list pattern if word count is very low (<150)
  if (wordCount < 150) {
    const rawListPattern = /(?:^|[.!?]\s+)(?:[A-ZÅÄÖ][^.!?\n]{1,60}\([^)]*\)|[A-ZÅÄÖ][^.!?\n]{1,60}\.)\s*(?:[A-ZÅÄÖ][^.!?\n]{1,60}\([^)]*\)|[A-ZÅÄÖ][^.!?\n]{1,60}\.)\s*(?:[A-ZÅÄÖ][^.!?\n]{1,60}\([^)]*\)|[A-ZÅÄÖ][^.!?\n]{1,60}\.)/u;
    if (rawListPattern.test(text)) return true;
  }

  return false;
}

function countGenericBrokerPhrases(text: string): number {
  if (!text) return 0;

  const genericPatterns = [
    /\bflexibla användningsmöjligheter\b/gi,
    /\bnaturliga flöden\b/gi,
    /\btrevligt umgänge\b/gi,
    /\bhelheten känns lättmöblerad\b/gi,
    /\bsjälvklar del av huset\b/gi,
    /\bbra förutsättningar för sol\b/gi,
    /\bkombinera pendling, ärenden och fritid\b/gi,
    /\bväl placerat för ett vardagsliv\b/gi,
    /\bsamlade för en enkel vardag\b/gi,
    /\bgenomgående välhållet\b/gi,
    /\bligger bra placerat\b/gi,
  ];

  return genericPatterns.reduce((count, pattern) => count + ((text.match(pattern) || []).length > 0 ? 1 : 0), 0);
}

function countConcreteEvidenceSignals(text: string): number {
  if (!text) return 0;

  const evidenceSignals = [
    /\b20\d{2}\b/g,
    /\b\d+\s*kvm\b/gi,
    /\b\d+\s*(?:meter|minuter|min)\b/gi,
    /\b(ballingslöv|marbodal|ikea|hth|kvik|noblessa|siemens|bosch|miele|electrolux|gaggenau)\b/gi,
    /\b(ekparkett|mörkoljad ekparkett|klinker|stenskiva|granit|helkaklat|golvvärme|dubbla handfat|luft-luftvärmepump|fiber|laddplats|jacuzzi|tilläggsisolerats?|nya fönster)\b/gi,
    /\b(uteplats|terrass|altan|trädgård|förråd|garage|carport|skjutdörrar|matplats|köksö)\b/gi,
  ];

  return evidenceSignals.reduce((count, pattern) => count + ((text.match(pattern) || []).length > 0 ? 1 : 0), 0);
}

function detectNarrativeIntegrityIssues(text: string): string[] {
  if (!text) return [];

  const issues: string[] = [];
  const integrityPatterns: Array<[RegExp, string]> = [
    [/\b(börja|fortsätta|avsluta|skapa|leva|njuta|använda|samla)\s+[A-ZÅÄÖ][a-zåäö]+(?:en|et|ar|or)?\s+(?:är|har|ger|blir|finns)\b/g, 'Avhuggen eller felaktigt sammanfogad mening'],
    [/\b[A-ZÅÄÖ][a-zåäö]+\s+Den\s+[a-zåäö]+\b/g, 'Felaktig satsövergång i löptext'],
    // CRITICAL FIX: Catch missing punctuation before capital letter (e.g., "utan I Mörtnäs")
    [/\b(utan|med|för|till|från|vid|hos)\s+[A-ZÅÄÖ][a-zåäö]+\s+[a-zåäö]+/g, 'Saknad punkt eller felaktig meningsövergång'],
  ];

  for (const [pattern, message] of integrityPatterns) {
    if (pattern.test(text)) {
      issues.push(message);
    }
  }

  return issues;
}

function getStrongPublishableWordFloor(minimumPublishableWordMin: number, plan: PlanType): number {
  if (plan === "premium") {
    return Math.max(minimumPublishableWordMin + 55, Math.round(minimumPublishableWordMin * 1.28));
  }
  if (plan === "pro") {
    return Math.max(minimumPublishableWordMin + 35, Math.round(minimumPublishableWordMin * 1.18));
  }
  return minimumPublishableWordMin;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeOutputTokenBudget(targetWordMax: number, includeAuxFields: boolean): number {
  const safeWordMax = Number.isFinite(targetWordMax) && targetWordMax > 0 ? targetWordMax : 500;
  const mainTextTokenBudget = Math.round(safeWordMax * 2.4);
  const auxTokenBudget = includeAuxFields ? 1200 : 240;
  return clampNumber(
    mainTextTokenBudget + auxTokenBudget,
    includeAuxFields ? 5500 : 900,  // Floor raised: 4800 → 5500 to prevent truncation with medium effort + aux fields
    includeAuxFields ? 8000 : 2600   // Ceiling raised: 7000 → 8000 for premium/long texts with many details
  );
}

function computeChatCompletionTokenBudget(targetWordMax: number, mode: "surgical" | "expansion" | "rescue", plan: PlanType = "pro"): number {
  const safeWordMax = Number.isFinite(targetWordMax) && targetWordMax > 0 ? targetWordMax : 500;
  const planMultiplier = plan === "premium" ? 1.14 : plan === "pro" ? 1.0 : 0.9;
  if (mode === "expansion") {
    return clampNumber(Math.round(safeWordMax * 4.2 * planMultiplier), 1300, plan === "premium" ? 3600 : 3200);
  }
  if (mode === "surgical") {
    return clampNumber(Math.round(safeWordMax * 3.6 * planMultiplier), 1600, plan === "premium" ? 4500 : 4200);
  }
  return clampNumber(Math.round(safeWordMax * 4.4 * planMultiplier), 2000, plan === "premium" ? 5000 : 4400);
}

function computeInlineEditOutputTokenBudget(selectedText: string, plan: PlanType, mode: "rewrite" | "improve"): number {
  const selectedWordCount = (selectedText || "").split(/\s+/).filter(Boolean).length;
  const baseFromText = Math.round(Math.max(40, selectedWordCount) * 2.4);
  const planBoost = plan === "premium" ? 220 : plan === "pro" ? 140 : 80;
  if (mode === "rewrite") {
    return clampNumber(baseFromText + planBoost + 260, 420, plan === "premium" ? 1400 : 1100);
  }
  return clampNumber(baseFromText + planBoost, 360, plan === "premium" ? 1150 : 900);
}

function compactExamplesForPrompt(examples: string[], maxExamples: number, maxCharsPerExample: number): string[] {
  return examples
    .slice(0, Math.max(1, maxExamples))
    .map((example) => {
      const normalized = example.replace(/[^\S\r\n]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
      if (normalized.length <= maxCharsPerExample) return normalized;
      const paragraphCut = normalized.lastIndexOf("\n\n", maxCharsPerExample);
      const hardCut = paragraphCut > 320 ? paragraphCut : maxCharsPerExample;
      return `${normalized.slice(0, hardCut).trim()}\n\n[...]`;
    });
}

// buildDeterministicFallbackDescription moved to server/lib/perfect-swedish-fallback.ts

function getMinimumPublishableWordCount(requestedMin: number, style: WritingStyle): number {
  const ratio = style === "factual" ? 0.58 : style === "selling" ? 0.72 : 0.65;
  const absoluteFloor = style === "factual" ? 140 : style === "selling" ? 200 : 180;
  return Math.min(requestedMin, Math.max(absoluteFloor, Math.round(requestedMin * ratio)));
}

// AI-driven stilinternalisering från referenstexter
async function analyzeWritingStyle(referenceTexts: string[]): Promise<{
  formality: number;
  detailLevel: number;
  emotionalTone: number;
  sentenceLength: number;
  adjectiveUsage: number;
  factFocus: number;
  // New: Deep style internalization
  allowedPhrases: string[];
  forbiddenPhrases: string[];
  tonePriorities: {
    useWelcoming: boolean;
    avoidAdjectives: boolean;
    focusFacts: boolean;
    personalTouch: boolean;
  };
  writingStyleDescription: string;
}> {
  const styleInternalizationPrompt = `Du är en expert på att analysera svenska mäklarexter. Läs dessa referenstexter från en mäklare och skapa en detaljerad stilprofil.

REFERENSTEXTER:
${referenceTexts.join('\n\n---\n\n')}

ANALYSERA OCH SVARA ENDAST MED JSON I DETTA FORMAT:
{
  "formality": 1-10,
  "detailLevel": 1-10,
  "emotionalTone": 1-10,
  "sentenceLength": 1-10,
  "adjectiveUsage": 1-10,
  "factFocus": 1-10,
  "allowedPhrases": ["leder in till", "med utgång mot", "genomgående"],
  "forbiddenPhrases": ["fantastisk", "perfekt", "utmärkt"],
  "tonePriorities": {
    "useWelcoming": false,
    "avoidAdjectives": false,
    "focusFacts": true,
    "personalTouch": true
  },
  "writingStyleDescription": "Mäklaren skriver kortfattade, faktabaserade texter med fokus på praktiska detaljer. Undviker överdrivna adjektiv som 'fantastisk'."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [{ role: "user", content: styleInternalizationPrompt }],
      temperature: 0.5, // Moderate temperature for style interpretation
      max_completion_tokens: 1000,
      response_format: { type: "json_object" },
      // Note: No reasoning_effort - simple JSON extraction doesn't need deep reasoning
    });

    const styleData = safeJsonParse(response.choices[0]?.message?.content || "{}");

    // Validera och normalisera grundläggande fält
    const formality = Math.max(1, Math.min(10, Number(styleData.formality) || 5));
    const detailLevel = Math.max(1, Math.min(10, Number(styleData.detailLevel) || 5));
    const emotionalTone = Math.max(1, Math.min(10, Number(styleData.emotionalTone) || 5));
    const sentenceLength = Math.max(1, Math.min(10, Number(styleData.sentenceLength) || 5));
    const adjectiveUsage = Math.max(1, Math.min(10, Number(styleData.adjectiveUsage) || 5));
    const factFocus = Math.max(1, Math.min(10, Number(styleData.factFocus) || 5));

    // Validera nya fält med fallbacks — filter allowedPhrases against universal forbidden phrases
    const rawAllowed = Array.isArray(styleData.allowedPhrases) ? styleData.allowedPhrases.slice(0, 10) : [];
    const forbiddenLower = FORBIDDEN_PHRASES.map(f => f.toLowerCase().trim());
    const allowedPhrases = rawAllowed.filter((phrase: string) =>
      !forbiddenLower.some(f => phrase.toLowerCase().includes(f) || f.includes(phrase.toLowerCase()))
    );
    const forbiddenPhrases = Array.isArray(styleData.forbiddenPhrases) ? styleData.forbiddenPhrases.slice(0, 10) : [];
    const tonePriorities = styleData.tonePriorities && typeof styleData.tonePriorities === 'object' ? {
      useWelcoming: Boolean(styleData.tonePriorities.useWelcoming),
      avoidAdjectives: Boolean(styleData.tonePriorities.avoidAdjectives),
      focusFacts: Boolean(styleData.tonePriorities.focusFacts),
      personalTouch: Boolean(styleData.tonePriorities.personalTouch),
    } : {
      useWelcoming: false,
      avoidAdjectives: true,
      focusFacts: true,
      personalTouch: false,
    };
    const writingStyleDescription = typeof styleData.writingStyleDescription === 'string' && styleData.writingStyleDescription.length > 10
      ? styleData.writingStyleDescription
      : "Professionell svensk mäklare med balanserad stil: faktabaserad med naturlig ton.";

    return {
      formality,
      detailLevel,
      emotionalTone,
      sentenceLength,
      adjectiveUsage,
      factFocus,
      allowedPhrases,
      forbiddenPhrases,
      tonePriorities,
      writingStyleDescription,
    };
  } catch (error) {
    console.error("Style internalization failed:", error);
    // Fallback till neutral profil
    return {
      formality: 5,
      detailLevel: 5,
      emotionalTone: 5,
      sentenceLength: 5,
      adjectiveUsage: 5,
      factFocus: 5,
      allowedPhrases: [],
      forbiddenPhrases: [],
      tonePriorities: {
        useWelcoming: false,
        avoidAdjectives: true,
        focusFacts: true,
        personalTouch: false,
      },
      writingStyleDescription: "Professionell svensk mäklare med balanserad stil.",
    };
  }
}

// Generera personaliserad prompt baserat på djup stilanalys
function generatePersonalizedPrompt(referenceTexts: string[], styleProfile: any): string {
  // Filter allowedPhrases against universal FORBIDDEN_PHRASES to prevent contradictions
  const forbiddenLower = FORBIDDEN_PHRASES.map(f => f.toLowerCase().trim());
  const safeAllowed = (styleProfile.allowedPhrases || []).filter((phrase: string) =>
    !forbiddenLower.some(f => phrase.toLowerCase().includes(f) || f.includes(phrase.toLowerCase()))
  );
  const allowedInstructions = safeAllowed.length > 0
    ? `\nTILLÅTNA FRASER (använd gärna dessa eftersom mäklaren gör det): ${safeAllowed.join(', ')}`
    : '';

  const customForbidden = styleProfile.forbiddenPhrases?.length > 0
    ? `\nUNDVIK DESSA SPECIFIKA FRASER (mäklaren använder dem inte): ${styleProfile.forbiddenPhrases.join(', ')}`
    : '';

  const toneInstructions = [];
  // NOTE: useWelcoming removed — 'välkommen till' is universally forbidden
  if (styleProfile.tonePriorities?.avoidAdjectives) toneInstructions.push('Undvik överdrivna adjektiv som "fantastisk", "perfekt"');
  if (styleProfile.tonePriorities?.focusFacts) toneInstructions.push('Fokusera på konkreta fakta och mått');
  if (styleProfile.tonePriorities?.personalTouch) toneInstructions.push('Lägg till personliga, mänskliga detaljer');
  const toneString = toneInstructions.length > 0 ? `\nTON-PRIORITERINGAR: ${toneInstructions.join('. ')}.` : '';
  const labeledExamples = referenceTexts
    .map((text, index) => {
      const label = index === 0
        ? "EXEMPEL 1 - ÖPPNING OCH TONALITET"
        : index === 1
          ? "EXEMPEL 2 - MITTPARTI OCH RUMSFLÖDE"
          : "EXEMPEL 3 - LÄGE OCH AVSLUT";
      return `${label}:\n${text}`;
    })
    .join('\n\n---\n\n');

  return `Du är en erfaren svensk mäklare med denna unika skrivstil:

STILBESKRIVNING: ${styleProfile.writingStyleDescription}

STILPROFIL:
- Formalitet: ${styleProfile.formality}/10
- Detaljnivå: ${styleProfile.detailLevel}/10
- Känsloton: ${styleProfile.emotionalTone}/10
- Meninglängd: ${styleProfile.sentenceLength}/10
- Adjektivanvändning: ${styleProfile.adjectiveUsage}/10
- Faktafokus: ${styleProfile.factFocus}/10${toneString}${allowedInstructions}${customForbidden}

REFERENSEXEMPEL (använd dem som olika stilprover, inte som fakta att kopiera):
${labeledExamples}

VIKTIGT OM PRIORITET:
- Skriv som denna specifika mäklare: samma meningsrytm, styckeindelning och ordval.
- Om flera exempel finns ska du lära dig deras gemensamma stilkärna. Behandla dem som kompletterande prover för öppning, mittparti och läges-/avslutsstil.
- Kopiera aldrig fakta, adressuppgifter eller formuleringar ordagrant från referensexemplen. Lär dig stil, inte innehåll.
- Om din personliga stil krockar med TEXTSTIL-sektionen nedan: textstilen har PRIORITET för ton och adjektivanvändning.
- Din personliga stil styr MENINGSRYTM, STYCKELÄNGD och PERSPEKTIV — men inom textsstilens tillåtna ramar.
- Undvik ALLTID universella AI-klyschor: "erbjuder generösa ytor", "andas lugn", "perfekt för den som", "välkommen till".
- Universellt förbjudna fraser gäller ALLTID — oavsett vad referenstexterna innehåller.`;
}

// Post-processing: Rensa bort de 50 VANLIGASTA förbjudna fraser
// Fokuserar på de mest frekventa AI-mönstren för att undvika prompt overload
const PHRASE_REPLACEMENTS: [string, string][] = [
  // === TOP 10: VANLIGASTE AI-FRASER ===
  ["erbjuder", "har"],
  ["erbjuds", "finns"],
  ["bjuder på", "har"],
  ["vilket ger", "med"],
  ["vilket gör", "och är"],
  ["för den som", ""],
  ["perfekt för", "passar"],
  ["välkommen till", ""],

  // === KLYSCHORD (TOP 15) ===
  ["fantastisk", "fin"],
  ["generös", "stor"],
  ["perfekt", "bra"],
  ["unik", ""],
  ["dröm", ""],
  ["magisk", ""],
  ["otrolig", ""],
  ["enastående", ""],
  ["underbar", "fin"],
  ["fantastiskt", "bra"],
  ["attraktivt", ""],
  ["charm", "karaktär"],
  ["stilren", ""],
  ["elegant", ""],
  ["exklusivt", ""],

  // === KONSTRUKTIONER (TOP 15) ===
  ["vilket skapar", "och ger"],
  ["som ger en", "med"],
  ["vilket bidrar till", "med"],
  ["vilket underlättar", "med"],
  ["gör det enkelt att", "underlättar att"],
  ["gör det möjligt att", "möjliggör att"],
  ["vilket passar", "för"],
  ["vilket är", "och är"],
  ["som gör det", "som"],
  ["för att skapa", ""],
  ["för att ge", ""],
  ["för den som vill", ""],
  ["för den som gillar", ""],
  ["för den som söker", ""],
  ["kontakta oss", ""],
  ["boka visning", ""],
  ["tveka inte", ""],

  // === ÖVRIGA VANLIGA (TOP 10) ===
  ["luftig", "rymlig"],
  ["inbjudande", ""],
  ["trivsam", ""],
  ["rofylld", "lugnt"],
  ["attraktivt läge", "bra läge"],
  ["i hjärtat av", "centralt i"],
  ["stadens puls", "stadskärnan"],
  ["gott om", "bra"],
  ["förvaringsmöjligheter", "förvaring"],
  ["parkeringsmöjligheter", "parkering"],
  ["i mycket gott skick", "i gott skick"],
  ["fungerande vardagslogistik", "bra vardagsflöde"],
  ["kan påverka inomhusklimatet", "påverkar helhetsintrycket"],
  ["är registrerad", "finns registrerad"],
  ["tydlig del av husets yttre standard", "del av husets yttre uttryck"],
  ["utan att kännas genomgångs", "utan genomgångskänsla"],
  ["tidlös och elegant", ""],
  ["mysigt och ombonat", ""],
  ["charmigt och välplanerat", "välplanerat"],
  ["praktiskt och snyggt", "praktiskt"],
  ["fräscht och modernt", "fräscht"],

  // Emotionella verb/fras-mönster
  ["inbjuder till avkoppling", ""],
  ["inbjuder till", ""],
  ["bjuder in till", ""],
  ["lockar till", ""],
  ["inspirerar till", ""],
  ["andas modernitet", ""],
  ["andas stil", ""],
  ["utstrålar", "har"],
  ["ger en känsla av rymd", ""],
  ["ger en känsla av", ""],
  ["skapar en känsla av", ""],
  ["ger ett intryck av", ""],
  ["skapar en harmonisk", ""],
  ["skapar en inbjudande", ""],
  ["ger ett lyxigt intryck", ""],
  ["bidrar till en trivsam", ""],
  ["bidrar till en", ""],
  ["förstärker känslan av", ""],
  ["förstärker känslan", ""],
  ["adderar en touch av", ""],
  ["adderar en touch", ""],
  ["ger en touch av", ""],
  ["ger en touch", ""],

  // Sammanfattning/värderings-fraser (AI-slut)
  ["sammanfattningsvis", ""],
  ["med andra ord", ""],
  ["kort sagt", ""],
  ["allt sammantaget", ""],
  ["detta gör bostaden till ett", ""],
  ["detta gör bostaden till", ""],
  ["detta gör lägenheten till", ""],
  ["detta gör villan till", ""],
  ["allt detta gör", ""],
  ["det bästa av båda världar", ""],
  ["det bästa av", ""],
  ["inte bara ett hem utan", ""],
  ["inte bara ett hem", ""],
  ["mer än bara ett hem", ""],
  ["mer än bara en bostad", ""],
  ["ett hem för alla sinnen", ""],
  ["ett hem för alla", ""],
  ["ett hem att trivas i", ""],

  // "Inte bara... utan också" (AI-signatur)
  ["inte bara", ""],
  ["utan också", "och"],

  // Abstrakt livsstil/känsla
  ["modern livsstil med alla bekvämligheter", ""],
  ["modern livsstil", ""],
  ["livsstil", ""],
  ["livskvalitet", ""],
  ["hög standard", ""],
  ["hög kvalitet", ""],
  ["stor potential", ""],
  ["stor möjlighet", ""],
  ["ett smart val", ""],
  ["klok investering", ""],

  // Överdrivna adverb (ta bort — fakta talar för sig själv)
  ["noggrant utvalt", ""],
  ["noggrant utvalda", ""],
  ["omsorgsfullt renoverat", "renoverat"],
  ["omsorgsfullt", ""],
  ["genomtänkt planlösning", "bra planlösning"],
  ["genomtänkt", ""],
  ["smakfullt renoverat", "renoverat"],
  ["smakfullt inrett", ""],
  ["smakfullt", ""],
  ["stilfullt renoverat", "renoverat"],
  ["stilfullt", ""],
  ["exklusivt utförande", ""],
  ["exklusivt", ""],
  ["lyxigt badrum", "renoverat badrum"],
  ["lyxigt", ""],
  ["imponerande takhöjd", "hög takhöjd"],
  ["imponerande", ""],
  ["magnifikt", ""],
  ["praktfullt", ""],

  // Fler -möjligheter
  ["utemöjligheter", "uteplats"],
  ["lagringsmöjligheter", "förvaring"],
  ["rekreationsmöjligheter", "friluftsliv"],
  ["fritidsmöjligheter", ""],
  ["aktivitetsmöjligheter", ""],
  ["umgängesmöjligheter", ""],
  ["utvecklingsmöjligheter", ""],
  ["utbyggnadsmöjligheter", ""],

  // Passiva/byråkratiska konstruktioner
  ["det kan konstateras att", ""],
  ["det kan konstateras", ""],
  ["det bör nämnas att", ""],
  ["det bör nämnas", ""],
  ["det ska tilläggas att", ""],
  ["det ska tilläggas", ""],
  ["värt att nämna är", ""],
  ["värt att nämna", ""],
  ["värt att notera är", ""],
  ["värt att notera", ""],
  ["som en bonus finns", ""],
  ["som en bonus", ""],
  ["en extra fördel är", ""],
  ["en extra fördel", ""],
  ["en stor fördel är", ""],
  ["en stor fördel", ""],
  ["en klar fördel är", ""],
  ["en klar fördel", ""],

  // Överdrivna plats-beskrivningar
  ["eftertraktat område", ""],
  ["populärt område", ""],
  ["omtyckt område", ""],
  ["familjevänligt område", ""],
  ["barnvänligt område", ""],
  ["naturskönt läge", ""],
  ["natursköna omgivningar", ""],
  ["grön oas mitt i", "nära"],
  ["grön oas", "grönområde"],
  ["en oas i staden", "nära grönområde"],
  ["en oas", ""],
  ["en fristad", ""],
  ["en pärla i", ""],
  ["en pärla", ""],
  ["ett stenkast från", "nära"],

];

// === QUALITY ANALYSIS FUNCTION ===
function analyzeTextQuality(text: string): number {
  if (typeof text !== "string") return 0;
  if (!text || text.trim().length < 50) return 0;

  let score = 0.5; // Base score

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/);
  const lowerText = text.toLowerCase();

  // 1. Sentence length variety (good flow — mix of short and long)
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
  if (avgLength >= 7 && avgLength <= 14) score += 0.08;

  // 2. Staccato detection — penalize 3+ ultra-short sentences in a row
  let staccatoRuns = 0;
  let currentRun = 0;
  for (const len of sentenceLengths) {
    if (len <= 4) { currentRun++; if (currentRun >= 3) staccatoRuns++; }
    else { currentRun = 0; }
  }
  if (staccatoRuns === 0) score += 0.08;
  else score -= (staccatoRuns * 0.04);

  // 3. No extremely long sentences (> 25 words)
  const veryLongSentences = sentenceLengths.filter(len => len > 25).length;
  if (veryLongSentences === 0) score += 0.05;
  else score -= (veryLongSentences * 0.03);

  // 4. Proper punctuation
  if (/[.!?]$/.test(text.trim())) score += 0.03;

  // 5. No repeated sentence starters (variety)
  const starters = sentences.map(s => s.trim().split(/\s+/)[0]?.toLowerCase()).filter(Boolean);
  const uniqueStarters = new Set(starters);
  const starterRatio = starters.length > 0 ? uniqueStarters.size / starters.length : 0;
  if (starterRatio > 0.75) score += 0.08;
  else if (starterRatio > 0.6) score += 0.04;

  // 6. No forbidden phrases (quick check — universal AI markers)
  const forbiddenQuick = ['erbjuder', 'välkommen till', 'bjuder på', 'präglas av', 'genomsyras av'];
  const forbiddenCount = forbiddenQuick.filter(f => lowerText.includes(f)).length;
  if (forbiddenCount === 0) score += 0.08;
  else score -= (forbiddenCount * 0.04);

  // 7. No obvious AI artifacts
  const artifacts = ['vilket gör', 'vilket ger', 'för den som', 'skapar en känsla', 'bidrar till', 'inte bara'];
  const artifactCount = artifacts.filter(a => lowerText.includes(a)).length;
  if (artifactCount === 0) score += 0.08;
  else score -= (artifactCount * 0.03);

  // 8. Specificity bonus — brand names, years, measurements indicate real content
  const specificitySignals = [
    /\b(ballingslöv|marbodal|ikea|hth|kvik|noblessa)\b/i, // kitchen brands
    /\b(siemens|bosch|miele|electrolux|gaggenau)\b/i, // appliance brands
    /\b(20\d{2})\b/, // years (2000-2099)
    /\b\d+\s*kvm\b/i, // square meters
    /\b\d+[,.]?\d*\s*meter\b/i, // height measurements
    /\b(ekparkett|laminat|klinker|fiskbens)/i, // floor materials
  ];
  const specificityCount = specificitySignals.filter(r => r.test(text)).length;
  score += Math.min(0.12, specificityCount * 0.02);

  // 8b. Corrupted word penalty — broken Swedish words must trigger retry/correction
  const corruptionSignals = [
    /\b[a-zåäö]+för att[a-zåäö]*\b/gi,
    /\bsödterass\b/gi,
    /\bterass\b/gi,
    /\bvälsköför att\b/gi,
    /\banvändningssäför att\b/gi,
  ];
  const corruptionCount = corruptionSignals.filter((r) => r.test(text)).length;
  if (corruptionCount > 0) {
    score -= Math.min(0.3, corruptionCount * 0.12);
  }

  // 9. Connecting language bonus — signs of natural flow
  const connectors = ['leder in till', 'med utgång mot', 'med utsikt mot', 'genomgående', 'som renoverades'];
  const connectorCount = connectors.filter(c => lowerText.includes(c)).length;
  if (connectorCount >= 2) score += 0.06;
  else if (connectorCount >= 1) score += 0.03;

  // 10. Natural article usage ("En trea", "Ett radhus") — human touch
  if (/\b(en|ett)\s+(etta|tvåa|trea|fyra|femma|villa|radhus|lägenhet)\b/i.test(text)) {
    score += 0.04;
  }

  // 11. Opening quality — should start with address (street name pattern)
  const firstLine = text.split('\n')[0] || '';
  if (/^[A-ZÅÄÖ][a-zåäö]+(?:gatan|vägen|stigen|gränd|plan|torget|backen)\s/i.test(firstLine)) {
    score += 0.05;
  }

  const firstSentence = sentences[0]?.trim() || '';
  const genericOpeningPatterns = [
    /^en\s+(etta|tvåa|trea|fyra|femma|villa|radhus|lägenhet)\s+om\s+\d+/i,
    /^\w+[^.!?]{0,80}\bmed\s+(balkong|uteplats|terrass)\b/i,
  ];
  const genericOpeningHitCount = genericOpeningPatterns.filter((pattern) => pattern.test(firstSentence)).length;
  if (genericOpeningHitCount > 0 && !/(söderläge|västerläge|gård|utsikt|kvällssol|lugn|renoverat kök|takhöjd|terrass|uteplats)/i.test(firstSentence)) {
    score -= 0.06;
  }

  // 12. Word count appropriateness
  if (words.length >= 100 && words.length <= 500) score += 0.03;

  // 13. Hard penalty for disposition/raw-data layout instead of prose
  const dispositionMarkers = [
    'objektdisposition',
    'grundinformation',
    'planlösning & rum',
    'läge & omgivning',
    'försäljningsargument',
    'särskilda egenskaper',
    '===',
    'typ:',
    'adress:',
    'boarea:',
    'tomtarea:',
  ];
  const dispositionMarkerCount = dispositionMarkers.filter((marker) => lowerText.includes(marker)).length;
  if (dispositionMarkerCount >= 3) {
    score -= 0.45;
  }

  // 14. Penalize repeated core facts too close together (common raw-data feel)
  const sqmMentions = text.match(/\b\d+\s*kvm\b/gi) || [];
  const duplicatedSqmMentions = new Set(sqmMentions.map((m) => m.toLowerCase())).size < sqmMentions.length;
  if (duplicatedSqmMentions) {
    score -= 0.08;
  }

  // 15. Penalize parenthetical clutter and stacked venue lists in area prose
  const parentheticalCount = (text.match(/\([^\n)]{2,80}\)/g) || []).length;
  if (parentheticalCount >= 2) {
    score -= Math.min(0.09, parentheticalCount * 0.03);
  }

  const rawAmenitySignals = [
    /\b(restauranger|butiker|caféer|kommunikationer|service)\s*[:\-]/i,
    /\b(ica|coop|willys|hemköp|förskola|skola|restaurang|bageri)\b[^.!?\n]{0,30},\s*\b(ica|coop|willys|hemköp|förskola|skola|restaurang|bageri)\b/i,
    /\n\s*[A-ZÅÄÖa-zåäö][^\n]{0,40}\n\s*[A-ZÅÄÖa-zåäö][^\n]{0,40}\n/,
  ];
  const rawAmenityCount = rawAmenitySignals.filter((r) => r.test(text)).length;
  if (rawAmenityCount > 0) {
    score -= Math.min(0.12, rawAmenityCount * 0.05);
  }

  const genericBrokerPhraseCount = countGenericBrokerPhrases(text);
  if (genericBrokerPhraseCount > 0) {
    score -= Math.min(0.18, genericBrokerPhraseCount * 0.06);
  }

  const concreteEvidenceSignals = countConcreteEvidenceSignals(text);
  if (concreteEvidenceSignals >= 5) {
    score += Math.min(0.1, concreteEvidenceSignals * 0.015);
  } else if (concreteEvidenceSignals <= 2) {
    score -= 0.08;
  }

  const integrityIssueCount = detectNarrativeIntegrityIssues(text).length;
  if (integrityIssueCount > 0) {
    score -= Math.min(0.35, integrityIssueCount * 0.16);
  }

  const lastSentence = sentences[sentences.length - 1]?.trim() || '';
  if (lastSentence) {
    const weakLocationEndingPatterns = [
      /^\b(ica|coop|willys|hemköp|centrum|skola|förskola|resecentrum|centralstationen?)\b/i,
      /^\b\w+\s+\d+\s+(meter|minuter)\b/i,
    ];
    const weakLocationEndingCount = weakLocationEndingPatterns.filter((pattern) => pattern.test(lastSentence)).length;
    if (weakLocationEndingCount > 0 && !/(promenad|buss|pendling|vardag|nära|runt hörnet|i kvarteret|på cykel)/i.test(lastSentence)) {
      score -= 0.05;
    }
  }

  // 16. Penalize mechanical fact-line constructions
  const mechanicalPatterns = [
    /\benergiklass(?:en)?\s+är\s+[A-G]\b/i,
    /\bfiber\s+är\s+installerat\b/i,
    /\bboarea(?:n)?\s+är\s+\d+\s*kvm\b/i,
    /\bavgiften\s+är\s+\d+/i,
  ];
  const mechanicalCount = mechanicalPatterns.filter((r) => r.test(text)).length;
  if (mechanicalCount > 0) {
    score -= Math.min(0.12, mechanicalCount * 0.04);
  }

  return Math.max(0, Math.min(1, score));
}

function isDispositionLikeOutput(text: string): boolean {
  if (!text) return false;

  const normalized = text.toLowerCase();
  const strongMarkers = [
    'objektdisposition',
    '=== grundinformation ===',
    '=== ytor ===',
    '=== byggnad ===',
    '=== planlösning & rum ===',
    '=== kök ===',
    '=== badrum ===',
    '=== läge & omgivning ===',
    '=== försäljningsargument ===',
    '=== trädgård & uteplats ===',
    '=== särskilda egenskaper ===',
  ];
  const strongHitCount = strongMarkers.filter((marker) => normalized.includes(marker)).length;
  if (strongHitCount >= 2) return true;

  const colonFieldMarkers = [
    'typ:',
    'adress:',
    'pris:',
    'boarea:',
    'tomtarea:',
    'antal rum:',
    'sovrum:',
    'byggår:',
    'energiklass:',
    'kommunikationer:',
    'parkering:',
  ];
  const colonHitCount = colonFieldMarkers.filter((marker) => normalized.includes(marker)).length;
  const lineCount = text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const headingLineCount = text.split(/\r?\n/).filter((line) => /^={3,}|^[A-ZÅÄÖ\s&]+:$/.test(line.trim())).length;

  return colonHitCount >= 5 || (headingLineCount >= 3 && lineCount >= 8);
}

function sanitizeGeneratedMarketingField(text: unknown, styleProfile?: any, style: WritingStyle = "balanced", options?: { allowParagraphs?: boolean; nullIfInvalid?: boolean }, platform?: string): string | null {
  if (typeof text !== "string") return null;
  const sourceHadParagraphBreaks = /\n\s*\n/.test(text);

  let cleaned = cleanForbiddenPhrases(text, styleProfile, style, platform).trim();
  if (!cleaned) return null;
  if (isDispositionLikeOutput(cleaned)) {
    return options?.nullIfInvalid ? null : cleaned;
  }

  if (options?.allowParagraphs) {
    cleaned = addParagraphs(cleaned);
    if (sourceHadParagraphBreaks && !/\n\s*\n/.test(cleaned)) {
      const sentences = cleaned.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      if (sentences.length >= 2) {
        const cut = Math.ceil(sentences.length / 2);
        cleaned = [sentences.slice(0, cut).join(" "), sentences.slice(cut).join(" ")].filter(Boolean).join("\n\n");
      }
    }
  }

  cleaned = repairEmbeddedForAttArtifacts(cleaned);
  cleaned = repairMechanicalBrokerArtifacts(cleaned);
  cleaned = replaceWholePhrase(cleaned, "gör det enkelt att", "underlättar att");
  cleaned = replaceWholePhrase(cleaned, "gör det möjligt att", "möjliggör att");
  cleaned = cleaned.replace(/\bunderlättar att ta sig till och från\b/gi, "ger smidiga resvägar");
  cleaned = cleaned.replace(/\bmöjliggör att ta sig till och från\b/gi, "ger smidiga resvägar");
  cleaned = cleaned.replace(/([.!?]){2,}/g, "$1");

  // NYA REGLER FÖR PERFEKTION:
  // 1. Ta bort parentetiska förklaringar (t.ex. "ICA (matbutik)" -> "ICA")
  cleaned = cleaned.replace(/\s*\((?:matbutik|livsmedelsbutik|affär|gym|skola|förskola|centrum|galleria|restaurang|cafe|station|busshållplats)\)/gi, "");
  
  // 2. Ersätt fega/hedging-formuleringar med direkta påståenden
  cleaned = cleaned.replace(/\bupplevs (?:som )?tyst\b/gi, "är tyst");
  cleaned = cleaned.replace(/\bupplevs (?:som )?ljust?\b/gi, "är ljus");
  cleaned = cleaned.replace(/\bupplevs (?:som )?rymlig(?:t)?\b/gi, "är rymlig");
  cleaned = cleaned.replace(/\bupplevs (?:som )?välplanerad\b/gi, "är välplanerad");
  cleaned = cleaned.replace(/\bupplevs (?:som )?harmonisk\b/gi, "är harmonisk");
  cleaned = collapseRepeatedPhraseRuns(cleaned);
  
  cleaned = cleaned.replace(/[^\S\r\n]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return cleaned.trim() || null;
}

function polishAuxFieldText(field: "socialCopy" | "instagramCaption" | "showingInvitation" | "shortAd" | "headline", text: unknown, style: WritingStyle = "balanced", platform?: string): string | null {
  if (typeof text !== "string") return null;
  let value = text.trim();
  if (!value) return null;

  value = cleanForbiddenPhrases(value, null, style, platform).trim();
  if (!value) return null;
  value = replaceWholePhrase(value, "inom räckhåll", "nära");
  value = value.replace(/\b(laddplats(?: för elbil)?|laddbox(?: installerad)?)\b/gi, "laddbox för elbil");
  value = value.replace(/\bladdbox för elbil(?:\s+med\s+)?laddbox för elbil\b/gi, "laddbox för elbil");
  value = value.replace(/\b(Söder|Väster|Öster|Norr)\b/g, (m) => m.toLowerCase());
  value = collapseRepeatedPhraseRuns(value);
  value = value.replace(/([.!?]){2,}/g, "$1");
  value = value.replace(/\s{2,}/g, " ").trim();

  if (field === "socialCopy" || field === "instagramCaption") {
    value = value.replace(/(?:[.!?]\s*)?(?:skriv för visningstid(?: och mer information)?|hör av dig(?: för [^.!?]+)?|kontakta(?: ansvarig mäklare)?(?: för [^.!?]+)?|boka visning|anmälan)\b[^.!?]*[.!?]?$/i, ". Läs mer i annonsen.").trim();
    value = value.replace(/(?:\.\s*){2,}/g, ". ").trim();
  }

  if (field === "headline") {
    // Remove ALL punctuation everywhere (not just trailing) and emojis
    value = value.replace(/[.!?…]+/g, "").trim();
    value = value.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length > 9) value = words.slice(0, 9).join(" ");
  } else if (field === "instagramCaption") {
    const hasEndPunctuation = /[.!?…]$/.test(value);
    if (!hasEndPunctuation) value += ".";
  } else {
    value = value.replace(/[!?…]+$/g, ".");
    if (!/[.]$/.test(value)) value += ".";
  }

  if ((field === "instagramCaption" || field === "socialCopy") && /(?:skulle du börja|skulle du avsluta|vad säger du)\s*\.?$/i.test(value)) {
    value = value.replace(/(?:skulle du börja|skulle du avsluta|vad säger du)\s*\.?$/i, "").trim();
    if (value && !/[.!?]$/.test(value)) value += ".";
  }
  if (field === "showingInvitation" && !/\bvisning\b/i.test(value)) {
    value = `${value.replace(/[.!?…]+$/g, "")}. Välkommen på visning.`;
  }

  return value || null;
}

function normalizePropertyTypeLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  const map: Record<string, string> = {
    apartment: "lägenhet",
    condo: "lägenhet",
    house: "villa",
    townhouse: "radhus",
    villa: "villa",
    radhus: "radhus",
    lägenhet: "lägenhet",
    fritidshus: "fritidshus",
    parhus: "parhus",
    kedjehus: "kedjehus",
  };
  return map[raw] || raw;
}

const PLATFORM_MAIN_TEXT_BLOCKLIST: Record<string, RegExp[]> = {
  hemnet: [/\benergiklass\b/i, /\benergiprestanda\b/i],
  booli: [],
};

function stripPlatformDisallowedMainTextSentences(text: string, platform: string): string {
  if (!text) return text;
  const blockedPatterns = PLATFORM_MAIN_TEXT_BLOCKLIST[(platform || "").toLowerCase()] || [];
  if (blockedPatterns.length === 0) return text;

  // CRITICAL FIX: Preserve paragraph breaks (\n\n) while filtering sentences
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  const processedParagraphs = paragraphs.map(paragraph => {
    const sentences = paragraph.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const filtered = sentences.filter((sentence) => blockedPatterns.every((pattern) => !pattern.test(sentence)));
    return filtered.length > 0 ? filtered.join(" ") : "";
  }).filter(Boolean);
  
  return processedParagraphs.length > 0 ? processedParagraphs.join("\n\n") : text;
}

function enforcePlatformMainTextHeuristics(text: string, platform: string, disposition?: any): string {
  if (!text) return text;
  if ((platform || "").toLowerCase() !== "hemnet") return text;
  
  // CRITICAL FIX: Preserve paragraph breaks while processing
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  const processedParagraphs = paragraphs.map((paragraph, idx) => {
    // Only process first paragraph (opening)
    if (idx !== 0) return paragraph;
    
    const sentences = paragraph.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length === 0) return paragraph;

    const firstSentence = sentences[0];
    const hasTypeInOpening = /\b(villa|lägenhet|radhus|parhus|kedjehus|fritidshus|etta|tvåa|trea|fyra|femma)\b/i.test(firstSentence);
    const hasSizeInOpening = /\b\d+\s*kvm\b/i.test(firstSentence);
    const hasStrongOpeningSignal = /(söderläge|västerläge|uteplats|terrass|balkong|utsikt|gård|kvällssol|lugn|renoverat kök|takhöjd|genomgående)/i.test(firstSentence);
    const firstSentenceWordCount = firstSentence.split(/\s+/).filter(Boolean).length;
    const openingLikelyAlreadyGood = hasStrongOpeningSignal && firstSentenceWordCount >= 8;
    const shouldAttemptRewrite = (!hasTypeInOpening || !hasSizeInOpening) && !openingLikelyAlreadyGood;
    if (!shouldAttemptRewrite) return paragraph;

    const property = disposition?.property || {};
    const propertyType = normalizePropertyTypeLabel(property.type || disposition?.propertyType);
    const numericSize = typeof property.size === "number"
      ? property.size
      : (typeof property.size === "string" ? Number((property.size.match(/\d+/) || [])[0]) : null);
    if (!propertyType || !numericSize || Number.isNaN(numericSize)) return paragraph;

    const area = typeof disposition?.location?.area === "string" && disposition.location.area.trim()
      ? disposition.location.area.trim()
      : null;

    const strengthCandidates = [
      typeof property.preferred_outdoor_term === "string" ? property.preferred_outdoor_term : null,
      Array.isArray(disposition?.unique_features) ? disposition.unique_features.find((item: unknown) => typeof item === "string" && item.trim().length > 0) : null,
      typeof property.layout === "string" ? property.layout : null,
    ].filter((item): item is string => typeof item === "string" && item.trim().length > 0);

    const strength = strengthCandidates[0] || null;
    const lead = `${propertyType.charAt(0).toUpperCase()}${propertyType.slice(1)} om ${numericSize} kvm${area ? ` i ${area}` : ""}${strength ? ` med ${strength}` : ""}.`;
    sentences[0] = lead.replace(/\s{2,}/g, " ").trim();
    return sentences.join(" ");
  });
  
  return processedParagraphs.join("\n\n");
}

function enforceOpeningStrengthByStyle(text: string, style: WritingStyle, disposition?: any): string {
  if (!text || style === "factual") return text;
  
  // CRITICAL FIX: Preserve paragraph breaks while processing
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  const processedParagraphs = paragraphs.map((paragraph, idx) => {
    // Only process first paragraph (opening)
    if (idx !== 0) return paragraph;
    
    const sentences = paragraph.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length === 0) return paragraph;

    const firstSentence = sentences[0];
    const hasStrongSignal = /(söderläge|västerläge|uteplats|terrass|balkong|utsikt|gård|kvällssol|lugn|renoverat kök|takhöjd|genomgående|jacuzzi|köksö)/i.test(firstSentence);
    const firstWordCount = firstSentence.split(/\s+/).filter(Boolean).length;
    if (hasStrongSignal && firstWordCount >= 8) return paragraph;

    const property = disposition?.property || {};
    const address = typeof property.address === "string" && property.address.trim().length > 0 ? property.address.trim() : "";
    const propertyType = normalizePropertyTypeLabel(property.type || disposition?.propertyType) || "bostad";
    const size = getNumericFact(property.size);
    const preferredOutdoor = typeof property.preferred_outdoor_term === "string" ? property.preferred_outdoor_term.trim() : "";
    const uniqueFeature = Array.isArray(disposition?.unique_features)
      ? disposition.unique_features.find((item: unknown) => typeof item === "string" && item.trim().length > 0)
      : null;
    const layout = typeof property.layout === "string" && property.layout.trim().length > 0 ? property.layout.trim() : "";
    const strongest = preferredOutdoor || (typeof uniqueFeature === "string" ? uniqueFeature.trim() : "") || layout;
    if (!strongest) return paragraph;

    const lead = `${address ? `${address}. ` : ""}${propertyType.charAt(0).toUpperCase()}${propertyType.slice(1)}${size ? ` om ${size} kvm` : ""} med ${strongest}.`
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!lead) return paragraph;

    sentences[0] = lead;
    return sentences.join(" ").replace(/\s{2,}/g, " ").trim();
  });
  
  return processedParagraphs.join("\n\n");
}

function enforceLocationClosingQuality(text: string, platform: string, disposition?: any): string {
  if (!text) return text;
  
  // CRITICAL FIX: Preserve paragraph breaks while processing
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  const processedParagraphs = paragraphs.map((paragraph, idx) => {
    // Only process last paragraph (closing)
    if (idx !== paragraphs.length - 1) return paragraph;
    
    const sentences = paragraph.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length === 0) return paragraph;

    const lastSentence = sentences[sentences.length - 1] || "";
    const weakLocationEnding = /^\b(ica|coop|willys|hemköp|lidl|centrum|skola|förskola|resecentrum|centralstationen?|matbutik)\b/i.test(lastSentence)
      || /^\b\d+\s*(meter|minuter)\b/i.test(lastSentence);
    const alreadyContextual = /(promenad|buss|cykel|pendling|vardag|nära|kvarter|kommunikation)/i.test(lastSentence);
    if (!weakLocationEnding || alreadyContextual) return paragraph;

    const location = disposition?.location || {};
    const property = disposition?.property || {};
    const transport = typeof (property.transport || location.transport) === "string" ? String(property.transport || location.transport).trim() : "";
    const area = typeof location.area === "string" && location.area.trim().length > 0
      ? location.area.trim()
      : (typeof location.municipality === "string" ? location.municipality.trim() : "");
    const amenities = Array.isArray(location.amenities)
      ? location.amenities.filter((item: unknown) => typeof item === "string" && item.trim().length > 0)
      : [];
    const services = Array.isArray(location.services)
      ? location.services.filter((item: unknown) => typeof item === "string" && item.trim().length > 0)
      : [];
    const nearby = [...amenities, ...services].slice(0, 1).map((item) => String(item).replace(/\s*\([^)]*\)\s*/g, "").trim()).filter(Boolean);

    let improvedClosing = "";
    if (area && transport) {
      improvedClosing = `${area} ger smidig vardagslogistik med ${toLowerStart(transport)}.`;
    } else if (transport) {
      improvedClosing = `Kommunikationerna fungerar smidigt med ${toLowerStart(transport)}.`;
    } else if (nearby.length > 0) {
      improvedClosing = `I närområdet finns ${nearby[0]} som underlättar vardagen.`;
    } else if ((platform || "").toLowerCase() === "booli") {
      improvedClosing = "Läget fungerar väl i vardagen med närhet till service och kommunikationer.";
    } else {
      improvedClosing = "Läget ger en vardag med närhet till service och smidiga kommunikationer.";
    }

    sentences[sentences.length - 1] = improvedClosing;
    return sentences.join(" ").replace(/\s{2,}/g, " ").trim();
  });
  
  return processedParagraphs.join("\n\n");
}

function shouldSkipFinalRescueRewrite(finalBrokerAudit: any, localScore: number): boolean {
  if (finalBrokerAudit?.publish_ready !== false) return false;
  if (!Array.isArray(finalBrokerAudit?.issues) || finalBrokerAudit.issues.length === 0) return false;
  if (localScore < 0.84) return false;

  const hardFailureSignals = /\b(fakta|felaktig|motsäger|påhitt|halluc|saknar|boarea|avgift|rum|sovrum|badrum|adress|juridisk|otillåten|enhet)\b/i;
  const advisorySignals = /\b(öppning|stil|ton|flyt|prioritering|lägesstycke|kunde vara|något|uppradande|prosa|berättande)\b/i;

  const issues = finalBrokerAudit.issues
    .filter((issue: unknown): issue is string => typeof issue === "string" && issue.trim().length > 0)
    .slice(0, 8);
  if (issues.length === 0) return false;

  const hasHardFailure = issues.some((issue: string) => hardFailureSignals.test(issue));
  if (hasHardFailure) return false;

  return issues.every((issue: string) => advisorySignals.test(issue));
}

function toLowerStart(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function getNumericFact(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasRoomsMention(text: string, rooms: number | null): boolean {
  if (!rooms) return /\b(rum|sovrum|rok)\b/i.test(text);
  const numberWords: Record<number, string[]> = {
    1: ["ett", "en"],
    2: ["två"],
    3: ["tre"],
    4: ["fyra"],
    5: ["fem"],
    6: ["sex"],
    7: ["sju"],
    8: ["åtta"],
    9: ["nio"],
    10: ["tio"],
  };
  if (new RegExp(`(^|[^\\p{L}\\p{N}])${rooms}\\s*(rum|sovrum|rok)(?=$|[^\\p{L}\\p{N}])`, "iu").test(text)) return true;
  return (numberWords[rooms] || []).some((word) => new RegExp(`(^|[^\\p{L}\\p{N}])${word}\\s*(rum|sovrum)(?=$|[^\\p{L}\\p{N}])`, "iu").test(text));
}

function hasCountLabelMention(text: string, count: number | null, labels: string[]): boolean {
  if (!count) return labels.some((label) => new RegExp(`\\b${label}\\b`, "i").test(text));
  const numberWords: Record<number, string[]> = {
    1: ["ett", "en"],
    2: ["två"],
    3: ["tre"],
    4: ["fyra"],
    5: ["fem"],
    6: ["sex"],
    7: ["sju"],
    8: ["åtta"],
    9: ["nio"],
    10: ["tio"],
  };
  const labelsPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  if (new RegExp(`(^|[^\\p{L}\\p{N}])${count}\\s*(?:${labelsPattern})(?=$|[^\\p{L}\\p{N}])`, "iu").test(text)) return true;
  return (numberWords[count] || []).some((word) => new RegExp(`(^|[^\\p{L}\\p{N}])${word}\\s*(?:${labelsPattern})(?=$|[^\\p{L}\\p{N}])`, "iu").test(text));
}

function buildTransportFallbackSentence(transport: string): string {
  const cleaned = transport.trim().replace(/\.$/, "");
  // If already a well-formed sentence, return as-is with period
  if (/^(med\s+buss|kommunikationerna|pendeltåg|t-bana|spårvagn)/i.test(cleaned)) {
    return `${cleaned}.`;
  }
  const hasBus = /\bbuss\b/i.test(cleaned);
  const hasMinute = /\b\d+\s*minuter?\b/i.test(cleaned);
  const hasTo = /\btill\b/i.test(cleaned);
  if (hasBus && hasMinute && hasTo) {
    // Strip any leading "buss" AND any embedded "med buss" to avoid duplication
    const withoutLeadingBus = cleaned.replace(/^\s*buss\s*/i, "").trim();
    // Remove "med buss" from the middle if it would create a double
    const deduped = withoutLeadingBus.replace(/\bmed\s+buss\b/gi, "").replace(/\s{2,}/g, " ").trim();
    return `Med buss tar det ${toLowerStart(deduped || cleaned)}.`;
  }
  return `Kommunikationerna fungerar smidigt med ${toLowerStart(cleaned)}.`;
}

function enforceCriticalFactPresence(text: string, disposition?: any): string {
  if (!text || !disposition) return text;
  const property = disposition?.property || {};
  const location = disposition?.location || {};
  const sentences: string[] = [];

  const size = getNumericFact(property.size);
  const rooms = getNumericFact(property.rooms);
  const bedrooms = getNumericFact(property.bedrooms);
  const bathrooms = getNumericFact(property.bathrooms);
  const hasSizeMention = size ? new RegExp(`\\b${size}\\b\\s*(kvm|m2|m²)`, "i").test(text) : /\b(kvm|boarea)\b/i.test(text);
  const hasBedrooms = hasCountLabelMention(text, bedrooms, ["sovrum", "sovrummen"]);
  const hasBathroomsCount = hasCountLabelMention(text, bathrooms, ["badrum", "badrummen", "wc", "toalett"]);
  const hasRooms = hasRoomsMention(text, rooms) || (bedrooms ? hasBedrooms : false);
  if (size && !hasSizeMention) {
    sentences.push(`Boarea är ${size} kvm.`);
  }
  if (rooms && !hasRooms) {
    sentences.push(`Bostaden omfattar ${rooms} rum.`);
  }
  if (bedrooms && !hasBedrooms) {
    sentences.push(`Planlösningen rymmer ${bedrooms} sovrum.`);
  }
  if (bathrooms && !hasBathroomsCount) {
    sentences.push(`Planlösningen inkluderar ${bathrooms} badrum.`);
  }

  const kitchen = typeof property.kitchen === "string" && property.kitchen.trim().length > 0
    ? property.kitchen.trim()
    : (typeof property?.materials?.kitchen === "string" ? property.materials.kitchen.trim() : "");
  const kitchenDetail = kitchen.replace(/^kök(?:et)?\s*/i, "").trim();
  if (kitchen && !/\b(kök|köket|köks)\b/i.test(text)) {
    if (kitchenDetail.length > 0 && kitchenDetail.length < kitchen.length) {
      sentences.push(`Köket är ${toLowerStart(kitchenDetail)}.`);
    } else {
      sentences.push(`Köket har ${toLowerStart(kitchen)}.`);
    }
  }

  const bathroom = typeof property.bathroom === "string" && property.bathroom.trim().length > 0
    ? property.bathroom.trim()
    : (typeof property?.materials?.bathroom === "string" ? property.materials.bathroom.trim() : "");
  if (bathroom && !/\b(badrum|badrummet|wc|toalett)\b/i.test(text)) {
    sentences.push(`Badrummet är utfört med ${toLowerStart(bathroom)}.`);
  }

  const transport = typeof property.transport === "string" && property.transport.trim().length > 0
    ? property.transport.trim()
    : (typeof location.transport === "string" ? location.transport.trim() : "");
  if (transport && !/\b(kommunikation|kommunikationer|buss|bussen|t-bana|tbana|pendeltåg|spårvagn|resecentrum|station)\b/i.test(text)) {
    sentences.push(buildTransportFallbackSentence(transport));
  }

  if (sentences.length === 0) return text;
  return `${text.trim()} ${sentences.join(" ")}`.replace(/\s{2,}/g, " ").trim();
}

async function finalizeMainMarketingText(
  text: unknown,
  platform: string,
  styleProfile?: any,
  style: WritingStyle = "balanced",
  options?: { allowParagraphs?: boolean; nullIfInvalid?: boolean },
  disposition?: any
): Promise<string | null> {
  const sanitized = sanitizeGeneratedMarketingField(text, styleProfile, style, options, platform);
  if (!sanitized) return null;

  let finalized = stripPlatformDisallowedMainTextSentences(sanitized, platform);

  if ((platform || "").toLowerCase() === "hemnet") {
    // CRITICAL FIX: Preserve paragraph breaks while filtering energiklass
    const paragraphs = finalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    
    const processedParagraphs = paragraphs.map(paragraph => {
      const sentences = paragraph.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      
      // För Hemnet: Filtrera bort energiklass helt (visas separat på Hemnet)
      const filteredSentences = sentences.filter(sentence => {
        const lower = sentence.toLowerCase();
        return !(/energiklass(?:en)?\s+[a-g]/i.test(lower)) && !(/\bbostaden har energiklass\b/i.test(lower));
      });
      
      const technicalSentences = filteredSentences.filter(sentence => {
        const lower = sentence.toLowerCase();
        return /^fiber\s+är\s+installerat/i.test(lower) ||
               (/^uppvärmning sker via/i.test(lower) && sentence.split(/\s+/).length <= 8);
      });

      if (technicalSentences.length > 0) {
        const mainTextSentences = filteredSentences.filter((s) => !technicalSentences.includes(s));
        const technicalTail = technicalSentences
          .map((s) => s.replace(/^fiber\s+är\s+installerat/i, "Fiber är installerat").replace(/^uppvärmning sker via/i, "Uppvärmning sker via"))
          .join(". ")
          .replace(/\.\s*\./g, ".");
        return `${mainTextSentences.join(" ")} ${technicalTail}`.replace(/\s{2,}/g, " ").trim();
      } else {
        return filteredSentences.join(" ");
      }
    });
    
    finalized = processedParagraphs.join("\n\n");
  }

  finalized = enforcePlatformMainTextHeuristics(finalized, platform, disposition);
  finalized = enforceOpeningStrengthByStyle(finalized, style, disposition);
  finalized = enforceCriticalFactPresence(finalized, disposition);
  
  // VIKTIGT: Generalisera specifika restaurangnamn automatiskt
  finalized = finalized.replace(/\b(Kikka|COME 2 EAT|ChopChop Asian Express Värmdö|ChopChop)\b/gi, 'restauranger');
  finalized = finalized.replace(/\bflera lunch- och middagsalternativ som restauranger\b/gi, 'flera restauranger och caféer');
  finalized = finalized.replace(/\boch restauranger när\b/gi, 'när');
  
  // CRITICAL FIX: Deduplicate repeated restaurant/café terms after generalization
  // "restauranger, restauranger och restauranger" → "restauranger"
  finalized = finalized.replace(/\b(restauranger|caféer|matställen)(?:\s*,\s*\1)+(?:\s+och\s+\1)?/gi, '$1');
  finalized = finalized.replace(/\b(restauranger|caféer|matställen)\s+och\s+\1\b/gi, '$1');
  
  finalized = applyProfessionalNarrativePolish(finalized, disposition, style, platform);
  finalized = enforceLocationClosingQuality(finalized, platform, disposition);

  if (options?.allowParagraphs) {
    finalized = addParagraphs(finalized);
  }

  return finalized.trim() || null;
}

function isStrongPublishableCandidate(
  text: string,
  platform: string,
  minimumPublishableWordMin: number,
  targetWordMax: number,
  style: WritingStyle,
  plan: PlanType
): boolean {
  const mainViolations = validateMainMarketingText({ improvedPrompt: text }, platform, minimumPublishableWordMin, targetWordMax, style);
  const nonWordCountViolations = getNonWordCountViolations(mainViolations);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const strongWordFloor = getStrongPublishableWordFloor(minimumPublishableWordMin, plan);
  const publishableEnough = wordCount >= strongWordFloor;
  const qualityScore = analyzeTextQuality(text);
  // EXCELLENT thresholds - aiming for highest quality, not just "good enough"
  const threshold = plan === "premium" ? 0.92 : plan === "pro" ? 0.88 : 0.84;
  const firstSentence = text.split(/[.!?]+/).find((sentence) => sentence.trim().length > 0)?.trim() || "";
  const strongOpening = /(söderläge|västerläge|uteplats|terrass|balkong|gård|utsikt|kvällssol|lugn|renoverat kök|takhöjd|genomgående)/i.test(firstSentence);
  const concreteEvidenceSignals = countConcreteEvidenceSignals(text);
  const genericBrokerPhraseCount = countGenericBrokerPhrases(text);
  const integrityIssueCount = detectNarrativeIntegrityIssues(text).length;
  return nonWordCountViolations.length === 0
    && publishableEnough
    && !isTooThinForDelivery(text, minimumPublishableWordMin, qualityScore, nonWordCountViolations)
    && qualityScore >= threshold
    && strongOpening
    && concreteEvidenceSignals >= 4
    && genericBrokerPhraseCount === 0
    && integrityIssueCount === 0;
}

// ... (rest of the code remains the same)
function countWeakHemnetDetailSignals(text: string, platform: string): number {
  if (platform !== "hemnet" || !text) return 0;

  const weakDetailPatterns = [
    /\benergiklass(?:en)?\b/gi,
    /\bfiber\s+är\s+installerat\b/gi,
    /\bparkering med laddplats för elbil\b/gi,
    /\buppvärmning sker via\b/gi,
    /\b(fjärrvärme|bergvärme|luft-vattenvärmepump|luftvärmepump)\b/gi,
  ];

  return weakDetailPatterns.reduce((count, pattern) => count + ((text.match(pattern) || []).length > 0 ? 1 : 0), 0);
}

function getNonWordCountViolations(violations: string[]): string[] {
  return violations.filter((v) => !v.startsWith("För få ord") && !v.startsWith("För många ord"));
}

function checkWordCount(text: string, platform: string, targetMin?: number, targetMax?: number): string[] {
  const violations: string[] = [];
  const wordCount = text.split(/\s+/).length;
  const minWords = targetMin || (platform === "hemnet" ? 180 : 200);
  const maxWords = targetMax || (platform === "hemnet" ? 500 : 600);

  if (wordCount < minWords) {
    violations.push(`För få ord: ${wordCount}/${minWords} krävs`);
  }
  if (wordCount > maxWords) {
    violations.push(`För många ord: ${wordCount}/${maxWords} max`);
  }

  return violations;
}

function validateMainMarketingText(result: any, platform: string = "hemnet", targetMin?: number, targetMax?: number, style: WritingStyle = "balanced"): string[] {
  const violations: string[] = [];
  if (typeof result?.improvedPrompt === "string") {
    violations.push(...findRuleViolations(result.improvedPrompt, platform, style));
    violations.push(...checkWordCount(result.improvedPrompt, platform, targetMin, targetMax));
  }
  return violations;
}

// Haversine distance between two lat/lng points in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceWholePhrase(text: string, phrase: string, replacement: string): string {
  if (!text || !phrase) return text;

  const escapedPhrase = escapeRegex(phrase);
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapedPhrase})(?=$|[^\\p{L}\\p{N}])`, "giu");

  return text.replace(pattern, (_match, prefix: string) => `${prefix}${replacement}`);
}

function collapseRepeatedPhraseRuns(text: string): string {
  if (!text) return text;

  let value = text;
  value = value.replace(/\b([A-Za-zÅÄÖåäö0-9]{3,})\s+\1(?:\s+\1)+\b/giu, "$1");
  value = value.replace(/\b([A-Za-zÅÄÖåäö0-9]{2,}(?:\s+[A-Za-zÅÄÖåäö0-9]{2,}){0,2})\s+\1(?:\s+\1)+\b/giu, "$1");
  return value;
}

function repairEmbeddedForAttArtifacts(text: string): string {
  if (!text) return text;

  // First, fix specific known broken words
  let repaired = text
    .replace(/\bvälsköför att\b/gi, 'välskött')
    .replace(/\banvändningssäför att\b/gi, 'användningssätt');

  // Then apply general pattern for any word fused with "för att"
  repaired = repaired
    .replace(/\b([A-Za-zÅÄÖåäö]{3,})för att([A-Za-zÅÄÖåäö]{2,})\b/g, (_match, prefix: string, suffix: string) => `${prefix}${suffix}`)
    .replace(/\b([A-Za-zÅÄÖåäö]{2,})för att([A-Za-zÅÄÖåäö]{3,})\b/g, (_match, prefix: string, suffix: string) => `${prefix}${suffix}`);
  
  return repaired;
}

function hasCorruptedWordArtifacts(text: string): boolean {
  if (!text) return false;
  // Only check for specific fused words, not general patterns
  const specificCorruptions = [
    /\bköketför att\b/gi,
    /\bvardagsrummetför att\b/gi,
    /\bsovrumetför att\b/gi,
    /\bbadrummetför att\b/gi,
    /\bhallenför att\b/gi,
    /\bsödterass\b/gi,
    /\bvälsköför att\b/gi,
    /\banvändningssäför att\b/gi,
  ];
  return specificCorruptions.some((pattern) => pattern.test(text));
}

function repairMechanicalBrokerArtifacts(text: string): string {
  if (!text) return text;

  let repaired = text;

  // Combine energy class and fiber into a single, more natural sentence.
  repaired = repaired.replace(/\b[Ee]nergiklass(?:en)?\s+är\s+([A-G])\.\s*Fiber\s+är\s+installerat\b/g, 'Bostaden har energiklass $1 och fiber är installerat');
  
  // Handle standalone energy class sentences.
  repaired = repaired.replace(/\b[Ee]nergiklass(?:en)?\s+är\s+([A-G])\b/g, 'Bostaden har energiklass $1');

  // Make parking descriptions more concise.
  repaired = repaired.replace(/\b[Pp]arkering\s+har\s+laddplats\s+för\s+elbil\b/g, 'Parkering med laddplats för elbil');
  repaired = repaired.replace(/\b[Pp]arkering\s+har\s+(garage|carport|plats)\b/g, 'Parkering med $1');

  repaired = repaired.replace(/\b(avgift(?:en)?|driftkostnad(?:en)?|kostnad(?:en)?)\s+(?:om|på)\s+((?:\d{1,3}(?:[ \u00A0]\d{3})*|\d{4,7}))(?!\s*(?:kr|kronor|sek|:-|\/mån|\/månad|\/år|per))/gi, '$1 $2 kr');

  // Improve phrasing for nearby amenities.
  repaired = repaired.replace(/(^|[.!?]\s+)([A-ZÅÄÖ][A-Za-zÅÄÖåäö0-9&' -]{1,60})\s+ligger\s+nära\s+när\s+det\s+passar\s+med\s+en\s+måltid\b/g, '$1I samma riktning finns $2 när det passar att äta ute');
  
  // Fix sentence fragments related to bus routes.
  repaired = repaired.replace(/(när det passar med en måltid)\s+(Buss\s+tar\s+cirka\s+\d+)/g, '$1. $2');
  repaired = repaired.replace(/(när det passar att äta ute)\s+(Buss\s+tar\s+cirka\s+\d+)/g, '$1. $2');
  repaired = repaired.replace(/\bBuss\s+tar\s+cirka\s+(\d+\s+minuter[^.!?\n]*)/g, 'Med buss tar det cirka $1');
  repaired = repaired.replace(/\b(\d{1,3}(?:[ \u00A0]\d{3})\s*(?:kr|sek|kronor|:-)?)(?:\s+)([A-ZÅÄÖ][a-zåäö]{2,}\s+(?:fungerar|ligger|har|är|ger|tar)\b)/g, '$1. $2');

  return repaired;
}

function buildOpeningHookFromText(text: string, disposition?: any): string | null {
  const hasSouthPatio = /\bsödervänd?\s+(uteplats|terrass|balkong)\b/i.test(text);
  const hasJacuzzi = /\b(jacuzzi|spabad)\b/i.test(text);
  const address = typeof disposition?.property?.address === "string" ? disposition.property.address.trim() : "";
  if (hasSouthPatio && hasJacuzzi) {
    return address
      ? `På ${address} sätter en södervänd uteplats med inbyggd jacuzzi tonen direkt.`
      : "En södervänd uteplats med inbyggd jacuzzi sätter tonen direkt.";
  }
  if (hasSouthPatio) {
    return address
      ? `På ${address} sätter den södervända uteplatsen tonen direkt.`
      : "Den södervända uteplatsen sätter tonen direkt.";
  }
  return null;
}

function reduceServiceNameListing(text: string): string {
  if (!text) return text;
  let updated = text;
  updated = updated.replace(/Handlingen går snabbt när\s+([^.!?]+?)\s+ligger nära,\s+och en spontan middag blir enkel med\s+([^.!?]{20,120})\./gi, "Vardagen blir smidig med $1 i närheten, och för middag finns flera alternativ i området.");
  updated = updated.replace(/\b(Kikka|COME 2 EAT|ChopChop Asian Express Värmdö)(?:\s*,\s*(Kikka|COME 2 EAT|ChopChop Asian Express Värmdö)){2,}\b/gi, "flera restaurangalternativ");
  return updated;
}

function applyProfessionalNarrativePolish(text: string, disposition?: any, style: WritingStyle = "balanced", platform: string = "hemnet"): string {
  if (!text) return text;
  
  // CRITICAL FIX: Preserve paragraph breaks while processing
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  
  const processedParagraphs = paragraphs.map((paragraph, idx) => {
    let updated = paragraph;
    updated = updated.replace(/\ben kombination som lätt att\b/gi, "en kombination som gör det lätt att");
    updated = updated.replace(/\blätt att snabbt\b/gi, "lätt att");
    updated = updated.replace(/\.\./g, ".");
    
    // Only add hook to first paragraph
    if (idx === 0) {
      const sentences = updated.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      const first = sentences[0] || "";
      if (style !== "factual" && /^(villa|lägenhet|radhus|parhus|fritidshus)\s+om\s+\d+\s*kvm\b/i.test(first)) {
        const hook = buildOpeningHookFromText(updated, disposition);
        if (hook && !updated.startsWith(hook)) {
          updated = `${hook} ${updated}`;
        }
      }
    }
    
    updated = reduceServiceNameListing(updated);
    if (style === "factual") {
      updated = updated
        .replace(/\bsätter tonen direkt\b/gi, "är en tydlig styrka")
        .replace(/\bVardagen blir smidig med\b/gi, "I närområdet finns");
    }
    if ((platform || "").toLowerCase() === "hemnet") {
      updated = updated.replace(/\benergiklass(?:en)?\s+[A-G]\b/gi, "");
      updated = updated.replace(/\s{2,}/g, " ").replace(/\.\s*\./g, ".").trim();
    }
    return updated.replace(/\s{2,}/g, " ").trim();
  });
  
  return processedParagraphs.join("\n\n");
}

function cleanForbiddenPhrases(text: string, styleProfile?: any, style: WritingStyle = "balanced", platform?: string): string {
  if (!text) return text;
  let cleaned = text;

  // === STAGE 1: Fix broken AI artifacts (CRITICAL for quality) ===
  const brokenWordFixes: Array<[RegExp, string]> = [
    // Trasiga sammansättningar
    [/\bmmångaa\b/gi, "många"],
    [/\bgmångaavstånd\b/gi, "gångavstånd"],
    [/\bsprojsade\b/gi, "spröjsade"],
    [/\bSödterass\b/g, "Söderterrass"],
    [/\bsödterass\b/g, "söderterrass"],
    [/\bTerass\b/g, "Terrass"],
    [/\bterass\b/g, "terrass"],
    [/\bvälsköför att\b/gi, "välskött"],
    [/\banvändningssäför att\b/gi, "användningssätt"],
    // Avhuggna prefix — ordning spelar roll (specifika före generiska)
    [/\bPriset \. Enna\b/gi, "Priset för denna"],
    [/\bPriset \.\b/gi, "Priset för denna"],
    [/\bAmiljer\b/gi, "Familjer"],
    [/\bamiljer\b/gi, "familjer"],
    [/\bVkoppling\b/gi, "Avkoppling"],
    [/\bMgänge\b/gi, "umgänge"],
    [/\bKad komfort\b/gi, "med komfort"],
    [/\bEnna\b/gi, "Denna"],
    // "Tt" artefakter
    [/\bTt skapa\b/gi, "för att skapa"],
    [/\bTt ge\b/gi, "för att ge"],
    [/\bTt\b/gi, "för att"],
    // "perfekt"-ersättningar (förbjudet ord)
    [/\bär en perfekt plats\b/gi, "passar bra"],
    [/\bperfekt plats\b/gi, "bra plats"],
    [/\bperfekt för\b/gi, "passar"],
    // Grammatikfel
    [/\bmed rymd och ljus\b/gi, "med god rymd"],
    [/\bmed rymd\b/gi, "med god rymd"],
    [/\bmed , med\b/gi, "med"],
    [/\bmed mer plats \./gi, "med mer plats."],
    [/\bDen generösa takhöjden\b/gi, "Den höga takhöjden"],
    [/\bDen är passar\b/gi, "Den passar"],
    [/\bVillan är passar\b/gi, "Villan passar"],
    [/\bMaterialvalet är noggrant utvalda\b/gi, "Materialen är noggrant utvalda"],
    // NEW: Fix common broken patterns from your example
    [/\bAmiljen\./gi, "Miljön."],
    [/\bVedpanna \. Ppvärmning\./gi, "Vedpanna och pannvärme."],
    [/\bPpvärmning\b/gi, "pannvärme"],
    [/\bAmiljen\b/gi, "miljön"],
    [/\bläför att att\b/gi, "lätt att"],
  ];

  for (const [regex, replacement] of brokenWordFixes) {
    cleaned = cleaned.replace(regex, replacement);
  }

  cleaned = repairEmbeddedForAttArtifacts(cleaned);
  cleaned = repairMechanicalBrokerArtifacts(cleaned);

  // Fix orphan 1-3 char fragments with periods (broken sentences)
  // Keep valid Swedish abbreviations: kvm, m², rum, wc, etc.
  const validShortWords = new Set(['kvm', 'rum', 'mån', 'avg', 'brå', 'brf', 'osv', 'dvs', 'mfl', 'tex', 'pga', 'mha', 'tom']);
  cleaned = cleaned.replace(/(^|\s)([A-ZÅÄÖa-zåäö]{1,2})\.(\s)/gm, (match: string, prefix: string, word: string, space: string) => {
    if (validShortWords.has(word.toLowerCase())) return match; // keep valid abbreviations
    if (/^[A-G]$/.test(word)) return match; // keep energy class letters like "B."
    if (/^[A-ZÅÄÖ]/.test(word) && word.length >= 2) return match; // keep capitalized words (names, etc.)
    return `${prefix}${space}`; // remove orphan fragment only when standalone
  });

  // === STAGE 2: Replace forbidden phrases (filtered by writing style) ===
  for (const [phrase, replacement] of PHRASE_REPLACEMENTS) {
    const normalizedPhrase = phrase.trim();
    const isSingleWordPhrase = /^[A-Za-zÅÄÖåäö0-9-]+$/.test(normalizedPhrase);
    const criticalSingleWordPhrases = new Set(["erbjuder", "erbjuds", "fantastisk", "underbar", "magisk", "otrolig"]);

    if (style !== "factual" && isSingleWordPhrase && !criticalSingleWordPhrases.has(normalizedPhrase.toLowerCase())) continue;
    if (!shouldBlockPhraseForStyle(normalizedPhrase, style, platform)) continue;
    // Skip if phrase is in allowed phrases (respect broker's personal style)
    if (styleProfile?.allowedPhrases?.some((allowed: string) => phrase.toLowerCase().includes(allowed.toLowerCase()))) {
      continue;
    }
    cleaned = replaceWholePhrase(cleaned, phrase, replacement);
  }

  // Add custom forbidden phrases from styleProfile
  if (styleProfile?.forbiddenPhrases?.length > 0) {
    for (const customPhrase of styleProfile.forbiddenPhrases) {
      // Replace custom forbidden phrases with empty string or simple alternative
      cleaned = replaceWholePhrase(cleaned, customPhrase, "");
    }
  }

  cleaned = repairEmbeddedForAttArtifacts(cleaned);
  cleaned = repairMechanicalBrokerArtifacts(cleaned);

  // === STAGE 3: Advanced grammar cleanup (NEW) ===

  // Pass 1: Fix sentence fragments and incomplete thoughts
  cleaned = cleaned.replace(/\.\s+[A-ZÅÄÖ][a-zåäö]{0,3}\s*\./g, "."); // Remove 1-2 word fragments
  cleaned = cleaned.replace(/\.\s+\w{1,2}\.\s*/g, ". "); // Remove single-letter fragments

  // Pass 2: Fix hanging prepositions and connectors at end of lines
  // NOTE: Only actual prepositions/connectors that CANNOT end a Swedish sentence.
  // 'är', 'har', 'finns', 'den', 'det', 'en', 'ett' ARE valid sentence endings.
  cleaned = cleaned.replace(/\s+(med|för|på|av|till|om|från|och|eller|som)\s*$/gim, "");
  cleaned = cleaned.replace(/\s+(med|för|på|av|till|om|från|och|eller|som)\s*\./gim, ".");

  // Pass 3: Fix capitalization after sentence breaks
  cleaned = cleaned.replace(/\.\s+([a-zåäö])/g, (_match, letter) => `. ${letter.toUpperCase()}`);
  cleaned = cleaned.replace(/\?\s+([a-zåäö])/g, (_match, letter) => `? ${letter.toUpperCase()}`);
  cleaned = cleaned.replace(/\!\s+([a-zåäö])/g, (_match, letter) => `! ${letter.toUpperCase()}`);

  // Pass 4: Merge overly short, choppy sentences
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const mergedSentences: string[] = [];
  let i = 0;

  while (i < sentences.length) {
    const current = sentences[i].trim();
    const next = sentences[i + 1]?.trim();

    // Merge if current is very short (< 4 words) and next exists
    if (current.split(' ').length < 4 && next && !current.match(/[!?]$/)) {
      mergedSentences.push(current + ' ' + next);
      i += 2;
    } else {
      mergedSentences.push(current);
      i += 1;
    }
  }

  cleaned = mergedSentences.join(' ');

  // Pass 5: Fix double punctuation and spacing
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  cleaned = cleaned.replace(/\.\s*\./g, ".").replace(/,\s*,/g, ",").replace(/,\s*\./g, ".");
  cleaned = cleaned.replace(/\?\s*\?/g, "?").replace(/\!\s*\!/g, "!");
  cleaned = cleaned.replace(/\s+[.,!?]/g, (match) => match.trim());
  cleaned = cleaned.replace(/[.,!?]\s+[.,!?]/g, (match) => match[0]);

  // Pass 6: Fix specific broken patterns
  cleaned = cleaned.replace(/Priset \. Enna/gi, "Priset för denna");
  cleaned = cleaned.replace(/^\s*[\-–—]\s*/gm, "");
  cleaned = cleaned.replace(/^\s*[,;:]\s*/gm, "");
  cleaned = cleaned.replace(/\b(balkong|terrass|altan|uteplats)\s*\/\s*(balkong|terrass|altan|uteplats)\b/gi, "$1");
  cleaned = cleaned.replace(/\b(det finns|den har)\b(?=\s+\1\b)/gi, "$1");
  cleaned = cleaned.replace(/\bmed\s+(med)\b/gi, "$1");
  cleaned = cleaned.replace(/\b(och|med|samt)\s*[,.]/gi, ".");
  cleaned = cleaned.replace(/(^|[.!?]\s+)(En|Ett)\s+(balkong|terrass|altan|uteplats)\s+(med|i)\s+\3\b/gi, "$1$2 $3 $4");

  // Pass 7: Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[.,!?]\s*/, "").replace(/\s*[.,!?]$/, ".");

  // Pass 8: Ensure text ends with proper punctuation
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += ".";
  }

  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}

// Lägg till styckeindelning om texten saknar radbrytningar
function addParagraphs(text: string): string {
  if (!text) return text;

  // CRITICAL FIX: If text already has paragraph breaks (from post-processor), preserve them!
  const existingParagraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (existingParagraphs.length >= 3) {
    // Text already has good paragraph structure - don't touch it!
    return text;
  }

  // Only normalize and add paragraphs if text is missing them
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  const sentences = normalized.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length < 4) return text;

  const roomOrFeatureStarters = /^(Hallen|Hall\b|Vardagsrummet|Vardagsrum\b|Köket|Kök\b|Sovrummet|Sovrum\b|Huvudsovrummet|Badrummet|Badrum\b|Balkongen|Balkong\b|Altanen|Altan\b|Trädgården|Trädgård\b|Tomten|Tomt\b|Källaren|Källare\b|Övervåning|Entréplan|Bottenvåning|Garage|Carport|Förråd|Tvättstuga|Gäst-wc)/i;
  const locationOrAssociationStarters = /^(BRF\b|Förening|Avgift\b|Resecentrum|Centralstation|Buss\b|Spårvagn|Tåg\b|Pendeltåg|Tunnelbana|ICA\b|Coop\b|Hemköp|Willys|Matbutik|Skola|Förskola|Centrum\b|Kommunikation)/i;

  const paragraphs: string[] = [];
  let current: string[] = [];
  let locationParagraphStarted = false;

  const flush = () => {
    if (current.length === 0) return;
    paragraphs.push(current.join(" ").trim());
    current = [];
  };

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const isRoomOrFeature = roomOrFeatureStarters.test(sentence);
    const isLocationOrAssociation = locationOrAssociationStarters.test(sentence);

    const shouldStartLocationParagraph = isLocationOrAssociation && !locationParagraphStarted && i > 0;
    const shouldStartFeatureParagraph = isRoomOrFeature && current.length >= 2;
    const shouldStartByLength = current.length >= 3 && i < sentences.length - 1;

    if (shouldStartLocationParagraph || shouldStartFeatureParagraph || shouldStartByLength) {
      flush();
    }

    current.push(sentence);

    if (isLocationOrAssociation) {
      locationParagraphStarted = true;
    }
  }

  flush();

  if (paragraphs.length < 3 && sentences.length >= 6) {
    const opening = sentences.slice(0, 2).join(" ");
    const body = sentences.slice(2, Math.max(4, sentences.length - 2)).join(" ");
    const closing = sentences.slice(Math.max(4, sentences.length - 2)).join(" ");
    return [opening, body, closing].filter(Boolean).join("\n\n");
  }

  return paragraphs.join("\n\n");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;
const STRIPE_PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID;

// --- 2-STEGS GENERATION ---

// COMBINED EXTRACTION: Extrahera fakta + ton + skrivplan i ETT steg
const COMBINED_EXTRACTION_PROMPT = `
# UPPGIFT

Du är en svensk fastighetsmäklare med 15 års erfarenhet. I ETT steg ska du:
1. Extrahera ALLA relevanta fakta från rådata
2. Analysera tonalitet och målgrupp
3. Skapa en skrivplan med evidence-gate

# REGLER

1. HITTA ALDRIG PÅ — extrahera bara vad som faktiskt finns i rådata
2. Om info saknas, ange null — gissa ALDRIG
3. Använd exakta värden från rådata (kvm, pris, år, märken, material)
4. Använd BARA fakta från rådata — lägg ALDRIG till avstånd, platser eller detaljer som inte står i rådata
5. Varje claim i skrivplanen MÅSTE ha evidence från rådata

# KLASSIFICERING (baserat på rådata — hitta ALDRIG på nya fakta)

Kategorisera objektet utifrån vad som FINNS i rådata:
- Områdestyp (stadskärna, villaområde, förort, etc) — baserat på adress/område
- Prisnivå (budget, standard, premium, luxury) — baserat på pris och kvm-pris
- Målgrupp (förstagångsköpare, familjer, etablerade, downsizers) — baserat på storlek och läge
- VIKTIGT: Lägg INTE till kommunikationer, butiker eller avstånd som inte står i rådata

# OUTPUT FORMAT (JSON)

{
  "disposition": {
    "property": {
      "type": "lägenhet/villa/radhus",
      "address": "exakt adress",
      "size": 62,
      "rooms": 3,
      "bedrooms": 2,
      "floor": "3 av 5",
      "year_built": "1930-tal",
      "condition": "gott skick",
      "energy_class": "C",
      "elevator": true,
      "renovations": ["kök 2022", "badrum 2020"],
      "materials": {
        "floors": "ekparkett",
        "walls": "målade väggar",
        "kitchen": "stenbänk, vita luckor",
        "bathroom": "helkaklat"
      },
      "balcony": { "exists": true, "direction": "sydväst", "size": "8 kvm", "type": "inglasad" },
      "ceiling_height": "2.8 meter",
      "layout": "genomgående planlösning",
      "storage": ["garderob i sovrum", "förråd 4 kvm"],
      "heating": "fjärrvärme",
      "parking": "garage",
      "special_features": ["golvvärme badrum", "öppen spis"]
    },
    "economics": {
      "price": 4500000,
      "fee": 4200,
      "price_per_kvm": 72581,
      "association": { "name": "BRF Solhemmet", "status": "stabil ekonomi", "renovations": "stambytt 2019" }
    },
    "location": {
      "area": "områdesnamn från rådata",
      "municipality": "kommun från rådata",
      "character": "stadskärna/villaområde/förort/etc",
      "price_level": "budget/standard/premium/luxury",
      "target_group": "baserat på storlek och läge",
      "transport": "BARA från rådata, annars null",
      "amenities": ["BARA platser nämnda i rådata"],
      "services": ["BARA service nämnd i rådata"],
      "parking": "från rådata eller null"
    },
    "unique_features": ["takhöjd 2.8m", "originaldetaljer", "inglasad balkong"]
  },
  "tone_analysis": {
    "price_category": "budget/standard/premium/luxury",
    "location_category": "suburban/urban/waterfront/nature",
    "target_audience": "first_time_buyers/young_families/established/downsizers",
    "writing_style": "professional/sophisticated/luxury",
    "key_selling_points": ["punkt 1", "punkt 2", "punkt 3"],
    "local_context": "kort geografisk kontext"
  },
  "writing_plan": {
    "opening": "Adress + typ + unik egenskap (ALDRIG 'Välkommen')",
    "paragraphs": [
      {"id": "p1", "goal": "Öppning och läge", "must_include": ["adress", "typ", "storlek"]},
      {"id": "p2", "goal": "Planlösning och rum", "must_include": ["rum", "material", "ljus"]},
      {"id": "p3", "goal": "Kök och badrum", "must_include": ["utrustning", "renovering"]},
      {"id": "p4", "goal": "Balkong/uteplats", "must_include": ["storlek", "väderstreck"]},
      {"id": "p5", "goal": "Läge och kommunikationer", "must_include": ["transport", "service"]}
    ],
    "claims": [
      {"claim": "påstående som får vara i texten", "evidence": "exakt värde från rådata"}
    ],
    "must_include": ["obligatoriska fakta som MÅSTE med"],
    "missing_info": ["info som saknas i rådata"],
    "forbidden_phrases": ["erbjuder", "perfekt för", "i hjärtat av", "vilket gör det", "för den som", "bjuder på", "präglas av", "välkommen till"]
  }
}
`;

// Steg 2: Skapa plan/checklista som steg 3 måste följa
const PLAN_PROMPT = `
# UPPGIFT

Du ska skapa en tydlig plan för objektbeskrivningen utifrån DISPOSITIONEN.
Du ska INTE skriva själva objektbeskrivningen. Du ska bara skapa en plan som steg 3 kan följa utan att behöva en lång regelprompt.

# KRITISKA REGLER

1. HITTA ALDRIG PÅ — använd bara fakta som finns i dispositionen
2. Om fakta saknas: skriv in det i missing_info (och planera inte in det i texten)
3. Håll planen kort, konkret och kontrollerbar
4. Anpassa ordantal och upplägg efter PLATTFORM (HEMNET eller BOOLI/EGEN SIDA)
5. EVIDENCE-GATE: Varje sakpåstående som får förekomma i texten MÅSTE finnas som en post i claims med evidence_path + evidence_value från dispositionen
6. HÖGRISK-PÅSTÅENDEN: Utsikt (t.ex. havsutsikt), eldstad/öppen spis, balkongtyp (inglasad), väderstreck och kommunikationstyp (pendeltåg/tunnelbana) får bara finnas i claims om det står explicit i dispositionen
7. ANTI-AI-MALL: forbidden_words måste innehålla en baslista med klassiska generiska fraser (plattformsspecifik). Writer kommer följa den listan strikt.
8. TERMINOLOGI-LÅS: Om dispositionen anger en föredragen term (t.ex. terrass, altan, uteplats, balkong) ska samma term användas konsekvent. Blanda aldrig ihop flera termer med snedstreck.
9. KONFLIKTHANTERING: Om DISPOSITION innehåller data_quality_notes eller motstridiga år/fakta ska planen skriva in hur texten ska neutraliseras, tonas ner eller hoppas över.
10. BETONING: Planen ska tydligt säga vilken detalj som ska få mest utrymme, vilka som ska nämnas kort och vilka som ska utelämnas om de är svaga eller oklara.

# BASLISTA FÖRBJUDNA FRASER (lägg in i forbidden_words)

För BOTH (universella AI-markörer): "i hjärtat av", "vilket gör det enkelt", "vilket", "som ger en", "rymlig känsla", "härlig plats för", "plats för avkoppling", "generösa ytor", "generös takhöjd", "bjuder på", "präglas av", "genomsyras av", "andas lugn", "andas charm", "erbjuder", "perfekt", "en sann pärla", "Välkommen", "faciliteter", "njut av", "inte bara", "utan också", "bidrar till", "förstärker", "skapar en känsla", "-möjligheter", "Det finns även", "Det finns också"

För BOOLI/EGEN SIDA: lägg även in "för den som", "vilket ger en", "en bostad som", "ett hem som", "ett hem att trivas i", "mer än bara"

# OUTPUT FORMAT (JSON)

{
  "platform": "hemnet" | "booli",
  "tone": "professionell svensk mäklare, saklig och engagerande",
  "word_target": {
    "min": 0,
    "max": 0
  },
  "paragraph_outline": [
    {
      "id": "p1",
      "goal": "Vad stycket ska uppnå",
      "must_include": ["exakta faktapunkter som MÅSTE med om de finns"],
      "do_not_include": ["fakta som inte ska vara här"],
      "allowed_flair": "max 1 kort känslodetalj, men endast om den stöds av fakta"
    }
  ],
  "must_include_global": ["lista med obligatoriska fakta över hela texten"],
  "forbidden_words": ["ord/fraser som absolut inte får användas"],
  "claims": [
    {
      "claim": "kort påstående som får förekomma i text",
      "evidence_path": "JSONPath-liknande sökväg i dispositionen, t.ex. property.size",
      "evidence_value": "värdet från dispositionen"
    }
  ],
  "missing_info": ["fakta som saknas men som normalt behövs för komplett annons"],
  "risk_notes": ["varningar: överdrifter, oklara uppgifter, juridiska risker"]
}
`;

function deepClean<T>(value: T): T {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => deepClean(item))
      .filter((item) => {
        if (item === null || item === undefined) return false;
        if (typeof item === "string") return item.trim().length > 0;
        if (Array.isArray(item)) return item.length > 0;
        if (typeof item === "object") return Object.keys(item as Record<string, unknown>).length > 0;
        return true;
      });
    return cleaned as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => [key, deepClean(val)] as const)
      .filter(([, val]) => {
        if (val === null || val === undefined) return false;
        if (typeof val === "string") return val.trim().length > 0;
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "object") return Object.keys(val as Record<string, unknown>).length > 0;
        return true;
      });
    return Object.fromEntries(entries) as T;
  }

  return value;
}

function matchExamples(disposition: any, toneAnalysis: any): string[] {
  const propertyType = String(disposition?.property?.type || "lägenhet").toLowerCase();
  const rooms = Number(disposition?.property?.rooms) || 0;
  const size = Number(disposition?.property?.size) || 0;

  let bucket: keyof typeof EXAMPLE_DATABASE = "medium_apartment";
  if (propertyType.includes("villa") || propertyType.includes("hus")) {
    bucket = "villa";
  } else if (propertyType.includes("radhus")) {
    bucket = "radhus";
  } else if (size > 0 && size < 55) {
    bucket = "small_apartment";
  } else if (size >= 85 || rooms >= 4) {
    bucket = "large_apartment";
  }

  const examples = EXAMPLE_DATABASE[bucket] || EXAMPLE_DATABASE.medium_apartment;
  const sorted = [...examples].sort((a, b) => {
    const roomDelta = Math.abs((a.metadata.rooms || 0) - rooms) - Math.abs((b.metadata.rooms || 0) - rooms);
    if (roomDelta !== 0) return roomDelta;
    return Math.abs((a.metadata.size || 0) - size) - Math.abs((b.metadata.size || 0) - size);
  });

  const selected = sorted.slice(0, 3).map((example) => example.text);

  const outdoorPreference = String(
    disposition?.property?.preferred_outdoor_term ||
    disposition?.property?.outdoor_space_term ||
    toneAnalysis?.terminology_preferences?.outdoor_space ||
    ""
  ).toLowerCase();

  if (outdoorPreference && selected.length > 0) {
    return selected.map((text) => {
      if (outdoorPreference === "terrass") return text.replace(/uteplats/gi, "terrass").replace(/altan/gi, "terrass");
      if (outdoorPreference === "altan") return text.replace(/uteplats/gi, "altan").replace(/terrass/gi, "altan");
      if (outdoorPreference === "uteplats") return text.replace(/altan/gi, "uteplats").replace(/terrass/gi, "uteplats");
      return text;
    });
  }

  return selected;
}

function normalizeCommonSwedishRealEstateTypos(value: string): string {
  return value
    .replace(/\bterass\b/gi, (match) => match[0] === match[0].toUpperCase() ? "Terrass" : "terrass")
    .replace(/\bjaccuzi\b/gi, (match) => match[0] === match[0].toUpperCase() ? "Jacuzzi" : "jacuzzi")
    .replace(/\btilläggaisolering\b/gi, "tilläggsisolering")
    .replace(/\bvälsköför att\b/gi, "välskött")
    .replace(/\banvändningssäför att\b/gi, "användningssätt");
}

function sanitizeStructuredText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = normalizeCommonSwedishRealEstateTypos(String(value))
    .replace(/\bNaN\s*(km|m|meter)?\b/gi, "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return null;
  if (/^(nan|undefined|null|okänd)$/i.test(text)) return null;
  return text;
}

function sanitizeStructuredList(value: unknown): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n]/)
      : [];

  const cleaned = rawItems
    .map((item) => sanitizeStructuredText(item))
    .filter((item): item is string => Boolean(item))
    .map((item) => item.replace(/^[-–—]\s*/, "").trim())
    .filter((item) => item.length > 1)
    .filter((item) => !/\bnan\b/i.test(item))
    .filter((item, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);

  return cleaned;
}

function canonicalizeFeatureToken(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (/\b(laddplats elbil|laddplats för elbil|laddbox(?: för elbil)?|elbilsladdning)\b/i.test(normalized)) return "laddbox för elbil";
  if (/\b(nya fönster|fönster bytta)\b/i.test(normalized)) return "nya fönster";
  if (/\b(stambyte|stamrenovering)\b/i.test(normalized)) return "stambyte genomfört";
  return normalized;
}

function removeRedundantFeatureMentions(features: string[], relatedFields: string[]): string[] {
  if (!features.length) return features;
  const related = relatedFields.map((entry) => canonicalizeFeatureToken(entry || ""));
  return features.filter((feature) => {
    const canonical = canonicalizeFeatureToken(feature);
    return !related.some((relatedCanonical) => relatedCanonical.length > 0 && relatedCanonical === canonical);
  });
}

function normalizeOutdoorTerm(value: string | null, propertyType: string): string {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("terrass")) return "terrass";
  if (normalized.includes("altan") || normalized.includes("trädäck")) return "altan";
  if (normalized.includes("uteplats")) return "uteplats";
  if (normalized.includes("balkong")) return "balkong";
  if (propertyType.includes("villa") || propertyType.includes("radhus")) return "uteplats";
  return "balkong";
}

function detectConflictingYears(values: Array<unknown>): string[] {
  const years = values
    .flatMap((value) => sanitizeStructuredList(value))
    .flatMap((text) => Array.from(text.matchAll(/\b(19\d{2}|20\d{2})\b/g)).map((match) => match[1]));

  return Array.from(new Set(years));
}

function resolveLocationAreaName(propertyData: Record<string, any>): string | null {
  const candidates = [
    propertyData.areaName,
    propertyData.district,
    propertyData.neighborhood,
    propertyData.cityDistrict,
    propertyData.locationArea,
  ];

  for (const candidate of candidates) {
    const sanitized = sanitizeStructuredText(candidate);
    if (!sanitized) continue;
    if (/^\d+(?:[.,]\d+)?$/.test(sanitized)) continue;
    if (/^\d+(?:[.,]\d+)?\s*kvm$/i.test(sanitized)) continue;
    return sanitized;
  }

  return null;
}

function normalizeBooleanish(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["ja", "yes", "true", "1", "finns"].includes(normalized)) return true;
    if (["nej", "no", "false", "0", "saknas"].includes(normalized)) return false;
  }
  return null;
}

function buildDispositionFromStructuredData(propertyData: Record<string, any>, imageAnalysis?: any) {
  const propertyTypeRaw = sanitizeStructuredText(propertyData.propertyType || propertyData.type || "lägenhet")?.toLowerCase() || "lägenhet";
  const propertyType = propertyTypeRaw === "apartment" ? "lägenhet" : propertyTypeRaw;
  const livingArea = Number(propertyData.livingArea ?? propertyData.area ?? propertyData.size) || null;
  const rooms = Number(propertyData.rooms ?? propertyData.totalRooms) || null;
  const bedrooms = Number(propertyData.bedrooms) || null;
  const bathrooms = Number(propertyData.bathrooms) || null;
  const price = Number(propertyData.price) || null;
  const fee = Number(propertyData.monthlyFee ?? propertyData.fee) || null;
  const pricePerKvm = price && livingArea ? Math.round(price / livingArea) : null;
  const yearBuilt = sanitizeStructuredText(propertyData.yearBuilt ?? propertyData.year_built ?? null);
  const areaName = resolveLocationAreaName(propertyData);
  const address = sanitizeStructuredText(propertyData.address) || "";
  const addressCity = address.split(",").pop()?.trim() || null;
  const balconyDirection = sanitizeStructuredText(propertyData.balconyDirection ?? propertyData.direction ?? null);
  const outdoorSize = sanitizeStructuredText(propertyData.balconySize ?? propertyData.outdoorSize ?? propertyData.patioSize ?? propertyData.terraceSize ?? null);
  const rawDescription = sanitizeStructuredText([propertyData.description, propertyData.otherInfo, propertyData.layout].filter(Boolean).join(" ")) || "";

  const outdoorSignals = [
    propertyData.preferredOutdoorTerm,
    propertyData.outdoorType,
    propertyData.balconyType,
    propertyData.patioType,
    propertyData.terraceType,
    propertyData.description,
    propertyData.otherInfo,
    propertyData.layout,
  ].map((value) => sanitizeStructuredText(value)).filter(Boolean) as string[];
  const preferredOutdoorTerm = normalizeOutdoorTerm(outdoorSignals.join(" "), propertyType);

  const uniqueSellingPoints = [
    propertyData.uniqueSellingPoints,
    propertyData.highlights,
    propertyData.specialFeatures,
    propertyData.otherInfo,
  ]
    .flatMap((value) => sanitizeStructuredList(value))
    .filter((value) => value.length >= 3)
    .filter((value) => !/^renoverat\s+kök$/i.test(value))
    .filter((value) => !/^renoverat$/i.test(value));

  const transport = sanitizeStructuredText(propertyData.transport ?? null);
  const amenities = sanitizeStructuredList(propertyData.amenities);
  const services = sanitizeStructuredList(propertyData.services);
  const specialFeaturesRaw = sanitizeStructuredList(propertyData.specialFeatures);
  const renovations = sanitizeStructuredList(propertyData.renovations);
  const renovationYears = detectConflictingYears([
    propertyData.renovations,
    propertyData.kitchen,
    propertyData.bathroom,
    propertyData.otherInfo,
  ]);
  const kitchenText = sanitizeStructuredText(propertyData.kitchen ?? propertyData.kitchenDescription ?? null);
  const bathroomText = sanitizeStructuredText(propertyData.bathroom ?? propertyData.bathroomDescription ?? null);
  const flooringText = sanitizeStructuredText(propertyData.flooring ?? propertyData.floors);
  const parkingText = sanitizeStructuredText(propertyData.parking);
  const heatingText = sanitizeStructuredText(propertyData.heating);
  const layoutText = sanitizeStructuredText(propertyData.layout ?? propertyData.layoutDescription ?? propertyData.floorPlan);
  const storageList = sanitizeStructuredList(propertyData.storage);
  const specialFeatures = removeRedundantFeatureMentions(specialFeaturesRaw, [
    parkingText || "",
    ...uniqueSellingPoints,
  ]);
  const floorText = sanitizeStructuredText(propertyData.floor ?? null);
  const elevatorValue = normalizeBooleanish(propertyData.elevator);
  const balconyExists = normalizeBooleanish(propertyData.hasBalcony ?? propertyData.balcony);

  const dataQualityNotes: string[] = [];
  if (!livingArea) dataQualityNotes.push("Boyta saknas eller är oklar.");
  if (!rooms) dataQualityNotes.push("Antal rum saknas eller är oklart.");
  if (!address) dataQualityNotes.push("Adress saknas eller är ofullständig.");
  if (!price && propertyData.askingPrice) dataQualityNotes.push("Prisfältet är inte normaliserat.");
  if (propertyData.balcony && propertyData.patio) dataQualityNotes.push("Underlaget nämner flera uteytor; använd konsekvent terminologi och undvik sammanblandning.");
  if (/\b(balkong|terrass|altan|uteplats)\b.*\b(balkong|terrass|altan|uteplats)\b/i.test(rawDescription) && outdoorSignals.length > 1) {
    dataQualityNotes.push("Uteytan beskrivs med flera termer i underlaget; välj en term och håll den genom hela texten.");
  }
  if (String(yearBuilt || "").includes("/") || String(yearBuilt || "").includes("-")) {
    dataQualityNotes.push("Byggår eller årtal behöver skrivas försiktigt eftersom underlaget kan tolkas på flera sätt.");
  }
  if (!transport && typeof propertyData.transport === "string" && propertyData.transport.trim().length > 0) {
    dataQualityNotes.push("Kommunikationsfältet innehöll ogiltiga eller ofullständiga värden och har tonats ned.");
  }
  if (amenities.length === 0 && typeof propertyData.amenities === "string" && propertyData.amenities.trim().length > 0) {
    dataQualityNotes.push("Områdes-/platsdata var för brusig för att användas direkt i texten.");
  }
  if (renovationYears.length >= 2 && renovations.length > 0) {
    dataQualityNotes.push(`Renoveringsuppgifter innehåller flera årtal (${renovationYears.join(", ")}); skriv neutralt och undvik exakt koppling om underlaget är oklart.`);
  }

  const emphasisNotes = [
    uniqueSellingPoints[0] ? `Ge störst utrymme åt: ${uniqueSellingPoints[0]}.` : null,
    uniqueSellingPoints[1] ? `Nämn kortare men tydligt: ${uniqueSellingPoints[1]}.` : null,
    dataQualityNotes.length > 0 ? "Tona ned eller utelämna uppgifter som markerats som oklara i data_quality_notes." : null,
  ].filter(Boolean);

  const disposition = deepClean({
    property: {
      type: propertyType,
      address,
      size: livingArea,
      rooms,
      bedrooms,
      bathrooms,
      floor: floorText,
      year_built: yearBuilt,
      condition: sanitizeStructuredText(propertyData.condition ?? null),
      energy_class: sanitizeStructuredText(propertyData.energyClass ?? null),
      elevator: elevatorValue,
      renovations,
      materials: {
        floors: flooringText,
        walls: sanitizeStructuredText(propertyData.walls ?? null),
        kitchen: kitchenText,
        bathroom: bathroomText,
      },
      kitchen: kitchenText,
      bathroom: bathroomText,
      balcony: {
        exists: balconyExists,
        direction: balconyDirection,
        size: outdoorSize,
        type: sanitizeStructuredText(propertyData.balconyType ?? null),
      },
      ceiling_height: sanitizeStructuredText(propertyData.ceilingHeight ?? null),
      layout: layoutText,
      storage: storageList,
      heating: heatingText,
      parking: parkingText,
      special_features: specialFeatures,
      unique_selling_points: uniqueSellingPoints,
      preferred_outdoor_term: preferredOutdoorTerm,
      data_quality_notes: dataQualityNotes,
      emphasis_notes: emphasisNotes,
      // Image analysis insights
      ...(imageAnalysis?.aggregated ? {
        image_insights: {
          room_types: imageAnalysis.aggregated.roomTypes,
          observed_features: imageAnalysis.aggregated.allFeatures,
          materials_observed: imageAnalysis.aggregated.materials,
          condition_from_images: imageAnalysis.aggregated.condition,
          lighting_from_images: imageAnalysis.aggregated.lighting,
        }
      } : {}),
    },
    economics: {
      price,
      fee,
      price_per_kvm: pricePerKvm,
      association: {
        name: sanitizeStructuredText(propertyData.brfName ?? propertyData.associationName ?? null),
        status: sanitizeStructuredText(propertyData.brfStatus ?? null),
        renovations: sanitizeStructuredText(propertyData.brfRenovations ?? null),
      },
    },
    location: {
      area: areaName,
      municipality: sanitizeStructuredText(propertyData.municipality ?? null) ?? addressCity,
      transport,
      amenities,
      services,
      parking: sanitizeStructuredText(propertyData.locationParking ?? null),
    },
    unique_features: uniqueSellingPoints,
    risk_notes: dataQualityNotes,
    data_quality_notes: dataQualityNotes,
  });

  const priceCategory = pricePerKvm
    ? pricePerKvm > 80000 ? "premium"
      : pricePerKvm < 40000 ? "budget"
        : "standard"
    : "standard";

  const targetAudience = propertyType.includes("villa") || propertyType.includes("radhus")
    ? ((rooms || 0) >= 5 ? "familjer" : "par eller mindre familjer")
    : ((livingArea || 0) < 45 ? "förstagångsköpare eller singlar"
      : (livingArea || 0) < 85 ? "par eller liten familj"
        : "etablerade köpare eller familjer");

  const tone_analysis = deepClean({
    price_category: priceCategory,
    location_category: propertyType.includes("villa") || propertyType.includes("radhus") ? "residential" : "urban",
    target_audience: targetAudience,
    writing_style: priceCategory === "premium" ? "sophisticated" : "professional",
    key_selling_points: uniqueSellingPoints.slice(0, 3),
    local_context: areaName || addressCity || null,
    terminology_preferences: {
      outdoor_space: preferredOutdoorTerm,
    },
    data_quality_notes: dataQualityNotes,
    emphasis_strategy: emphasisNotes,
  });

  const weakHemnetFacts = [
    propertyData.energyClass ? "energiklass" : null,
    heatingText ? "uppvärmning" : null,
    parkingText ? "parkering" : null,
    /fiber/i.test(String(propertyData.otherInfo ?? "")) || /fiber/i.test(String(propertyData.description ?? "")) ? "fiber" : null,
  ].filter(Boolean) as string[];

  const hemnetDeprioritizeNotes = [
    weakHemnetFacts.length > 0 ? `I Hemnet-huvudtext: tona ned eller utelämna svaga teknikfakta som ${weakHemnetFacts.join(", ")} om de inte tydligt stärker köparnyttan.` : null,
    "Låt aldrig teknikfakta ta plats från öppning, planlösning, uteplats, ljus, kökskvalitet eller lägesprosa i Hemnet.",
  ].filter(Boolean);

  const writing_plan = deepClean({
    opening: "Adress + typ + storlek + stark konkret detalj utan klyscha",
    paragraphs: [
      { id: "p1", goal: "Öppning", must_include: [address, propertyType, livingArea ? `${livingArea} kvm` : null].filter(Boolean), do_not_include: weakHemnetFacts, allowed_flair: uniqueSellingPoints[0] || null },
      { id: "p2", goal: "Planlösning och rum", must_include: [layoutText, rooms ? `${rooms} rum` : null, bedrooms ? `${bedrooms} sovrum` : null, bathrooms ? `${bathrooms} badrum` : null].filter(Boolean), do_not_include: dataQualityNotes.length > 0 ? ["oklara planlösningspåståenden"] : [] },
      { id: "p3", goal: "Kök, badrum och material", must_include: [kitchenText, bathroomText, flooringText].filter(Boolean), do_not_include: [] },
      { id: "p4", goal: "Uteplats och övrigt", must_include: [preferredOutdoorTerm, outdoorSize, balconyDirection].filter(Boolean), mention_if_space_allows: [parkingText, heatingText, sanitizeStructuredText(propertyData.energyClass ?? null)].filter(Boolean), do_not_include: ["blandad balkong/terrass/altan-terminologi", ...weakHemnetFacts] },
      { id: "p5", goal: "Läge", must_include: [areaName, transport, ...amenities.slice(0, 2)].filter(Boolean), do_not_include: ["påhittade områdespåståenden"] },
    ],
    claims: [
      livingArea ? { claim: `Boyta om ${livingArea} kvm`, evidence_path: "property.size", evidence_value: livingArea } : null,
      rooms ? { claim: `${rooms} rum`, evidence_path: "property.rooms", evidence_value: rooms } : null,
      bedrooms ? { claim: `${bedrooms} sovrum`, evidence_path: "property.bedrooms", evidence_value: bedrooms } : null,
      bathrooms ? { claim: `${bathrooms} badrum`, evidence_path: "property.bathrooms", evidence_value: bathrooms } : null,
      yearBuilt ? { claim: `Byggår ${yearBuilt}`, evidence_path: "property.year_built", evidence_value: yearBuilt } : null,
      outdoorSize ? { claim: `${preferredOutdoorTerm} ${outdoorSize}`, evidence_path: "property.balcony.size", evidence_value: outdoorSize } : null,
      balconyDirection ? { claim: `${preferredOutdoorTerm} i ${balconyDirection}`, evidence_path: "property.balcony.direction", evidence_value: balconyDirection } : null,
    ].filter(Boolean),
    must_include: [address, propertyType, livingArea ? `${livingArea} kvm` : null, areaName].filter(Boolean),
    missing_info: dataQualityNotes,
    forbidden_phrases: ["erbjuder", "välkommen till", "bjuder på", "präglas av", "generösa ytor"],
    deprioritize_for_hemnet: hemnetDeprioritizeNotes,
    risk_notes: dataQualityNotes,
    emphasis_notes: [...emphasisNotes, ...hemnetDeprioritizeNotes],
    terminology_lock: {
      outdoor_space: preferredOutdoorTerm,
    },
  });

  return { disposition, tone_analysis, writing_plan };
}

// === EXEMPELDATABAS — RIKSTÄCKANDE MÄKLARTEXTER ===
// Kategoriserade efter BOSTADSTYP + STORLEK (fungerar för ALLA städer i Sverige)
const EXAMPLE_DATABASE: Record<string, { text: string, metadata: { type: string, rooms: number, size: number } }[]> = {
  // SMÅ LÄGENHETER (1-2 rum, under 55 kvm)
  small_apartment: [
    {
      text: "Kyrkogatan 8, 3 tr, Västerås. En etta om 34 kvm med nymålade väggar och nya fönster.\n\nÖppen planlösning med kök och vardagsrum i samma rum. Köket har spis, kyl och frys. Förvaring i väggskåp och garderob i hallen.\n\nLaminatgolv genomgående. Fönstren är bytta och ger bra ljusinsläpp.\n\nBadrummet renoverades 2022 och är helkaklat med dusch, wc och handfat.\n\nTågstationen 5 minuter. ICA Nära i kvarteret.",
      metadata: { type: "lägenhet", rooms: 1, size: 34 }
    },
    {
      text: "Andra Långgatan 15, 2 tr, Göteborg. En tvåa om 48 kvm med balkong mot gården.\n\nHallen har garderob och leder in till vardagsrummet med två fönster och takhöjd på 2,60 meter. Ekparkett genomgående.\n\nKöket har vita luckor och vitvaror från Electrolux 2020. Matplats för två vid fönstret.\n\nSovrummet rymmer dubbelsäng. Badrummet är helkaklat med dusch och tvättmaskin.\n\nBalkong om 3 kvm mot väster. Avgift 3 200 kr/mån.\n\nSpårvagn Järntorget 2 minuter. Coop på Andra Långgatan.",
      metadata: { type: "lägenhet", rooms: 2, size: 48 }
    },
    {
      text: "Nygatan 22, 4 tr, Norrköping. En tvåa om 42 kvm med balkong mot söder.\n\nHall med hatthylla och förvaring. Vardagsrummet har fönster åt söder och ekparkett.\n\nKöket har vita luckor, Electrolux-vitvaror och diskmaskin. Matplats för två vid fönstret.\n\nSovrummet rymmer 120-säng och har garderob. Badrummet renoverades 2021 med dusch och tvättmaskin.\n\nBalkong om 2 kvm i söderläge. BRF Stadshagen, avgift 2 900 kr/mån.\n\nResecentrum 5 minuter. Willys Hemma 200 meter.",
      metadata: { type: "lägenhet", rooms: 2, size: 42 }
    },
    {
      text: "Storgatan 45, 1 tr, Jönköping. En etta om 28 kvm med utsikt mot Vättern.\n\nÖppen planlösning med kök och vardagsrum. Köket har nya vitvaror, laminatbänk och förvaring i överskåp. Laminatgolv genomgående.\n\nBadrummet är helkaklat med dusch. Fönster mot Vättern.\n\nBRF Sjögläntan, avgift 2 400 kr/mån.\n\nBuss till centrum 3 minuter. ICA 400 meter.",
      metadata: { type: "lägenhet", rooms: 1, size: 28 }
    }
  ],

  // MELLANSTORA LÄGENHETER (2-3 rum, 55-85 kvm)
  medium_apartment: [
    {
      text: "Drottninggatan 42, 4 tr, Uppsala. En trea om 74 kvm med genomgående planlösning och balkong i söderläge.\n\nHallen har garderob och leder in till vardagsrummet med tre fönster mot gatan. Ekparkett genomgående och takhöjd på 2,85 meter.\n\nKöket renoverades 2021 med luckor från Ballingslöv och bänkskiva i komposit. Vitvaror från Siemens. Matplats för fyra vid fönstret.\n\nSovrummet mot gården rymmer dubbelsäng och har garderob. Det mindre rummet fungerar som arbetsrum. Badrummet är helkaklat, renoverat 2019, med dusch och tvättmaskin.\n\nBalkong om 5 kvm i söderläge. BRF Solgården, stambyte 2018. Avgift 4 100 kr/mån.\n\nCentralstationen 8 minuters promenad. ICA Nära i kvarteret. Stadsparken 200 meter.",
      metadata: { type: "lägenhet", rooms: 3, size: 74 }
    },
    {
      text: "Rönnvägen 12, 1 tr, Malmö. En tvåa om 62 kvm med balkong i söderläge och golvvärme i badrummet.\n\nHallen har platsbyggd garderob. Vardagsrummet har stort fönsterparti och takhöjd på 2,55 meter. Laminatgolv genomgående.\n\nKöket har vitvaror från Bosch 2022 och bänkskiva i laminat. Matplats för fyra vid fönstret.\n\nSovrummet rymmer dubbelsäng och har garderob med skjutdörrar. Badrummet är helkaklat med dusch, wc och tvättmaskin. Golvvärme.\n\nBalkong om 4 kvm i söderläge. Avgift 3 650 kr/mån.\n\nBuss 5 minuter till Triangeln. Coop 300 meter. Pildammsparken ca 10 minuters promenad.",
      metadata: { type: "lägenhet", rooms: 2, size: 62 }
    },
    {
      text: "Vasagatan 18, 3 tr, Linköping. En trea om 78 kvm i fastighet från 1945, stambyte genomfört 2020.\n\nHall med garderob och klinkergolv. Vardagsrummet har två fönster mot gatan och takhöjd på 2,80 meter. Ekparkett genomgående.\n\nKöket renoverades 2020 med Kvik-luckor, Bosch-vitvaror och bänkskiva i sten. Matplats för fyra.\n\nHuvudsovrummet rymmer dubbelsäng. Det andra sovrummet passar som barnrum eller kontor. Badrummet är helkaklat med badkar och tvättmaskin.\n\nBalkong om 4 kvm mot gården. BRF Eken, avgift 4 500 kr/mån.\n\nResecentrum 6 minuter. Hemköp i kvarteret.",
      metadata: { type: "lägenhet", rooms: 3, size: 78 }
    },
    {
      text: "Bergsgatan 9, 2 tr, Örebro. En tvåa om 58 kvm med nytt kök från 2023.\n\nHall med förvaring. Vardagsrummet har fönster i två väderstreck och laminatgolv.\n\nKöket är nytt från 2023 med IKEA-stomme och Siemens-vitvaror. Matplats vid fönstret.\n\nSovrummet rymmer dubbelsäng och har garderob. Badrummet har dusch och tvättmaskin.\n\nIngen balkong. BRF Svalan, avgift 3 100 kr/mån. Stambyte planerat 2026.\n\nCentrum 5 minuters promenad. Tågstationen 8 minuter.",
      metadata: { type: "lägenhet", rooms: 2, size: 58 }
    }
  ],

  // STORA LÄGENHETER (4+ rum, 85+ kvm)
  large_apartment: [
    {
      text: "Kungsgärdsgatan 7, 2 tr, Uppsala. En fyra om 105 kvm med balkong i västerläge och ekparkett genomgående.\n\nHallen har platsbyggd garderob och klinkergolv. Vardagsrummet har tre fönster och takhöjd på 2,70 meter.\n\nKöket är från Marbodal 2020 med stenbänkskiva och vitvaror från Siemens. Matplats för sex vid fönstret.\n\nHuvudsovrummet rymmer dubbelsäng och har garderob. Två mindre sovrum. Badrummet är helkaklat med badkar och dusch. Separat toalett.\n\nBalkong om 8 kvm i västerläge. BRF Kungsparken, stambyte 2020. Avgift 5 800 kr/mån.\n\nCentralstationen 5 minuter. Coop Forum 400 meter.",
      metadata: { type: "lägenhet", rooms: 4, size: 105 }
    },
    {
      text: "Strandvägen 32, 4 tr, Helsingborg. Fyra om 112 kvm med havsutsikt.\n\nHall med platsbyggd garderob. Vardagsrummet har tre fönster mot Öresund och takhöjd 2,90 meter. Ekparkett genomgående.\n\nKöket från Ballingslöv 2019 med granitbänk och Gaggenau-vitvaror. Matplats för sex vid fönstret.\n\nTre sovrum. Huvudsovrummet med garderob och fönster mot havet. Badrum med badkar och dusch, helkaklat. Separat gäst-wc.\n\nBalkong 10 kvm mot väster. BRF Strandgården, avgift 6 200 kr/mån.\n\nKnutpunkten 8 minuter. ICA Kvantum 5 minuters promenad.",
      metadata: { type: "lägenhet", rooms: 4, size: 112 }
    },
    {
      text: "Södra Vägen 15, 5 tr, Göteborg. Femma om 130 kvm med hiss.\n\nHall med garderob och klinker. Vardagsrummet har öppen spis och fönster åt två håll. Takhöjd 3,10 meter. Fiskbensparkett.\n\nKöket renoverat 2022 med Noblessa-luckor och Miele-vitvaror. Bänkskiva i marmor. Köksö med barsittning.\n\nFyra sovrum. Huvudsovrummet med walk-in-closet. Badrum med badkar och dusch. Gäst-wc.\n\nBalkong 6 kvm i söderläge. BRF Victoriaparken, stambyte 2017. Avgift 7 100 kr/mån.\n\nKungsportsplatsen 4 minuter. Saluhallen Briggen 300 meter.",
      metadata: { type: "lägenhet", rooms: 5, size: 130 }
    }
  ],

  // VILLOR
  villa: [
    {
      text: "Tallvägen 8, Djursholm. En villa om 180 kvm på tomt om 920 kvm, tillbyggd 2015.\n\nEntréplan med hall, vardagsrum och kök. Vardagsrummet har eldstad och utgång till altanen. Köket är från HTH 2015 med bänkskiva i granit och induktionshäll.\n\nÖvervåningen har tre sovrum och badrum med badkar och golvvärme. Huvudsovrummet har garderob och fönster åt två håll.\n\nKällare med tvättstuga, förråd och ett extra rum. Altan om 25 kvm i västerläge med pergola. Dubbelgarage och uppfart för två bilar.\n\nDjursholms samskola 600 meter. Mörby centrum ca 10 minuters promenad.",
      metadata: { type: "villa", rooms: 5, size: 180 }
    },
    {
      text: "Björkvägen 14, Löddeköpinge. En villa om 145 kvm på tomt om 750 kvm, renoverad 2021.\n\nEntréplan med hall, vardagsrum, kök och badrum. Köket är nytt från 2021 med IKEA-stomme och Bosch-vitvaror. Öppen planlösning mot vardagsrummet.\n\nÖvervåningen har fyra sovrum. Badrummet är helkaklat med dusch och badkar.\n\nTomten har gräsmatta och stenlagd uteplats i söderläge. Garage och förråd om 12 kvm.\n\nLöddeköpinge skola 400 meter. Willys ca 5 minuters promenad. Malmö 15 minuter med bil.",
      metadata: { type: "villa", rooms: 5, size: 145 }
    },
    {
      text: "Granlundsvägen 3, Umeå. Villa om 160 kvm på tomt om 1 100 kvm. Byggår 1985.\n\nEntréplan med hall, vardagsrum, kök och gästrum. Köket har vitvaror från Electrolux och bänkskiva i trä. Vardagsrummet har eldstad.\n\nÖvervåningen har tre sovrum och badrum med badkar. Huvudsovrummet har garderob.\n\nKällare med tvättstuga och förråd. Tomten har garage, gräsmatta och uteplats. Bergvärme.\n\nGrubbeskolan 300 meter. ICA Maxi 5 minuter med bil. E4:an 3 km.",
      metadata: { type: "villa", rooms: 5, size: 160 }
    },
    {
      text: "Ekvägen 7, Täby. Villa om 210 kvm på tomt om 1 050 kvm. Byggår 2018.\n\nEntréplan med hall, vardagsrum med dubbelsidig eldstad, kök och gäst-wc. Köket från Ballingslöv med granitbänk och Miele-vitvaror. Köksö med barsittning.\n\nÖvervåning med fyra sovrum och två badrum. Huvudsovrummet med walk-in-closet och eget badrum med badkar.\n\nAltan 35 kvm i sydvästläge med inbyggd utekök. Dubbelgarage. Gräsmatta och planteringar.\n\nTäby centrum 8 minuter med bil. Roslagsbanan 5 minuters promenad.",
      metadata: { type: "villa", rooms: 6, size: 210 }
    },
    {
      text: "Sjövägen 12, Växjö. Villa om 125 kvm på tomt om 680 kvm. Byggår 1972.\n\nEntréplan med hall, vardagsrum och kök. Köket har laminatbänk och vitvaror från Electrolux. Vardagsrummet har parkettgolv.\n\nÖvervåning med tre sovrum och badrum med dusch. Laminatgolv.\n\nTomten har gräsmatta och uteplats. Carport. Förråd. Fjärrvärme.\n\nPåvelundsskolan 500 meter. Coop 5 minuter. Centrum 10 minuter med cykel.",
      metadata: { type: "villa", rooms: 4, size: 125 }
    }
  ],

  // RADHUS
  radhus: [
    {
      text: "Solnavägen 23, Solna. Ett radhus om 120 kvm med fyra rum och kök.\n\nBottenvåningen har kök och vardagsrum i öppen planlösning. Köket från IKEA 2021 med Bosch-vitvaror. Vardagsrummet har utgång till trädgården.\n\nÖvervåningen har tre sovrum och badrum. Huvudsovrummet har walk-in-closet. Badrummet är helkaklat med dusch. Laminatgolv genomgående.\n\nTrädgård med gräsmatta och uteplats i söderläge. Förråd om 10 kvm och carport för två bilar.\n\nSkola och förskola i promenadavstånd. Matbutik 300 meter.",
      metadata: { type: "radhus", rooms: 4, size: 120 }
    },
    {
      text: "Ekbacken 5, Partille. Radhus om 110 kvm med 4 rum. Byggår 1995.\n\nBottenvåning med hall, kök och vardagsrum. Köket har vitvaror från Electrolux och laminatbänk. Utgång till uteplats.\n\nÖvervåning med tre sovrum och badrum med dusch. Laminatgolv genomgående.\n\nUteplats i söderläge på 15 kvm. Förråd. P-plats.\n\nSkola 400 meter. ICA 5 minuter. Spårvagn till Göteborg centrum 20 minuter.",
      metadata: { type: "radhus", rooms: 4, size: 110 }
    },
    {
      text: "Ängsgatan 14, Lund. Radhus om 95 kvm med 3 rum. Byggår 2010.\n\nBottenvåning med hall, kök och vardagsrum. Köket från Marbodal med Siemens-vitvaror. Utgång till altanen.\n\nÖvervåning med två sovrum och badrum med dusch och badkar. Ekparkett.\n\nAltan i västerläge, 12 kvm. Förråd 6 kvm. P-plats.\n\nLunds centralstation 10 minuter med buss. ICA Supermarket 300 meter.",
      metadata: { type: "radhus", rooms: 3, size: 95 }
    },
    {
      text: "Hasslevägen 8, Västerås. Radhus om 135 kvm med 5 rum. Byggår 1988, renoverat 2020.\n\nBottenvåning med hall, kök, vardagsrum och gäst-wc. Köket renoverat 2020 med IKEA-stomme och Bosch-vitvaror. Öppen planlösning.\n\nÖvervåning med fyra sovrum och badrum med dusch och badkar. Golvvärme i badrum.\n\nTrädgård med gräsmatta och stenlagd uteplats i söderläge. Garage. Förråd 8 kvm.\n\nSkola 300 meter. Hemköp 5 minuter. Mälaren 10 minuters promenad.",
      metadata: { type: "radhus", rooms: 5, size: 135 }
    }
  ]
};

const GOLDEN_BROKER_EXAMPLES = {
  hemnet: [
    `EXEMPEL A:
Villa om 146 kvm i Mörtnäs med södervänd uteplats och inbyggd jacuzzi.

Planlösningen är genomgående med öppna sociala ytor mellan kök och vardagsrum, samtidigt som tre sovrum ligger mer avskilt. Köket är renoverat och materialvalen håller en enhetlig nivå med ekparkett i större delen av huset.

Fönster är bytta och huset har tilläggsisolerats i samband med renovering. Laddbox för elbil stärker vardagsfunktionen över tid.

Mörtnäs ger ett lugnt läge nära service och med smidig pendling mot Slussen.`,
    `EXEMPEL B:
Trea om 76 kvm med balkong i västerläge på Storgatan 12, 3 tr, Linköping.

Köket renoverades 2022 med luckor från Ballingslöv och har matplats vid fönstret. Vardagsrummet rymmer både soffgrupp och matbord utan att flödet blir trångt.

Sovrummen ligger mot gårdssidan och badrummet är uppdaterat. BRF med stabil ekonomi och avgift som inkluderar värme och vatten.

Resecentrum nås på några minuter och vardagsservice finns i direkt närområde.`
  ],
  booli: [
    `EXEMPEL A:
På Ekorrvägen 10 i Mörtnäs ligger en villa om 146 kvm där söderläget märks direkt på uteplatsen.

Entréplanet samlar kök och vardagsrum i ett öppet men tydligt flöde, vilket gör att både vardagsmiddag och större helgmiddagar fungerar utan att ytorna känns överbelastade. Tre sovrum ger flexibel användning för familj, gäster eller hemmakontor.

Renoveringar de senaste åren omfattar bland annat fönsterbyte och tilläggsisolering, vilket bidrar till ett jämnare inomhusklimat. Vid huset finns laddbox för elbil.

I Mörtnäs bor du lugnt med närhet till service och med pendling som fungerar i praktiken över tid.`,
    `EXEMPEL B:
Tallstigen 4 i Värmdö är ett radhus om 118 kvm med uteplats i västerläge och tydlig vardagsfunktion.

Kök och vardagsrum ligger i social anslutning med bra kontakt mot uteplatsen, medan övervåningen rymmer sovrum i mer privat del. Material och standard är valda för att tåla vardagstempo utan att tumma på helhetsintrycket.

Området kombinerar lugn med korta avstånd till service, skola och kommunikationer. Det gör bostaden relevant både för familjeliv och för dig som pendlar regelbundet.`
  ],
} as const;

function buildGoldenBrokerExamples(platform: "hemnet" | "booli"): string {
  const examples = GOLDEN_BROKER_EXAMPLES[platform] || [];
  return examples.map((example, index) => `--- Referensexempel ${index + 1} ---\n${example}`).join("\n\n");
}

// --- HEMNET FORMAT: World-class prompt med examples-first-teknik ---
const HEMNET_TEXT_PROMPT = `Du är en av Sveriges absolut bästa fastighetsmäklare. Ditt uppdrag är att skriva en Hemnet-text som är så övertygande, professionell och klyschfri att den sätter en ny standard för branschen.

SHOW, DON'T TELL (KRITISKT):
- Istället för "fint ljusinsläpp", skriv: "Solen flödar in från tre stora fönster i söderläge och speglar sig i den nyslipade parketten."
- Istället för "bra förvaring", skriv: "En hel garderobsvägg i sovrummet och ett källarförråd på 6 kvm löser alla förvaringsbehov."
- Omvandla ALLA adjektiv till konkreta, verifierbara observationer.

SPRÅKLIGA REGLER (NOLLTOLERANS):
- INGA PARENTESER för att förklara typ av service. Skriv "ICA Supermarket" istället för "ICA (matbutik)".
- INGA "FEGA" FORMULERINGAR. Skriv "Läget är tyst" istället för "Läget upplevs tyst". Var självsäker men korrekt.
- FULLSTÄNDIGA MENINGAR. Kontrollera att varje mening har subjekt, predikat och korrekt punktuering. Inga syftningsfel.
- UNDVIK UPPREPNING. Om du nämnt jacuzzin i öppningen, fokusera på materialval eller känsla senare, inte bara att den finns.
- INGA LISTOR. Omvandla alla fakta till naturlig, flytande prosa.

LEVANDE BESKRIVNING:
- Beskriv bostaden ur perspektivet av någon som bor där. Hur känns det att dricka morgonkaffet på balkongen? Hur är arbetsflödet i köket?
- Måla upp en bild av vardagslivet.

KRAV:
- Utgå ALLTID från dispositionen. Hitta aldrig på fakta.
- Öppningen är A och O. De första två meningarna måste omedelbart fånga en stressad Hemnet-scrollare med den mest unika och attraktiva egenskapen hos bostaden.
- Prioritera enligt följande: 1. Uteplats/Solläge/Utsikt, 2. Sociala ytor/Planlösning, 3. Kök/Badrum, 4. Läge.
- Varje mening ska addera nytt, konkret värde. Stryk allt som är fluff.
- Undvik mekanisk uppräkning. Energiklass ska aldrig nämnas i huvudtexten för Hemnet då den visas separat. Fiber och parkering får vävas in naturligt om de tillför värde, men aldrig som egna mekaniska meningar.
- Lägesbeskrivningen ska berätta en historia om området, inte bara lista namn på butiker.
- Skriv som en erfaren svensk mäklare: trygg, konkret och professionell med tydlig köpnytta.
- Huvudtexten ska kännas publicerad: inled helst med [bostadstyp] om [boarea] på [adress] + en stark detalj, t.ex. "Trea om 76 kvm på Storgatan 12 med balkong i söderläge."
- Om dispositionen innehåller rum, standard eller kommunikationer ska de vävas in naturligt där de bär beslutsvärde.
- För avgift/driftskostnad: nämn i huvudtext när det är tydligt beslutsdrivande eller särskiljande; annars räcker faktadelen i annonsen. Om kostnad nämns ska enhet alltid anges (t.ex. kr/mån eller kr/år).
- Om dispositionen innehåller boarea, antal rum, kök, badrum eller kommunikationer måste samtliga dessa faktagrupper nämnas tydligt i huvudtexten.
- Använd variation i meningsstart och rytm; undvik två meningar i rad med samma huvudpoäng.

UNDVIK ALLTID:
erbjuder, bjuder på, generös, vilket, för den som, välkommen, präglas av, magisk, fantastisk, otrolig, drömboende.

EXTRA TEXTER (anpassa för varje format):
- headline: Kort, slagkraftig och lockande. Max 7 ord. Ex: "Insynsskyddad trea med balkong i söderläge."
- instagramCaption: Varm, mänsklig och säljande mäklarprosa i 1-2 meningar. Använd 1-2 relevanta emojis och avsluta alltid med korrekt sluttecken.
- showingInvitation: Professionell inbjudan med tydlig visningsnytta. Ange praktiska detaljer som finns i dispositionen ([TID], [KONTAKT]) och håll tonen trevlig, trygg och konkret.
- shortAd: Kort annonsprosa (max 2 meningar) med bostadstyp/boarea och 2 starka styrkor. Säljande men saklig.
- socialCopy: Säljande social text i mäklarstil med konkret köparnytta. Undvik aggressiva uppmaningar; använd i stället en mjuk avslutning som "Läs mer i annonsen".
- Terminologi: använd EN huvudterm per sak. Exempel: skriv "laddbox för elbil" och undvik dubbleringar som "laddplats ... laddbox" i samma text.

OUTPUT:
Svara med JSON och fyll alla fält.
JSON måste innehålla:
{
  "improvedPrompt": "...",
  "headline": "...",
  "socialCopy": "...",
  "instagramCaption": "...",
  "showingInvitation": "...",
  "shortAd": "..."
}

REFERENSEXEMPEL FÖR NIVÅ OCH STIL:
${buildGoldenBrokerExamples("hemnet")}`;;

// --- BOOLI/EGEN SIDA: World-class prompt med examples-first-teknik ---
const BOOLI_TEXT_PROMPT_WRITER = `Du är en av Sveriges absolut bästa fastighetsmäklare. Ditt uppdrag är att skriva en objektbeskrivning som är så övertygande, professionell och klyschfri att den sätter en ny standard för branschen.

SHOW, DON'T TELL (KRITISKT):
- Istället för "fint ljusinsläpp", skriv: "Solen flödar in från tre stora fönster i söderläge och speglar sig i den nyslipade parketten."
- Istället för "bra förvaring", skriv: "En hel garderobsvägg i sovrummet och ett källarförråd på 6 kvm löser alla förvaringsbehov."
- Omvandla ALLA adjektiv till konkreta, verifierbara observationer.

SPRÅKLIGA REGLER (NOLLTOLERANS):
- INGA PARENTESER för att förklara typ av service. Skriv "ICA Supermarket" istället för "ICA (matbutik)".
- INGA "FEGA" FORMULERINGAR. Skriv "Läget är tyst" istället för "Läget upplevs tyst". Var självsäker men korrekt.
- FULLSTÄNDIGA MENINGAR. Kontrollera att varje mening har subjekt, predikat och korrekt punktuering. Inga syftningsfel.
- UNDVIK UPPREPNING. Om du nämnt jacuzzin i öppningen, fokusera på materialval eller känsla senare, inte bara att den finns.
- INGA LISTOR. Omvandla alla fakta till naturlig, flytande prosa.

LEVANDE BESKRIVNING:
- Beskriv bostaden ur perspektivet av någon som bor där. Hur känns det att dricka morgonkaffet på balkongen? Hur är arbetsflödet i köket?
- Måla upp en bild av vardagslivet.

KRAV:
- Utgå ALLTID från dispositionen. Hitta aldrig på fakta.
- Öppningen är A och O. De första två meningarna måste omedelbart fånga en stressad scrollare med den mest unika och attraktiva egenskapen hos bostaden.
- Prioritera enligt följande: 1. Uteplats/Solläge/Utsikt, 2. Sociala ytor/Planlösning, 3. Kök/Badrum, 4. Läge.
- Varje mening ska addera nytt, konkret värde. Stryk allt som är fluff.
- Undvik mekanisk uppräkning. Väv in tekniska detaljer (energiklass, fiber) i en naturlig mening, eller utelämna dem om de stör flödet.
- Lägesbeskrivningen ska berätta en historia om området, inte bara lista namn på butiker.
- Skriv som en erfaren svensk mäklare: trygg, konkret och professionell med tydlig köpnytta.
- Booli/egen sida får vara mer berättande än Hemnet, men ska fortfarande vara faktaburen och relevant för köpbeslut.
- Låt avslutet bära en trovärdig vardagsbild i stället för klyschig summering.
- För avgift/driftskostnad: nämn i huvudtext när det stärker köpbeslutet tydligt; annars kan uppgiften ligga i faktadelen.
- Om dispositionen innehåller boarea, antal rum, kök, badrum eller kommunikationer måste samtliga dessa faktagrupper nämnas tydligt i huvudtexten.

UNDVIK ALLTID:
erbjuder, bjuder på, generös, vilket, för den som, välkommen, präglas av, magisk, fantastisk, otrolig, drömboende.

EXTRA TEXTER (anpassa för varje format):
- headline: Kort, slagkraftig och lockande. Max 7 ord. Ex: "Insynsskyddad trea med balkong i söderläge."
- instagramCaption: Varm, mänsklig och säljande mäklarprosa i 1-2 meningar. Använd 1-2 relevanta emojis och avsluta alltid med korrekt sluttecken.
- showingInvitation: Professionell inbjudan med tydlig visningsnytta. Ange praktiska detaljer som finns i dispositionen ([TID], [KONTAKT]) och håll tonen trevlig, trygg och konkret.
- shortAd: Kort annonsprosa (max 2 meningar) med bostadstyp/boarea och 2 starka styrkor. Säljande men saklig.
- socialCopy: Säljande social text i mäklarstil med konkret köparnytta. Undvik aggressiva uppmaningar; använd i stället en mjuk avslutning som "Läs mer i annonsen".
- Terminologi: använd EN huvudterm per sak. Exempel: skriv "laddbox för elbil" och undvik dubbleringar som "laddplats ... laddbox" i samma text.

OUTPUT:
Svara med JSON och fyll alla fält.
JSON måste innehålla:
{
  "improvedPrompt": "...",
  "headline": "...",
  "socialCopy": "...",
  "instagramCaption": "...",
  "showingInvitation": "...",
  "shortAd": "..."
}

REFERENSEXEMPEL FÖR NIVÅ OCH STIL:
${buildGoldenBrokerExamples("booli")}`;;

// Faktagranskning med kirurgisk korrigering — fixa BARA felen, bevara allt rätt
const FACT_CHECK_PROMPT = `
# UPPGIFT

Du är en noggrann granskare. Kontrollera objektbeskrivningen mot dispositionen och gör KIRURGISKA korrigeringar — ändra BARA det som är fel, bevara allt som är rätt.

# REGLER — KIRURGISK KORRIGERING

1. Kontrollera att fakta i texten stämmer med dispositionen.
2. Identifiera och korrigera BARA: påhittade detaljer, felaktiga mått/år/märken.
3. Juridiskt känsliga påståenden utan stöd i dispositionen: ta bort eller neutralisera dem.
4. Identifiera förbjudna AI-fraser och ersätt dem kirurgiskt (se lista nedan).
5. Laga syftningsfel och punktueringsfel (t.ex. saknade punkter mellan meningar eller efter siffror).
6. Särskilt viktigt: Kontrollera avgifter och kostnader. De MÅSTE ha enhet (kr, kr/mån, kr/år). Fixa meningar som "avgift om 10 000 Mörtnäs..." till "avgift om 10 000 kr/år. Mörtnäs...".
7. För Hemnet-text: Om energiklass nämns, TA BORT den meningen helt (energiklass visas separat på Hemnet).
8. TA BORT alla parenteser som förklarar typ av service (t.ex. "ICA (matbutik)" -> "ICA").
9. ERSÄTT "fega" formuleringar (t.ex. "upplevs tyst") med mer självsäkra påståenden (t.ex. "är tyst") om det finns stöd för det.
10. Behåll ALL korrekt text — meningsstruktur, stil och flöde ska INTE ändras.
11. KIRURGISK FIX: Byt ut bara de felaktiga fraserna. Kopiera resten av texten OFÖRÄNDRAT.
12. Om inga fel hittas: sätt fact_check_passed=true och corrected_text=null — skriv INTE om en korrekt text.
13. Behåll ALLA styckebrytningar (\\n\\n) exakt som de är.

# UNIVERSELLT FÖRBJUDNA AI-FRASER (flagga ALLTID, oavsett stil)
erbjuder, bjuder på, präglas av, genomsyras av, andas lugn, andas charm, generösa ytor, generös takhöjd,
vilket (i relativ bisats), för den som, i hjärtat av, skapar en känsla, bidrar till, välkommen till,
härlig plats, plats för avkoppling, faciliteter, njut av

# STILMEDVETENHET — VIKTIGT
Kolla STYLE-fältet i user-meddelandet:
- Om STYLE = "factual": flagga ALLA beskrivande adjektiv (smakfullt, stilfullt, elegant, genomtänkt, etc.)
- Om STYLE = "balanced": tillåt milda beskrivningar (genomtänkt, smakfullt, stilfullt, ljus och luftig) OM de stöds av fakta i samma mening
- Om STYLE = "selling": tillåt beskrivande ord (genomtänkt, smakfullt, stilfullt, elegant, imponerande, charm) OM de stöds av fakta
- Universellt förbjudna fraser (listan ovan) ska ALLTID flaggas oavsett stil

# OUTPUT FORMAT (JSON)

{
  "fact_check_passed": true,
  "corrected_text": "Hela texten med BARA felen utbytta — sätt null om inga korrigeringar behövdes",
  "issues": [
    {"type": "fabricated/inaccurate/legal/ai_phrase", "quote": "felaktig fras", "correction": "korrigerad fras", "reason": "varför det var fel"}
  ],
  "quality_score": 0.95,
  "broker_tips": ["tips för mäklaren"]
}
`;

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // User status endpoint
  app.get("/api/user/status", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const tzOffset = parseInt(req.query.tz as string) || 0;

      const now = new Date();
      const userNow = new Date(now.getTime() - tzOffset * 60000);

      if (userId) {
        const user = await storage.getUserById(userId);
        if (user) {
          // ANVÄNDAR-SPECIFIK MÅNAD - baserat på när användaren startade sin plan
          const planStartAt = new Date(user.planStartAt || user.createdAt || now);

          // Beräkna nästa reset baserat på användarens startdatum
          const nextReset = new Date(planStartAt);
          nextReset.setMonth(nextReset.getMonth() + 1);  // +1 månad, inte +1 år
          nextReset.setHours(0, 0, 0, 0);

          // Om nästa reset har passerat, lägg till månader tills vi hamnar i framtiden
          while (nextReset <= userNow) {
            nextReset.setMonth(nextReset.getMonth() + 1);
            nextReset.setHours(0, 0, 0, 0);
          }

          const resetTime = new Date(nextReset.getTime() + tzOffset * 60000);
          const plan = (user.plan as PlanType) || "free";
          const usage = await storage.getMonthlyUsage(userId, user) || {
            textsGenerated: 0,
            areaSearchesUsed: 0,
            textEditsUsed: 0,
            personalStyleAnalyses: 0,
          };

          const limits = PLAN_LIMITS[plan];
          const textsRemaining = Math.max(0, limits.texts - usage.textsGenerated);
          const areaSearchesRemaining = Math.max(0, limits.areaSearches - usage.areaSearchesUsed);
          const textEditsRemaining = Math.max(0, limits.textEdits - usage.textEditsUsed);
          const personalStyleAnalysesRemaining = Math.max(0, limits.personalStyleAnalyses - usage.personalStyleAnalyses);

          return res.json({
            plan,
            textsUsedThisMonth: usage.textsGenerated,
            textsRemaining,
            monthlyTextLimit: limits.texts,
            areaSearchesUsed: usage.areaSearchesUsed,
            areaSearchesLimit: limits.areaSearches,
            textEditsUsed: usage.textEditsUsed,
            textEditsLimit: limits.textEdits,
            personalStyleAnalyses: usage.personalStyleAnalyses,
            personalStyleAnalysesLimit: limits.personalStyleAnalyses,
            isLoggedIn: true,
            resetTime: resetTime.toISOString(),
            stripeCustomerId: user.stripeCustomerId || null,
          });
        }
      } else {
        // För icke-inloggade användare - använd standard reset (första nästa månad)
        const nextMonth = new Date(userNow);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        const resetTime = new Date(nextMonth.getTime() + tzOffset * 60000);

        return res.json({
          plan: "free",
          textsUsedThisMonth: 0,
          textsRemaining: PLAN_LIMITS.free.texts,
          monthlyTextLimit: PLAN_LIMITS.free.texts,
          areaSearchesUsed: 0,
          areaSearchesLimit: PLAN_LIMITS.free.areaSearches,
          textEditsUsed: 0,
          textEditsLimit: PLAN_LIMITS.free.textEdits,
          personalStyleAnalyses: 0,
          personalStyleAnalysesLimit: PLAN_LIMITS.free.personalStyleAnalyses,
          isLoggedIn: false,
          resetTime: resetTime.toISOString(),
        });
      }
    } catch (err) {
      console.error("User status error:", err);
      res.status(500).json({ message: "Kunde inte hämta användarstatus" });
    }
  });

  // ── ACCOUNT ENDPOINTS ──

  // GET /api/account/details — subscription + profile info for Settings page
  app.get("/api/account/details", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const now = new Date();
      const planStartAt = new Date(user.planStartAt || user.createdAt || now);

      // Calculate next billing/reset date
      const nextReset = new Date(planStartAt);
      nextReset.setMonth(nextReset.getMonth() + 1);
      while (nextReset <= now) nextReset.setMonth(nextReset.getMonth() + 1);

      const plan = (user.plan as PlanType) || "free";
      const usage = await storage.getMonthlyUsage(user.id, user) || {
        textsGenerated: 0, areaSearchesUsed: 0, textEditsUsed: 0, personalStyleAnalyses: 0,
      };
      const limits = PLAN_LIMITS[plan];

      res.json({
        email: user.email,
        displayName: user.displayName || null,
        avatarColor: user.avatarColor || null,
        plan,
        planStartAt: planStartAt.toISOString(),
        nextResetAt: nextReset.toISOString(),
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        stripeCustomerId: user.stripeCustomerId || null,
        stripeSubscriptionId: user.stripeSubscriptionId || null,
        usage: {
          textsGenerated: usage.textsGenerated,
          textsLimit: limits.texts,
          textEditsUsed: usage.textEditsUsed,
          textEditsLimit: limits.textEdits,
        },
      });
    } catch (err) {
      console.error("Account details error:", err);
      res.status(500).json({ message: "Kunde inte hämta kontoinformation" });
    }
  });

  // PUT /api/account/profile — update display name and avatar color
  app.put("/api/account/profile", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { displayName, avatarColor } = req.body;

      if (displayName !== undefined && typeof displayName !== "string") {
        return res.status(400).json({ message: "Ogiltigt visningsnamn" });
      }
      if (avatarColor !== undefined && typeof avatarColor !== "string") {
        return res.status(400).json({ message: "Ogiltig avatarfärg" });
      }

      const updated = await storage.updateUserProfile(user.id, {
        displayName: displayName?.trim().slice(0, 50) || undefined,
        avatarColor: avatarColor || undefined,
      });

      res.json({ success: true, displayName: updated?.displayName, avatarColor: updated?.avatarColor });
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ message: "Kunde inte uppdatera profilen" });
    }
  });

  // DELETE /api/account — GDPR-compliant account deletion
  app.delete("/api/account", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: "Lösenord krävs för att radera kontot" });
      }

      // Verify password before deletion
      const bcrypt = await import("bcrypt");
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Felaktigt lösenord" });
      }

      // Cancel Stripe subscription if active
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (stripeErr) {
          console.error("Stripe cancel error during account deletion:", stripeErr);
          // Continue deletion even if Stripe fails
        }
      }

      // Destroy the session first
      req.session.destroy(() => { });

      // Delete all user data
      await storage.deleteUser(user.id);

      res.json({ success: true, message: "Kontot har raderats" });
    } catch (err) {
      console.error("Delete account error:", err);
      res.status(500).json({ message: "Kunde inte radera kontot" });
    }
  });

  // PERSONAL STYLE ENDPOINTS - Pro-funktion
  app.get("/api/personal-style", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      if (!FEATURE_ACCESS[user.plan as PlanType].personalStyle) {
        return res.status(403).json({ message: "Personlig stil är endast för Pro/Premium-användare" });
      }

      const personalStyle = await storage.getPersonalStyle(user.id);

      if (!personalStyle) {
        return res.json({
          hasStyle: false,
          message: "Ingen personlig stil har satts upp än"
        });
      }

      res.json({
        hasStyle: true,
        referenceTexts: personalStyle.referenceTexts,
        styleProfile: personalStyle.styleProfile,
        isActive: personalStyle.isActive,
        teamShared: personalStyle.teamShared,
        createdAt: personalStyle.createdAt
      });
    } catch (err) {
      console.error("Get personal style error:", err);
      res.status(500).json({ message: "Kunde inte hämta personlig stil" });
    }
  });

  app.post("/api/personal-style", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const plan = (user.plan as PlanType) || "free";

      // Check feature access
      if (!FEATURE_ACCESS[plan].personalStyle) {
        return res.status(403).json({ message: "Personlig stil är endast för Pro/Premium-användare" });
      }

      const { referenceTexts, teamShared } = req.body;

      if (!referenceTexts || !Array.isArray(referenceTexts) || referenceTexts.length < 1 || referenceTexts.length > 3) {
        return res.status(400).json({ message: "Du måste ange 1–3 exempeltexter" });
      }

      // Validera att varje text är minst 100 tecken
      for (const text of referenceTexts) {
        if (typeof text !== "string" || text.trim().length < 100) {
          return res.status(400).json({ message: "Varje exempeltext måste vara minst 100 tecken lång" });
        }
      }


      // Analysera skrivstilen med AI
      const styleProfile = await analyzeWritingStyle(referenceTexts);

      // Spara till databasen
      const personalStyleData: InsertPersonalStyle = {
        userId: user.id,
        referenceTexts,
        styleProfile,
        isActive: true,
        teamShared: teamShared || false
      };

      const savedStyle = await storage.createPersonalStyle(personalStyleData);

      res.json({
        success: true,
        styleProfile,
        message: "Personlig stil har sparats! AI:n kommer nu att använda din skrivstil."
      });
    } catch (err) {
      console.error("Create personal style error:", err);
      res.status(500).json({ message: "Kunde inte spara personlig stil" });
    }
  });

  app.put("/api/personal-style", requireAuth, requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { isActive, teamShared } = req.body;

      const updatedStyle = await storage.updatePersonalStyle(user.id, {
        isActive,
        teamShared,
      });

      if (!updatedStyle) {
        return res.status(404).json({ message: "Ingen personlig stil hittades" });
      }

      res.json({
        success: true,
        message: "Personlig stil har uppdaterats"
      });
    } catch (err) {
      console.error("Update personal style error:", err);
      res.status(500).json({ message: "Kunde inte uppdatera personlig stil" });
    }
  });

  app.delete("/api/personal-style", requireAuth, requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;

      await storage.deletePersonalStyle(user.id);

      res.json({
        success: true,
        message: "Personlig stil har raderats"
      });
    } catch (err) {
      console.error("Delete personal style error:", err);
      res.status(500).json({ message: "Kunde inte radera personlig stil" });
    }
  });

  // ============================================================
  // INTEGRATIONS: Vitec CRM & Hemnet
  // ============================================================
  {
    const { VitecClient, VitecAuthError, VitecNotFoundError, VitecApiError } = await import("./lib/vitec-integration");
    const { fetchHemnetProperty, mapHemnetPropertyToOptiPrompt, isHemnetUrl, HemnetError, HemnetNotFoundError, HemnetRateLimitError } = await import("./lib/hemnet-integration");
    const { downloadImages, cleanupCache, getCacheKey, getCachePath } = await import("./lib/image-downloader");
    const { vitecImportSchema, vitecSearchSchema, vitecApiKeySchema, hemnetImportSchema, integrationSettings } = await import("@shared/schema");
    const crypto = await import("crypto");
    const { eq } = await import("drizzle-orm"); // hoisted — not re-imported per request

    // Encrypt/decrypt Vitec API key using SESSION_SECRET as key material
    const ENCRYPTION_KEY = Buffer.from(
      (process.env.SESSION_SECRET || "fallback-key-change-in-production").padEnd(32, "0").slice(0, 32),
      "utf8"
    );
    function encryptApiKey(plaintext: string): string {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return iv.toString("hex") + ":" + encrypted.toString("hex");
    }
    function decryptApiKey(ciphertext: string): string {
      const [ivHex, encHex] = ciphertext.split(":");
      if (!ivHex || !encHex) throw new Error("Invalid ciphertext format");
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
      const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
      return decrypted.toString("utf8");
    }

    async function getUserVitecClient(userId: string): Promise<InstanceType<typeof VitecClient> | null> {
      const rows = await db.select().from(integrationSettings).where(
        eq(integrationSettings.userId, userId)
      ).limit(1);
      const settings = rows[0];
      if (!settings?.vitecEnabled || !settings.vitecApiKey || !settings.vitecCustomerId) return null;
      try {
        const apiKey = decryptApiKey(settings.vitecApiKey);
        return new VitecClient({ apiKey, customerId: settings.vitecCustomerId, baseUrl: settings.vitecBaseUrl || undefined });
      } catch {
        return null;
      }
    }

    // GET /api/integrations/settings — get current integration settings (masked)
    app.get("/api/integrations/settings", requireAuth, requirePro, async (req, res) => {
      try {
        const user = (req as any).user as User;
        const rows = await db.select().from(integrationSettings).where(eq(integrationSettings.userId, user.id)).limit(1);
        const settings = rows[0];
        res.json({
          vitecEnabled: settings?.vitecEnabled ?? false,
          vitecApiKeySet: Boolean(settings?.vitecApiKey),
          vitecCustomerId: settings?.vitecCustomerId || null,
          vitecBaseUrl: settings?.vitecBaseUrl || null,
        });
      } catch (err) {
        console.error("Get integration settings error:", err);
        res.status(500).json({ message: "Kunde inte hämta integrationsinställningar" });
      }
    });

    // PUT /api/integrations/vitec/key — save/update Vitec API key
    app.put("/api/integrations/vitec/key", requireAuth, requirePro, async (req, res) => {
      try {
        const user = (req as any).user as User;
        const parse = vitecApiKeySchema.safeParse(req.body);
        if (!parse.success) {
          return res.status(400).json({ message: parse.error.issues[0]?.message || "Ogiltig förfrågan" });
        }
        const { apiKey, baseUrl, customerId } = parse.data;

        // Validate the key works before saving
        const client = new VitecClient({ apiKey, customerId, baseUrl: baseUrl || undefined });
        const valid = await client.validateApiKey();
        if (!valid) {
          return res.status(400).json({ message: "API-nyckeln är ogiltig eller saknar behörighet i Vitec." });
        }

        const encrypted = encryptApiKey(apiKey);
        await db.insert(integrationSettings).values({
          userId: user.id,
          vitecApiKey: encrypted,
          vitecCustomerId: customerId,
          vitecBaseUrl: baseUrl || null,
          vitecEnabled: true,
        }).onConflictDoUpdate({
          target: integrationSettings.userId,
          set: {
            vitecApiKey: encrypted,
            vitecCustomerId: customerId,
            vitecBaseUrl: baseUrl || null,
            vitecEnabled: true,
            updatedAt: new Date(),
          },
        });

        res.json({ success: true, message: "Vitec API-nyckel sparad och verifierad." });
      } catch (err) {
        if (err instanceof VitecAuthError) {
          return res.status(400).json({ message: err.message });
        }
        console.error("Save Vitec API key error:", err);
        res.status(500).json({ message: "Kunde inte spara API-nyckeln" });
      }
    });

    // DELETE /api/integrations/vitec/key — remove Vitec API key
    app.delete("/api/integrations/vitec/key", requireAuth, requirePro, async (req, res) => {
      try {
        const user = (req as any).user as User;
        await db.update(integrationSettings)
          .set({ vitecApiKey: null, vitecEnabled: false, updatedAt: new Date() })
          .where(eq(integrationSettings.userId, user.id));
        res.json({ success: true });
      } catch (err) {
        console.error("Delete Vitec API key error:", err);
        res.status(500).json({ message: "Kunde inte ta bort API-nyckeln" });
      }
    });

    // GET /api/integrations/vitec/listings — list broker's active Vitec listings
    app.get("/api/integrations/vitec/listings", requireAuth, requirePro, async (req, res) => {
      try {
        const user = (req as any).user as User;
        const client = await getUserVitecClient(user.id);
        if (!client) {
          return res.status(400).json({ message: "Vitec är inte konfigurerat. Lägg till din API-nyckel i inställningarna." });
        }
        const properties = await client.listActiveProperties(20);
        res.json({ properties });
      } catch (err) {
        if (err instanceof VitecAuthError) return res.status(401).json({ message: err.message });
        if (err instanceof VitecApiError) return res.status(502).json({ message: err.message });
        console.error("Vitec list listings error:", err);
        res.status(500).json({ message: "Kunde inte hämta objekt från Vitec" });
      }
    });

    // GET /api/integrations/vitec/search?q=... — search Vitec properties
    app.get("/api/integrations/vitec/search", requireAuth, requirePro, async (req, res) => {
      try {
        const user = (req as any).user as User;
        const parse = vitecSearchSchema.safeParse({ query: req.query.q });
        if (!parse.success) return res.status(400).json({ message: "Sökterm krävs" });

        const client = await getUserVitecClient(user.id);
        if (!client) {
          return res.status(400).json({ message: "Vitec är inte konfigurerat. Lägg till din API-nyckel i inställningarna." });
        }
        const properties = await client.searchProperties(parse.data.query);
        res.json({ properties });
      } catch (err) {
        if (err instanceof VitecAuthError) return res.status(401).json({ message: err.message });
        if (err instanceof VitecApiError) return res.status(502).json({ message: err.message });
        console.error("Vitec search error:", err);
        res.status(500).json({ message: "Sökning i Vitec misslyckades" });
      }
    });

    // POST /api/integrations/vitec/import — import a specific Vitec object as propertyData
    app.post("/api/integrations/vitec/import", requireAuth, requirePro, async (req, res) => {
      try {
        const user = (req as any).user as User;
        const parse = vitecImportSchema.safeParse(req.body);
        if (!parse.success) return res.status(400).json({ message: parse.error.issues[0]?.message || "Ogiltigt objekt-ID" });

        const client = await getUserVitecClient(user.id);
        if (!client) {
          return res.status(400).json({ message: "Vitec är inte konfigurerat. Lägg till din API-nyckel i inställningarna." });
        }
        const property = await client.getProperty(parse.data.objectId);
        res.json({ property, propertyData: property });
      } catch (err) {
        if (err instanceof VitecAuthError) return res.status(401).json({ message: err.message });
        if (err instanceof VitecNotFoundError) return res.status(404).json({ message: err.message });
        if (err instanceof VitecApiError) return res.status(502).json({ message: err.message });
        console.error("Vitec import error:", err);
        res.status(500).json({ message: "Kunde inte importera objekt från Vitec" });
      }
    });

    // POST /api/integrations/hemnet/import — fetch property data from a Hemnet URL
    app.post("/api/integrations/hemnet/import", requireAuth, async (req, res) => {
      try {
        const parse = hemnetImportSchema.safeParse(req.body);
        if (!parse.success) return res.status(400).json({ message: parse.error.issues[0]?.message || "Ogiltig URL" });

        if (!isHemnetUrl(parse.data.url)) {
          return res.status(400).json({ message: "URL:en måste vara en hemnet.se/bostader/-länk." });
        }

        const property = await fetchHemnetProperty(parse.data.url);
        const propertyData = mapHemnetPropertyToOptiPrompt(property);
        res.json({ property, propertyData });
      } catch (err) {
        if (err instanceof HemnetNotFoundError) return res.status(404).json({ message: err.message });
        if (err instanceof HemnetRateLimitError) return res.status(429).json({ message: err.message });
        if (err instanceof HemnetError) return res.status(502).json({ message: err.message });
        console.error("Hemnet import error:", err);
        res.status(500).json({ message: "Kunde inte hämta data från Hemnet" });
      }
    });

    // GET /api/integrations/hemnet/image/:hash — serve cached Hemnet image
    app.get("/api/integrations/hemnet/image/:hash", (req, res) => {
      try {
        const { hash } = req.params;
        if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
          return res.status(400).json({ message: "Invalid image hash" });
        }

        const imagePath = path.join(CACHE_DIR, hash);
        if (!fs.existsSync(imagePath)) {
          return res.status(404).json({ message: "Image not found" });
        }

        const buffer = fs.readFileSync(imagePath);
        res.set("Content-Type", "image/jpeg");
        res.set("Cache-Control", "public, max-age=604800"); // 7 days
        res.send(buffer);
      } catch (err) {
        console.error("Image serve error:", err);
        res.status(500).json({ message: "Kunde inte hämta bilden" });
      }
    });
  }

  // Optimize endpoint
  app.post("/api/optimize", requireAuth, async (req, res) => {
    // Streaming support: if client accepts text/event-stream, send NDJSON progress events
    const wantsStream = req.headers.accept?.includes("text/event-stream") || req.headers.accept?.includes("application/x-ndjson");
    let streamInitialized = false;
    const ensureStreamStarted = () => {
      if (!wantsStream || streamInitialized || res.headersSent) return;
      res.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });
      streamInitialized = true;
    };
    const sendProgress = wantsStream
      ? (step: number, total: number, message: string) => {
        ensureStreamStarted();
        res.write(JSON.stringify({ type: "progress", step, total, message }) + "\n");
      }
      : (_step: number, _total: number, _message: string) => { };

    let failSafeResponseData: any = null;
    let failSafeStrongCandidateData: any = null;
    let observabilityRunStarted = false;
    
    // Define optimizationRecord outside try block so it's accessible in catch for fail-safe quota tracking
    let optimizationRecord: any = null;
    let observabilityRunCompleted = false;
    const finalizeObservabilityRun = (success: boolean, metrics?: { qualityScore?: number; wordCount?: number }) => {
      if (!observabilityRunStarted || observabilityRunCompleted) return;
      observabilityRunCompleted = true;
      try {
        pipelineObservability.endRun(success, metrics);
      } catch (obsErr) {
        console.warn("[Observability] Failed to end run:", obsErr);
      }
    };
    const choosePreferredFailSafePayload = (latest: any, strongest: any) => {
      if (!latest) return strongest;
      if (!strongest) return latest;
      const scorePayload = (payload: any) => {
        const metaQuality = typeof payload?.fail_safe_meta?.qualityScore === "number" ? payload.fail_safe_meta.qualityScore : 0;
        const metaViolations = typeof payload?.fail_safe_meta?.violationCount === "number" ? payload.fail_safe_meta.violationCount : 0;
        const wordCount = typeof payload?.wordCount === "number" ? payload.wordCount : 0;
        const stageBonus = typeof payload?.fail_safe_stage === "string" && payload.fail_safe_stage.includes("post-final-broker-audit") ? 0.03 : 0;
        return metaQuality - metaViolations * 0.03 + Math.min(wordCount, 350) / 10000 + stageBonus;
      };
      return scorePayload(strongest) > scorePayload(latest) ? strongest : latest;
    };
    try {
      const warnings: string[] = [];
      // Validate input with Zod schema
      const parseResult = optimizeRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Ogiltig förfrågan: " + parseResult.error.issues.map(i => i.message).join(", "),
        });
      }

      const user = (req as any).user as User;
      const plan = (user.plan as PlanType) || "free";
      const incomingPropertyData = req.body?.propertyData;
      const structuredDataInput = Boolean(incomingPropertyData && typeof incomingPropertyData === "object" && incomingPropertyData.address);
      pipelineObservability.startRun({
        runId: randomUUID(),
        userId: user.id,
        plan,
        style: String(req.body?.writingStyle || "balanced"),
        platform: String(req.body?.platform || "hemnet"),
        propertyType: typeof incomingPropertyData?.propertyType === "string" ? incomingPropertyData.propertyType : undefined,
        structuredData: structuredDataInput,
      });
      observabilityRunStarted = true;
      pipelineObservability.startStep("preflight", "input");

      // Rate limit check (per minute) — BEFORE stream starts so we can return proper HTTP status
      if (!(await checkOptimizeRateLimit(user.id))) {
        pipelineObservability.endStep({
          success: false,
          actionTaken: "blocked_rate_limit",
          decisionReason: "optimize rate limit reached",
        });
        finalizeObservabilityRun(false);
        return res.status(429).json({
          message: "För många förfrågningar. Vänta en minut och försök igen.",
        });
      }

      // Check monthly usage limits — BEFORE stream starts
      const usage = await storage.getMonthlyUsage(user.id, user) || {
        textsGenerated: 0,
        areaSearchesUsed: 0,
        textEditsUsed: 0,
        personalStyleAnalyses: 0,
      };


      const limits = PLAN_LIMITS[plan];
      if (usage.textsGenerated >= limits.texts) {
        pipelineObservability.endStep({
          success: false,
          actionTaken: "blocked_monthly_limit",
          decisionReason: "monthly usage limit reached",
        });
        finalizeObservabilityRun(false);
        const upgradeMsg = plan === "free"
          ? `Du har nått din månadsgräns av ${limits.texts} genereringar. Uppgradera till Pro för 10 genereringar per månad!`
          : `Du har nått din månadsgräns av ${limits.texts} genereringar. Uppgradera till Premium för 25 genereringar per månad!`;

        return res.status(429).json({
          message: upgradeMsg,
          limitReached: true,
          upgradeRequired: true,
          currentPlan: plan,
          usage: {
            textsUsed: usage.textsGenerated,
            textsLimit: limits.texts,
          },
          upgradeOptions: {
            pro: { texts: 10, price: "299 kr/mån" },
            premium: { texts: 25, price: "599 kr/mån" }
          }
        });
      }
      pipelineObservability.endStep({
        success: true,
        actionTaken: "preflight_passed",
      });

      // === USE NEW 3-STEP PIPELINE (ALWAYS) ===
      const sessionId = (req as any).sessionID || randomUUID();
      
      console.log('[Perfect Swedish Pipeline] Using new 3-step pipeline');
        
      // Create progress emitter for WebSocket updates
      const progressEmitter = wantsStream
        ? (sessionId: string, event: any) => {
            ensureStreamStarted();
            res.write(JSON.stringify(event) + "\n");
          }
        : undefined;

      const orchestrator = new PerfectSwedishOrchestrator(progressEmitter);
      
      // Get personal style if available
      let personalStylePrompt: string | undefined;
      try {
        const personalStyle = await storage.getPersonalStyle(user.id);
        if (personalStyle?.isActive) {
          personalStylePrompt = generatePersonalizedPrompt(personalStyle.referenceTexts, personalStyle.styleProfile);
          console.log('[Perfect Swedish Pipeline] Applied user personal writing style');
        }
      } catch (e) {
        console.warn('[Perfect Swedish Pipeline] Failed to load personal style:', e);
      }

      const { prompt, type, platform, writingStyle, wordCountMin, wordCountMax } = req.body;
      const style: "factual" | "balanced" | "selling" = (writingStyle === "factual" || writingStyle === "selling") ? writingStyle : "balanced";

      // Determine word count targets
      let targetWordMin: number;
      let targetWordMax: number;

      if ((plan === "pro" || plan === "premium") && wordCountMin && wordCountMax) {
        const limits = plan === "premium" ? WORD_LIMITS.premium : WORD_LIMITS.pro;
        targetWordMin = Math.max(limits.min, Math.min(wordCountMin, limits.max));
        targetWordMax = Math.max(limits.min, Math.min(wordCountMax, limits.max));
      } else if (plan === "pro" || plan === "premium") {
        const defaults = plan === "premium" ? WORD_LIMITS.premium.default : WORD_LIMITS.pro.default;
        targetWordMin = defaults.min;
        targetWordMax = defaults.max;
      } else {
        targetWordMin = WORD_LIMITS.free.min;
        targetWordMax = WORD_LIMITS.free.max;
      }

      // Analyze images if provided (Pro/Premium feature)
      let imageAnalysis: any = undefined;
      if ((plan === "pro" || plan === "premium") && req.body.imageUrls && Array.isArray(req.body.imageUrls) && req.body.imageUrls.length > 0) {
        // Check vision rate limit
        const { visionRateLimiter } = await import("./lib/rate-limiter");
        const limitCheck = await visionRateLimiter.checkLimit(user.id);
        if (!limitCheck.allowed) {
          pipelineObservability.endStep({
            success: false,
            actionTaken: "blocked_vision_rate_limit",
            decisionReason: limitCheck.reason,
          });
          finalizeObservabilityRun(false);
          return res.status(429).json({
            message: `Bildanalys-gränsen nådd. Försök igen om ${limitCheck.retryAfter} sekunder.`,
            retryAfter: limitCheck.retryAfter,
            limitReason: limitCheck.reason,
          });
        }

        try {
          const { analyzePropertyImages } = await import("./lib/image-analyzer");
          sendProgress(1, 3, "Analyserar bilder...");
          
          // Add timeout protection
          imageAnalysis = await Promise.race([
            analyzePropertyImages(req.body.imageUrls, (current, total) => {
              sendProgress(1, 3, `Analyserar bilder (${current}/${total})...`);
            }),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Image analysis timeout after 30 seconds")),
                30_000
              )
            )
          ]);
          
          console.log('[Image Analysis] Completed:', imageAnalysis.aggregated);
        } catch (err) {
          console.warn('[Image Analysis] Failed:', err);
          
          // Add warning but don't fail the request
          if (err instanceof Error && err.message.includes("timeout")) {
            warnings.push("Bildanalys tog för lång tid. Fortsätter utan bildanalys.");
          } else {
            warnings.push(`Bildanalys misslyckades: ${err instanceof Error ? err.message : 'Okänt fel'}`);
          }
          
          // Continue without image analysis
          imageAnalysis = undefined;
        }
      }

      // Execute new pipeline
      const transformedDisposition = req.body.propertyData 
        ? buildDispositionFromStructuredData(req.body.propertyData, imageAnalysis)
        : { rawText: prompt };
      
      const result = await orchestrator.execute({
        disposition: transformedDisposition,
        style,
        platform: platform || 'hemnet',
        personalStylePrompt,
        targetWordMin,
        targetWordMax,
        userId: user.id,
        sessionId,
      });

      // Save to database
      await pool.query(`
        INSERT INTO pipeline_generations (
          user_id, session_id, variant, disposition, style, platform,
          personal_style_prompt, target_word_min, target_word_max,
          improved_prompt, headline, social_copy, instagram_caption,
          showing_invitation, short_ad, expert_analysis,
          total_duration, step1_duration, step2_duration, step3_duration,
          retry_count, success
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `, [
        user.id,
        sessionId,
        'treatment',
        JSON.stringify(transformedDisposition),
        style,
        platform || 'hemnet',
        personalStylePrompt || null,
        targetWordMin,
        targetWordMax,
        result.improvedPrompt,
        result.headline,
        result.socialCopy,
        result.instagramCaption,
        result.showingInvitation,
        result.shortAd,
        result.expertAnalysis ? JSON.stringify(result.expertAnalysis) : null,
        result.metrics.totalDuration,
        result.metrics.step1Duration ?? null,
        result.metrics.step2Duration ?? null,
        result.metrics.step3Duration ?? null,
        result.metrics.retryCount,
        result.metrics.success
      ]);

      // Increment usage counter
      await storage.incrementUsage(user.id, 'texts');

      // Save to optimization history
      {
        const [insertedOpt] = await db.insert(optimizations).values({
          userId: user.id,
          originalPrompt: prompt,
          improvedPrompt: result.improvedPrompt,
          headline: result.headline ?? null,
          socialCopy: result.socialCopy ?? null,
          instagramCaption: result.instagramCaption ?? null,
          showingInvitation: result.showingInvitation ?? null,
          shortAd: result.shortAd ?? null,
          category: type || 'listing',
          improvements: [],
          suggestions: [],
        }).returning({ id: optimizations.id, createdAt: optimizations.createdAt });
        optimizationRecord = { rows: [{ id: insertedOpt.id, created_at: insertedOpt.createdAt }] };
      }

      // Finalize observability
      finalizeObservabilityRun(true, {
        qualityScore: result.expertAnalysis?.overallQuality,
        wordCount: result.improvedPrompt.split(/\s+/).length,
      });

      // Send final response
      if (wantsStream) {
        res.write(JSON.stringify({
          type: "complete",
          data: {
            originalPrompt: prompt,
            improvedPrompt: result.improvedPrompt,
            headline: result.headline,
            socialCopy: result.socialCopy,
            instagramCaption: result.instagramCaption,
            showingInvitation: result.showingInvitation,
            shortAd: result.shortAd,
            expertAnalysis: result.expertAnalysis,
            optimizationId: optimizationRecord.rows[0].id,
            createdAt: optimizationRecord.rows[0].created_at,
          }
        }) + "\n");
        return res.end();
      } else {
        return res.json({
          originalPrompt: prompt,
          improvedPrompt: result.improvedPrompt,
          headline: result.headline,
          socialCopy: result.socialCopy,
          instagramCaption: result.instagramCaption,
          showingInvitation: result.showingInvitation,
          shortAd: result.shortAd,
          expertAnalysis: result.expertAnalysis,
          optimizationId: optimizationRecord.rows[0].id,
          createdAt: optimizationRecord.rows[0].created_at,
        });
      }
    } catch (error: any) {
      console.error('[Perfect Swedish Pipeline] Error:', error);
      pipelineObservability.endStep({
        success: false,
        actionTaken: "error",
        decisionReason: error.message,
      });

      // Handle different error types
      const err = error as any;
      if (wantsStream) {
        try {
          ensureStreamStarted();
          res.write(JSON.stringify({ 
            type: "error", 
            message: err.message || "Optimering misslyckades", 
            code: err.code || null, 
            upstreamQuota: Boolean(err.upstreamQuota) 
          }) + "\n");
          res.end();
        } catch { 
          res.end(); 
        }
      } else {
        res.status(err.statusCode || 500).json({ 
          message: err.message || "Optimering misslyckades", 
          code: err.code || null, 
          upstreamQuota: Boolean(err.upstreamQuota) 
        });
      }
      finalizeObservabilityRun(false);
    }
  });


  // ── AI REWRITE: Inline text editing ──

  app.post("/api/rewrite", requireAuth, async (req, res) => {
    const rewriteUser = (req as any).user as User;
    const rewritePlan = rewriteUser.plan as PlanType;
    if (rewritePlan === "free") {
      return res.status(403).json({ message: "Text-omskrivning är endast för Pro/Premium-användare" });
    }
    try {
      const { selectedText, fullText, instruction, writingStyle } = req.body;
      const style: WritingStyle = writingStyle === "factual" || writingStyle === "selling" ? writingStyle : "balanced";
      if (!selectedText || !fullText || !instruction) {
        return res.status(400).json({ message: "Markerad text, fulltext och instruktion krävs" });
      }

      // Check textEdits usage limit with model-based limits
      const rewriteUsage = await storage.getMonthlyUsage(rewriteUser.id, rewriteUser) || {
        textsGenerated: 0, areaSearchesUsed: 0, textEditsUsed: 0, personalStyleAnalyses: 0,
      };

      // GPT-5.2 fixed — use model-specific limits or fall back to plan default
      const rewriteLimit = MODEL_TEXT_EDIT_LIMITS["gpt-5.2"][rewritePlan as keyof typeof MODEL_TEXT_EDIT_LIMITS["gpt-5.2"]] || PLAN_LIMITS[rewritePlan].textEdits;
      if (rewriteUsage.textEditsUsed >= rewriteLimit) {
        return res.status(429).json({
          message: `Du har nått din gräns för AI-textredigeringar (${rewriteLimit}/månad) med GPT-5.2. ${rewritePlan === "pro"
            ? `Uppgradera till Premium för ${MODEL_TEXT_EDIT_LIMITS["gpt-5.2"].premium} redigeringar/månad.`
            : `Uppgradera till Premium för fler redigeringar.`
            }`,
          limitReached: true,
          upgradeTo: rewritePlan === "pro" ? "premium" : null,
        });
      }

      // Load personal style for filtering
      let personalStyle: any = null;
      try {
        personalStyle = await storage.getPersonalStyle(rewriteUser.id);
      } catch (e) {
        console.warn("[Rewrite] Failed to load personal style:", e);
      }

      const rewriteCompletion = await openai.responses.create({
        model: "gpt-5.2",
        reasoning: { effort: rewritePlan === "premium" ? "high" : "medium" },
        input: [
          {
            role: "developer",
            content: `Du är en erfaren fastighetsmäklare i Sverige. Du redigerar objektbeskrivningar för Hemnet och Booli. Du vet exakt hur en bra svensk objektbeskrivning ska låta.

TEXTSTIL: ${style === "factual" ? "Faktabaserad och stram" : style === "selling" ? "Säljande men konkret" : "Balanserad, professionell och naturlig"}

# DIN ROLL
Du redigerar objektbeskrivningar åt andra mäklare. Du förstår:
- Hur rum beskrivs (storlek → material → detaljer → ljus/känsla i den ordningen)
- Att köpare bryr sig om: skick, renoveringsår, material, planlösning, ljus, läge
- Att onödig text kostar läsarens uppmärksamhet
- Att varje mening ska tillföra ny information

# OBJEKTBESKRIVNINGSSTIL
BRA: "Köket renoverades 2021. Luckor från Ballingslöv, bänkskiva i komposit. Plats för matbord vid fönstret."
BRA: "Hall med garderobsvägg. Ekparkett genomgående. Takhöjd 2,85 meter."
BRA: "Badrummet helkaklat 2019. Dubbla handfat, golvvärme och handdukstork."
BRA: "Buss 4 minuter. Ica och skola inom 500 meter."
DÅLIGT: "Det fantastiska köket erbjuder en harmonisk matlagningsupplevelse."
DÅLIGT: "Badrummet präglas av hög kvalitet och genomtänkta materialval."
DÅLIGT: "Det centrala läget bjuder på närhet till allt."

# FÖRBJUDET (AI-klyschor som ofta gör texten generisk)
erbjuder, bjuder på, präglas av, genomsyras av, generös, andas lugn, andas charm,
vilket ger, som skapar, för den som, i hjärtat av, bidrar till, förstärker,
inte bara...utan också, njut av, faciliteter, -möjligheter,
kontakta oss, boka visning, välkommen till

# REGLER
1. Skriv om BARA den markerade texten
2. Behåll ALLA fakta — hitta ALDRIG PÅ nya uppgifter
3. Mäklare skriver: kort mening → konkret faktum. Presens.
4. "Skriv om" = andra ord, samma fakta, bättre flöde
5. "Mer säljande" = lyft starkaste fakta (storlek, läge, skick, material) — INTE fler adjektiv
6. "Kondensera" = ta bort utfyllnad, behåll konkreta mått/årtal/material
7. "Bättre flöde" = bind ihop meningar naturligt, variera meningslängd
8. Matcha stilen i hela texten

Svara med JSON: {"rewritten": "den omskrivna texten"}`
          },
          {
            role: "user",
            content: `HELA TEXTEN (för kontext och stil):\n${fullText}\n\nMARKERAD TEXT ATT SKRIVA OM:\n"${selectedText}"\n\nINSTRUKTION: ${instruction}`
          }
        ],
        max_output_tokens: computeInlineEditOutputTokenBudget(selectedText, rewritePlan, "rewrite"),
        text: { format: { type: "json_object" } }
      });

      const raw = rewriteCompletion.output_text || "{}";
      let parsed: any;
      try { parsed = safeJsonParse(raw); } catch { parsed = {}; }

      const rewritten = sanitizeGeneratedMarketingField(parsed.rewritten, personalStyle?.styleProfile, style, undefined, req.body?.platform) || selectedText;

      // More robust text replacement - handle edge cases
      let newFullText = fullText;
      if (fullText.includes(selectedText)) {
        newFullText = fullText.replace(selectedText, rewritten);
      } else {
        // Try to find the text with minor variations (whitespace, etc)
        const escaped = selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped.replace(/\s+/g, '\\s+'), 'i');
        newFullText = fullText.replace(regex, rewritten);
      }

      // Track text edit usage
      await storage.incrementUsage(rewriteUser.id, 'textEdits');

      res.json({ rewritten, newFullText });
    } catch (err: any) {
      console.error("Rewrite error:", err);
      res.status(500).json({ message: err.message || "Omskrivning misslyckades" });
    }
  });

  // ── AI SELECTION EDIT: Generate alternative suggestions for selected text ──
  app.post("/api/selection-edit", requireAuth, async (req, res) => {
    const selectionUser = (req as any).user as User;
    const selectionPlan = selectionUser.plan as PlanType;
    
    if (selectionPlan === "free") {
      return res.status(403).json({ message: "AI-förbättringsförslag är endast för Pro/Premium-användare" });
    }

    try {
      const { selectedText, fullContext, field, style, platform } = req.body;
      const writingStyle: WritingStyle = style === "factual" || style === "selling" ? style : "balanced";

      if (!selectedText || !fullContext) {
        return res.status(400).json({ message: "Markerad text och kontext krävs" });
      }

      // Check textEdits usage limit
      const selectionUsage = await storage.getMonthlyUsage(selectionUser.id, selectionUser) || {
        textsGenerated: 0, areaSearchesUsed: 0, textEditsUsed: 0, personalStyleAnalyses: 0,
      };

      const selectionLimit = MODEL_TEXT_EDIT_LIMITS["gpt-5.2"][selectionPlan as keyof typeof MODEL_TEXT_EDIT_LIMITS["gpt-5.2"]] || PLAN_LIMITS[selectionPlan].textEdits;
      if (selectionUsage.textEditsUsed >= selectionLimit) {
        return res.status(429).json({
          message: `Du har nått din gräns för AI-textredigeringar (${selectionLimit}/månad) med GPT-5.2.`,
          limitReached: true,
          upgradeTo: selectionPlan === "pro" ? "premium" : null,
        });
      }

      // Load personal style for filtering
      let personalStyle: any = null;
      try {
        personalStyle = await storage.getPersonalStyle(selectionUser.id);
      } catch (e) {
        console.warn("[SelectionEdit] Failed to load personal style:", e);
      }

      const selectionCompletion = await openai.responses.create({
        model: "gpt-5.2",
        reasoning: { effort: "low" }, // Fast response for better UX
        input: [
          {
            role: "developer",
            content: `Du är en erfaren fastighetsmäklare i Sverige. Du ger förbättringsförslag för objektbeskrivningar.

TEXTSTIL: ${writingStyle === "factual" ? "Faktabaserad och stram" : writingStyle === "selling" ? "Säljande men konkret" : "Balanserad, professionell och naturlig"}

# DIN UPPGIFT
Ge 2-3 alternativa versioner av den markerade texten som är:
1. Mer konkreta (lägg till mått, material, årtal om möjligt)
2. Bättre flöde (variera meningslängd, bind ihop naturligt)
3. Mer säljande (lyft starkaste fakta först)

# REGLER
- Behåll ALLA fakta från originaltexten
- Hitta ALDRIG PÅ nya uppgifter
- Varje alternativ ska vara tydligt annorlunda
- Undvik AI-klyschor: "erbjuder", "präglas av", "generös", "bjuder på"
- Skriv som en erfaren mäklare, inte som AI

Svara med JSON: {"suggestions": ["alternativ 1", "alternativ 2", "alternativ 3"]}`
          },
          {
            role: "user",
            content: `HELA TEXTEN (för kontext):\n${fullContext}\n\nMARKERAD TEXT ATT FÖRBÄTTRA:\n"${selectedText}"\n\nGe 2-3 förbättrade alternativ.`
          }
        ],
        max_output_tokens: computeInlineEditOutputTokenBudget(selectedText, selectionPlan, "improve"),
        text: { format: { type: "json_object" } }
      });

      const raw = selectionCompletion.output_text || "{}";
      let parsed: any;
      try { parsed = safeJsonParse(raw); } catch { parsed = {}; }

      const suggestions = Array.isArray(parsed.suggestions) 
        ? parsed.suggestions.slice(0, 3).map((s: string) => 
            sanitizeGeneratedMarketingField(s, personalStyle?.styleProfile, writingStyle, undefined, platform) || s
          )
        : [selectedText];

      // Track text edit usage
      await storage.incrementUsage(selectionUser.id, 'textEdits');

      res.json({ 
        suggestions,
        duration: Date.now() - Date.now() // Placeholder for actual timing
      });
    } catch (err: any) {
      console.error("Selection edit error:", err);
      res.status(500).json({ message: err.message || "AI-förbättring misslyckades" });
    }
  });

  // ── ADDRESS LOOKUP: Auto-fill nearby places ──
  app.post("/api/address-lookup", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const plan = (user.plan as PlanType) || "free";

      // Check API access
      if (!FEATURE_ACCESS[plan].apiAccess) {
        return res.status(403).json({
          message: "Adress-sökning är endast för Pro- och Premium-användare",
          upgradeTo: "pro"
        });
      }

      const { address } = req.body;
      if (!address) return res.status(400).json({ message: "Adress krävs" });

      try {
        // Step 1: Geocode with Nominatim
        const nominatimRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", Sverige")}&limit=1&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'OptiPrompt-Maklare/1.0 (contact@optiprompt.se)' // Required by Nominatim
            }
          }
        );

        if (!nominatimRes.ok) {
          console.error("[OpenStreetMap] Nominatim API error:", nominatimRes.status, nominatimRes.statusText);
          return res.status(500).json({
            message: "Adresssökning misslyckades. Försök igen senare.",
            error: `API error: ${nominatimRes.status}`
          });
        }

        const contentType = nominatimRes.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error("[OpenStreetMap] Unexpected content type:", contentType);
          return res.status(500).json({
            message: "Adresssökning misslyckades. Försök igen senare.",
            error: "Invalid API response format"
          });
        }

        let nominatimData;
        try {
          nominatimData = await nominatimRes.json();
        } catch (parseError) {
          console.error("[OpenStreetMap] JSON parse error:", parseError);
          return res.status(500).json({
            message: "Adresssökning misslyckades. Försök igen senare.",
            error: "Invalid JSON response"
          });
        }

        const location = nominatimData?.[0];

        if (!location) {
          return res.json({ places: [], message: "Adressen kunde inte hittas" });
        }

        const lat = parseFloat(location.lat);
        const lon = parseFloat(location.lon);
        const formattedAddress = location.display_name || address;

        // Step 2: Find nearby places with Overpass API
        const overpassQuery = `
          [out:json][timeout:25];
          (
            node["amenity"~"school|college|university"](around:1500,${lat},${lon});
            node["shop"~"supermarket|grocery|convenience"](around:1500,${lat},${lon});
            node["leisure"="park"](around:1500,${lat},${lon});
            node["highway"~"bus_stop|bus_station|tram_stop|subway_entrance"](around:1500,${lat},${lon});
            node["amenity"="restaurant"](around:1500,${lat},${lon});
          );
          out tags;
        `;

        const overpassRes = await fetch(
          'https://overpass-api.de/api/interpreter',
          {
            method: 'POST',
            body: 'data=' + encodeURIComponent(overpassQuery),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        if (!overpassRes.ok) {
          console.error("[OpenStreetMap] Overpass API error:", overpassRes.status, overpassRes.statusText);
          return res.status(500).json({
            message: "Adresssökning misslyckades. Försök igen senare.",
            error: `Overpass API error: ${overpassRes.status}`
          });
        }

        let overpassData;
        try {
          overpassData = await overpassRes.json();
        } catch (parseError) {
          console.error("[OpenStreetMap] Overpass JSON parse error:", parseError);
          return res.status(500).json({
            message: "Adresssökning misslyckades. Försök igen senare.",
            error: "Overpass API invalid response"
          });
        }

        // Step 3: Process and categorize results
        const places: any[] = [];
        const transportPlaces: any[] = [];

        overpassData.elements.forEach((element: any) => {
          if (!element.tags || !element.tags.name) return;

          const dist = haversineDistance(lat, lon, element.lat, element.lon);
          const distanceStr = dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`;

          let category = "";
          let label = "";

          if (element.tags.amenity === "school" || element.tags.amenity === "college" || element.tags.amenity === "university") {
            category = "school";
            label = "Skola";
          } else if (element.tags.shop && (element.tags.shop.includes("supermarket") || element.tags.shop.includes("grocery"))) {
            category = "supermarket";
            label = "Matbutik";
          } else if (element.tags.leisure === "park") {
            category = "park";
            label = "Park";
          } else if (element.tags.highway && (element.tags.highway.includes("bus") || element.tags.highway.includes("tram") || element.tags.highway.includes("subway"))) {
            category = "transit_station";
            label = "Kollektivtrafik";
            transportPlaces.push({
              name: element.tags.name,
              type: label,
              distance: distanceStr,
              distanceMeters: Math.round(dist),
            });
            return; // Skip adding to general places array
          } else if (element.tags.amenity === "restaurant") {
            category = "restaurant";
            label = "Restaurang";
          }

          if (category) {
            places.push({
              name: element.tags.name,
              type: label,
              distance: distanceStr,
              distanceMeters: Math.round(dist),
            });
          }
        });

        // Sort by distance and limit results
        places.sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);
        transportPlaces.sort((a: any, b: any) => a.distanceMeters - b.distanceMeters);

        const transport = transportPlaces.slice(0, 2).map((p: any) => `${p.name} ${p.distance}`).join(", ") || null;
        const neighborhood = places
          .slice(0, 4)
          .map((p: any) => `${p.name} (${p.type.toLowerCase()}) ${p.distance}`)
          .join(". ") || null;

        // No usage increment needed — OpenStreetMap APIs are free

        res.json({
          formattedAddress,
          places: places.slice(0, 6),
          transport,
          neighborhood,
          source: "openstreetmap"
        });

      } catch (osmError: any) {
        console.error("[OpenStreetMap] Error:", osmError);
        res.status(500).json({
          message: "Adresssökning misslyckades. Försök igen senare.",
          error: osmError.message
        });
      }
    } catch (err: any) {
      console.error("Address lookup error:", err);
      res.status(500).json({ message: err.message || "Adresssökning misslyckades" });
    }
  });

  // Admin password reset (requires ADMIN_KEY)
  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const adminHeader = req.headers["x-admin-key"];
      const adminKey = Array.isArray(adminHeader) ? adminHeader[0] : adminHeader;
      const expectedKey = process.env.ADMIN_KEY;

      if (!isValidAdminKey(adminKey, expectedKey)) {
        return res.status(403).json({ message: "Invalid admin key" });
      }

      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email och lösenord krävs" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      // Hash new password
      const bcryptMod = await import('bcrypt');
      const bcryptLib = bcryptMod.default || bcryptMod;
      const passwordHash = await bcryptLib.hash(newPassword, 12);

      // Update password
      await storage.updatePassword(user.id, passwordHash);

      res.json({ message: "Lösenord uppdaterat! Du kan nu logga in." });
    } catch (err: any) {
      console.error("[Admin Reset] Error:", err);
      res.status(500).json({ message: "Kunde inte återställa lösenordet" });
    }
  });

  // Stripe checkout
  app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { tier } = req.body;

      if (tier !== "pro" && tier !== "premium") {
        return res.status(400).json({ message: "Ogiltig plan" });
      }

      // If user already has a subscription, use Billing Portal for plan changes
      if (user.stripeCustomerId && user.stripeSubscriptionId) {
        const baseUrl = (process.env.APP_URL || 'https://optiprompt.se').replace(/\/+$/, '');
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: `${baseUrl}/app`,
        });
        return res.json({ url: portalSession.url });
      }

      const priceId = tier === "pro" ? STRIPE_PRO_PRICE_ID : STRIPE_PREMIUM_PRICE_ID;
      if (!priceId) {
        console.error("[Stripe Checkout] Price ID not configured for tier:", tier);
        return res.status(500).json({ message: "Stripe-pris är inte konfigurerat" });
      }

      let customerId = user.stripeCustomerId;

      if (!customerId) {
        console.log("[Stripe Checkout] Creating new Stripe customer");
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        console.log("[Stripe Checkout] Stripe customer created:", customerId);

        await storage.updateUserStripeCustomer(user.id, customerId);
        console.log("[Stripe Checkout] Customer ID saved to database");
      } else {
        console.log("[Stripe Checkout] Using existing Stripe customer:", customerId);
      }

      const baseUrl = (process.env.APP_URL || 'https://optiprompt.se').replace(/\/+$/, '');

      console.log("[Stripe Checkout] Creating checkout session with base URL:", baseUrl);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/app?success=true`,
        cancel_url: `${baseUrl}/app?canceled=true`,
        metadata: { userId: user.id, targetPlan: tier },
      });

      console.log("[Stripe Checkout] Session created successfully:", session.id);
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe Checkout] Error:", err);
      res.status(500).json({ message: err.message || "Betalning misslyckades" });
    }
  });

  // Stripe customer portal
  app.post("/api/stripe/create-portal", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;

      if (!user.stripeCustomerId) {
        return res.status(400).json({ message: "Ingen prenumeration hittades" });
      }

      const baseUrl = (process.env.APP_URL || 'https://optiprompt.se').replace(/\/+$/, '');

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/app`,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("Portal error:", err);
      res.status(500).json({ message: "Kunde inte öppna kundportalen" });
    }
  });

  // Stripe webhook
  app.post("/api/stripe/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Stripe webhook secret not configured");
      return res.status(500).json({ message: "Webhook not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ message: `Webhook Error: ${err.message}` });
    }

    try {
      const eventId = event.id;
      if (!eventId) {
        return res.status(400).json({ message: "Webhook event saknar ID" });
      }

      const lockAcquired = await acquireStripeWebhookEventLock(eventId);
      if (!lockAcquired) {
        return res.json({ received: true, duplicate: true });
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const targetPlan = session.metadata?.targetPlan as "pro" | "premium";

          if (userId && targetPlan && session.subscription && session.customer) {
            await storage.upgradeUser(
              userId,
              targetPlan,
              session.customer as string,
              session.subscription as string
            );

            // Send subscription confirmation email
            try {
              const user = await storage.getUserById(userId);
              if (user) {
                const { sendSubscriptionConfirmedEmail } = await import('./email');
                const planLabel = targetPlan === 'premium' ? 'Premium' : 'Pro';
                const planPrice = targetPlan === 'premium' ? '599' : '299';
                await sendSubscriptionConfirmedEmail(user.email, planLabel, planPrice, user.email);
              }
            } catch (emailErr) {
              console.error('[Stripe Webhook] Failed to send confirmation email:', emailErr);
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const updatedSub = event.data.object as Stripe.Subscription;
          const priceId = updatedSub.items?.data?.[0]?.price?.id;
          let newPlan: "pro" | "premium" | null = null;

          if (priceId === STRIPE_PRO_PRICE_ID) newPlan = "pro";
          else if (priceId === STRIPE_PREMIUM_PRICE_ID) newPlan = "premium";

          if (newPlan && updatedSub.status === "active") {
            // Find user by subscription ID and update their plan
            const subUser = await storage.getUserByStripeSubscriptionId(updatedSub.id);
            if (subUser) {
              await storage.setUserPlan(subUser.id, newPlan);
            }
          } else if (updatedSub.status === "past_due" || updatedSub.status === "unpaid") {
            console.log(`[Stripe Webhook] Subscription ${updatedSub.id} status: ${updatedSub.status}`);
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await storage.downgradeUserToFree(subscription.id);
          console.log(`Subscription ${subscription.id} cancelled`);
          break;
        }

        case "invoice.payment_failed": {
          // NOTE: Do NOT downgrade here. Stripe retries failed payments 3-4 times
          // over several days. The actual downgrade happens on customer.subscription.deleted.
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription;
          if (subscriptionId) {
            console.log(`[Stripe Webhook] Payment failed for subscription ${subscriptionId} — Stripe will retry`);
          }
          break;
        }

        case "invoice.paid": {
          const paidInvoice = event.data.object as Stripe.Invoice;
          const paidSubId = (paidInvoice as any).subscription;
          if (paidSubId) {
            console.log(`[Stripe Webhook] Invoice paid for subscription ${paidSubId}`);
          }
          break;
        }
      }

      await finalizeStripeWebhookEvent(eventId);
      res.json({ received: true });
    } catch (err) {
      try {
        if (event?.id) {
          await releaseStripeWebhookEventLock(event.id);
        }
      } catch (releaseErr) {
        console.error("Webhook lock release error:", releaseErr);
      }
      console.error("Webhook processing error:", err);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // History endpoints
  app.get("/api/history", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const history = await storage.getOptimizationHistory(user.id);
      res.json(history);
    } catch (err) {
      console.error("History error:", err);
      res.status(500).json({ message: "Kunde inte hämta historik" });
    }
  });

  app.delete("/api/history/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const id = parseInt(req.params.id);
      await storage.deleteOptimization(user.id, id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete history error:", err);
      res.status(500).json({ message: "Kunde inte radera" });
    }
  });

  app.delete("/api/history", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      await storage.deleteAllOptimizations(user.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Clear history error:", err);
      res.status(500).json({ message: "Kunde inte rensa historik" });
    }
  });

  // ==================== TEAM ROUTES (PRO ONLY) ====================

  app.get("/api/teams", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teams = await storage.getUserTeams(user.id);
      res.json(teams);
    } catch (err) {
      console.error("Get teams error:", err);
      res.status(500).json({ message: "Kunde inte hämta team" });
    }
  });

  app.post("/api/teams", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { name } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Teamnamn kr\u00e4vs" });
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const team = await storage.createTeam({
        name: name.trim(),
        slug: `${slug}-${Date.now()}`,
        ownerId: user.id,
      });

      await storage.addTeamMember({
        teamId: team.id,
        userId: user.id,
        role: "owner",
      });

      res.json(team);
    } catch (err) {
      console.error("Create team error:", err);
      res.status(500).json({ message: "Kunde inte skapa team" });
    }
  });

  app.get("/api/teams/:id", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Du är inte medlem i detta team" });
      }

      const team = await storage.getTeamById(teamId);
      res.json(team);
    } catch (err) {
      console.error("Get team error:", err);
      res.status(500).json({ message: "Kunde inte hämta team" });
    }
  });

  app.get("/api/teams/:id/members", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Du är inte medlem i detta team" });
      }

      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (err) {
      console.error("Get team members error:", err);
      res.status(500).json({ message: "Kunde inte hämta teammedlemmar" });
    }
  });

  app.post("/api/teams/:id/invite", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "E-postadress krävs" });
      }

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({ message: "Bara ägare och admins kan bjuda in medlemmar" });
      }

      // Check rate limit for invites
      const canSend = await storage.canSendEmail(user.email, 'team_invite', MAX_INVITE_EMAILS_PER_HOUR);
      if (!canSend) {
        return res.status(429).json({
          message: "Du har skickat för många inbjudningar. Vänligen vänta en timme."
        });
      }

      const invite = await storage.createTeamInvite(teamId, email.trim().toLowerCase(), user.id);

      // Get team name for the email
      const team = await storage.getTeamById(teamId);
      if (team) {
        await storage.recordEmailSent(user.email, 'team_invite');
        await sendTeamInviteEmail(invite.email, invite.token, team.name, user.email);
      }

      res.json({ token: invite.token, email: invite.email, emailSent: true });
    } catch (err) {
      console.error("Create invite error:", err);
      res.status(500).json({ message: "Kunde inte skapa inbjudan" });
    }
  });

  app.post("/api/teams/join/:token", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { token } = req.params;

      const invite = await storage.getInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Ogiltig eller utgången inbjudan" });
      }

      if (new Date(invite.expiresAt) < new Date()) {
        await storage.deleteInvite(invite.id);
        return res.status(410).json({ message: "Denna inbjudan har gått ut" });
      }

      if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ message: "Denna inbjudan är för en annan e-postadress" });
      }

      const existingMembership = await storage.getUserTeamMembership(user.id, invite.teamId);
      if (existingMembership) {
        await storage.deleteInvite(invite.id);
        const team = await storage.getTeamById(invite.teamId);
        return res.json(team);
      }

      await storage.addTeamMember({
        teamId: invite.teamId,
        userId: user.id,
        role: "member",
      });

      await storage.deleteInvite(invite.id);
      const team = await storage.getTeamById(invite.teamId);
      res.json(team);
    } catch (err) {
      console.error("Join team error:", err);
      res.status(500).json({ message: "Kunde inte gå med i teamet" });
    }
  });

  app.get("/api/teams/:id/prompts", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Du är inte medlem i detta team" });
      }

      const prompts = await storage.getTeamSharedPrompts(teamId);
      res.json(prompts);
    } catch (err) {
      console.error("Get team prompts error:", err);
      res.status(500).json({ message: "Kunde inte hämta prompter" });
    }
  });

  app.post("/api/teams/:id/prompts", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);
      const { title, content, category } = req.body;

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Du är inte medlem i detta team" });
      }

      const prompt = await storage.createSharedPrompt({
        teamId,
        creatorId: user.id,
        title: title || "Untitled",
        content: content || "",
        category: category || "General",
        status: "draft",
      });

      res.json(prompt);
    } catch (err) {
      console.error("Create prompt error:", err);
      res.status(500).json({ message: "Kunde inte skapa prompt" });
    }
  });

  app.patch("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const existingPrompt = await storage.getSharedPromptById(promptId);
      if (!existingPrompt) {
        return res.status(404).json({ message: "Prompten hittades inte" });
      }

      const membership = await storage.getUserTeamMembership(user.id, existingPrompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Du är inte medlem i detta team" });
      }

      const prompt = await storage.updateSharedPrompt(promptId, req.body);
      res.json(prompt);
    } catch (err) {
      console.error("Update prompt error:", err);
      res.status(500).json({ message: "Kunde inte uppdatera prompt" });
    }
  });

  app.delete("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const existingPrompt = await storage.getSharedPromptById(promptId);
      if (!existingPrompt) {
        return res.status(404).json({ message: "Prompten hittades inte" });
      }

      const membership = await storage.getUserTeamMembership(user.id, existingPrompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Du är inte medlem i detta team" });
      }

      if (!["owner", "admin"].includes(membership.role) && existingPrompt.creatorId !== user.id) {
        return res.status(403).json({ message: "Bara teamägare, admins eller skaparen kan ta bort prompter" });
      }

      await storage.deleteSharedPrompt(promptId);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete prompt error:", err);
      res.status(500).json({ message: "Kunde inte ta bort prompt" });
    }
  });

  app.get("/api/prompts/:id/comments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompten hittades inte" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Du är inte medlem i detta team" });
      }

      const comments = await storage.getPromptComments(promptId);
      res.json(comments);
    } catch (err) {
      console.error("Get comments error:", err);
      res.status(500).json({ message: "Kunde inte hämta kommentarer" });
    }
  });

  app.post("/api/prompts/:id/comments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);
      const { content } = req.body;

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompten hittades inte" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Du är inte medlem i detta team" });
      }

      const comment = await storage.createComment({
        promptId,
        userId: user.id,
        content: content || "",
      });

      res.json(comment);
    } catch (err) {
      console.error("Create comment error:", err);
      res.status(500).json({ message: "Kunde inte skapa kommentar" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  // Admin endpoint to set user plan manually (no Stripe required)
  // Usage: POST /api/admin/set-plan
  // Body: { userId: "user-id", plan: "pro" } OR { email: "user@example.com", plan: "pro" }
  app.post("/api/admin/set-plan", async (req, res) => {
    try {
      const adminHeader = req.headers["x-admin-key"];
      const adminKey = Array.isArray(adminHeader) ? adminHeader[0] : adminHeader;
      const expectedKey = process.env.ADMIN_KEY;

      if (!isValidAdminKey(adminKey, expectedKey)) {
        return res.status(403).json({ message: "Invalid admin key" });
      }

      const { userId, email, plan } = req.body;

      if (!plan || !["free", "pro", "premium"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Must be 'free', 'pro', or 'premium'" });
      }

      let targetUser: User | null = null;

      if (userId) {
        targetUser = await storage.getUserById(userId);
      } else if (email) {
        targetUser = await storage.getUserByEmail(email);
      } else {
        return res.status(400).json({ message: "Either userId or email must be provided" });
      }

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.setUserPlan(targetUser.id, plan);


      res.json({
        success: true,
        message: `User ${targetUser.email} plan set to ${plan}`,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          plan: plan
        }
      });
    } catch (err: any) {
      console.error("Admin set-plan error:", err);
      res.status(500).json({ message: err.message || "Kunde inte ställa in användarplan" });
    }
  });

  // TEXTFÖRBÄTTRING - AI-assistent för att skriva om delar av texten
  app.post("/api/improve-text", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const { originalText, selectedText, improvementType, context, writingStyle } = req.body;
      const style: WritingStyle = writingStyle === "factual" || writingStyle === "selling" ? writingStyle : "balanced";

      if (!selectedText || !improvementType) {
        return res.status(400).json({ message: "Markerad text och förbättringstyp krävs" });
      }

      const plan = user.plan as PlanType;
      if (plan === "free") {
        return res.status(403).json({ message: "Denna funktion är endast för Pro/Premium-användare" });
      }

      // Load personal style for filtering
      let personalStyle: any = null;
      try {
        personalStyle = await storage.getPersonalStyle(user.id);
      } catch (e) {
        console.warn("[Improve Text] Failed to load personal style:", e);
      }

      // Check textEdits usage limit with model-based limits
      const improveUsage = await storage.getMonthlyUsage(user.id, user) || {
        textsGenerated: 0, areaSearchesUsed: 0, textEditsUsed: 0, personalStyleAnalyses: 0,
      };

      // GPT-5.2 fixed — use model-specific limits or fall back to plan default
      const improveLimit = MODEL_TEXT_EDIT_LIMITS["gpt-5.2"][plan as keyof typeof MODEL_TEXT_EDIT_LIMITS["gpt-5.2"]] || PLAN_LIMITS[plan].textEdits;
      if (improveUsage.textEditsUsed >= improveLimit) {
        return res.status(429).json({
          message: `Du har nått din gräns för AI-textredigeringar (${improveLimit}/månad) med GPT-5.2. ${plan === "pro"
            ? `Uppgradera till Premium för ${MODEL_TEXT_EDIT_LIMITS["gpt-5.2"].premium} redigeringar/månad.`
            : `Uppgradera till Premium för fler redigeringar.`
            }`,
          limitReached: true,
          upgradeTo: plan === "pro" ? "premium" : null,
        });
      }

      console.log(`[Text Improvement] Improving text with type: ${improvementType}`);

      const improvementPrompts: Record<string, string> = {
        more_descriptive: `Gör texten mer beskrivande på det sätt en mäklare gör: nämn material (ek, komposit, klinker), mått (kvm, meter), renoveringsår, märken (Ballingslöv, Miele). Hitta inte på nya fakta — lyft det som redan finns.`,
        more_selling: `Gör texten mer säljande genom att lyfta de starkaste fakta först: läge, storlek, skick, material. En bra mäklare säljer med FAKTA (nyrenoverat 2023, 500m till T-bana, söderläge) — INTE med adjektiv (fantastisk, underbar).`,
        better_flow: `Förbättra textflödet: variera meningslängd, bind ihop korta hackiga meningar naturligt med "med", "som leder in till", "mot". Rumsordning ska följa en naturlig vandring genom bostaden.`,
        more_concise: `Kondensera texten. Ta bort utfyllnadsord och upprepningar. Behåll alla konkreta fakta (mått, årtal, material). En bra objektbeskrivning är tät — varje mening tillför.`,
        fix_claims: `Ersätt alla AI-klyschor och vaga påståenden med konkreta fakta. "Generöst kök" → "Kök om 15 kvm". "Ljust och luftigt" → "Fönster i tre väderstreck". Om fakta saknas — stryk meningen hellre än att behålla tomma ord.`
      };

      if (!(improvementType in improvementPrompts)) {
        return res.status(400).json({ message: "Ogiltig förbättringstyp" });
      }

      const improvementInstruction = improvementPrompts[improvementType] || improvementPrompts.more_descriptive;

      const completion = await openai.responses.create({
        model: "gpt-5.2",
        reasoning: { effort: plan === "premium" ? "high" : "medium" },
        input: [
          {
            role: "developer",
            content: `Du är en erfaren svensk fastighetsmäklare som redigerar objektbeskrivningar. Du vet hur Hemnet- och Booli-texter ska låta.

TEXTSTIL: ${style === "factual" ? "Faktabaserad och återhållsam" : style === "selling" ? "Säljande men klyschfri" : "Balanserad, naturlig och professionell"}

${improvementInstruction}

# SÅ SKRIVER MÄKLARE
- Rum beskrivs: storlek → material → utrustning → ljus/läge
- Kök: renoveringsår, luckor/märke, bänkskiva, vitvaror, matplats
- Bad: helkaklat/renoveringsår, utrustning (badkar, dubbla handfat, golvvärme)
- Läge: avstånd i meter/minuter till kollektivtrafik, skola, butiker
- Aldrig lista vitvaror som alla har (kyl, frys, spis, micro) — bara det som utmärker sig

# FÖRBJUDET (AI-klyschor)
erbjuder, bjuder på, präglas av, genomsyras av, generös, andas lugn/charm,
vilket ger, som skapar, för den som, i hjärtat av, bidrar till, förstärker,
inte bara...utan också, njut av, faciliteter, välkommen till

Svara med JSON: {"improved": "den förbättrade texten"}`
          },
          {
            role: "user",
            content: `HELA TEXTEN (för kontext):\n${originalText}\n\nVALD TEXT ATT FÖRBÄTTRA:\n"${selectedText}"${context ? `\n\nEXTRA KONTEXT: ${context}` : ''}`
          }
        ],
        max_output_tokens: computeInlineEditOutputTokenBudget(selectedText, plan, "improve"),
        text: { format: { type: "json_object" } }
      });

      let rawImprovedText = "";
      try {
        const parsed = safeJsonParse(completion.output_text || "{}");
        rawImprovedText = parsed.improved || completion.output_text || "";
      } catch {
        rawImprovedText = completion.output_text || "";
      }
      // Strip quotes, markdown code blocks, and leading/trailing whitespace
      rawImprovedText = rawImprovedText.trim();
      rawImprovedText = rawImprovedText.replace(/^```[\s\S]*?\n/, "").replace(/\n```$/, ""); // code blocks
      rawImprovedText = rawImprovedText.replace(/^[""\u201C]|[""\u201D]$/g, ""); // smart quotes
      rawImprovedText = rawImprovedText.replace(/^"|"$/g, ""); // regular quotes
      const improvedText = sanitizeGeneratedMarketingField(rawImprovedText.trim(), personalStyle?.styleProfile, style, undefined, req.body?.platform) || selectedText;

      // Track text edit usage
      await storage.incrementUsage(user.id, 'textEdits');

      res.json({
        originalText: selectedText,
        improvedText: improvedText,
        improvementType: improvementType
      });

    } catch (err: any) {
      console.error("Text improvement error:", err);
      res.status(500).json({ message: err.message || "Textförbättring misslyckades" });
    }
  });

  // ==================== MONITORING & ALERTING ROUTES ====================
  
  // Import monitoring and alerting modules
  const { PerfectSwedishMonitoring } = await import('./lib/perfect-swedish-monitoring');
  const { PerfectSwedishAlerts } = await import('./lib/perfect-swedish-alerts');
  
  const monitoring = new PerfectSwedishMonitoring();
  const alerts = new PerfectSwedishAlerts();

  // Get current metrics for a variant
  app.get("/api/monitoring/metrics/:variant", requireAuth, async (req, res) => {
    try {
      const variant = req.params.variant as 'control' | 'treatment';
      if (variant !== 'control' && variant !== 'treatment') {
        return res.status(400).json({ message: "Invalid variant. Must be 'control' or 'treatment'" });
      }

      const timeWindowHours = parseInt(req.query.hours as string) || 24;
      const metrics = await monitoring.collectMetrics(variant, timeWindowHours);
      
      res.json(metrics);
    } catch (err) {
      console.error("Metrics collection error:", err);
      res.status(500).json({ message: "Failed to collect metrics" });
    }
  });

  // Get historical metrics
  app.get("/api/monitoring/metrics", requireAuth, async (req, res) => {
    try {
      const query: any = {};
      
      if (req.query.variant) {
        query.variant = req.query.variant as 'control' | 'treatment';
      }
      
      if (req.query.startDate) {
        query.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        query.endDate = new Date(req.query.endDate as string);
      }
      
      if (req.query.minSampleSize) {
        query.minSampleSize = parseInt(req.query.minSampleSize as string);
      }

      const metrics = await monitoring.getHistoricalMetrics(query);
      
      res.json(metrics);
    } catch (err) {
      console.error("Historical metrics error:", err);
      res.status(500).json({ message: "Failed to get historical metrics" });
    }
  });

  // Generate daily summary report
  app.get("/api/monitoring/summary", requireAuth, async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const summary = await monitoring.generateDailySummary(date);
      
      res.json({ summary, date });
    } catch (err) {
      console.error("Daily summary error:", err);
      res.status(500).json({ message: "Failed to generate daily summary" });
    }
  });

  // Export metrics (JSON or CSV)
  app.get("/api/monitoring/export", requireAuth, async (req, res) => {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const data = await monitoring.exportMetrics(format);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="metrics-${new Date().toISOString().split('T')[0]}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
      
      res.send(data);
    } catch (err) {
      console.error("Metrics export error:", err);
      res.status(500).json({ message: "Failed to export metrics" });
    }
  });

  // Check alert thresholds
  app.get("/api/alerts/check/:variant", requireAuth, async (req, res) => {
    try {
      const variant = req.params.variant as 'control' | 'treatment';
      if (variant !== 'control' && variant !== 'treatment') {
        return res.status(400).json({ message: "Invalid variant. Must be 'control' or 'treatment'" });
      }

      const timeWindowHours = parseInt(req.query.hours as string) || 1;
      const alertList = await alerts.checkThresholds(variant, timeWindowHours);
      
      res.json({ alerts: alertList, count: alertList.length });
    } catch (err) {
      console.error("Alert check error:", err);
      res.status(500).json({ message: "Failed to check alerts" });
    }
  });

  // Check all variants
  app.get("/api/alerts/check", requireAuth, async (req, res) => {
    try {
      const timeWindowHours = parseInt(req.query.hours as string) || 1;
      const notification = await alerts.checkAllVariants(timeWindowHours);
      
      res.json(notification);
    } catch (err) {
      console.error("Alert check error:", err);
      res.status(500).json({ message: "Failed to check alerts" });
    }
  });

  // Get current alert thresholds
  app.get("/api/alerts/thresholds", requireAuth, async (req, res) => {
    try {
      const thresholds = alerts.getThresholds();
      res.json(thresholds);
    } catch (err) {
      console.error("Get thresholds error:", err);
      res.status(500).json({ message: "Failed to get thresholds" });
    }
  });

  // Update alert thresholds (admin only - for now just requireAuth)
  app.put("/api/alerts/thresholds", requireAuth, async (req, res) => {
    try {
      const newThresholds = req.body;
      alerts.updateThresholds(newThresholds);
      
      res.json({ success: true, thresholds: alerts.getThresholds() });
    } catch (err) {
      console.error("Update thresholds error:", err);
      res.status(500).json({ message: "Failed to update thresholds" });
    }
  });

  // Run health check manually
  app.post("/api/alerts/health-check", requireAuth, async (req, res) => {
    try {
      const notification = await alerts.runHealthCheck();
      res.json(notification);
    } catch (err) {
      console.error("Health check error:", err);
      res.status(500).json({ message: "Failed to run health check" });
    }
  });

  return httpServer;
}

export {
  buildGoldenBrokerExamples,
  computeChatCompletionTokenBudget,
  computeInlineEditOutputTokenBudget,
  buildDeterministicFallbackDescription,
  buildDispositionFromStructuredData,
  countGenericBrokerPhrases,
  detectNarrativeIntegrityIssues,
  finalizeMainMarketingText,
  isStrongPublishableCandidate,
  shouldSkipFinalRescueRewrite,
  safeJsonParse,
  sanitizeGeneratedMarketingField,
  polishAuxFieldText,
  validateOptimizationResult,
};
