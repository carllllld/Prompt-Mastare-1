import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
import { createClient, type RedisClientType } from "redis";
import { storage } from "./storage";
import { analyzeMarketPosition, getMarketTrends2025 } from "./market-intelligence";
import { analyzeArchitecturalValue } from "./architectural-intelligence";
import { optimizeRequestSchema, PLAN_LIMITS, WORD_LIMITS, FEATURE_ACCESS, MODEL_TEXT_EDIT_LIMITS, type PlanType, type User, type PersonalStyle, type InsertPersonalStyle } from "@shared/schema";
import { requireAuth, requirePro } from "./auth";
import { sendTeamInviteEmail } from "./email";
import OpenAI from "openai";

const MAX_INVITE_EMAILS_PER_HOUR = 5;

// Rate limiting for /api/optimize (per user, per minute)
const optimizeRateMap = new Map<string, { count: number; resetAt: number }>();
const OPTIMIZE_RATE_LIMIT = (() => {
  const n = Number.parseInt(process.env.OPTIMIZE_RATE_LIMIT || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
})(); // max requests per minute
const OPTIMIZE_RATE_WINDOW = (() => {
  const n = Number.parseInt(process.env.OPTIMIZE_RATE_WINDOW_MS || "", 10);
  return Number.isFinite(n) && n > 0 ? n : 60 * 1000;
})(); // 1 minute
const REDIS_CONNECT_COOLDOWN_MS = (() => {
  const n = Number.parseInt(process.env.REDIS_CONNECT_COOLDOWN_MS || "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 30_000;
})();

function checkOptimizeRateLimitInMemory(userId: string): boolean {
  const now = Date.now();
  const entry = optimizeRateMap.get(userId);
  if (!entry || now > entry.resetAt) {
    optimizeRateMap.set(userId, { count: 1, resetAt: now + OPTIMIZE_RATE_WINDOW });
    return true;
  }
  if (entry.count >= OPTIMIZE_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

const optimizeRateLuaScript =
  "local current = redis.call('INCR', KEYS[1])\n" +
  "if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end\n" +
  "return current";

let redisClient: RedisClientType | null = null;
let redisInitPromise: Promise<RedisClientType | null> | null = null;
let redisDisabledUntil = 0;

async function getRedisClient(): Promise<RedisClientType | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  if (Date.now() < redisDisabledUntil) return null;
  if (redisClient?.isReady) return redisClient;
  if (redisInitPromise) return redisInitPromise;

  redisInitPromise = (async () => {
    let client: RedisClientType | null = null;
    try {
      client = createClient({ url: redisUrl });
      client.on("error", (err: unknown) => {
        console.warn("[Redis] error:", err);
      });

      await client.connect();
      redisClient = client;
      console.log("[Redis] connected");
      return client;
    } catch (err) {
      console.warn("[Redis] connect failed, falling back to in-memory rate limiting:", err);
      redisDisabledUntil = Date.now() + REDIS_CONNECT_COOLDOWN_MS;
      try {
        await client?.disconnect();
      } catch {
      }
      redisClient = null;
      return null;
    } finally {
      redisInitPromise = null;
    }
  })();

  return redisInitPromise;
}

async function checkOptimizeRateLimit(userId: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!client) return checkOptimizeRateLimitInMemory(userId);

  const key = `rl:optimize:${userId}`;
  try {
    const count = (await client.eval(optimizeRateLuaScript, {
      keys: [key],
      arguments: [String(OPTIMIZE_RATE_WINDOW)],
    })) as number;

    return count <= OPTIMIZE_RATE_LIMIT;
  } catch (err) {
    console.warn("[Rate Limit] Redis error, falling back to in-memory:", err);
    return checkOptimizeRateLimitInMemory(userId);
  }
}

// Cleanup stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(optimizeRateMap)) {
    if (now > entry.resetAt) optimizeRateMap.delete(key);
  }
}, 5 * 60 * 1000);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "{}";
  return text.slice(start, end + 1);
}

function safeJsonParse(rawText: string): any {
  const extracted = extractFirstJsonObject(rawText || "{}");
  // Common model slip: trailing commas before } or ]
  const sanitized = extracted
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\u0000/g, "")
    .trim();
  return JSON.parse(sanitized);
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
  "allowedPhrases": ["välkommen till", "bra läge", "fin utsikt"],
  "forbiddenPhrases": ["fantastisk", "perfekt", "utmärkt"],
  "tonePriorities": {
    "useWelcoming": true,
    "avoidAdjectives": false,
    "focusFacts": true,
    "personalTouch": true
  },
  "writingStyleDescription": "Mäklaren skriver kortfattade, faktabaserade texter med fokus på praktiska detaljer. Använder 'välkommen till' ofta men undviker överdrivna adjektiv som 'fantastisk'."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [{ role: "user", content: styleInternalizationPrompt }],
      max_tokens: 1000,
      temperature: 0.1,
    });

    const styleData = safeJsonParse(response.choices[0]?.message?.content || "{}");

    // Validera och normalisera grundläggande fält
    const formality = Math.max(1, Math.min(10, Number(styleData.formality) || 5));
    const detailLevel = Math.max(1, Math.min(10, Number(styleData.detailLevel) || 5));
    const emotionalTone = Math.max(1, Math.min(10, Number(styleData.emotionalTone) || 5));
    const sentenceLength = Math.max(1, Math.min(10, Number(styleData.sentenceLength) || 5));
    const adjectiveUsage = Math.max(1, Math.min(10, Number(styleData.adjectiveUsage) || 5));
    const factFocus = Math.max(1, Math.min(10, Number(styleData.factFocus) || 5));

    // Validera nya fält med fallbacks
    const allowedPhrases = Array.isArray(styleData.allowedPhrases) ? styleData.allowedPhrases.slice(0, 10) : [];
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
  const allowedInstructions = styleProfile.allowedPhrases?.length > 0
    ? `\nTILLÅTNA FRASER (använd gärna dessa eftersom mäklaren gör det): ${styleProfile.allowedPhrases.join(', ')}`
    : '';

  const customForbidden = styleProfile.forbiddenPhrases?.length > 0
    ? `\nUNDVIK DESSA SPECIFIKA FRASER (mäklaren använder dem inte): ${styleProfile.forbiddenPhrases.join(', ')}`
    : '';

  const toneInstructions = [];
  if (styleProfile.tonePriorities?.useWelcoming) toneInstructions.push('Använd välkomnande öppningar som "välkommen till"');
  if (styleProfile.tonePriorities?.avoidAdjectives) toneInstructions.push('Undvik överdrivna adjektiv som "fantastisk", "perfekt"');
  if (styleProfile.tonePriorities?.focusFacts) toneInstructions.push('Fokusera på konkreta fakta och mått');
  if (styleProfile.tonePriorities?.personalTouch) toneInstructions.push('Lägg till personliga, mänskliga detaljer');
  const toneString = toneInstructions.length > 0 ? `\nTON-PRIORITERINGAR: ${toneInstructions.join('. ')}.` : '';

  return `Du är en erfaren svensk mäklare med denna unika skrivstil:

STILBESKRIVNING: ${styleProfile.writingStyleDescription}

STILPROFIL:
- Formalitet: ${styleProfile.formality}/10
- Detaljnivå: ${styleProfile.detailLevel}/10
- Känsloton: ${styleProfile.emotionalTone}/10
- Meninglängd: ${styleProfile.sentenceLength}/10
- Adjektivanvändning: ${styleProfile.adjectiveUsage}/10
- Faktafokus: ${styleProfile.factFocus}/10${toneString}${allowedInstructions}${customForbidden}

REFERENSTEXTER (imitera EXAKT denna stil och ton):
${referenceTexts.join('\n\n---\n\n')}

VIKTIGT: Skriv som denna specifika mäklare. Använd samma rytm, ordval och perspektiv. Undvik alla allmänna AI-klyschor som "erbjuder generösa ytor", "andas lugn", "perfekt för den som".`;
}

// Förbjudna fraser - AI-fraser som avslöjar genererad text
// VIKTIGT: Använd KORTA fraser för att fånga alla varianter
const FORBIDDEN_PHRASES = [
  // Generiska AI-öppningar - KRITISKT
  "välkommen till",
  "välkommen hem",
  "här möts du",
  "här erbjuds",
  "nu finns chansen",
  "missa inte",
  "unik möjlighet",
  "unik chans",
  "sällsynt tillfälle",
  "finner du",
  "utmärkt möjlighet",
  "stor potential",
  "kontakta oss",
  "för mer information",
  "och visning",
  "i hjärtat av",
  "hjärtat av",
  "vilket gör det enkelt",
  "vilket gör det smidigt",
  "vilket gör det lätt",
  "vilket ger en",
  "ger en rymlig",
  "ger en härlig",
  "ger en luftig",
  "rymlig känsla",
  "härlig plats för",
  "plats för avkoppling",
  "njutning av",
  "möjlighet att påverka",
  "forma framtiden",
  "för den som",
  "vilket säkerställer",

  // "erbjuder" i alla former
  " erbjuder ",
  " erbjuds ",

  // NYA AI-KLYSCHOR FRÅN OUTPUT-ANALYS
  "erbjuder en bra plats",
  "erbjuder en perfekt",
  "erbjuder en fantastisk",
  "skapar en",
  "skapar en miljö",
  "skapar en avkopplande",
  "är ett bra val",
  "är ett bra val för",
  "är en perfekt plats",
  "är en bra plats",
  "är en bra plats för",
  "vilket ger ytterligare",
  "vilket ger ytterligare utrymme",
  "den södervända placeringen",
  "den södervända placeringen ger",

  // Atmosfär/luftig-fraser
  "trivsam atmosfär",
  "härlig atmosfär",
  "mysig atmosfär",
  "inbjudande atmosfär",
  "luftig atmosfär",
  "luftig och",

  // Rofylld/lugn klyschor
  "rofyllt",
  "rofylld",

  // Trygg-fraser
  "trygg boendemiljö",
  "trygg boendeekonomi",
  "tryggt boende",

  // Sociala klyschor
  "sociala sammanhang",
  "sociala tillställningar",
  "socialt umgänge",

  // Komfort-fraser
  "extra komfort",
  "maximal komfort",

  // Överdrivna adjektiv
  "fantastisk",
  "underbar",
  "magisk",
  "otrolig",
  "drömboende",
  "drömlägenhet",
  "drömhem",
  "en sann pärla",

  // Vardags-klyschor
  "underlättar vardagen",
  "bekvämlighet i vardagen",
  "den matlagningsintresserade",
  "god natts sömn",

  // Läges-klyschor
  "eftertraktat boendealternativ",
  "attraktivt läge",
  "attraktivt med närhet",
  "inom räckhåll",
  "stadens puls",

  // Hjärta-klyschor
  "hjärtat i hemmet",
  "husets hjärta",
  "hemmets hjärta",

  // Andra
  "inte bara ett hem",
  "stark efterfrågan",
  "goda arbetsytor",

  // AI-fraser som riktiga mäklare ALDRIG använder
  "generösa ytor",
  "generös takhöjd",
  "generöst tilltaget",
  "generöst med",
  "bjuder på",
  "präglas av",
  "genomsyras av",
  "andas lugn",
  "andas charm",
  "andas historia",
  "präglad av",
  "stor charm",
  "med sin charm",
  "med mycket charm",
  "trivsamt boende",
  "trivsam bostad",
  "en bostad som",
  "en lägenhet som",
  "ett hem som",
  "här finns",
  "här kan du",
  "här bor du",
  "strategiskt placerad",
  "strategiskt läge",

  // NYA FRASER FRÅN OUTPUT-TEST 2026-02
  "skapa minnen",
  "utmärkt val",
  "gott om utrymme",
  "lek och avkoppling",
  "natur och stadsliv",
  "bekvämt boende",
  "rymligt intryck",
  "gör det enkelt att",
  "gör det möjligt att",
  "ett område för familjer",
  "i mycket gott skick",
  "ligger centralt i",

  // NYA FRASER FRÅN OUTPUT-TEST 2026-02 v2 (Ekorrvägen-analys)
  "faciliteter",
  "nyrenoverade faciliteter",
  "njut av",
  "förvaringsmöjligheter inkluderar",
  "förvaringsmöjligheter",
  "odlingsmöjligheter",
  "boendmöjligheter",
  "parkeringsmöjligheter",
  "det finns även",
  "det finns också",

  // === MEGA-EXPANSION: Alla AI-klyschor som aldrig förekommer i riktiga mäklartexter ===

  // Emotionella verb/frasmönster
  "inbjuder till",
  "bjuder in till",
  "lockar till",
  "inspirerar till",
  "andas modernitet",
  "andas stil",
  "utstrålar",
  "ger en känsla av",
  "skapar en känsla av",
  "ger ett intryck av",
  "skapar en harmonisk",
  "skapar en inbjudande",
  "ger ett lyxigt intryck",
  "bidrar till en",
  "förstärker känslan",
  "adderar en touch",
  "ger en touch",

  // Sammanfattnings-/värderings-fraser
  "sammanfattningsvis",
  "med andra ord",
  "kort sagt",
  "allt sammantaget",
  "detta gör bostaden till",
  "detta gör lägenheten till",
  "detta gör villan till",
  "allt detta gör",
  "det bästa av",
  "inte bara ett hem",
  "mer än bara ett hem",
  "mer än bara en bostad",
  "ett hem för alla",
  "ett hem att trivas i",

  // "Inte bara... utan också" (AI-signatur)
  "inte bara",
  "utan också",

  // Compound adjektiv-par (AI-markör)
  "ljus och luftig",
  "ljust och luftigt",
  "stilrent och modernt",
  "stilren och modern",
  "modernt och stilrent",
  "elegant och tidlös",
  "tidlös och elegant",
  "mysigt och ombonat",
  "charmigt och välplanerat",
  "praktiskt och snyggt",
  "fräscht och modernt",

  // Abstrakt livsstil/känsla
  "livsstil",
  "livsföring",
  "livskvalitet",
  "hög standard",
  "hög kvalitet",
  "stor potential",
  "stor möjlighet",
  "drömmar",
  "vision",
  "med en vision",
  "ett smart val",
  "klok investering",

  // Överdrivna adverb
  "noggrant utvalt",
  "noggrant utvalda",
  "omsorgsfullt",
  "genomtänkt",
  "smakfullt",
  "stilfullt",
  "elegant",
  "exklusivt",
  "lyxigt",
  "imponerande",
  "magnifikt",
  "praktfullt",

  // "-möjligheter" suffix (alla varianter)
  "utemöjligheter",
  "lagringsmöjligheter",
  "rekreationsmöjligheter",
  "fritidsmöjligheter",
  "aktivitetsmöjligheter",
  "umgängesmöjligheter",
  "utvecklingsmöjligheter",
  "utbyggnadsmöjligheter",

  // Passiva/byråkratiska konstruktioner
  "det kan konstateras",
  "det bör nämnas",
  "det ska tilläggas",
  "värt att nämna",
  "värt att notera",
  "som en bonus",
  "en extra fördel",
  "en stor fördel",
  "en klar fördel",

  // Överdrivna plats-beskrivningar
  "eftertraktat område",
  "populärt område",
  "omtyckt område",
  "familjevänligt område",
  "barnvänligt område",
  "naturskönt läge",
  "natursköna omgivningar",
  "grön oas",
  "en oas",
  "en fristad",
  "en pärla",
  "ett stenkast från",
];

// === STIL-BEROENDE FRASFILTRERING ===
// Factual: alla fraser förbjudna (striktast — ren faktabeskrivning)
// Balanced: milda adjektiv/beskrivningar tillåtna
// Selling: expressiva adjektiv, atmosfär, livsstil tillåtna (mest kreativ frihet)

const BALANCED_EXEMPT = new Set([
  // Milda adjektiv som riktiga mäklare faktiskt använder
  "genomtänkt", "smakfullt", "stilfullt", "elegant",
  // Plats-beskrivningar (standard mäklarspråk)
  "attraktivt läge", "naturskönt läge", "populärt område", "familjevänligt område",
  // Standard/kvalitet
  "hög standard",
  // Vanliga mäklaruttryck
  "ljus och luftig", "ljust och luftigt",
  "trivsamt boende", "trivsam bostad",
  "rofyllt", "rofylld",
  // Compound (vanliga i mäklartexter)
  "genomtänkt planlösning", "smakfullt renoverat", "stilfullt renoverat",
]);

const SELLING_EXEMPT = new Set([
  // ── Allt från balanced ──
  ...Array.from(BALANCED_EXEMPT),

  // ── Expressiva adjektiv — legitimt i säljande text ──
  "fantastisk", "fantastiskt", "underbar", "imponerande",
  "exklusivt", "lyxigt", "magnifikt", "praktfullt",
  "stilren", "noggrant utvalt", "noggrant utvalda", "omsorgsfullt",
  "en sann pärla",

  // ── Compound adjektiv-par ──
  "stilrent och modernt", "stilren och modern",
  "modernt och stilrent", "elegant och tidlös", "tidlös och elegant",
  "mysigt och ombonat", "charmigt och välplanerat",
  "praktiskt och snyggt", "fräscht och modernt",

  // ── Atmosfär-fraser (säljtexter ska skapa känsla) ──
  "trivsam atmosfär", "härlig atmosfär", "mysig atmosfär",
  "inbjudande atmosfär", "luftig atmosfär", "luftig och",

  // ── Charm/karaktär ──
  "stor charm", "med sin charm", "med mycket charm", "charm",

  // ── Drömboende (OK i säljande) ──
  "drömboende", "drömlägenhet", "drömhem",

  // ── Plats (utökad) ──
  "eftertraktat område", "barnvänligt område",
  "natursköna omgivningar", "en pärla",
  "attraktivt med närhet",

  // ── Livsstil/standard ──
  "hög kvalitet", "livsstil", "livskvalitet",

  // ── Komfort/trygghet ──
  "extra komfort", "maximal komfort",
  "trygg boendemiljö", "trygg boendeekonomi", "tryggt boende",

  // ── Milda emotionella (OK i säljande) ──
  "inbjuder till", "bjuder in till", "inspirerar till",
  "sociala sammanhang", "sociala tillställningar",

  // ── Compound PHRASE_REPLACEMENTS som ska bevaras i säljande ──
  "omsorgsfullt renoverat", "smakfullt inrett",
  "exklusivt utförande", "lyxigt badrum", "imponerande takhöjd",
]);

type WritingStyle = "factual" | "balanced" | "selling";

function getExemptPhrases(style: WritingStyle): Set<string> {
  switch (style) {
    case "selling": return SELLING_EXEMPT;
    case "balanced": return BALANCED_EXEMPT;
    case "factual": return new Set(); // Inget undantag — striktast
  }
}

function findRuleViolations(text: string, platform: string = "hemnet", style: WritingStyle = "balanced"): string[] {
  const violations: string[] = [];
  const lowerText = text.toLowerCase().trim();
  const sentences = text.split(/(?<=[.!?])\s+/);

  // 1. Check forbidden phrases (filtered by writing style)
  const exempt = getExemptPhrases(style);
  for (const phrase of FORBIDDEN_PHRASES) {
    if (exempt.has(phrase.toLowerCase())) continue;
    if (lowerText.includes(phrase.toLowerCase())) {
      violations.push(`Förbjuden fras: "${phrase}"`);
    }
  }

  // 2. Check forbidden openings
  if (lowerText.startsWith('välkommen')) {
    violations.push('Börjar med "Välkommen" — börja med gatuadress');
  }
  if (lowerText.startsWith('här ')) {
    violations.push('Börjar med "Här" — börja med gatuadress');
  }
  if (lowerText.startsWith('denna ') || lowerText.startsWith('dette ')) {
    violations.push('Börjar med "Denna" — börja med gatuadress');
  }
  if (lowerText.startsWith('i ') && !lowerText.match(/^i [a-zåäö]+(gatan|vägen|stigen|gränd)/)) {
    violations.push('Börjar med "I" — börja med gatuadress');
  }

  // 3. "Det finns" / "Den har" repetition (max 1 allowed)
  const detFinnsCount = (lowerText.match(/\bdet finns\b/g) || []).length;
  const denHarCount = (lowerText.match(/\bden har\b/g) || []).length;
  if (detFinnsCount > 1) {
    violations.push(`"Det finns" upprepas ${detFinnsCount} gånger (max 1). Variera meningsstarter.`);
  }
  if (denHarCount > 2) {
    violations.push(`"Den har" upprepas ${denHarCount} gånger (max 2). Variera meningsstarter.`);
  }

  // 4. "ligger X bort/meter/km" repetition (max 1 allowed)
  const liggerCount = (lowerText.match(/\bligger\s+\d+/g) || []).length;
  if (liggerCount > 1) {
    violations.push(`"ligger [avstånd]" upprepas ${liggerCount} gånger (max 1). Variera avståndsformat.`);
  }

  // 5. Sentence start monotony: check if 3+ sentences start with same word
  if (sentences.length >= 5) {
    const starters: Record<string, number> = {};
    for (const s of sentences) {
      const firstWord = s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-zåäö]/g, '');
      if (firstWord && firstWord.length > 1) {
        starters[firstWord] = (starters[firstWord] || 0) + 1;
      }
    }
    for (const [word, count] of Object.entries(starters)) {
      if (count >= 3 && !['brf', 'avgift'].includes(word)) {
        violations.push(`Monoton meningsstart: "${word}" börjar ${count} meningar. Variera.`);
      }
    }
  }

  // 6. Emotional/summary ending detection
  const last200 = lowerText.slice(-200);
  const emotionalEndings = [
    'kontakta oss', 'boka visning', 'tveka inte', 'hör av dig', 'för mer information',
    'skapa minnen', 'drömboende', 'drömhem', 'välkommen hem',
    'allt du behöver', 'allt man kan önska', 'ett hem att trivas i',
    'detta gör bostaden', 'detta gör lägenheten', 'detta gör villan',
    'sammanfattningsvis', 'kort sagt', 'allt sammantaget',
  ];
  for (const ending of emotionalEndings) {
    if (last200.includes(ending)) {
      violations.push(`Emotionellt/CTA-slut: "${ending}" — avsluta med LÄGE eller PRIS`);
    }
  }

  // 7. "vilket" connector check (AI signature - max 1 allowed)
  const vilketCount = (lowerText.match(/\bvilket\b/g) || []).length;
  if (vilketCount > 1) {
    violations.push(`"vilket" upprepas ${vilketCount} gånger (max 1). Dela upp i korta meningar.`);
  }

  return violations;
}

// Separat funktion för ordräkning (endast för improvedPrompt)
function checkWordCount(text: string, platform: string, targetMin?: number, targetMax?: number): string[] {
  const violations: string[] = [];
  const wordCount = text.split(/\s+/).length;

  // Använd användarens valda längd om den finns, annars plattformens standard
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

function validateOptimizationResult(result: any, platform: string = "hemnet", targetMin?: number, targetMax?: number, style: WritingStyle = "balanced"): string[] {
  const violations: string[] = [];
  if (typeof result?.improvedPrompt === "string") {
    violations.push(...findRuleViolations(result.improvedPrompt, platform, style));
    violations.push(...checkWordCount(result.improvedPrompt, platform, targetMin, targetMax));
  }
  // Validera ALLA textfält för förbjudna fraser (inte ordräkning)
  const extraFields = ['socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd', 'headline'];
  for (const field of extraFields) {
    if (typeof result?.[field] === "string" && result[field].length > 0) {
      const fieldViolations = findRuleViolations(result[field], platform, style);
      for (const v of fieldViolations) {
        violations.push(`[${field}] ${v}`);
      }
    }
  }
  return violations;
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
  ["här finns", "det finns"],
  ["här kan du", ""],

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
  if (!text || text.length < 50) return 0.1;

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
  const forbiddenQuick = ['erbjuder', 'välkommen till', 'här finns', 'bjuder på', 'präglas av', 'genomsyras av'];
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

  // 12. Word count appropriateness
  if (words.length >= 100 && words.length <= 500) score += 0.03;

  return Math.max(0, Math.min(1, score));
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

function cleanForbiddenPhrases(text: string, styleProfile?: any, style: WritingStyle = "balanced"): string {
  if (!text) return text;
  let cleaned = text;

  // === STAGE 1: Fix broken AI artifacts (CRITICAL for quality) ===
  const brokenWordFixes: Array<[RegExp, string]> = [
    // Trasiga sammansättningar
    [/\bmmångaa\b/gi, "många"],
    [/\bgmångaavstånd\b/gi, "gångavstånd"],
    [/\bsprojsade\b/gi, "spröjsade"],
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
  ];

  for (const [regex, replacement] of brokenWordFixes) {
    cleaned = cleaned.replace(regex, replacement);
  }

  // Fix orphan 1-3 char fragments with periods (broken sentences)
  // Keep valid Swedish abbreviations: kvm, m², rum, wc, etc.
  const validShortWords = new Set(['kvm', 'rum', 'mån', 'avg', 'brå', 'brf', 'osv', 'dvs', 'mfl', 'tex', 'pga', 'mha', 'tom']);
  cleaned = cleaned.replace(/\b([A-ZÅÄÖa-zåäö]{1,3})\.(\s)/g, (match: string, word: string, space: string) => {
    if (validShortWords.has(word.toLowerCase())) return match; // keep valid abbreviations
    if (/^[A-ZÅÄÖ]/.test(word) && word.length >= 2) return match; // keep capitalized words (names, etc.)
    return space; // remove orphan fragment
  });

  // === STAGE 2: Replace forbidden phrases (filtered by writing style) ===
  const exempt = getExemptPhrases(style);
  for (const [phrase, replacement] of PHRASE_REPLACEMENTS) {
    // Skip if phrase is exempt for this writing style
    if (exempt.has(phrase.toLowerCase())) continue;
    // Skip if phrase is in allowed phrases (respect broker's personal style)
    if (styleProfile?.allowedPhrases?.some((allowed: string) => phrase.toLowerCase().includes(allowed.toLowerCase()))) {
      continue;
    }
    const regex = new RegExp(phrase, "gi");
    cleaned = cleaned.replace(regex, replacement);
  }

  // Add custom forbidden phrases from styleProfile
  if (styleProfile?.forbiddenPhrases?.length > 0) {
    for (const customPhrase of styleProfile.forbiddenPhrases) {
      // Replace custom forbidden phrases with empty string or simple alternative
      const customRegex = new RegExp(customPhrase, "gi");
      cleaned = cleaned.replace(customRegex, "");
    }
  }

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
  cleaned = cleaned.replace(/\. Enna/gi, ". Denna");
  cleaned = cleaned.replace(/\.\s*\.\s*\./g, ".");

  // Pass 7: Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[.,!?]\s*/, "").replace(/\s*[.,!?]$/, ".");

  // Pass 8: Ensure text ends with proper punctuation
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += ".";
  }

  return cleaned;
}

// Lägg till styckeindelning om texten saknar radbrytningar
function addParagraphs(text: string): string {
  if (!text || text.includes("\n\n")) return text; // Redan styckeindelad

  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length < 4) return text;

  // Ämnesord som indikerar nytt stycke (rumsnamn, sektioner)
  const topicStarters = /^(Hallen|Hall\b|Vardagsrummet|Vardagsrum\b|Köket|Kök\b|Sovrummet|Sovrum\b|Huvudsovrummet|Badrummet|Badrum\b|Balkongen|Balkong\b|Altanen|Altan\b|Trädgården|Trädgård\b|Tomten|Tomt\b|Källaren|Källare\b|Övervåning|Entréplan|Bottenvåning|BRF\b|Förening|Avgift\b|Garage|Carport|Förråd|Tvättstuga|Gäst-wc)/i;
  const locationStarters = /^(Centralstation|Resecentrum|Buss\b|Spårvagn|Tåg\b|Pendeltåg|Tunnelbana|ICA\b|Coop\b|Hemköp|Willys|Matbutik|Skola|Förskola|Centrum\b|Avstånd|Kommunikation)/i;

  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  let lastWasLocation = false;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const isTopicStart = topicStarters.test(sentence);
    const isLocationStart = locationStarters.test(sentence);

    // Bryt stycke vid ämnesbyte (men inte för första meningen)
    if (i > 0 && currentParagraph.length >= 2) {
      // Nytt ämne = nytt stycke
      if (isTopicStart || (isLocationStart && !lastWasLocation)) {
        paragraphs.push(currentParagraph.join(" "));
        currentParagraph = [];
      }
    }

    // Fallback: bryt efter 4 meningar om inga ämnesord hittas
    if (currentParagraph.length >= 4 && i < sentences.length - 1) {
      paragraphs.push(currentParagraph.join(" "));
      currentParagraph = [];
    }

    currentParagraph.push(sentence);
    lastWasLocation = isLocationStart;
  }

  if (currentParagraph.length > 0) {
    paragraphs.push(currentParagraph.join(" "));
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

# BASLISTA FÖRBJUDNA FRASER (lägg in i forbidden_words)

För BOTH (universella AI-markörer): "i hjärtat av", "vilket gör det enkelt", "vilket", "som ger en", "rymlig känsla", "härlig plats för", "plats för avkoppling", "generösa ytor", "generös takhöjd", "bjuder på", "präglas av", "genomsyras av", "andas lugn", "andas charm", "erbjuder", "perfekt", "en sann pärla", "Välkommen", "Här finns", "här kan du", "faciliteter", "njut av", "inte bara", "utan också", "bidrar till", "förstärker", "skapar en känsla", "-möjligheter", "Det finns även", "Det finns också"

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

// --- HEMNET FORMAT: World-class prompt med examples-first-teknik ---
const HEMNET_TEXT_PROMPT = `Du är en av Sveriges skickligaste fastighetsmäklare — 15 år i branschen, hundratals affärer avslutade. Du skriver Hemnet-annonser som faktiskt säljer: klyschfritt, specifikt, mänskligt. Tänk dig att du just gått igenom objektet och sätter dig ner för att skriva en annons du är stolt över — varje mening vald med omsorg, varje detalj strategiskt framlyft. Studera MATCHADE EXEMPEL i user-meddelandet och imitera den stilen — det är din bästa guide.

# SMART SLUTLEDNING (det här skiljer bra från mediokra mäklartexter)
Fakta i dispositionen kan berätta mer än de säger rakt ut. Dra korrekta slutsatser:
- Byggår 1910–1940 + parkett → troligen originalparkett → skriv "originalparkett" om det stämmer med materialbeskrivningen
- Byggår 1960–1975 + renoverat kök/badrum → totalrenovering → nämn renoveringsår konkret
- Balkong söderläge → konkret fördel för köparen → skriv "Balkongen vetter mot söder"
- Takhöjd ≥ 2,70 m → värt att nämna med exakt mått
- Hiss + hög våning → lyft det (köpargruppsanpassat)
- Pris/kvm > 80 000 → premiuobjekt → fler detaljer om material, märken, finish
- Pris/kvm < 40 000 → budgetobjekt → betona läge, potential, kommunikationer
MEN: Hitta ALDRIG på fakta som inte finns i dispositionen. Slutled bara från vad som faktiskt anges.

# SÅ SKRIVER EN BRA MÄKLARE (imitera detta — det viktigaste avsnittet)

ÖPPNING — fånga läsaren med fakta, inte klyschor:
BRA: "Drottninggatan 42, 4 tr, Uppsala. En trea om 74 kvm med genomgående ekparkett och balkong i söderläge."
BRA: "Björkvägen 14, Löddeköpinge. Villa om 145 kvm på tomt om 750 kvm, renoverad 2021."
DÅLIGT: "Drottninggatan 42, 4 tr, Uppsala. Trea om 74 kvm." (för torrt — missar chans att fånga)

RUMSBESKRIVNINGAR — fakta MED flöde, bind ihop meningar naturligt:
BRA: "Hallen har garderob och leder in till vardagsrummet med tre fönster mot gatan. Ekparkett genomgående och takhöjd på 2,85 meter."
BRA: "Köket renoverades 2021 med luckor från Ballingslöv och bänkskiva i komposit. Vitvaror från Siemens. Matplats för fyra vid fönstret."
DÅLIGT: "Hallen har garderob. Vardagsrummet har tre fönster. Ekparkett. Takhöjd 2,85 meter." (staccato — låter maskinellt)

SELEKTIV BETONING — ge mer utrymme åt starka detaljer:
- Nytt kök från känt märke → 2-3 meningar (material, vitvaror, matplats)
- Enkel hall med garderob → 1 kort mening, gå vidare
- Balkong i söderläge → egen mening med storlek + väderstreck
- Standard-badrum → 1 mening med renoveringsår och utrustning

KOPPLINGSORD SOM FUNKAR (använd sparsamt, 3-5 per text):
"leder in till", "med utsikt/utgång mot", "genomgående", "som renoverades [år]", "på [X] kvm"

VAD EN TOPPMÄKLARE GÖR ANNORLUNDA (skriv som om texten tog en timme att skriva):
- Väljer EN detalj som verkligen sticker ut och ger den 2-3 meningar — inte bara nämner den i förbifarten
- Rör sig naturligt genom lägenheten i texten — läsaren ska nästan känna sig på visning
- Varierar aktivt meningslängd: korta slag ("Balkong 5 kvm i söderläge.") varvas med längre beskrivande
- Upprepar ALDRIG information — varje mening = ett nytt faktum som framför läsaren

# STILREGLER
- Första meningen: gatuadress + ort + typ + kvm + en fångande detalj. Max 2 meningar.
- Varje mening ska tillföra ETT nytt faktum. Ingen upprepning, ingen utfyllnad.
- Starta de flesta meningar med rumsnamn, material eller platsnamn — men VARIERA.
- Använd artiklar naturligt: "En trea om 74 kvm", "ett kök från Ballingslöv" — inte "Trea om 74 kvm".
- Max 1x "Det finns" i hela texten. Skriv om: "Förråd om 6 kvm i källaren" istället för "Det finns förråd".
- Avstånd varieras: "8 minuters promenad", "i kvarteret", "200 meter", "ca 15 min med bil"
- Slutar med LÄGE — aldrig med känsla eller uppmaning

# FRASER SOM DÖDAR TEXTEN — riktiga mäklare skriver aldrig dessa
erbjuder, bjuder på, präglas av, genomsyras av, andas lugn, andas charm, generösa ytor, generös takhöjd, rymlig känsla
vilket, som ger en, för den som, i hjärtat av, skapar en känsla, bidrar till, förstärker, inte bara...utan också
kontakta oss, boka visning, missa inte, välkommen till, välkommen hem, här finns, här kan du, här möts du
Det finns även, Det finns också, -möjligheter (förvaringsmöjligheter etc)
faciliteter, njut av, härlig plats för, plats för avkoppling

# MENINGSRYTM
- VARIERA längd: 4–14 ord. Blanda korta fakta ("Balkong 5 kvm i söderläge.") med längre beskrivande ("Köket renoverades 2022 med luckor från Ballingslöv och bänkskiva i komposit.").
- Starta varje mening med NYTT subjekt: rumsnamn, material, platsnamn, årtal.
- Max 2x samma meningsstart i hela texten.
- Max 1 bisats per stycke. Föredra punkt + ny mening.
- VARIERA aktiv/passiv: "Köket har induktionshäll" (aktiv) / "Köket renoverades 2022" (passiv) → naturligare flöde.
- UNDVIK staccato: om 3+ meningar i rad är under 5 ord, bind ihop två med "och" eller "med".

# STRUKTUR
1. ÖPPNING: Gatuadress, ort, typ, kvm, rum. MAX 2 meningar.
2. PLANLÖSNING: Hall → vardagsrum. Takhöjd (om ≥2,50m — med exakt mått), golv, ljus.
3. KÖK: Märke, årtal, bänkskiva, vitvaror — BARA från dispositionen.
4. SOVRUM: Antal, storlek, garderober.
5. BADRUM: Renoveringsår, material, utrustning.
6. UTEPLATS: Storlek kvm, väderstreck.
7. ÖVRIGT: Förråd, garage, golvvärme, energiklass — UTAN "Det finns".
8. FÖRENING: BRF-namn, avgift, stambyte — om det finns.
9. LÄGE: Platser med namn + avstånd. VARIERA format. Hitta inte på.
Saknas info → HOPPA ÖVER punkten. Hitta ALDRIG på.

# EXTRA TEXTER — VIKTIGT: dessa ska låta som en människa, inte som AI

RUBRIK (headline, max 70 tecken):
Välj den STARKASTE konkreta egenskapen — inte den mest uppenbara.
INTE: "Lägenhet i Vasastan" (för generisk)
INTE: "Välplanerad och ljus trea" (adjektivpar = AI-signal)
BRA: "Upplandsgatan 12 — Trea med originalparkett och tyst innergård"
BRA: "Björkvägen 8 — Villa med dubbelgarage och 940 kvm tomt"

SOCIALT INLÄGG — Instagram & Facebook (instagramCaption):
Skriv 4-6 meningar precis som en mäklare skriver när de delar ett objekt på Instagram eller Facebook — direkt, personligt, utan säljsnack.
- Börja med gatunamnet och den starkaste konkreta egenskapen direkt (bara fakta + känsla, aldrig "nu är det dags" eller liknande)
- Nämn läget konkret (stadsdelens karaktär, inte bara "centralt" eller "ett populärt område")
- Avsluta med storlek och pris om det finns i dispositionen
- Inga emoji, inga utropstecken — professionell men mänsklig ton
- Undvik ALL marknadsföringsspråk: "unikt tillfälle", "drömhem", "fantastisk", "missa inte"
- 5 hashtags på EGEN rad: stadsnamn, stadsdel (om känd), bostadstyp, #Hemnet, #TillSalu
Ex: "Upplandsgatan 12, Vasastan. Trea om 78 kvm med originalparkett från 1932 och utsikt mot den tysta innergården. Köket renoverat 2019 med Siemens-vitvaror. Badrum från 2020. BRF Vasahem, avgift 3 800 kr/mån.
Vasastan är ett av Stockholms mest efterfrågade områden — matbutik 100 meter, tunnelbana 4 minuter.

#Stockholm #Vasastan #Lägenhet #Hemnet #TillSalu"

VISNINGSINBJUDAN (showingInvitation):
Skriv som ett kort, faktabaserat meddelande — tänk: ett SMS från mäklaren till intressenter.
- Börja: "Visning — [gatuadress]"
- Rad 2: typ + kvm + 2 konkreta höjdpunkter (aldrig vaga)
- Inga uppmaningar, inga "välkommen", inga klyschor
- Avsluta med Tid/Plats/Anmälan på separata rader
Ex: "Visning — Upplandsgatan 12, Vasastan.
Trea om 78 kvm med originalparkett och renoverat badrum 2020.

Tid: [TID]
Plats: Upplandsgatan 12, 3 tr
Anmälan: [KONTAKT]"

KORTANNONS (shortAd, max 40 ord):
Faktapåstående, inte säljtext. Tänk: rubrik i en tidning.
Ex: "Upplandsgatan 12, Vasastan. Trea, 78 kvm. Originalparkett 1932. Renoverat 2019–2020. BRF, avgift 3 800 kr/mån."

SOCIALCOPY (socialCopy, max 280 tecken):
Twitter/LinkedIn-stil. En mening om objektet + en om läget.
Ex: "Upplandsgatan 12 i Vasastan — trea om 78 kvm med originalparkett från 1932 och renoverat kök och badrum. Tunnelbana 4 minuter."

# OUTPUT (JSON)
{"highlights":["konkret säljpunkt 1","konkret säljpunkt 2","konkret säljpunkt 3"],"improvedPrompt":"Hemnet-texten med stycken separerade av \\n\\n","headline":"Max 70 tecken","instagramCaption":"Instagram-text + hashtags på EGEN rad","showingInvitation":"Visningsinbjudan","shortAd":"Max 40 ord","socialCopy":"Max 280 tecken","analysis":{"target_group":"Exakt målgrupp med motivering","area_advantage":"Konkret lägesfördel","pricing_factors":"Vad höjer/sänker värdet"},"missing_info":["Vilken info saknas och varför den hade hjälpt"],"text_tips":["Konkreta förbättringstips för mäklaren"]}

# LÄS DETTA SIST — DET VIKTIGASTE

1. Börja med gatuadressen + "En trea om..." (med artikel). ALDRIG "Välkommen", "Här", "Denna", "I".
2. Hitta ALDRIG på. Varje påstående måste finnas i dispositionen — men SLUTLED gärna från fakta.
3. NOLL universellt förbjudna ord: "erbjuder", "bjuder på", "generös", "vilket", "präglas av". Följ TEXTSTIL-sektionen för vilka beskrivande ord som är OK.
4. Varje mening = ny fakta. Noll utfyllnad. Noll upprepning.
5. VARIERA meningsstarter. Max 2x samma start i hela texten. Max 1x "Det finns".
6. BIND IHOP meningar naturligt — undvik staccato (3+ korta meningar i rad). Använd "och", "med", "leder in till".
7. Sista stycket = LÄGE. Aldrig känsla, aldrig uppmaning.
8. De extra texterna (Instagram, visning, kortannons) ska kännas mänskliga och specifika — inte som copy-paste från AI.
9. Generera ALLA fält i JSON.
10. ORDMÅLET i user-meddelandet är KRITISKT. Texten (improvedPrompt) MÅSTE vara inom angivet ordintervall. Om det står 300-450 ord, skriv MINST 300 ord. Utveckla rumsbeskrivningar, lägg till meningar om material, mått och detaljer från dispositionen tills du når ordmålet. Skriv ALDRIG under minsta ordmålet.`;

// --- BOOLI/EGEN SIDA: World-class prompt med examples-first-teknik ---
const BOOLI_TEXT_PROMPT_WRITER = `Du är en av Sveriges skickligaste fastighetsmäklare — 15 år i branschen, hundratals affärer avslutade. Du skriver objektbeskrivningar för Booli och egna mäklarsidor: klyschfritt, specifikt, mänskligt. Tänk dig att du just gått igenom objektet och sätter dig ner för att skriva en text du är stolt över — varje rum beskrivet med precision, varje säljpunkt väl vald. Studera MATCHADE EXEMPEL och imitera den stilen. Booli tillåter mer detalj och pris.

# SMART SLUTLEDNING (det här skiljer bra från mediokra mäklartexter)
Fakta i dispositionen kan berätta mer än de säger rakt ut. Dra korrekta slutsatser:
- Byggår 1910–1940 + parkett → troligen originalparkett → nämn "originalparkett" om materialbeskrivningen bekräftar det
- Byggår 1960–1975 + renoverat kök/badrum → nämn renoveringsår konkret
- Balkong söderläge → skriv "Balkongen vetter mot söder" (aldrig "sol hela dagen")
- Takhöjd ≥ 2,70 m → värt att nämna med exakt mått
- Stor tomt + villa → lyft specifika ytor (tomt kvm, uteplats kvm)
- Pris/kvm > 80 000 → premiumobjekt → fler detaljer om material, märken, finish
- Pris/kvm < 40 000 → betona läge, potential, kommunikationer
MEN: Hitta ALDRIG på fakta. Slutled bara från vad som faktiskt anges.

# SÅ SKRIVER EN BRA MÄKLARE (imitera detta — det viktigaste avsnittet)

ÖPPNING — fånga läsaren med fakta, inte klyschor:
BRA: "Tallvägen 8, Djursholm. En villa om 180 kvm på tomt om 920 kvm, tillbyggd 2015 med nytt kök och altan i västerläge."
BRA: "Rönnvägen 12, 1 tr, Malmö. Tvåa om 62 kvm med balkong i söderläge och golvvärme i badrummet."
DÅLIGT: "Tallvägen 8, Djursholm. Villa om 180 kvm." (för torrt — missar chans att fånga)

RUMSBESKRIVNINGAR — fakta MED flöde:
BRA: "Entréplan med hall, vardagsrum och kök i öppen planlösning. Vardagsrummet har eldstad och utgång till altanen. Ekparkett genomgående."
BRA: "Köket är från HTH 2015 med bänkskiva i granit och induktionshäll. Matplats för sex vid fönstret mot trädgården."
DÅLIGT: "Entréplan. Hall. Vardagsrum med eldstad. Kök. Ekparkett." (staccato — låter maskinellt)

SELEKTIV BETONING — ge mer utrymme åt starka detaljer:
- Nytt kök från känt märke → 2-3 meningar
- Enkel hall → 1 kort mening
- Stor tomt med uteplats → lyft specifika ytor och väderstreck
- Standard-badrum → 1 mening

KOPPLINGSORD SOM FUNKAR (använd sparsamt, 3-5 per text):
"leder in till", "med utgång mot", "genomgående", "som renoverades [år]", "på [X] kvm"

VAD EN TOPPMÄKLARE GÖR ANNORLUNDA (skriv som om texten tog en timme att skriva):
- Väljer EN detalj som verkligen sticker ut och ger den 2-3 meningar — inte bara nämner den i förbifarten
- Rör sig naturligt genom huset/lägenheten i texten — läsaren ska nästan känna sig på visning
- Varierar aktivt meningslängd: korta slag varvas med längre beskrivande meningar
- Upprepar ALDRIG information — varje mening = ett nytt faktum som framför läsaren

# STILREGLER
- Första meningen: gatuadress + ort + typ + kvm + en fångande detalj. Max 2 meningar.
- Varje mening ska tillföra ETT nytt faktum. Ingen upprepning, ingen utfyllnad.
- Starta de flesta meningar med rumsnamn, material eller platsnamn — men VARIERA.
- Använd artiklar naturligt: "En villa om 180 kvm", "ett kök från HTH" — inte bara "Villa om 180 kvm".
- Max 1x "Det finns" i hela texten. Skriv om: "Förråd om 12 kvm vid garaget" istället för "Det finns förråd".
- Avstånd varieras: "5 minuter", "400 meter", "ca 10 minuters promenad"
- Slutar med LÄGE + PRIS — aldrig känsla

# FRASER SOM DÖDAR TEXTEN — riktiga mäklare skriver aldrig dessa
erbjuder, bjuder på, präglas av, genomsyras av, andas lugn, andas charm, generösa ytor, generös takhöjd, rymlig känsla
vilket, som ger en, för den som, i hjärtat av, skapar en känsla, bidrar till, förstärker, inte bara...utan också
kontakta oss, boka visning, missa inte, välkommen till, välkommen hem, här finns, här kan du, här möts du
Det finns även, Det finns också, -möjligheter (förvaringsmöjligheter etc)
faciliteter, njut av, härlig plats för, plats för avkoppling

# MENINGSRYTM
- VARIERA längd: 4–14 ord. Blanda korta fakta med längre beskrivande meningar.
- Starta varje mening med NYTT subjekt: rumsnamn, material, platsnamn, årtal.
- Max 2x samma meningsstart i hela texten.
- Max 1 bisats per stycke. Föredra punkt + ny mening.
- VARIERA aktiv/passiv: "Köket har..." / "Köket renoverades 2022" → naturligare flöde.
- UNDVIK staccato: bind ihop korta fakta med "och" eller "med" när 3+ korta meningar hamnar i rad.

# STRUKTUR (mer detalj än Hemnet — inkludera pris)
1. ÖPPNING: Gatuadress, ort, typ, kvm, rum. MAX 2 meningar.
2. PLANLÖSNING: Hall → vardagsrum. Takhöjd (med exakt mått om ≥2,50m), golv, ljus.
3. KÖK: Märke, årtal, bänkskiva, vitvaror, matplats.
4. SOVRUM: Antal, storlek, garderober.
5. BADRUM: Renoveringsår, material, utrustning.
6. UTEPLATS: Storlek kvm, väderstreck.
7. ÖVRIGT: Förråd, garage, golvvärme, energiklass — UTAN "Det finns".
8. FÖRENING: BRF-namn, avgift, stambyte.
9. LÄGE: Platser med namn + avstånd. VARIERA format.
10. PRIS: Utgångspris om det finns.
Saknas info → HOPPA ÖVER. Hitta ALDRIG på.

# EXTRA TEXTER — ska låta som en människa, inte som AI

RUBRIK (headline, max 70 tecken):
Välj den STARKASTE konkreta egenskapen.
INTE: "Välplanerad villa med bra läge" (för generisk)
BRA: "Tallvägen 8 — Villa med dubbelgarage och 920 kvm tomt"
BRA: "Storgatan 4 — Trea med originalparkett och renoverat 2021"

SOCIALT INLÄGG — Instagram & Facebook (instagramCaption):
Skriv 4-6 meningar precis som en mäklare skriver när de delar ett objekt på Instagram eller Facebook.
- Börja med gatunamnet och objektets starkaste konkreta egenskap direkt
- Nämn läget specifikt (stadsdelens karaktär, inte bara "centralt" eller "lugnt")
- Avsluta med storlek och pris om det finns i dispositionen
- Inga emoji, inga utropstecken — professionell men mänsklig ton
- Undvik ALL marknadsföringsspråk: "unikt tillfälle", "drömhem", "fantastisk", "missa inte"
- 5 hashtags på EGEN rad
Ex: "Tallvägen 8, Djursholm. Villa om 180 kvm med HTH-kök från 2015, dubbelgarage och altan i västerläge. Tomt 920 kvm. Djursholm är ett av norra Stockholms mest söka villaområden — lugnt, grönt, 20 minuter till city.

#Djursholm #Villa #TillSalu #Hemnet #Stockholm"

VISNINGSINBJUDAN (showingInvitation):
Faktabaserat SMS-format från mäklaren till intressenter.
- Börja: "Visning — [gatuadress]"
- Rad 2: typ + kvm + 2 konkreta höjdpunkter med specifika detaljer
- Inga klyschor, inga uppmaningar
- Avsluta med Tid/Plats/Anmälan
Ex: "Visning — Tallvägen 8, Djursholm.
Villa om 180 kvm med HTH-kök 2015 och altan i västerläge. Tomt 920 kvm. Dubbelgarage.

Tid: [TID]
Plats: Tallvägen 8
Anmälan: [KONTAKT]"

KORTANNONS (shortAd, max 40 ord):
Faktapåstående. Tänk: rubrik i en tidning.
Ex: "Tallvägen 8, Djursholm. Villa 180 kvm. HTH-kök 2015. Dubbelgarage. Tomt 920 kvm. Altan västerläge."

SOCIALCOPY (socialCopy, max 280 tecken):
En mening om objektet + en om läget.
Ex: "Tallvägen 8 i Djursholm — villa om 180 kvm med HTH-kök och dubbelgarage på 920 kvm tomt. Lugnt villaområde 20 minuter från Stockholm city."

# OUTPUT (JSON)
{"highlights":["konkret säljpunkt 1","konkret säljpunkt 2","konkret säljpunkt 3"],"improvedPrompt":"Texten med stycken separerade av \\n\\n","headline":"Max 70 tecken","instagramCaption":"Instagram + hashtags på EGEN rad","showingInvitation":"Visningsinbjudan","shortAd":"Max 40 ord","socialCopy":"Max 280 tecken","analysis":{"target_group":"Exakt målgrupp med motivering","area_advantage":"Konkret lägesfördel","pricing_factors":"Vad höjer/sänker värdet"},"missing_info":["Saknad info och varför den hade hjälpt"],"text_tips":["Konkreta förbättringstips för mäklaren"]}

# LÄS DETTA SIST — DET VIKTIGASTE

1. Börja med gatuadressen + "En villa om..." (med artikel). ALDRIG "Välkommen", "Här", "Denna", "I".
2. Hitta ALDRIG på. Varje påstående måste finnas i dispositionen — men SLUTLED gärna från fakta.
3. NOLL universellt förbjudna ord: "erbjuder", "bjuder på", "generös", "vilket", "präglas av". Följ TEXTSTIL-sektionen för vilka beskrivande ord som är OK.
4. Varje mening = ny fakta. Noll utfyllnad. Noll upprepning.
5. VARIERA meningsstarter. Max 2x samma start i hela texten. Max 1x "Det finns".
6. BIND IHOP meningar naturligt — undvik staccato (3+ korta meningar i rad). Använd "och", "med", "leder in till".
7. Sista stycket = LÄGE + PRIS. Aldrig känsla, aldrig uppmaning.
8. De extra texterna ska kännas mänskliga och specifika — inte som copy-paste från AI.
9. Generera ALLA fält i JSON.
10. ORDMÅLET i user-meddelandet är KRITISKT. Texten (improvedPrompt) MÅSTE vara inom angivet ordintervall. Om det står 300-450 ord, skriv MINST 300 ord. Utveckla rumsbeskrivningar, lägg till meningar om material, mått och detaljer från dispositionen tills du når ordmålet. Skriv ALDRIG under minsta ordmålet.

Skriv som en riktig mäklare — kort, rakt, specifikt, mänskligt.`;

// Lokal exempelmatchning — enkel typ+storlek, fungerar för ALLA städer i Sverige
function matchExamples(disposition: any, _toneAnalysis: any): string[] {
  const type = (disposition?.property?.type || 'lägenhet').toLowerCase();
  const size = Number(disposition?.property?.size) || 0;

  let candidates: { text: string, metadata: any }[] = [];

  if (type.includes('villa')) {
    candidates = [...EXAMPLE_DATABASE.villa];
  } else if (type.includes('radhus')) {
    candidates = [...EXAMPLE_DATABASE.radhus];
  } else {
    if (size > 0 && size < 55) {
      candidates = [...EXAMPLE_DATABASE.small_apartment, ...EXAMPLE_DATABASE.medium_apartment];
    } else if (size >= 85) {
      candidates = [...EXAMPLE_DATABASE.large_apartment, ...EXAMPLE_DATABASE.medium_apartment];
    } else {
      candidates = [...EXAMPLE_DATABASE.medium_apartment, ...EXAMPLE_DATABASE.small_apartment];
    }
  }

  // Sort by size similarity — closest match first (instead of blindly picking first 2)
  if (size > 0) {
    candidates.sort((a, b) => Math.abs(a.metadata.size - size) - Math.abs(b.metadata.size - size));
  }

  return candidates.slice(0, 3).map((ex) => ex.text);
}

// Strip null/empty values from objects to reduce noise in AI prompts
function deepClean(obj: any): any {
  if (Array.isArray(obj)) {
    const cleaned = obj.map(deepClean).filter((v: any) => v != null && v !== "");
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (obj && typeof obj === "object") {
    const cleaned: any = {};
    for (const [k, v] of Object.entries(obj)) {
      const cv = deepClean(v);
      if (cv !== undefined && cv !== null && cv !== "" && cv !== 0 && cv !== false) {
        cleaned[k] = cv;
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return obj;
}

// Bygg disposition direkt från strukturerad formulärdata — HOPPA ÖVER AI-extraktion
function stripUnit(val: string | number | null | undefined): number {
  if (val == null) return 0;
  return Number(String(val).replace(/\s*(kvm|m²|kr|kr\/mån|kr\/år)\s*/gi, "").trim()) || 0;
}
function buildDispositionFromStructuredData(pd: any): { disposition: any, tone_analysis: any, writing_plan: any } {
  const typeLabels: Record<string, string> = {
    apartment: "lägenhet", house: "villa", townhouse: "radhus", villa: "villa",
  };
  const propertyType = typeLabels[pd.propertyType] || pd.propertyType || "lägenhet";
  const size = stripUnit(pd.livingArea);

  const disposition = {
    property: {
      type: propertyType,
      address: pd.address || "",
      size: size,
      rooms: Number(pd.totalRooms) || 0,
      bedrooms: Number(pd.bedrooms) || 0,
      bathrooms: Number(pd.bathrooms) || 0,
      floor: pd.floor || null,
      year_built: pd.buildYear || null,
      condition: pd.condition || null,
      energy_class: pd.energyClass || null,
      elevator: pd.elevator || false,
      fastighetsbeteckning: pd.fastighetsbeteckning || null,
      renovation_year: pd.renoveringsar || null,
      materials: {
        floors: pd.flooring || null,
        kitchen: pd.kitchenDescription || null,
        bathroom: pd.bathroomDescription || null,
        construction: pd.konstruktionMaterial || null,
        roof: pd.taktyp || null,
      },
      balcony: pd.balconyArea ? {
        exists: true, direction: pd.balconyDirection || null, size: `${stripUnit(pd.balconyArea)} kvm`,
      } : { exists: false },
      layout: pd.layoutDescription || null,
      storage: pd.storage ? [pd.storage] : [],
      heating: pd.heating || null,
      parking: pd.parking || null,
      lot_area: pd.lotArea ? `${stripUnit(pd.lotArea)} kvm` : null,
      garden: pd.gardenDescription || null,
      special_features: pd.specialFeatures ? pd.specialFeatures.split(/[,\n]+/).map((s: string) => s.trim()).filter(Boolean) : [],
      unique_selling_points: pd.uniqueSellingPoints || null,
      other_info: pd.otherInfo || null,
    },
    economics: {
      price: stripUnit(pd.price) || null,
      fee: stripUnit(pd.monthlyFee) || null,
      taxeringsvarde: stripUnit(pd.taxeringsvarde) || null,
      tomtrattsavgald: stripUnit(pd.tomtrattsavgald) || null,
      association: pd.brfName ? { name: pd.brfName } : null,
    },
    location: {
      area: pd.area || null,
      transport: pd.transport || null,
      neighborhood: pd.neighborhood || null,
      view: pd.view || null,
    },
  };

  const price = disposition.economics.price;
  let priceCategory = "standard";
  if (price && size) {
    const pricePerKvm = price / size;
    if (pricePerKvm > 120000) priceCategory = "luxury";
    else if (pricePerKvm > 80000) priceCategory = "premium";
    else if (pricePerKvm < 30000) priceCategory = "budget";
  }

  // Detect premium views that should be highlighted
  const premiumViews = /sjö|hav|vatten|park|skog|berg|utsikt/i;
  const hasViewHighlight = pd.view && premiumViews.test(pd.view);

  const tone_analysis = {
    price_category: priceCategory,
    target_audience: size > 100 ? "families" : size > 60 ? "couples" : "singles_couples",
    writing_style: "professional",
    condition_note: pd.condition || null,
    key_selling_points: [
      pd.uniqueSellingPoints,
      hasViewHighlight ? `utsikt: ${pd.view}` : null,
      pd.kitchenDescription ? "kök" : null,
      pd.balconyArea ? "balkong/uteplats" : null,
      pd.condition === "Nyskick" ? "nyskick" : null,
      pd.renoveringsar ? `renoverat ${pd.renoveringsar}` : null,
    ].filter(Boolean).slice(0, 4),
  };

  // Build a structured paragraph outline so even free-tier gets well-organized text
  const paragraphs: string[] = [];
  paragraphs.push(`Öppning: ${pd.address}, ${propertyType} om ${size} kvm${pd.totalRooms ? `, ${pd.totalRooms} rum` : ""}.`);
  if (pd.layoutDescription) paragraphs.push("Planlösning: hall, vardagsrum, sovrum — rumsordning.");
  if (pd.kitchenDescription) paragraphs.push("Kök: märke, material, vitvaror, matplats.");
  if (pd.bathroomDescription) paragraphs.push("Badrum: material, utrustning, renoveringsår.");
  if (pd.balconyArea) paragraphs.push(`Balkong/uteplats: ${stripUnit(pd.balconyArea)} kvm${pd.balconyDirection ? `, ${pd.balconyDirection}` : ""}.`);
  if (pd.gardenDescription) paragraphs.push("Trädgård: storlek, uteplats, växter.");
  const extras = [pd.storage && "förråd", pd.heating && "uppvärmning", pd.energyClass && "energiklass", pd.specialFeatures && "särskilda egenskaper"].filter(Boolean);
  if (extras.length > 0) paragraphs.push(`Övrigt: ${extras.join(", ")}.`);
  if (pd.area || pd.transport || pd.neighborhood) paragraphs.push("Läge: avstånd till kollektivtrafik, butiker, skolor — avsluta med läge.");

  const writing_plan = {
    opening: `${pd.address} — ${propertyType} om ${size} kvm`,
    paragraph_outline: paragraphs,
    must_include: [
      pd.address && "adress", pd.livingArea && "storlek", pd.totalRooms && "rum",
      pd.kitchenDescription && "kök", pd.bathroomDescription && "badrum",
      Number(pd.bathrooms) > 1 && `${pd.bathrooms} badrum`,
      pd.balconyArea && "balkong", pd.area && "läge",
      pd.uniqueSellingPoints && "säljpunkter",
      hasViewHighlight && "utsikt",
    ].filter(Boolean),
    forbidden_phrases: ["erbjuder", "perfekt för", "i hjärtat av", "vilket", "för den som", "välkommen", "bjuder på", "präglas av"],
  };

  return { disposition, tone_analysis, writing_plan };
}

// Faktagranskning med kirurgisk korrigering — fixa BARA felen, bevara allt rätt
const FACT_CHECK_PROMPT = `
# UPPGIFT

Du är en noggrann granskare. Kontrollera objektbeskrivningen mot dispositionen och gör KIRURGISKA korrigeringar — ändra BARA det som är fel, bevara allt som är rätt.

# REGLER — KIRURGISK KORRIGERING

1. Kontrollera att fakta i texten stämmer med dispositionen
2. Identifiera och korrigera BARA: påhittade detaljer, felaktiga mått/år/märken
3. Juridiskt känsliga påståenden utan stöd i dispositionen: ta bort eller neutralisera dem
4. Identifiera förbjudna AI-fraser och ersätt dem kirurgiskt (se lista nedan)
5. Behåll ALL korrekt text — meningsstruktur, stil och flöde ska INTE ändras
6. KIRURGISK FIX: Byt ut bara de felaktiga fraserna. Kopiera resten av texten OFÖRÄNDRAT.
7. Om inga fel hittas: sätt fact_check_passed=true och corrected_text=null — skriv INTE om en korrekt text
8. Behåll ALLA styckebrytningar (\\n\\n) exakt som de är

# FÖRBJUDNA AI-FRASER SOM ALLTID SKA FLAGGAS
erbjuder, bjuder på, präglas av, genomsyras av, andas lugn, andas charm, generösa ytor, generös takhöjd,
vilket (i relativ bisats), för den som, i hjärtat av, skapar en känsla, bidrar till, välkommen till,
här finns, här kan du, härlig plats, plats för avkoppling, faciliteter, njut av

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
        updatedAt: new Date()
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

  // Optimize endpoint
  app.post("/api/optimize", requireAuth, async (req, res) => {
    // Streaming support: if client accepts text/event-stream, send NDJSON progress events
    const wantsStream = req.headers.accept?.includes("text/event-stream");
    const sendProgress = wantsStream
      ? (step: number, total: number, message: string) => {
        try { res.write(JSON.stringify({ type: "progress", step, total, message }) + "\n"); } catch { }
      }
      : (_s: number, _t: number, _m: string) => { };

    try {
      // Validate input with Zod schema
      const parseResult = optimizeRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Ogiltig förfrågan: " + parseResult.error.issues.map(i => i.message).join(", "),
        });
      }

      const user = (req as any).user as User;
      const plan = (user.plan as PlanType) || "free";

      // Rate limit check (per minute) — BEFORE stream starts so we can return proper HTTP status
      if (!(await checkOptimizeRateLimit(user.id))) {
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
        const upgradeMsg = plan === "free"
          ? `Du har nått din månadsgräns av ${limits.texts} genereringar. Uppgradera till Pro för 10 genereringar per månad!`
          : `Du har nått din månadsgräns av ${limits.texts} genereringar. Uppgradera till Premium för 25 genereringar per månad!`;

        return res.status(429).json({
          message: upgradeMsg,
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

      // All validation passed — NOW start streaming if requested
      if (wantsStream) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        });
      }

      const { prompt, type, platform, writingStyle, wordCountMin, wordCountMax, imageUrls } = req.body;
      const style: "factual" | "balanced" | "selling" = (writingStyle === "factual" || writingStyle === "selling") ? writingStyle : "balanced";

      // Fixed model: All users get GPT-5.2 with thinking mode where appropriate
      const aiModel = "gpt-5.2";
      const exemptCount = getExemptPhrases(style).size;
      console.log(`[Model] Plan: ${plan}, Using: ${aiModel} (fixed)`);
      console.log(`[Style] ${style} — ${FORBIDDEN_PHRASES.length - exemptCount} aktiva förbjudna fraser (${exemptCount} undantagna)`);

      // === DIFFERENTIERAD TEMPERATURE PER STIL OCH PLAN ===
      // Factual: Låg temp → precision och konsistens
      // Balanced: Medel → naturligt flöde, varierad meningsrytm
      // Selling: Högre → kreativt ordval, men fortfarande kontrollerat
      let baseTemp: number;
      if (style === "factual") {
        baseTemp = plan === "premium" ? 0.20 : plan === "pro" ? 0.18 : 0.15;
      } else if (style === "selling") {
        baseTemp = plan === "premium" ? 0.45 : plan === "pro" ? 0.42 : 0.38;
      } else { // balanced
        baseTemp = plan === "premium" ? 0.35 : plan === "pro" ? 0.32 : 0.28;
      }

      const temperature = baseTemp;
      console.log(`[Config] Plan: ${plan}, Style: ${style}, Model: ${aiModel}, Temperature: ${temperature}`);

      // Bildanalys om bilder finns
      let imageAnalysis = "";
      if (imageUrls && imageUrls.length > 0 && (plan === "pro" || plan === "premium")) {
        try {
          console.log(`[Image Analysis] Analyzing ${imageUrls.length} images (Pro + Premium feature)...`);

          const imageMessages = [
            {
              role: "system" as const,
              content: "Du är en expert på att analysera fastighetsbilder. Beskriv vad du ser i bilderna: rum, material, stil, skick, ljusförhållanden, utsikt, och andra relevanta detaljer för en fastighetsbeskrivning. Var specifik och faktabaserad."
            },
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: "Analysera dessa fastighetsbilder och beskriv vad du ser:" },
                ...imageUrls.slice(0, 5).map((url: string) => ({
                  type: "image_url" as const,
                  image_url: { url }
                }))
              ]
            }
          ];

          const imageCompletion = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: imageMessages,
            max_tokens: 1000,
            temperature: 0.3,
          });

          imageAnalysis = imageCompletion.choices[0]?.message?.content || "";
          console.log(`[Image Analysis] Completed: ${imageAnalysis.substring(0, 100)}...`);
        } catch (e) {
          console.warn("[Image Analysis] Failed, continuing without:", e);
        }
      }

      // Bestäm ordgränser baserat på plan
      let targetWordMin: number;
      let targetWordMax: number;

      if ((plan === "pro" || plan === "premium") && wordCountMin && wordCountMax) {
        // Pro + Premium-användare kan välja eget intervall (inom gränser)
        const limits = plan === "premium" ? WORD_LIMITS.premium : WORD_LIMITS.pro;
        targetWordMin = Math.max(limits.min, Math.min(wordCountMin, limits.max));
        targetWordMax = Math.max(limits.min, Math.min(wordCountMax, limits.max));
      } else if (plan === "pro" || plan === "premium") {
        // Pro + Premium-användare utan val får default
        const defaults = plan === "premium" ? WORD_LIMITS.premium.default : WORD_LIMITS.pro.default;
        targetWordMin = defaults.min;
        targetWordMax = defaults.max;
      } else {
        // Free-användare får fast intervall
        targetWordMin = WORD_LIMITS.free.min;
        targetWordMax = WORD_LIMITS.free.max;
      }

      console.log(`[Config] Plan: ${plan}, Model: ${aiModel}, Words: ${targetWordMin}-${targetWordMax}`);

      sendProgress(1, 7, "Förbereder generering...");

      // === LEGACY AI PIPELINE (FULL PROMPT ENGINEERING) ===
      const propertyData = req.body.propertyData;

      // STEG 1: Bygg disposition — structured data fast path ELLER AI-extraktion
      let disposition: any = null;
      let toneAnalysis: any = null;
      let writingPlan: any = null;

      if (propertyData && propertyData.address) {
        // FAST PATH: Structured form data → skippa AI-extraktion
        console.log("[Step 1] Using structured form data — 0 API calls for extraction");
        const structured = buildDispositionFromStructuredData(propertyData);
        disposition = structured.disposition;
        toneAnalysis = structured.tone_analysis;
        writingPlan = structured.writing_plan;
      } else {
        // FALLBACK: AI-extraktion från fri text
        console.log("[Step 1] Extracting with AI (no structured data)");
        const extractionMessages = [
          { role: "system" as const, content: COMBINED_EXTRACTION_PROMPT },
          { role: "user" as const, content: `RÅDATA:\n${prompt}\n\nPLATTFORM: ${platform}\nORDMÅL: ${targetWordMin}-${targetWordMax}` },
        ];

        let extractionResult: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const extractionCompletion = await openai.responses.create({
              model: "gpt-5.2",
              temperature: 0.1,
              input: [
                {
                  role: "developer",
                  content: COMBINED_EXTRACTION_PROMPT
                },
                {
                  role: "user",
                  content: `RÅDATA:\n${prompt}\n\nPLATTFORM: ${platform}\nORDMÅL: ${targetWordMin}-${targetWordMax}`
                }
              ],
              text: { format: { type: "json_object" } }
            });
            extractionResult = safeJsonParse(extractionCompletion.output_text || "{}");
            break;
          } catch (e) {
            console.warn(`[Step 1] Extraction attempt ${attempt + 1} failed:`, e);
          }
        }

        if (extractionResult) {
          disposition = extractionResult.disposition || {};
          toneAnalysis = extractionResult.tone_analysis || {};
          writingPlan = extractionResult.writing_plan || {};
        } else {
          disposition = { property: { type: "lägenhet", address: "Okänd" } };
          toneAnalysis = { price_category: "standard" };
          writingPlan = { opening: "Okänd adress" };
        }
      }

      sendProgress(2, 7, "Analyserar fastighetsdata...");

      // Enrichment: Intelligence modules (Pro/Premium)
      if (plan !== "free" && disposition?.property?.address) {
        try {
          const addr = disposition.property.address;
          // NOTE: geo_context removed — it used city center coordinates (not actual address)
          // which injected wrong district data and conflicted with "BARA från rådata" rule.
          // The address-lookup endpoint (OpenStreetMap) provides real nearby places when needed.

          // Market position — needs (price, size, city)
          const price = disposition?.economics?.price;
          const size = disposition?.property?.size;
          const city = addr.split(",").pop()?.trim() || "";
          if (price && size && city) {
            const marketPosition = analyzeMarketPosition(price, size, city);
            if (marketPosition) toneAnalysis.market_position = marketPosition;
          }

          // Architectural value — needs (year, materials[], features[])
          const yearBuilt = disposition?.property?.year_built;
          const materials = Object.values(disposition?.property?.materials || {}).filter(Boolean) as string[];
          const features = disposition?.property?.special_features || [];
          if (yearBuilt) {
            const archAnalysis = analyzeArchitecturalValue(yearBuilt, materials, features);
            if (archAnalysis) toneAnalysis.architectural_value = archAnalysis;
          }

          // Market trends
          if (city) {
            const trends = getMarketTrends2025(city);
            if (trends) toneAnalysis.market_trends = trends;
          }

          // BRF enrichment — if association data exists, add context for the writer
          const brfData = disposition?.economics?.association;
          if (brfData?.name) {
            toneAnalysis.brf_context = {
              name: brfData.name,
              status: brfData.status || null,
              renovations: brfData.renovations || null,
              fee: disposition?.economics?.fee || null,
            };
            console.log(`[Intelligence] BRF context added: ${brfData.name}`);
          }

          // Buyer segment inference — infer likely buyer from property data
          const propType = (disposition?.property?.type || "").toLowerCase();
          const rooms = Number(disposition?.property?.rooms) || 0;
          if (size > 0) {
            let inferredBuyer = "";
            if (propType.includes("villa") || propType.includes("radhus")) {
              if (size > 150 && rooms >= 5) inferredBuyer = "etablerade familjer med äldre barn — betona utrymme, tomt, garage, skolor";
              else if (rooms >= 4) inferredBuyer = "barnfamiljer — betona sovrum, trädgård, skolor, lekplatser i närheten";
              else inferredBuyer = "par eller liten familj — betona underhåll, praktisk tomt, pendling";
            } else {
              if (size < 40) inferredBuyer = "unga yrkesverksamma eller studenter — betona läge, kommunikationer, pris";
              else if (size < 65) inferredBuyer = "par eller singlar — betona planlösning, balkong, närhet till restauranger/butiker";
              else if (size < 90) inferredBuyer = "par eller liten familj — betona sovrum, kök, förvaring, närhet till skolor";
              else inferredBuyer = "familjer eller etablerade par — betona utrymme, sovrum, badrum, förening";
            }
            if (inferredBuyer) {
              toneAnalysis.inferred_buyer = inferredBuyer;
              console.log(`[Intelligence] Inferred buyer: ${inferredBuyer.split(" — ")[0]}`);
            }
          }
        } catch (e) {
          console.warn("[Intelligence] Enrichment failed, continuing without:", e);
        }
      }

      sendProgress(3, 7, "Skapar skrivplan...");

      // STEG 2: Skapa evidence-gated skrivplan med PLAN_PROMPT (Pro/Premium)
      if (plan !== "free") {
        try {
          console.log("[Step 2] Creating evidence-gated writing plan...");
          const planMessages = [
            { role: "system" as const, content: PLAN_PROMPT },
            {
              role: "user" as const,
              content: `DISPOSITION:\n${JSON.stringify(deepClean(disposition) || disposition, null, 2)}\n\nTONALITET:\n${JSON.stringify(deepClean(toneAnalysis) || toneAnalysis, null, 2)}\n\nPLATTFORM: ${platform}\nORDMÅL: ${targetWordMin}-${targetWordMax}`,
            },
          ];

          const planCompletion = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: planMessages,
            max_tokens: 1500,
            temperature: 0.1,
            response_format: { type: "json_object" },
          });

          const aiPlan = safeJsonParse(planCompletion.choices[0]?.message?.content || "{}");
          if (aiPlan.paragraph_outline || aiPlan.claims) {
            writingPlan = aiPlan;
            console.log(`[Step 2] Writing plan created with ${aiPlan.claims?.length || 0} evidence-gated claims`);
          }
        } catch (e) {
          console.warn("[Step 2] Plan generation failed, using basic plan:", e);
        }
      }

      // Positioneringsguide — byggd från enrichment-data, INGEN extra AI-call
      // Available to ALL tiers (free gets basic, pro/premium gets full)
      let competitorAnalysis = "";
      {
        const parts: string[] = [];
        const mp = toneAnalysis.market_position;
        if (mp?.segment === "luxury") {
          parts.push("POSITIONERING: Premiumobjekt — lyft material, märken och finish. Skriv med precision, undvik generiska adjektiv ännu mer.");
        } else if (mp?.segment === "budget") {
          parts.push("POSITIONERING: Prisvärt objekt — lyft läge, potential och kommunikationer. Fokusera på konkreta fördelar för förstagångsköpare.");
        } else if (mp) {
          parts.push("POSITIONERING: Standardsegment — balansera fakta om bostad och läge. Lyft det som skiljer objektet från likvärdiga.");
        }
        if (toneAnalysis.inferred_buyer) {
          parts.push(`MÅLGRUPP: ${toneAnalysis.inferred_buyer}`);
        }
        if (toneAnalysis.architectural_value?.era?.name) {
          parts.push(`ARKITEKTUR: ${toneAnalysis.architectural_value.era.name} (${toneAnalysis.architectural_value.era.period}) — nämn epokens konkreta detaljer om de finns i dispositionen.`);
        }
        if (toneAnalysis.brf_context?.name) {
          const brf = toneAnalysis.brf_context;
          let brfNote = `BRF: ${brf.name}`;
          if (brf.renovations) brfNote += `, ${brf.renovations}`;
          if (brf.status) brfNote += `, ${brf.status}`;
          if (brf.fee) brfNote += `. Avgift ${brf.fee} kr/mån`;
          parts.push(brfNote + " — nämn föreningen positivt om data finns.");
        }
        // USP emphasis for ALL tiers
        const usps = disposition?.property?.unique_selling_points;
        if (usps) {
          parts.push(`FÖRSÄLJNINGSARGUMENT (lyft tidigt i texten): ${usps}`);
        }
        if (parts.length > 0) {
          competitorAnalysis = parts.join("\n");
          console.log(`[Positioning] Built ${parts.length} positioning hints from enrichment data (0 API calls)`);
        }
      }

      // Matcha exempel från EXAMPLE_DATABASE
      const matchedExamples = matchExamples(disposition, toneAnalysis);
      console.log(`[Step 2b] Matched ${matchedExamples.length} examples`);

      // Hämta personlig stil om den finns
      let personalStylePrompt = "";
      let personalStyle: any = null;
      if (plan !== "free") {
        try {
          personalStyle = await storage.getPersonalStyle(user.id);
          if (personalStyle && personalStyle.isActive) {
            personalStylePrompt = generatePersonalizedPrompt(personalStyle.referenceTexts, personalStyle.styleProfile);
            console.log("[Personal Style] Applied user's personal writing style");
          }
        } catch (e) {
          console.warn("[Personal Style] Failed to load, continuing without:", e);
        }
      }

      // STEG 3: Textgenerering med full prompt engineering
      const isHemnet = platform === "hemnet";
      const textPrompt = isHemnet ? HEMNET_TEXT_PROMPT : BOOLI_TEXT_PROMPT_WRITER;

      // Stilinstruktion baserat på mäklarens val — koordinerad med stil-exemptions
      const styleInstruction = style === "factual"
        ? `\n# TEXTSTIL: PM-STIL (STRIKT FAKTABASERAD)
Mäklaren vill ha ett faktadokument, inte en säljtext.
- Kronologisk rumsordning: hall → vardagsrum → kök → sovrum → badrum → uteplats → övrigt → läge
- Varje rum = max 2 meningar. Bara mått, material, utrustning.
- INGA värdeladdade adjektiv överhuvudtaget: inga "smakfullt", "stilfullt", "elegant", "genomtänkt"
- INGA säljpunkter, INGA "lyfter", INGA betoning på fördelar
- Avsluta med fakta om läge (avstånd/namn). Punkt. Slut.
- Tänk: besiktningsprotokoll skrivet av en människa, inte mäklare.
- EXTRA FÖRBJUDET i denna stil: fantastisk, underbar, imponerande, charm, drömboende, hög standard, ljus och luftig, atmosfär, livsstil, livskvalitet\n`
        : style === "selling"
          ? `\n# TEXTSTIL: SÄLJANDE (KLYSCHFRITT ÖVERTYGANDE)
Mäklaren vill maximera intresset — men med SUBSTANS, inte tomma ord.
- Öppna med de 1-2 starkaste konkreta säljpunkterna: "Balkong i söderläge på 8 kvm" > "fantastisk balkong"
- Betona det som gör objektet unikt TIDIGT — inte sist
- Välj aktivt VAD du lyfter: ge mer utrymme åt starka detaljer, kortare om svaga
- Sista stycke: läge + en konkret köparnytta (pendlingstid, skola, affär)
- Du FÅR använda dessa beskrivande ord när de stöds av fakta:
  genomtänkt, smakfullt, stilfullt, elegant, hög standard, ljus och luftig, rofyllt, trivsamt
  attraktivt läge, naturskönt läge, populärt område, familjevänligt område
- Du FÅR även använda (sparsamt, max 2-3 per text):
  imponerande (t.ex. "imponerande takhöjd på 3,10 meter"), charm, drömboende
  atmosfär (t.ex. "trivsam atmosfär"), inbjuder till
- VIKTIGT: Varje beskrivande ord MÅSTE stödjas av ett konkret faktum i samma mening eller nästa
  BRA: "Smakfullt renoverat kök från Ballingslöv 2021 med granitbänk." (smakfullt + konkret bevis)
  DÅLIGT: "Smakfullt boende i attraktivt område." (tomt — inga fakta)
- Sälj med FAKTA som talar för sig själva, inte med adjektiv-staplar\n`
          : `\n# TEXTSTIL: BALANSERAD (STANDARD MÄKLARTEXT)
Fakta i fokus med naturlig rytm och professionell ton.
- Lyfter rätt saker utan att sälja hårt
- Du FÅR använda dessa milda beskrivningar när de stöds av fakta:
  genomtänkt, smakfullt, stilfullt, elegant, hög standard
  ljus och luftig (om det finns fönster/takhöjd som stöd), rofyllt
  attraktivt läge, populärt område, familjevänligt område
  trivsamt boende, genomtänkt planlösning
- Varje beskrivande ord MÅSTE ha fakta-stöd i samma eller nästa mening
  BRA: "Genomtänkt planlösning med sovrum mot gården och vardagsrum mot gatan."
  DÅLIGT: "Genomtänkt och trivsamt boende." (tomt)
- Tonen ska vara som en erfaren mäklare som berättar sakligt men engagerande\n`;

      // Typspecifika negativa/positiva exempel
      const propType = (disposition?.property?.type || "lägenhet").toLowerCase();
      let negativeExample: string;
      let positiveExample: string;

      if (propType.includes("villa") || propType.includes("hus")) {
        negativeExample = `"Välkommen till denna fantastiska villa som erbjuder generösa ytor och en ljus och luftig atmosfär. Huset präglas av en genomtänkt planlösning som bjuder på en harmonisk känsla av rymd. Trädgården erbjuder en grön oas perfekt för den som söker lugn och avkoppling. Den strategiskt placerade villan ger en unik möjlighet att njuta av natursköna omgivningar. Kontakta oss för visning!"`;
        positiveExample = `"Björkvägen 14, Löddeköpinge. En villa om 145 kvm på tomt om 750 kvm, renoverad 2021.\n\nEntréplan med hall, vardagsrum och kök i öppen planlösning. Köket är nytt från 2021 med IKEA-stomme och Bosch-vitvaror. Vardagsrummet har utgång till trädgården.\n\nÖvervåning med fyra sovrum. Badrummet är helkaklat med dusch och badkar.\n\nTomten har stenlagd uteplats i söderläge och gräsmatta. Garage och förråd om 12 kvm.\n\nLöddeköpinge skola 400 meter. Willys ca 5 minuters promenad. Malmö 15 min med bil."`;
      } else if (propType.includes("radhus")) {
        negativeExample = `"Välkommen till detta charmiga och välplanerade radhus som erbjuder en perfekt kombination av modern komfort och klassisk charm. Den genomtänkta planlösningen bjuder på generösa ytor som skapar en harmonisk känsla. Trädgården erbjuder en härlig plats för avkoppling och sociala tillställningar. Kontakta oss för visning!"`;
        positiveExample = `"Solnavägen 23, Solna. Ett radhus om 120 kvm med fyra rum och kök.\n\nBottenvåningen har kök och vardagsrum i öppen planlösning. Köket från IKEA 2021 med Bosch-vitvaror. Vardagsrummet har utgång till trädgården.\n\nÖvervåningen har tre sovrum och badrum. Huvudsovrummet har walk-in-closet. Badrummet är helkaklat med dusch. Laminatgolv genomgående.\n\nTrädgård med gräsmatta och uteplats i söderläge. Förråd om 10 kvm och carport för två bilar.\n\nSkola och förskola i promenadavstånd. Matbutik 300 meter."`;
      } else {
        negativeExample = `"Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en ljus och luftig atmosfär. Bostaden präglas av en genomtänkt planlösning som bjuder på en harmonisk känsla. Köket erbjuder gott om arbetsyta vilket gör det perfekt för den matlagningsintresserade. Kontakta oss för visning!"`;
        positiveExample = `"Storgatan 12, 3 tr, Linköping. En trea om 76 kvm med balkong i söderläge.\n\nHallen har garderob och leder in till vardagsrummet med tre fönster mot gatan. Ekparkett genomgående och takhöjd på 2,70 meter.\n\nKöket renoverades 2022 med luckor från Ballingslöv och vitvaror från Siemens. Matplats för fyra vid fönstret.\n\nSovrummet rymmer dubbelsäng och har garderob. Badrummet är helkaklat med dusch och tvättmaskin.\n\nBalkong om 4 kvm i söderläge. BRF Storgården, avgift 3 900 kr/mån.\n\nResecentrum 5 minuters promenad. Coop 200 meter."`;
      }

      // Clean null/empty values from data sent to AI — reduces noise significantly
      const cleanDisposition = deepClean(disposition) || disposition;
      const cleanToneAnalysis = deepClean(toneAnalysis) || toneAnalysis;
      const cleanWritingPlan = deepClean(writingPlan) || writingPlan;

      // Build content strings once — reused for Responses API (primary) and Chat Completions (retry)
      const systemContent = `${personalStylePrompt}\n\n${textPrompt}${styleInstruction}`;
      const userContent = `DISPOSITION:\n${JSON.stringify(cleanDisposition, null, 2)}\n\nTONALITET:\n${JSON.stringify(cleanToneAnalysis, null, 2)}\n\nSKRIVPLAN:\n${JSON.stringify(cleanWritingPlan, null, 2)}\n\nORDMÅL: ${targetWordMin}-${targetWordMax} ord\n\nPLATTFORM: ${platform}\n\n${competitorAnalysis ? `POSITIONERING:\n${competitorAnalysis}\n\n` : ""}${imageAnalysis ? `BILDANALYS:\n${imageAnalysis}\n\n` : ""}MATCHADE EXEMPEL (imitera stilen EXAKT):\n${matchedExamples.join("\n\n---\n\n")}\n\nNEGATIVT EXEMPEL (skriv ALDRIG så här):\n${negativeExample}\n\nPOSITIVT EXEMPEL (skriv exakt så här):\n${positiveExample}`;

      // Chat Completions format — used for quality gate retry
      const textMessages = [
        { role: "system" as const, content: systemContent },
        { role: "user" as const, content: userContent },
      ];

      sendProgress(4, 7, "Skriver objektbeskrivning...");
      console.log("[Step 3] Generating text with full prompt engineering...");

      const textCompletion = await openai.responses.create({
        model: "gpt-5.2",
        reasoning: { effort: "high" },
        temperature: temperature,
        input: [
          { role: "developer", content: systemContent },
          { role: "user", content: userContent }
        ],
        max_output_tokens: 8000,
        text: { format: { type: "json_object" } }
      });

      // Detect truncation — if output was truncated
      if (textCompletion.status === "incomplete") {
        console.warn("[Step 3] WARNING: Output truncated. Token limit hit.");
      }

      let result: any;
      try {
        result = safeJsonParse(textCompletion.output_text || "{}");
      } catch (e) {
        console.error("[Step 3] Failed to parse AI response, attempting raw extraction:", e);
        // Try to extract improvedPrompt from truncated JSON
        const raw = textCompletion.output_text || "";
        const match = raw.match(/"improvedPrompt"\s*:\s*"([\s\S]*?)(?:"|$)/);
        if (match) {
          result = { improvedPrompt: match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') };
          console.log("[Step 3] Recovered improvedPrompt from truncated JSON");
        } else {
          result = { improvedPrompt: prompt };
        }
      }

      // Truncation recovery: if text ends mid-word or mid-sentence, trim to last complete sentence
      if (result.improvedPrompt && textCompletion.status === "incomplete") {
        const text = result.improvedPrompt;
        const lastPeriod = Math.max(text.lastIndexOf(". "), text.lastIndexOf(".\n"));
        if (lastPeriod > text.length * 0.5) {
          result.improvedPrompt = text.substring(0, lastPeriod + 1);
          console.log(`[Step 3] Trimmed truncated text from ${text.length} to ${result.improvedPrompt.length} chars (last complete sentence)`);
        }
      }

      sendProgress(5, 7, "Kontrollerar textkvalitet...");

      // === QUALITY GATE: Analysera textkvalitet direkt ===
      if (result.improvedPrompt) {
        const qualityScore = analyzeTextQuality(result.improvedPrompt);
        console.log(`[Quality Gate] Score: ${qualityScore.toFixed(2)} (threshold: 0.70)`);

        if (qualityScore < 0.70) {
          console.log(`[Quality Gate] Poor quality detected, retrying with higher temperature...`);

          // Retry med högre temperature
          const retryTemp = Math.min(temperature + 0.10, 0.55);
          const retryCompletion = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: textMessages,
            max_tokens: 4500,
            temperature: retryTemp,
            response_format: { type: "json_object" },
          });

          try {
            const retryResult = safeJsonParse(retryCompletion.choices[0]?.message?.content || "{}");
            const retryScore = analyzeTextQuality(retryResult.improvedPrompt || "");

            if (retryScore > qualityScore) {
              console.log(`[Quality Gate] Retry improved score: ${retryScore.toFixed(2)} > ${qualityScore.toFixed(2)}`);
              result = retryResult;
            } else {
              console.log(`[Quality Gate] Retry didn't improve, keeping original`);
            }
          } catch (e) {
            console.warn("[Quality Gate] Retry failed, keeping original:", e);
          }
        }
      }

      // STEG 4: Post-processing — rensa förbjudna fraser + lägg till stycken
      if (result.improvedPrompt) {
        result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt, personalStyle?.styleProfile, style);
        result.improvedPrompt = addParagraphs(result.improvedPrompt);
      }
      // Rensa alla extra textfält också
      for (const field of ['socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd', 'headline']) {
        if (result[field]) {
          result[field] = cleanForbiddenPhrases(result[field], personalStyle?.styleProfile, style);
        }
      }

      // STEG 5: Validering + kirurgisk korrigering
      const violations = validateOptimizationResult(result, platform, targetWordMin, targetWordMax, style);
      if (violations.length > 0) {
        console.log(`[Step 5] Found ${violations.length} violations, attempting surgical correction...`);

        try {
          // Filtrera bort ordräknings-violations (kan inte fixas genom textredigering)
          const textViolations = violations.filter(v => !v.startsWith("För få ord") && !v.startsWith("För många ord"));

          if (textViolations.length > 0) {
            const correctionMessages = [
              {
                role: "system" as const,
                content: `Du är en kirurgisk korrekturläsare för svenska fastighetstexter.

DITT JOBB: Ersätt EXAKT de felaktiga fraserna med korrekta ersättningar. Ändra INGET annat.

REGLER:
1. Kopiera HELA texten exakt som den är
2. Byt BARA ut de markerade felen — rör INTE resten
3. Om en fras ska tas bort: ta bort den och städa meningen grammatiskt
4. Om en fras ska ersättas: byt ut den och behåll meningsstrukturen
5. Behåll ALLA styckebrytningar (\\n\\n) exakt som de är
6. Lägg ALDRIG till nya meningar eller information
7. Svara med JSON: {"corrected_text": "hela texten med bara felen fixade"}

ERSÄTTNINGSTABELL:
- "erbjuder" → "har"
- "bjuder på" → "har"
- "generös/generösa/generöst" → ta bort ordet, använd exakt mått om det finns
- "vilket" → dela meningen i två vid "vilket": "X, vilket Y" → "X. Y"
- "för den som" → ta bort hela frasen
- "fantastisk/fantastiskt" → ta bort
- "perfekt" → "passar bra" eller ta bort
- "ljus och luftig" → "ljus"
- "stilrent och modernt" → "modernt"
- Alla "X och Y"-adjektivpar → behåll bara det första
- "Det finns även/också" → börja med vad som finns istället`,
              },
              {
                role: "user" as const,
                content: `ORIGINALTEXT (ändra BARA de markerade felen, behåll allt annat exakt):\n\n${result.improvedPrompt}\n\nFEL SOM MÅSTE FIXAS (${textViolations.length} st):\n${textViolations.map((v, i) => `${i + 1}. ${v}`).join("\n")}`,
              },
            ];

            const correctionCompletion = await openai.chat.completions.create({
              model: "gpt-5.2",
              messages: correctionMessages,
              max_tokens: 4500,
              temperature: 0.05,
              response_format: { type: "json_object" },
            });

            const corrected = safeJsonParse(correctionCompletion.choices[0]?.message?.content || "{}");
            if (corrected.corrected_text) {
              // Verifiera att korrigeringen inte ändrade för mycket (max 30% ändring)
              const originalWords = result.improvedPrompt.split(/\s+/).length;
              const correctedWords = corrected.corrected_text.split(/\s+/).length;
              const wordDiff = Math.abs(originalWords - correctedWords);

              if (wordDiff / originalWords < 0.3) {
                result.improvedPrompt = cleanForbiddenPhrases(corrected.corrected_text, personalStyle?.styleProfile, style);
                result.improvedPrompt = addParagraphs(result.improvedPrompt);
                console.log(`[Step 5] Surgical correction applied (${textViolations.length} violations fixed, ${wordDiff} words changed)`);
              } else {
                console.warn(`[Step 5] Correction changed too much (${Math.round(wordDiff / originalWords * 100)}%), keeping original`);
                // Kör ändå cleanForbiddenPhrases som fallback
                result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt, personalStyle?.styleProfile, style);
              }
            }
          }
        } catch (e) {
          console.warn("[Step 5] AI correction failed, using original:", e);
        }
      }

      // STEG 5b: Ordräknings-enforcement — om texten är för kort, expandera
      if (result.improvedPrompt) {
        const currentWordCount = result.improvedPrompt.split(/\s+/).filter(Boolean).length;
        const shortfall = targetWordMin - currentWordCount;

        if (shortfall > 30) {
          console.log(`[Step 5b] Text too short: ${currentWordCount} words, target min ${targetWordMin}. Expanding...`);

          try {
            const expandMessages = [
              {
                role: "system" as const,
                content: `Du är en erfaren svensk mäklare. Du ska UTÖKA en befintlig objektbeskrivning så den når rätt längd.

REGLER:
1. Behåll ALL befintlig text exakt som den är — ändra INTE befintliga meningar
2. LÄGG TILL nya meningar med FAKTA från dispositionen som saknas i texten
3. Varje ny mening = nytt faktum (material, mått, utrustning, avstånd)
4. Infoga nya meningar på RÄTT plats i texten (kök-detaljer vid kök-stycket osv)
5. Hitta ALDRIG på fakta — använd BARA dispositionen
6. Inga förbjudna ord: erbjuder, bjuder på, generös, vilket, välkommen, präglas av, här finns
7. Texten MÅSTE bli minst ${targetWordMin} ord
8. Svara med JSON: {"expanded_text": "hela den utökade texten med \\n\\n mellan stycken"}`,
              },
              {
                role: "user" as const,
                content: `NUVARANDE TEXT (${currentWordCount} ord — behöver bli minst ${targetWordMin} ord):\n\n${result.improvedPrompt}\n\nDISPOSITION (använd fakta härifrån för att utöka):\n${JSON.stringify(cleanDisposition, null, 2)}`,
              },
            ];

            const expandCompletion = await openai.chat.completions.create({
              model: "gpt-5.2",
              messages: expandMessages,
              max_tokens: 3000,
              temperature: 0.2,
              response_format: { type: "json_object" },
            });

            const expanded = safeJsonParse(expandCompletion.choices[0]?.message?.content || "{}");
            if (expanded.expanded_text) {
              const expandedWordCount = expanded.expanded_text.split(/\s+/).filter(Boolean).length;
              if (expandedWordCount >= currentWordCount) {
                result.improvedPrompt = cleanForbiddenPhrases(expanded.expanded_text, personalStyle?.styleProfile, style);
                result.improvedPrompt = addParagraphs(result.improvedPrompt);
                console.log(`[Step 5b] Expanded from ${currentWordCount} to ${expandedWordCount} words`);
              }
            }
          } catch (e) {
            console.warn("[Step 5b] Expansion failed, keeping original:", e);
          }
        } else if (shortfall > 0) {
          console.log(`[Step 5b] Text slightly short: ${currentWordCount}/${targetWordMin} words (within tolerance)`);
        }
      }

      sendProgress(6, 7, "Faktagranskar texten...");

      // STEG 6: Faktagranskning (Pro/Premium)
      let factCheckResult: any = null;
      if (plan !== "free" && result.improvedPrompt) {
        try {
          const factCheckMessages = [
            { role: "system" as const, content: FACT_CHECK_PROMPT },
            {
              role: "user" as const,
              content: `DISPOSITION:\n${JSON.stringify(cleanDisposition, null, 2)}\n\nGENERERAD TEXT:\n${result.improvedPrompt}`,
            },
          ];

          const factCheckCompletion = await openai.responses.create({
            model: "gpt-5.2",
            temperature: 0.1,
            reasoning: { effort: "medium" }, // Medium thinking for fact-checking
            input: [
              {
                role: "developer",
                content: FACT_CHECK_PROMPT
              },
              {
                role: "user",
                content: `DISPOSITION:\n${JSON.stringify(cleanDisposition, null, 2)}\n\nGENERERAD TEXT:\n${result.improvedPrompt}`
              }
            ],
            text: { format: { type: "json_object" } }
          });

          factCheckResult = safeJsonParse(factCheckCompletion.output_text || "{}");

          if (factCheckResult.corrected_text && !factCheckResult.fact_check_passed) {
            result.improvedPrompt = cleanForbiddenPhrases(factCheckResult.corrected_text, personalStyle?.styleProfile, style);
            result.improvedPrompt = addParagraphs(result.improvedPrompt);
            console.log("[Step 6] Fact-check corrections applied");
          }
        } catch (e) {
          console.warn("[Step 6] Fact-check failed, continuing:", e);
        }
      }

      // Spara resultat
      await storage.createOptimization({
        userId: user.id,
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt || prompt,
        category: type,
        improvements: [
          result.analysis?.identified_epoch ? "Epok: " + result.analysis.identified_epoch : null,
          result.analysis?.target_group ? "Målgrupp: " + result.analysis.target_group : null,
          result.analysis?.area_advantage ? "Område: " + result.analysis.area_advantage : null,
          result.analysis?.pricing_factors ? "Prisfaktorer: " + result.analysis.pricing_factors : null,
          result.analysis?.association_status ? "Förening: " + result.analysis.association_status : null,
        ].filter(Boolean) as string[],
        suggestions: result.text_tips || result.pro_tips || [],
        socialCopy: result.socialCopy || null,
        headline: result.headline || null,
        instagramCaption: result.instagramCaption || null,
        showingInvitation: result.showingInvitation || null,
        shortAd: result.shortAd || null,
      });

      // AI-förbättringsanalys (körs efter textgenerering)
      let improvementSuggestions = undefined;
      if (plan !== "free") {
        console.log("[Improvement Analysis] Analyzing generated text for improvements...");

        const improvementPrompt = `Analysera denna objektbeskrivning ur ett rent text- och kommunikationsperspektiv:

OBJEKTBESKRIVNING:
${result.improvedPrompt}

Ge feedback ENDAST på:
1. Textstruktur - är flödet logiskt och lättläst?
2. Språkton - är tonen professionell och saklig?
3. Informationstäthet - är varje mening informativ?
4. Styrkor - vad fungerar bra i texten?

VIKTIGT: INGA juridiska råd, INGA mäklartips, INGA prisrekommendationer.
Fokusera ENDAST på textkvalitet och kommunikation.

Svara med JSON i formatet:
{
  "tone": "Beskrivning av textens ton och professionalitet",
  "structure_quality": "Hur väl strukturerad och lättläst texten är",
  "information_density": "Hur informativ och koncis texten är",
  "strengths": ["styrka 1", "styrka 2"],
  "text_improvements": ["konkret textförslag 1", "konkret textförslag 2"]
}`;

        const improvementMessages = [
          {
            role: "system" as const,
            content: "Du är en expert på textkvalitet och kommunikation. Ge ENDAST feedback på textstruktur, språk och läsbarhet. INGA juridiska råd, INGA mäklartips, INGA prisrekommendationer. Fokusera på att göra texten bättre rent kommunikativt.",
          },
          {
            role: "user" as const,
            content: improvementPrompt,
          },
        ];

        try {
          const improvementCompletion = await openai.chat.completions.create({
            model: "gpt-5.2",
            messages: improvementMessages,
            max_tokens: 800,
            temperature: 0.3,
            response_format: { type: "json_object" },
          });

          const improvementText = improvementCompletion.choices[0]?.message?.content || "{}";
          improvementSuggestions = safeJsonParse(improvementText);
          console.log("[Improvement Analysis] Completed");
        } catch (e) {
          console.warn("[Improvement Analysis] Failed, skipping...", e);
        }
      }

      sendProgress(7, 7, "Finsliper och sparar...");

      // Increment usage after successful generation
      await storage.incrementUsage(user.id, 'texts');

      const tips = result.text_tips || result.pro_tips || [];

      // Auto-fill [TID] and [KONTAKT] placeholders in showing invitation
      let showingInvitation = result.showingInvitation || null;
      if (showingInvitation && propertyData) {
        const tid = (propertyData.visningstid || "").trim();
        const kontakt = [propertyData.maklarnamn, propertyData.maklartelefon].filter(Boolean).join(", ");
        if (tid) showingInvitation = showingInvitation.replace(/\[TID\]/g, tid);
        if (kontakt) showingInvitation = showingInvitation.replace(/\[KONTAKT\]/g, kontakt);
      }

      const responseData = {
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt || prompt,
        highlights: result.highlights || [],
        analysis: result.analysis || {},
        improvements: result.missing_info || [],
        suggestions: tips,
        text_tips: tips,
        critical_gaps: result.critical_gaps || [],
        socialCopy: result.socialCopy || null,
        headline: result.headline || null,
        instagramCaption: result.instagramCaption || null,
        showingInvitation,
        shortAd: result.shortAd || null,
        improvement_suggestions: improvementSuggestions,
        factCheck: factCheckResult ? {
          fact_check_passed: factCheckResult.fact_check_passed !== false,
          issues: (factCheckResult.issues || []).map((issue: any) =>
            typeof issue === "string" ? { quote: issue, reason: "" } : issue
          ),
          quality_score: factCheckResult.quality_score ?? null,
          broker_tips: factCheckResult.broker_tips || [],
        } : {
          fact_check_passed: violations.filter(v => !v.startsWith("För få ord") && !v.startsWith("För många ord")).length === 0,
          issues: violations.filter(v => !v.startsWith("För få ord") && !v.startsWith("För många ord")).map(v => ({ quote: v, reason: "" })),
          quality_score: null,
          broker_tips: [],
        },
        wordCount: (result.improvedPrompt || "").split(/\s+/).filter(Boolean).length,
        model: aiModel,
      };

      if (wantsStream) {
        res.write(JSON.stringify({ type: "complete", data: responseData }) + "\n");
        res.end();
      } else {
        res.json(responseData);
      }
    } catch (err: any) {
      console.error("Optimize error:", err);
      if (wantsStream) {
        try {
          res.write(JSON.stringify({ type: "error", message: err.message || "Optimering misslyckades" }) + "\n");
          res.end();
        } catch { res.end(); }
      } else {
        res.status(500).json({ message: err.message || "Optimering misslyckades" });
      }
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
      const { selectedText, fullText, instruction } = req.body;
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
        input: [
          {
            role: "developer",
            content: `Du är en erfaren svensk mäklare med 15 år i branschen. Du skriver om delar av objektbeskrivningar på begäran — klyschfritt, specifikt, mänskligt.

# DIN UPPGIFT
Skriv om den markerade texten enligt instruktionen. Behåll stilen från hela texten.

# RIKTIG MÄKLARSTIL — SÅ HÄR LÅTER DET
BRA: "Balkongen vetter mot söder. Köket renoverat 2021 med Ballingslöv-luckor. Skolan 400 meter."
BRA: "Takhöjd 2,85 meter. Ekparkett genomgående. Hall med garderob."
BRA: "Två sovrum. Huvudsovrummet rymmer dubbelsäng med nattduksbord."
DÅLIGT: "En fantastisk balkong som erbjuder sol hela dagen och ger en harmonisk känsla."
DÅLIGT: "Köket är genomtänkt och stilfullt renoverat vilket gör det perfekt för den matlagningsintresserade."

# FÖRBJUDET — UNIVERSELLA AI-MARKÖRER (använd ALDRIG)
erbjuder, bjuder på, präglas av, genomsyras av, generös, andas lugn, andas charm
vilket, som ger en, för den som, i hjärtat av, skapar en känsla, bidrar till, förstärker, inte bara...utan också
kontakta oss, boka visning, välkommen till, här finns, här kan du
njut av, faciliteter, Det finns även, Det finns också, -möjligheter

# REGLER
1. Skriv om BARA den markerade texten — inte resten
2. Behåll ALLA fakta. HITTA ALDRIG PÅ ny fakta som inte finns i originaltexten
3. Korta, direkta meningar. Presens. Varje mening = ett nytt faktum.
4. "Gör mer säljande" = lyft de starkaste befintliga fakta tydligare, inte lägg till adjektiv
5. "Kondensera" = ta bort utfyllnad, behåll alla konkreta fakta
6. "Mer fakta" = be om fler detaljer OM det finns i kontexten — annars kondensera och stärk det som finns
7. Matcha stilen i hela texten exakt

Svara med JSON: {"rewritten": "den omskrivna texten"}`
          },
          {
            role: "user",
            content: `HELA TEXTEN (för kontext och stil):\n${fullText}\n\nMARKERAD TEXT ATT SKRIVA OM:\n"${selectedText}"\n\nINSTRUKTION: ${instruction}`
          }
        ],
        text: { format: { type: "json_object" } }
      });

      const raw = rewriteCompletion.output_text || "{}";
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { parsed = { rewritten: selectedText }; }

      const rewritten = cleanForbiddenPhrases(parsed.rewritten || selectedText, personalStyle?.styleProfile);

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

      // Check area search usage limits
      const usage = await storage.getMonthlyUsage(user.id, user) || {
        textsGenerated: 0,
        areaSearchesUsed: 0,
        textEditsUsed: 0,
        personalStyleAnalyses: 0,
      };


      const limits = PLAN_LIMITS[plan];
      if (usage.areaSearchesUsed >= limits.areaSearches) {
        return res.status(429).json({
          message: plan === "free"
            ? "Adress-sökning är endast för Pro- och Premium-användare. Uppgradera för att använda denna funktion!"
            : `Du har nått din månadsgräns för adress-sökningar. Gräns: ${limits.areaSearches}`,
          upgradeRequired: true,
          currentPlan: plan,
          usage: {
            areaSearchesUsed: usage.areaSearchesUsed,
            areaSearchesLimit: limits.areaSearches,
          }
        });
      }

      const { address } = req.body;
      if (!address) return res.status(400).json({ message: "Adress krävs" });

      // Increment area search usage
      await storage.incrementUsage(user.id, 'areaSearches');

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
      const adminKey = req.headers['x-admin-key'] as string || req.query.adminKey as string;
      const expectedKey = process.env.ADMIN_KEY;

      if (!expectedKey || adminKey !== expectedKey) {
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

      res.json({ received: true });
    } catch (err) {
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
  // Query param: ?adminKey=YOUR_SECRET_KEY (set ADMIN_KEY env variable)
  app.post("/api/admin/set-plan", async (req, res) => {
    try {
      const adminKey = req.headers['x-admin-key'] as string || req.query.adminKey as string;
      const expectedKey = process.env.ADMIN_KEY;

      if (!expectedKey || adminKey !== expectedKey) {
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

      const { originalText, selectedText, improvementType, context } = req.body;

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
        more_descriptive: `Gör denna text mer beskrivande genom att lyfta fram KONKRETA detaljer (material, mått, märken, läge). Behåll alla faktapåståenden exakt.`,
        more_selling: `Gör denna text mer säljande genom att lyfta fram KONKRETA fakta och mått. Ersätt vaga påståenden med specifika detaljer (märken, årtal, kvm). Inga klyschor.`,
        more_formal: `Gör denna text mer formell och professionell. Använd korrekta fastighetstermer. Inga AI-klyschor.`,
        more_warm: `Gör denna text mer personlig utan att förlora professionaliteten. Behåll alla faktapåståenden.`,
        fix_claims: `Ersätt klyschor och vaga påståenden med konkreta fakta. Inga "erbjuder", "bjuder på", "generös", "vilket", "präglas av".`
      };

      const improvementInstruction = improvementPrompts[improvementType] || improvementPrompts.more_descriptive;

      const messages = [
        {
          role: "system" as const,
          content: `Du är en expert på svenska fastighetstexter. Dina texter är klyschfria, faktabaserade och säljande.

KONTEXT: ${context || 'Ingen extra kontext'}

ORIGINALTEXT: ${originalText}

VALD TEXT ATT FÖRBÄTTRA: ${selectedText}

${improvementInstruction}

FÖRBJUDET (universella AI-markörer): erbjuder, bjuder på, präglas av, genomsyras av, generös, vilket, för den som, i hjärtat av, faciliteter, njut av, skapar en känsla, bidrar till, inte bara, utan också, här finns, välkommen till.

Svara ENDAST med den förbättrade texten, inga förklaringar.`
        },
        {
          role: "user" as const,
          content: selectedText
        }
      ];

      const completion = await openai.responses.create({
        model: "gpt-5.2",
        input: messages,
        max_output_tokens: 500,
        temperature: 0.1,  // Sänkt från 0.7 för mer fakta-fokuserat
      });

      let rawImprovedText = completion.output_text || selectedText;
      // Strip quotes, markdown code blocks, and leading/trailing whitespace
      rawImprovedText = rawImprovedText.trim();
      rawImprovedText = rawImprovedText.replace(/^```[\s\S]*?\n/, "").replace(/\n```$/, ""); // code blocks
      rawImprovedText = rawImprovedText.replace(/^[""]|[""]$/g, ""); // smart quotes
      rawImprovedText = rawImprovedText.replace(/^"|"$/g, ""); // regular quotes
      const improvedText = cleanForbiddenPhrases(rawImprovedText.trim(), personalStyle?.styleProfile);

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

  return httpServer;
}
