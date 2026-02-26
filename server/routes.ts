import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
import { createClient, type RedisClientType } from "redis";
import { storage } from "./storage";
import { getGeographicContext } from "./geographic-intelligence";
import { analyzeMarketPosition, getMarketTrends2025 } from "./market-intelligence";
import { analyzeArchitecturalValue } from "./architectural-intelligence";
import { analyzeBRFEconomy, generateBRFWarningSigns } from "./brf-intelligence";
import { identifyBuyerSegment, generatePsychologicalProfile } from "./buyer-psychology";
import { optimizeRequestSchema, PLAN_LIMITS, WORD_LIMITS, FEATURE_ACCESS, type PlanType, type User, type PersonalStyle, type InsertPersonalStyle } from "@shared/schema";
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
  for (const [key, entry] of optimizeRateMap) {
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

// AI-analys av användarens skrivstil
async function analyzeWritingStyle(referenceTexts: string[]): Promise<{
  formality: number;
  detailLevel: number;
  emotionalTone: number;
  sentenceLength: number;
  adjectiveUsage: number;
  factFocus: number;
}> {
  const analysisPrompt = `Analysera dessa 3 objektbeskrivningar från en svensk mäklare och ge en stilprofil.

TEXTER:
${referenceTexts.join('\n\n---\n\n')}

Svara ENDAST med JSON i detta format:
{
  "formality": 1-10, // 1=mycket informell, 10=mycket formell
  "detailLevel": 1-10, // 1=kortfattad, 10=mycket detaljerad
  "emotionalTone": 1-10, // 1=rena fakta, 10=känslomässigt
  "sentenceLength": 1-10, // 1=korta meningar, 10=långa meningar
  "adjectiveUsage": 1-10, // 1=få adjektiv, 10=många adjektiv
  "factFocus": 1-10 // 1=fokus på känsla, 10=fokus på fakta
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: analysisPrompt }],
      max_tokens: 200,
      temperature: 0.1,
    });

    const analysis = safeJsonParse(response.choices[0]?.message?.content || "{}");

    // Validera och normalisera värden
    return {
      formality: Math.max(1, Math.min(10, Number(analysis.formality) || 5)),
      detailLevel: Math.max(1, Math.min(10, Number(analysis.detailLevel) || 5)),
      emotionalTone: Math.max(1, Math.min(10, Number(analysis.emotionalTone) || 5)),
      sentenceLength: Math.max(1, Math.min(10, Number(analysis.sentenceLength) || 5)),
      adjectiveUsage: Math.max(1, Math.min(10, Number(analysis.adjectiveUsage) || 5)),
      factFocus: Math.max(1, Math.min(10, Number(analysis.factFocus) || 5)),
    };
  } catch (error) {
    console.error("Style analysis failed:", error);
    // Fallback till neutral profil
    return {
      formality: 5,
      detailLevel: 5,
      emotionalTone: 5,
      sentenceLength: 5,
      adjectiveUsage: 5,
      factFocus: 5,
    };
  }
}

// Generera personaliserad prompt baserat på användarens stil
function generatePersonalizedPrompt(referenceTexts: string[], styleProfile: any): string {
  return `Skriv i exakt samma stil och ton som dessa exempel från mäklaren:

EXEMPELTEXTER:
${referenceTexts.join('\n\n---\n\n')}

STILPROFIL:
- Formalitet: ${styleProfile.formality}/10
- Detaljnivå: ${styleProfile.detailLevel}/10
- Känsloton: ${styleProfile.emotionalTone}/10
- Meninglängd: ${styleProfile.sentenceLength}/10
- Adjektivanvändning: ${styleProfile.adjectiveUsage}/10
- Faktafokus: ${styleProfile.factFocus}/10

VIKTIGT: Använd samma ton, men UNDVIK dessa klyschor:
${FORBIDDEN_PHRASES.slice(0, 20).join(', ')}

Skriv som en erfaren svensk mäklare med exakt samma stil som exemplen ovan.`;
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

function findRuleViolations(text: string, platform: string = "hemnet"): string[] {
  const violations: string[] = [];
  const lowerText = text.toLowerCase().trim();
  const sentences = text.split(/(?<=[.!?])\s+/);

  // 1. Check all forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
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

function validateOptimizationResult(result: any, platform: string = "hemnet", targetMin?: number, targetMax?: number): string[] {
  const violations: string[] = [];
  if (typeof result?.improvedPrompt === "string") {
    violations.push(...findRuleViolations(result.improvedPrompt, platform));
    violations.push(...checkWordCount(result.improvedPrompt, platform, targetMin, targetMax));
  }
  // Validera ALLA textfält för förbjudna fraser (inte ordräkning)
  const extraFields = ['socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd', 'headline'];
  for (const field of extraFields) {
    if (typeof result?.[field] === "string" && result[field].length > 0) {
      const fieldViolations = findRuleViolations(result[field], platform);
      for (const v of fieldViolations) {
        violations.push(`[${field}] ${v}`);
      }
    }
  }
  return Array.from(new Set(violations));
}

// Post-processing: Rensa bort förbjudna fraser automatiskt
// VIKTIGT: Längre fraser FÖRST så de matchas innan kortare
// Detta eliminerar behovet av retries för de vanligaste AI-fraserna
const PHRASE_REPLACEMENTS: [string, string][] = [
  // === ÖPPNINGAR - ta bort helt ===
  ["välkommen till denna", ""],
  ["välkommen till", ""],
  ["välkommen hem till", ""],
  ["här möts du av", ""],
  ["här erbjuds", ""],

  // === ERBJUDER-VARIANTER (vanligaste AI-frasen) ===
  ["lägenheten erbjuder", "lägenheten har"],
  ["bostaden erbjuder", "bostaden har"],
  ["köket erbjuder", "köket har"],
  ["badrummet erbjuder", "badrummet har"],
  ["balkongen erbjuder", "balkongen har"],
  ["området erbjuder", "området har"],
  ["föreningen erbjuder", "föreningen har"],
  [" erbjuder ", " har "],
  [" erbjuds ", " finns "],
  ["erbjuder", "har"],
  ["erbjuds", "finns"],

  // === "VILKET GER/GÖR" - vanlig AI-konstruktion ===
  ["vilket gör det enkelt att ta sig", "med nära till"],
  ["vilket gör det enkelt", ""],
  ["vilket ger en luftig", "med"],
  ["vilket ger en", "med"],
  ["vilket ger", "med"],
  ["som ger en", "med"],

  // === "FÖR DEN SOM" - vanlig AI-fras ===
  ["perfekt för den som", "passar"],
  ["idealisk för den som", "passar"],
  ["för den matlagningsintresserade", ""],
  ["för den som uppskattar", ""],
  ["för den som gillar", ""],
  ["för den som vill", ""],
  ["för den som söker", ""],
  ["för den som", ""],
  ["perfekt för", "passar"],
  ["idealisk för", "passar"],

  // === KONTAKT/CTA - ta bort helt ===
  ["kontakta oss för visning", ""],
  ["kontakta oss", ""],
  ["tveka inte att höra av dig", ""],
  ["tveka inte", ""],
  ["boka visning", ""],
  ["hör av dig", ""],

  // === PLATS-KLYSCHOR ===
  ["i hjärtat av stockholm", "centralt i stockholm"],
  ["i hjärtat av", "centralt i"],
  ["hjärtat av", "centrala"],
  ["stadens puls", "stadskärnan"],
  ["mitt i stadens liv", "centralt"],

  // === DRÖM-ORD ===
  ["drömboende", "bostad"],
  ["drömhem", "hem"],
  ["drömlägenhet", "lägenhet"],
  ["en sann pärla", ""],
  ["en riktig pärla", ""],

  // === LUFTIG/ATMOSFÄR ===
  ["luftig och inbjudande atmosfär", ""],
  ["luftig atmosfär", ""],
  ["ger en luftig känsla", ""],
  ["luftig känsla", ""],
  ["luftig", "rymlig"],
  ["inbjudande atmosfär", ""],
  ["trivsam atmosfär", ""],
  ["härlig atmosfär", ""],

  // === ROFYLLD ===
  ["rofyllt läge", "lugnt läge"],
  ["rofylld miljö", "lugn miljö"],
  ["rofyllt", "lugnt"],
  ["rofylld", "lugn"],

  // === VARDAGEN ===
  ["underlättar vardagen", ""],
  ["bekvämlighet i vardagen", ""],
  ["i vardagen", ""],

  // === ATTRAKTIVT ===
  ["attraktivt läge", "bra läge"],
  ["attraktivt med närhet", "nära"],
  ["attraktivt", ""],

  // === SUPERLATIV ===
  ["fantastisk utsikt", "fin utsikt"],
  ["fantastiskt läge", "bra läge"],
  ["fantastisk", "fin"],
  ["underbar", "fin"],
  ["magisk", ""],
  ["otrolig", ""],
  ["enastående", ""],

  // === ÖVRIGT ===
  ["unik möjlighet", ""],
  ["unik chans", ""],
  ["sällsynt tillfälle", ""],
  ["missa inte", ""],
  ["inom räckhåll", "i närheten"],
  ["sociala tillställningar", "middagar"],
  ["sociala sammanhang", "umgänge"],
  ["extra komfort", ""],
  ["maximal komfort", ""],
  ["trygg boendemiljö", "stabil förening"],
  ["trygg boendeekonomi", "stabil ekonomi"],
  ["goda arbetsytor", "bänkyta"],
  ["gott om arbetsyta", "bänkyta"],

  // === NYA FRASER FRÅN GRANSKNING ===
  ["säker boendemiljö", ""],
  ["stadens liv och rörelse", ""],
  ["mitt i stadens liv", "centralt"],
  ["njuta av eftermiddagssolen", "med eftermiddagssol"],
  ["njuta av kvällssolen", "med kvällssol"],
  ["njuta av", ""],
  ["den vanliga balkongen", "balkongen"],
  ["trevligt sällskap", ""],
  ["med nära till runt", "med nära till"],
  ["nära till runt i staden", "nära tunnelbana"],
  ["med ett bekvämt boende med", "med"],
  ["bekvämt boende", ""],
  ["det finns möjlighet att uppdatera", ""],
  ["om så önskas", ""],
  ["efter egna önskemål", ""],
  ["har potential för modernisering", "kan renoveras"],
  ["potential för", ""],
  ["imponerande takhöjd", "hög takhöjd"],
  ["imponerande", ""],
  ["unik karaktär", "karaktär"],
  ["lugn atmosfär", ""],

  // === "VILKET"-KONSTRUKTIONER (vanlig AI-mönster) ===
  ["vilket bidrar till en rymlig", "med rymlig"],
  ["vilket bidrar till", "med"],
  ["vilket skapar rymd", "med hög takhöjd"],
  ["vilket skapar", "och ger"],
  ["vilket gör den till ett långsiktigt val", ""],
  ["vilket gör den till", "och är"],
  ["vilket gör det till en utmärkt", "och fungerar som"],
  ["vilket gör det till ett", "och är ett"],
  ["vilket gör det till", "och är"],
  ["vilket kan vara en fördel", ""],
  ["vilket kan vara", ""],
  ["vilket passar familjer", "för familjer"],
  ["vilket passar den som söker", "för"],
  ["vilket passar den som", "för"],
  ["vilket passar", "för"],
  ["vilket underlättar resor", "med enkel pendling"],
  ["vilket underlättar pendling", "med enkel pendling"],
  ["vilket underlättar", "med"],
  ["vilket är uppskattat av många", ""],
  ["vilket är uppskattat", ""],
  ["vilket är", "och är"],

  // === FLER AI-FRASER FRÅN GRANSKNING 2 ===
  ["rymlig atmosfär", "rymd"],
  ["med god isolering och energibesparing", ""],
  ["med god isolering", ""],
  ["sociala sammankomster", "umgänge"],
  ["med behaglig temperatur året runt", ""],
  ["behaglig temperatur", ""],
  ["harmonisk livsstil", ""],
  ["modern livsstil med alla bekvämligheter", ""],
  ["modern livsstil", ""],
  ["alla bekvämligheter", ""],
  ["fridfull miljö", "lugnt läge"],
  ["goda kommunikationsmöjligheter", "bra kommunikationer"],
  ["kommunikationsmöjligheter", "kommunikationer"],
  ["rekreation och avkoppling", "friluftsliv"],
  ["karaktär och charm", "karaktär"],

  // === FLER AI-FRASER FRÅN GRANSKNING 3 ===
  ["stilren och funktionell matlagningsmiljö", "funktionellt kök"],
  ["funktionell matlagningsmiljö", "funktionellt kök"],
  ["matlagningsmiljö", "kök"],
  ["maximerar användningen av varje kvadratmeter", ""],
  ["maximerar användningen", ""],
  ["lugn och trygg miljö", "lugnt område"],
  ["trygg miljö", ""],
  ["fokus på kvalitet och hållbarhet", ""],
  ["fokus på kvalitet", ""],
  ["ytterligare förstärker dess", "med"],
  ["ytterligare förstärker", ""],
  ["ett långsiktigt val för köpare", ""],
  ["långsiktigt val", ""],
  ["gott om utrymme för förvaring", "bra förvaring"],
  ["välplanerad layout", "bra planlösning"],
  ["gott inomhusklimat", ""],
  ["bidrar till ett gott", "ger"],
  ["smakfullt renoverat", "renoverat"],
  ["smakfullt inrett", ""],
  ["enhetlig och elegant känsla", ""],
  ["enhetlig och stilren känsla", ""],
  ["för .", ". "],

  // === FLER AI-FRASER FRÅN GRANSKNING 4 ===
  ["tidslös och elegant känsla", ""],
  ["släpper in rikligt med ljus", ""],
  ["underlättar umgänge med familj och vänner", ""],
  ["passande", "lämplig"],
  ["en möjlighet att förvärva", ""],
  ["unik kombination av tradition och modernitet", ""],
  ["kombination av tradition och modernitet", ""],
  ["tradition och modernitet", ""],
  ["ett val för köpare", ""],
  ["ett val för", ""],
  ["historiska detaljer", "originaldetaljer"],
  ["moderna bekvämligheter", ""],
  ["moderna", ""],
  ["bekvämligheter", ""],

  // === FLER AI-FRASER FRÅN GRANSKNING 5 ===
  ["högkvalitativa material och finish", "högkvalitativa material"],
  ["material och finish", "material"],
  ["klassiska charm", "karaktär"],
  ["trevlig plats att vistas på", "bra plats"],
  ["plats att vistas på", "plats"],
  ["unik kombination av modern komfort och klassisk charm", ""],
  ["kombination av modern komfort och klassisk charm", ""],
  ["modern komfort och klassisk charm", ""],
  ["utmärkt val", ""],
  ["smidig pendling", "enkel pendling"],
  ["med känsla av rymd", "med rymd"],
  ["bidrar till husets klassiska charm", "ger karaktär"],
  ["med extra utrymme", "med mer plats"],
  ["medkel tillgång", "lättillgänglig"],
  ["medkel", "lätt"],
  ["stor fördel", "fördel"],

  // === AI-FRASER SOM RIKTIGA MÄKLARE ALDRIG ANVÄNDER ===
  ["generösa ytor", "stora ytor"],
  ["generös takhöjd", "hög takhöjd"],
  ["generöst tilltaget", "stort"],
  ["generöst med", "med"],
  ["bjuder på utsikt", "har utsikt"],
  ["bjuder på", "har"],
  ["präglas av lugn", "är lugnt"],
  ["präglas av", "har"],
  ["genomsyras av", "har"],
  ["andas lugn", "är lugnt"],
  ["andas charm", "har karaktär"],
  ["andas historia", "har originaldetaljer"],
  ["präglad av", "med"],
  ["stor charm", "karaktär"],
  ["strategiskt placerad", "centralt belägen"],
  ["strategiskt läge", "centralt läge"],
  ["trivsamt boende", ""],
  ["trivsam bostad", ""],
  ["här finns", "det finns"],
  ["här kan du", ""],
  ["här bor du", ""],

  // === NYA FRASER FRÅN OUTPUT-TEST 2026-02 ===
  ["skapa minnen", ""],
  ["utmärkt val för den som", ""],
  ["utmärkt val", ""],
  ["gott om utrymme för lek och avkoppling", "stor tomt"],
  ["gott om utrymme", ""],
  ["lek och avkoppling", ""],
  ["natur och stadsliv", ""],
  ["bekvämt boende", ""],
  ["rymligt intryck", ""],
  ["gör det enkelt att umgås", ""],
  ["gör det enkelt att", ""],
  ["gör det möjligt att", ""],
  ["ett område för familjer", ""],
  ["i mycket gott skick", "i gott skick"],
  ["ligger centralt i ett område", ""],
  ["ligger centralt i", "ligger i"],

  // === NYA FRASER FRÅN OUTPUT-TEST 2026-02 v2 (Ekorrvägen-analys) ===
  // "faciliteter" — inte naturligt mäklarspråk
  ["nyrenoverade faciliteter om", "nyrenoverat,"],
  ["nyrenoverade faciliteter och", "nyrenoverade ytor och"],
  ["nyrenoverade faciliteter", "nyrenoverade ytor"],
  ["renoverade faciliteter", "renoverade utrymmen"],
  ["faciliteter", "utrymmen"],

  // "Njut av" — AI-klyscha
  ["njut av en jacuzzi", "jacuzzi"],
  ["njut av jacuzzi", "jacuzzi"],
  ["njut av", ""],

  // "Det finns även/också" — lat meningsstart
  ["det finns även en", ""],
  ["det finns även ett", ""],
  ["det finns även", ""],
  ["det finns också en", ""],
  ["det finns också ett", ""],
  ["det finns också", ""],

  // "-möjligheter" — byråkratiskt
  ["förvaringsmöjligheter inkluderar ett förråd", "förråd"],
  ["förvaringsmöjligheter inkluderar", "förvaring:"],
  ["förvaringsmöjligheter", "förvaring"],
  ["odlingsmöjligheter", "plats för odling"],
  ["boendemöjligheter", "boende"],
  ["parkeringsmöjligheter", "parkering"],

  // "En X finns på" — passiv konstruktion
  ["en jacuzzi finns på", "jacuzzi på"],
  ["en bastu finns", "bastu"],
  ["en tvättstuga finns", "tvättstuga"],

  // === MEGA-EXPANSION: Alla nya AI-mönster ===

  // Compound adjektiv-par (AI-signatur — riktiga mäklare skriver aldrig så)
  ["ljus och luftig lägenhet", "ljus lägenhet"],
  ["ljus och luftig", "ljus"],
  ["ljust och luftigt", "ljust"],
  ["stilrent och modernt kök", "modernt kök"],
  ["stilrent och modernt", "modernt"],
  ["stilren och modern", "modern"],
  ["modernt och stilrent", "modernt"],
  ["elegant och tidlös", ""],
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

// Haversine distance between two lat/lng points in meters
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cleanForbiddenPhrases(text: string): string {
  if (!text) return text;
  let cleaned = text;

  // Först: Fixa trasiga ord som AI:n genererar (HELA ORD, inte delar)
  const brokenWordFixes: [RegExp, string][] = [
    [/\bmmångaa\b/gi, "många"],
    [/\bgmångaavstånd\b/gi, "gångavstånd"],
    [/\bVkoppling\b/gi, "Avkoppling"],
    [/\bEnna\b/gi, "Denna"],
    [/\bMgänge\b/gi, "umgänge"],
    [/\bAmiljer\b/gi, "Familjer"],
    [/\bamiljer\b/gi, "familjer"],
    [/\bperfekt plats\b/gi, "bra plats"],
    [/\bperfekt för\b/gi, "passar"],
    [/\bmed mer plats \.\b/gi, "med mer plats."],
    [/\bmed rymd och ljus\.\b/gi, "med god rymd."],
    [/\bPriset \. Enna\b/gi, "Priset för denna"],
    [/\bPriset \.\b/gi, "Priset för denna"],
    [/\b\. Enna\b/gi, ". Denna"],
    [/\bmed , med\b/gi, "med"],
    [/\bmed rymd\b/gi, "med god rymd"],
    [/\bmed mer plats \./gi, "med mer plats."],
    [/\bär en perfekt plats \./gi, "passar bra."],
    [/\bperfekt plats \./gi, "bra plats."],
    [/\bFamiljer\./gi, "familjer."],
    // Nya trasiga ord från output
    [/\bsprojsade\b/gi, "spröjsade"],
    [/\bTt skapa\b/gi, "för att skapa"],
    [/\bTt ge\b/gi, "för att ge"],
    [/\b. Tt\b/gi, ". För att"],
    [/\b. Vkoppling\b/gi, ". För avkoppling"],
    [/\b. Mgänge\b/gi, ". För umgänge"],
    [/\b. Kad komfort\b/gi, ". Komfort"],
    [/\b. En \./gi, ". En "],
    [/\b. Med\b/gi, ". Med"],
    [/\b. Villan är passar\b/gi, ". Villan passar"],
    [/\b. Villan har även\b/gi, ". Villan har"],
    [/\b. Området är familjevänligt och har en\b/gi, ". Området är familjevänligt"],
    [/\b. Med närhet till kollektivtrafik\b/gi, ". Med närhet till kollektivtrafik"],
    // Fixa ofullständiga meningar
    [/\bMaterialvalet är noggrant utvalda\b/gi, "Materialen är noggrant utvalda"],
    [/\bSovrummen är utformade\b/gi, "Sovrummen är utformade"],
    [/\bTerrassen vetter mot söder\b/gi, "Terrassen vetter mot söder"],
    [/\bDen är passar soliga dagar\b/gi, "Den passar för soliga dagar"],
    [/\bDet finns ett nybyggt uterum\b/gi, "Det finns ett nybyggt uterum"],
    [/\bVillan har även golvvärme\b/gi, "Villan har golvvärme"],
    [/\bDen generösa takhöjden bidrar till\b/gi, "Den höga takhöjden bidrar till"],
    [/\bDen generösa takhöjden\b/gi, "Den höga takhöjden"],
    // Fixa "Tt" i början av meningar
    [/\bTt\b/gi, "för att"],
    // Fixa ". En" och ". Med" i slutet av meningar
    [/\b\. En\b/gi, ". En"],
    [/\b\. Med\b/gi, ". Med"],
    // Fixa "Enna" till "Denna"
    [/\bEnna\b/gi, "Denna"],
    // Fixa "Vkoppling" till "Avkoppling"
    [/\bVkoppling\b/gi, "Avkoppling"],
    // Fixa "Mgänge" till "umgänge"
    [/\bMgänge\b/gi, "umgänge"],
    // Fixa "Kad" till "med"
    [/\bKad komfort\b/gi, "med komfort"],
  ];

  for (const [regex, replacement] of brokenWordFixes) {
    cleaned = cleaned.replace(regex, replacement);
  }

  // Sedan: Ersätt förbjudna fraser
  for (const [phrase, replacement] of PHRASE_REPLACEMENTS) {
    const regex = new RegExp(phrase, "gi");
    cleaned = cleaned.replace(regex, replacement);
  }

  // Ta bort dubbla mellanslag
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  // Ta bort meningar som börjar med tomt efter ersättning
  cleaned = cleaned.replace(/\.\s*\./g, ".").replace(/,\s*,/g, ",");
  // Fixa meningar som börjar med liten bokstav efter borttagning
  cleaned = cleaned.replace(/\.\s+([a-zåäö])/g, (match, letter) => `. ${letter.toUpperCase()}`);
  // Ta bort meningar som bara är ett ord eller tomma
  cleaned = cleaned.replace(/\.\s*\./g, ".");
  // Fixa "Priset . Enna" -> "Priset för denna"
  cleaned = cleaned.replace(/Priset \. Enna/gi, "Priset för denna");
  cleaned = cleaned.replace(/\. Enna/gi, ". Denna");

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
    "forbidden_phrases": ["erbjuder", "perfekt för", "i hjärtat av", "vilket gör det", "för den som", "drömboende", "luftig känsla", "fantastisk", "välkommen till"]
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

För BOTH: "i hjärtat av", "vilket gör det enkelt", "vilket", "som ger en", "rymlig känsla", "härlig plats för", "plats för avkoppling", "generösa ytor", "generös takhöjd", "bjuder på", "präglas av", "genomsyras av", "andas lugn", "andas charm", "erbjuder", "fantastisk", "perfekt", "drömboende", "en sann pärla", "Välkommen", "Här finns", "här kan du", "faciliteter", "njut av", "livsstil", "livskvalitet", "smakfullt", "stilfullt", "elegant", "exklusivt", "imponerande", "harmonisk", "inbjudande", "tidlös", "ljus och luftig", "stilrent och modernt", "mysigt och ombonat", "inte bara", "utan också", "bidrar till", "förstärker", "skapar en känsla", "-möjligheter", "Det finns även", "Det finns också"

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
      text: "Kyrkogatan 8, 3 tr, Västerås. Etta om 34 kvm med nymålade väggar 2023.\n\nÖppen planlösning med kök och vardagsrum i samma rum. Köket har spis, kyl och frys. Förvaring i väggskåp.\n\nLaminatgolv. Fönstren är nya med bra ljusinsläpp.\n\nBadrummet är helkaklat och renoverat 2022 med dusch, wc och handfat.\n\n5 minuter till tågstationen. ICA Nära i kvarteret.",
      metadata: { type: "lägenhet", rooms: 1, size: 34 }
    },
    {
      text: "Andra Långgatan 15, 2 tr, Göteborg. Tvåa om 48 kvm med balkong mot gården.\n\nHallen har garderob. Vardagsrummet har två fönster och takhöjd 2,60 meter. Ekparkett genomgående.\n\nKöket har vita luckor och vitvaror från Electrolux 2020. Plats för två vid fönstret.\n\nSovrummet rymmer dubbelsäng. Badrummet är helkaklat med dusch och tvättmaskin.\n\nBalkongen på 3 kvm vetter mot väster. Avgift 3 200 kr/mån.\n\nSpårvagn Järntorget 2 minuter. Coop på Andra Långgatan.",
      metadata: { type: "lägenhet", rooms: 2, size: 48 }
    },
    {
      text: "Nygatan 22, 4 tr, Norrköping. Tvåa om 42 kvm med balkong mot innergården.\n\nHall med hatthylla. Vardagsrummet har fönster åt söder och ekparkett.\n\nKöket har vita luckor och Electrolux-vitvaror. Diskmaskin. Matplats för två.\n\nSovrummet rymmer 120-säng och har garderob. Badrummet renoverat 2021 med dusch och tvättmaskin.\n\nBalkong 2 kvm mot söder. BRF Stadshagen, avgift 2 900 kr/mån.\n\nResecentrum 5 minuter. Willys Hemma 200 meter.",
      metadata: { type: "lägenhet", rooms: 2, size: 42 }
    },
    {
      text: "Storgatan 45, 1 tr, Jönköping. Etta om 28 kvm med sjöutsikt.\n\nÖppen planlösning. Köket har nya vitvaror och laminatbänk. Kyl, frys och spis.\n\nBadrummet helkaklat med dusch. Laminatgolv.\n\nFönster mot Vättern. BRF Sjögläntan, avgift 2 400 kr/mån.\n\nBuss till centrum 3 minuter. ICA 400 meter.",
      metadata: { type: "lägenhet", rooms: 1, size: 28 }
    }
  ],

  // MELLANSTORA LÄGENHETER (2-3 rum, 55-85 kvm)
  medium_apartment: [
    {
      text: "Drottninggatan 42, 4 tr, Uppsala. Trea om 74 kvm med genomgående planlösning.\n\nHallen har garderob. Vardagsrummet mot gatan har tre fönster och takhöjd 2,85 meter. Ekparkett genomgående.\n\nKöket är renoverat 2021 med luckor från Ballingslöv och bänkskiva i komposit. Vitvaror från Siemens. Plats för matbord vid fönstret.\n\nSovrummet mot gården rymmer dubbelsäng och har garderob. Det mindre rummet fungerar som arbetsrum. Badrummet är helkaklat, renoverat 2019, med dusch och tvättmaskin.\n\nBalkongen på 5 kvm vetter mot söder. BRF Solgården har stambyte 2018. Avgift 4 100 kr/mån.\n\nCentralstationen 8 minuters promenad. ICA Nära i kvarteret. Stadsparken 200 meter.",
      metadata: { type: "lägenhet", rooms: 3, size: 74 }
    },
    {
      text: "Rönnvägen 12, 1 tr, Malmö. Tvåa om 62 kvm med balkong i söderläge.\n\nHallen har platsbyggd garderob. Vardagsrummet har stort fönsterparti och takhöjd 2,55 meter. Laminatgolv genomgående.\n\nKöket har bänkskiva i laminat och vitvaror från Bosch 2022. Matplats för fyra vid fönstret.\n\nSovrummet rymmer dubbelsäng och har garderob med skjutdörrar. Badrummet är helkaklat med dusch, wc och tvättmaskin. Golvvärme.\n\nBalkongen på 4 kvm vetter mot söder. Avgift 3 650 kr/mån.\n\nBuss 5 minuter till Triangeln. Coop 300 meter. Pildammsparken 10 minuters promenad.",
      metadata: { type: "lägenhet", rooms: 2, size: 62 }
    },
    {
      text: "Vasagatan 18, 3 tr, Linköping. Trea om 78 kvm. Byggår 1945, stambyte 2020.\n\nHall med garderob och klinker. Vardagsrummet har två fönster mot gatan. Takhöjd 2,80 meter. Ekparkett.\n\nKöket renoverat 2020 med Kvik-luckor och Bosch-vitvaror. Bänkskiva i sten. Matplats för fyra.\n\nHuvudsovrummet rymmer dubbelsäng. Det andra sovrummet passar som barnrum eller kontor. Badrummet helkaklat med badkar och tvättmaskin.\n\nBalkong 4 kvm mot gården. BRF Eken, avgift 4 500 kr/mån.\n\nResecentrum 6 minuter. Hemköp i kvarteret.",
      metadata: { type: "lägenhet", rooms: 3, size: 78 }
    },
    {
      text: "Bergsgatan 9, 2 tr, Örebro. Tvåa om 58 kvm med nytt kök.\n\nHall med förvaring. Vardagsrummet har fönster i två väderstreck och laminatgolv.\n\nKöket nytt 2023 med IKEA-stomme och Siemens-vitvaror. Matplats vid fönstret.\n\nSovrummet rymmer dubbelsäng och har garderob. Badrummet med dusch och tvättmaskin.\n\nIngen balkong. BRF Svalan, avgift 3 100 kr/mån. Stambyte planerat 2026.\n\nCentrum 5 minuters promenad. Tågstation 8 minuter.",
      metadata: { type: "lägenhet", rooms: 2, size: 58 }
    }
  ],

  // STORA LÄGENHETER (4+ rum, 85+ kvm)
  large_apartment: [
    {
      text: "Kungsgärdsgatan 7, 2 tr, Uppsala. Fyra om 105 kvm med balkong i västerläge.\n\nHallen har platsbyggd garderob och klinker. Vardagsrummet har tre fönster och takhöjd 2,70 meter. Ekparkett genomgående.\n\nKöket är från Marbodal 2020 med stenbänkskiva och vitvaror från Siemens. Plats för matbord för sex.\n\nHuvudsovrummet rymmer dubbelsäng och har garderob. Två mindre sovrum. Badrummet är helkaklat med badkar och dusch. Separat toalett.\n\nBalkongen på 8 kvm vetter mot väster. BRF Kungsparken har stambyte 2020. Avgift 5 800 kr/mån.\n\nCentralstationen 5 minuter. Coop Forum 400 meter.",
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
      text: "Tallvägen 8, Djursholm. Villa om 180 kvm på tomt om 920 kvm. Byggår 1962, tillbyggd 2015.\n\nEntréplan har hall, vardagsrum med eldstad, kök och ett sovrum. Köket är från HTH 2015 med bänkskiva i granit och induktionshäll. Vardagsrummet har utgång till altanen.\n\nÖvervåningen har tre sovrum och badrum med badkar och golvvärme. Huvudsovrummet har garderob och fönster åt två håll.\n\nKällaren har tvättstuga, förråd och ett extra rum. Altanen i västerläge är 25 kvm med pergola. Dubbelgarage och uppfart för två bilar.\n\nDjursholms samskola 600 meter. Mörby centrum 10 minuters promenad.",
      metadata: { type: "villa", rooms: 5, size: 180 }
    },
    {
      text: "Björkvägen 14, Löddeköpinge. Villa om 145 kvm på tomt om 750 kvm. Byggår 1978, renoverad 2021.\n\nEntréplan har hall, vardagsrum, kök och badrum. Köket är från IKEA 2021 med vitvaror från Bosch. Öppen planlösning mot vardagsrummet.\n\nÖvervåningen har fyra sovrum. Badrummet är helkaklat med dusch och badkar.\n\nTomten har gräsmatta, stenlagd uteplats i söderläge och garage. Förråd på 12 kvm.\n\nLöddeköpinge skola 400 meter. Willys 5 minuters promenad. Malmö 15 minuter med bil.",
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
      text: "Solnavägen 23, Solna. Radhus om 120 kvm med 4 rum och kök.\n\nBottenvåningen har kök och vardagsrum i öppen planlösning. Köket är från IKEA 2021 med vitvaror från Bosch. Utgång till trädgården från vardagsrummet.\n\nÖvervåningen har tre sovrum och badrum. Huvudsovrummet har walk-in-closet. Badrummet är helkaklat med dusch. Laminatgolv genomgående.\n\nTrädgården har gräsmatta och uteplats i söderläge. Förråd 10 kvm. Carport för två bilar.\n\nSkola och förskola i promenadavstånd. Matbutik 300 meter.",
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
const HEMNET_TEXT_PROMPT = `Du är en erfaren svensk mäklare med 15 år i branschen. Du skriver Hemnet-annonser som faktiskt säljer — klyschfritt, specifikt, mänskligt. Studera MATCHADE EXEMPEL i user-meddelandet och imitera stilen.

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

# STILREGLER
- Första meningen: gatuadress + typ + kvm. Punkt. Klar.
- Varje mening = ETT nytt faktum. Noll utfyllnad.
- Rumsnamnet startar meningen: "Köket har...", "Balkongen vetter...", "Hallen har..."
- INGA adjektiv som "fantastisk", "generös", "underbar", "perfekt"
- INGA bisatser med "vilket", "som ger en", "där man kan"
- INGA "Det finns" eller "Den har" som meningsstart (max 1 gång i hela texten)
- Avstånd varieras: "8 minuters promenad", "i kvarteret", "200 meter", "15 min med bil"
- Slutar med LÄGE — aldrig med känsla eller uppmaning

# FÖRBJUDET
erbjuder, bjuder på, präglas av, genomsyras av, generös, fantastisk, perfekt, idealisk, underbar, magisk, unik, dröm-, en sann pärla, faciliteter, njut av, livsstil, livskvalitet, hög standard, smakfullt, stilfullt, elegant, exklusivt, omsorgsfullt, genomtänkt, imponerande, harmonisk, inbjudande, lockande, inspirerande, karaktärsfull, tidlös, betagande
vilket, som ger en, för den som, i hjärtat av, skapar en, bidrar till, förstärker, adderar, inte bara...utan också
kontakta oss, boka visning, missa inte, välkommen till, välkommen hem, här finns, här kan du
ljus och luftig, stilrent och modernt, mysigt och ombonat (alla "X och Y"-adjektivpar)
Det finns även, Det finns också, -möjligheter (förvaringsmöjligheter etc)

# MENINGSRYTM
- Starta VARJE mening med ett NYTT subjekt: rumsnamn, material, platsnamn, årtal
- BRA: "Köket har...", "Ekparkett genomgående.", "Balkong 5 kvm.", "Centralstationen 8 min."
- DÅLIGT: "Det finns golvvärme.", "Den har garderob.", "Det finns även förråd."
- VARIERA meningslängd: 4–12 ord. Blanda korta fakta med lite längre.
- Max 1 bisats per stycke. Föredra punkt + ny mening.

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

INSTAGRAM (instagramCaption):
Skriv 4-6 meningar som känns som att en riktig mäklare skrivit dem för sin Instagram.
- Börja med gatunamnet och den starkaste säljpunkten direkt
- Lägg till EN mening om läget (nämn specifikt stadsdelens karaktär om det finns i datan)
- Avsluta med storlek och pris OM det finns
- Inga emoji, inga utropstecken
- Ton: professionell men personlig — som om du just visat objektet och berättar för dina följare
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

1. Börja med gatuadressen. ALDRIG "Välkommen", "Här", "Denna", "I".
2. Hitta ALDRIG på. Varje påstående måste finnas i dispositionen — men SLUTLED gärna från fakta.
3. NOLL förbjudna ord. Noll "erbjuder", "bjuder på", "generös", "fantastisk", "vilket".
4. Varje mening = ny fakta. Noll utfyllnad. Noll upprepning.
5. VARIERA meningsstarter. Max 1x "Det finns" i hela texten.
6. Sista stycket = LÄGE. Aldrig känsla, aldrig uppmaning.
7. De extra texterna (Instagram, visning, kortannons) ska kännas mänskliga och specifika — inte som copy-paste från AI.
8. Generera ALLA fält i JSON.`;

// --- BOOLI/EGEN SIDA: World-class prompt med examples-first-teknik ---
const BOOLI_TEXT_PROMPT_WRITER = `Du är en erfaren svensk mäklare med 15 år i branschen. Du skriver objektbeskrivningar för Booli/egen mäklarsida — klyschfritt, specifikt, mänskligt. Studera MATCHADE EXEMPEL och imitera stilen. Booli tillåter mer detalj och pris.

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

# STILREGLER
- Gatuadress + typ + kvm i första meningen. Punkt.
- Varje mening = ETT nytt faktum. Noll utfyllnad.
- Rumsnamnet startar meningen. ALDRIG "Det finns" eller "Den har" som meningsstart (max 1x).
- INGA adjektiv: "fantastisk", "generös", "underbar", "perfekt" förekommer INTE.
- INGA bisatser: "vilket", "som ger en", "där man kan" förekommer INTE.
- Avstånd varieras: "5 minuter", "400 meter", "ca 10 minuters promenad"
- Slutar med LÄGE + PRIS — aldrig känsla

# FÖRBJUDET
erbjuder, bjuder på, präglas av, genomsyras av, generös, fantastisk, perfekt, idealisk, underbar, magisk, unik, dröm-, en sann pärla, faciliteter, njut av, livsstil, livskvalitet, hög standard, smakfullt, stilfullt, elegant, exklusivt, omsorgsfullt, genomtänkt, imponerande, harmonisk, inbjudande, tidlös
vilket, som ger en, för den som, i hjärtat av, skapar en, bidrar till, inte bara...utan också
kontakta oss, boka visning, missa inte, välkommen till, här finns, här kan du
ljus och luftig, stilrent och modernt, mysigt och ombonat (alla "X och Y"-adjektivpar)
Det finns även, Det finns också, -möjligheter (förvaringsmöjligheter etc)

# MENINGSRYTM
- Starta varje mening med NYTT subjekt: rumsnamn, material, platsnamn, årtal
- BRA: "Köket har...", "Ekparkett.", "Balkong 8 kvm.", "Coop 400 meter."
- DÅLIGT: "Det finns golvvärme.", "Den har garderob.", "Det finns även förråd."
- Max 1 bisats per stycke. Punkt + ny mening.

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

INSTAGRAM (instagramCaption):
Skriv 4-6 meningar som en riktig mäklare skulle skriva för sin Instagram.
- Börja med gatunamnet och objektets starkaste egenskap
- Nämn läget specifikt (stadsdelens karaktär, inte "centralt")
- Avsluta med storlek och pris OM det finns
- Inga emoji, inga utropstecken
- Ton: professionell men personlig, som om du just visat objektet
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

1. Börja med gatuadressen. ALDRIG "Välkommen", "Här", "Denna", "I".
2. Hitta ALDRIG på. Varje påstående måste finnas i dispositionen — men SLUTLED gärna från fakta.
3. NOLL förbjudna ord. Noll "erbjuder", "bjuder på", "generös", "fantastisk", "vilket".
4. Varje mening = ny fakta. Noll utfyllnad. Noll upprepning.
5. VARIERA meningsstarter. Max 1x "Det finns" i hela texten.
6. Sista stycket = LÄGE + PRIS. Aldrig känsla, aldrig uppmaning.
7. De extra texterna ska kännas mänskliga och specifika — inte som copy-paste från AI.
8. Generera ALLA fält i JSON.

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

  return candidates.slice(0, 2).map((ex) => ex.text);
}

// Bygg disposition direkt från strukturerad formulärdata — HOPPA ÖVER AI-extraktion
function buildDispositionFromStructuredData(pd: any): { disposition: any, tone_analysis: any, writing_plan: any } {
  const typeLabels: Record<string, string> = {
    apartment: "lägenhet", house: "villa", townhouse: "radhus", villa: "villa",
  };
  const propertyType = typeLabels[pd.propertyType] || pd.propertyType || "lägenhet";
  const size = Number(pd.livingArea) || 0;

  const disposition = {
    property: {
      type: propertyType,
      address: pd.address || "",
      size: size,
      rooms: Number(pd.totalRooms) || 0,
      bedrooms: Number(pd.bedrooms) || 0,
      floor: pd.floor || null,
      year_built: pd.buildYear || null,
      condition: pd.condition || null,
      energy_class: pd.energyClass || null,
      elevator: pd.elevator || false,
      materials: {
        floors: pd.flooring || null,
        kitchen: pd.kitchenDescription || null,
        bathroom: pd.bathroomDescription || null,
      },
      balcony: pd.balconyArea ? {
        exists: true, direction: pd.balconyDirection || null, size: `${pd.balconyArea} kvm`,
      } : { exists: false },
      layout: pd.layoutDescription || null,
      storage: pd.storage ? [pd.storage] : [],
      heating: pd.heating || null,
      parking: pd.parking || null,
      lot_area: pd.lotArea ? `${pd.lotArea} kvm` : null,
      garden: pd.gardenDescription || null,
      special_features: pd.specialFeatures ? pd.specialFeatures.split(/[,\n]+/).map((s: string) => s.trim()).filter(Boolean) : [],
      unique_selling_points: pd.uniqueSellingPoints || null,
      other_info: pd.otherInfo || null,
    },
    economics: {
      price: Number(pd.price) || null,
      fee: Number(pd.monthlyFee) || null,
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

  const tone_analysis = {
    price_category: priceCategory,
    target_audience: size > 100 ? "families" : size > 60 ? "couples" : "singles_couples",
    writing_style: "professional",
    key_selling_points: [
      pd.uniqueSellingPoints,
      pd.kitchenDescription ? "kök" : null,
      pd.balconyArea ? "balkong/uteplats" : null,
    ].filter(Boolean).slice(0, 3),
  };

  const writing_plan = {
    opening: `${pd.address} — ${propertyType} om ${size} kvm`,
    must_include: [
      pd.address && "adress", pd.livingArea && "storlek", pd.totalRooms && "rum",
      pd.kitchenDescription && "kök", pd.bathroomDescription && "badrum",
      pd.balconyArea && "balkong", pd.area && "läge",
    ].filter(Boolean),
    forbidden_phrases: ["erbjuder", "perfekt för", "i hjärtat av", "vilket", "för den som", "fantastisk", "välkommen"],
  };

  return { disposition, tone_analysis, writing_plan };
}

// Faktagranskning med korrigering — hitta fel OCH fixa dem
const FACT_CHECK_PROMPT = `
# UPPGIFT

Granska objektbeskrivningen mot dispositionen. Hitta fel och korrigera dem.

# REGLER

1. Kontrollera att ALLA fakta i texten finns i dispositionen
2. Ta bort påhittade detaljer (märken, mått, årtal som inte finns i rådata)
3. Ta bort juridiskt problematiska påståenden
4. Ta bort ALLA förbjudna AI-fraser
5. Behåll ALLA korrekta fakta från dispositionen
6. Skriv om texten för att vara 100% korrekt

# OUTPUT FORMAT (JSON)

{
  "fact_check_passed": true,
  "corrected_text": "Hela den korrigerade texten här",
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

          // Om nästa reset har passerat, lägg till en månad
          if (nextReset <= userNow) {
            nextReset.setMonth(nextReset.getMonth() + 1);
          }

          const resetTime = new Date(nextReset.getTime() + tzOffset * 60000);
          const plan = (user.plan as PlanType) || "free";
          const usage = await storage.getMonthlyUsage(userId) || {
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

      // Check usage limits for personal style analysis
      const usage = await storage.getMonthlyUsage(user.id) || {
        textsGenerated: 0,
        areaSearchesUsed: 0,
        textEditsUsed: 0,
        personalStyleAnalyses: 0,
      };

      const limits = PLAN_LIMITS[plan];
      if (usage.personalStyleAnalyses >= limits.personalStyleAnalyses) {
        return res.status(429).json({
          message: `Du har nått din gräns för personlig stil-analys. Uppgradera till Premium för obegränsad användning!`,
          limitReached: true,
          upgradeTo: "premium",
        });
      }

      const { referenceTexts, teamShared } = req.body;

      if (!referenceTexts || !Array.isArray(referenceTexts) || referenceTexts.length !== 3) {
        return res.status(400).json({ message: "Du måste ange exakt 3 exempeltexter" });
      }

      // Validera att varje text är minst 100 tecken
      for (const text of referenceTexts) {
        if (typeof text !== "string" || text.trim().length < 100) {
          return res.status(400).json({ message: "Varje exempeltext måste vara minst 100 tecken lång" });
        }
      }

      console.log("[Personal Style] Analyzing writing style from 3 reference texts...");

      // Analysera skrivstilen med AI
      const styleProfile = await analyzeWritingStyle(referenceTexts);

      console.log("[Personal Style] Style analysis completed:", styleProfile);

      // Spara till databasen
      const personalStyleData: InsertPersonalStyle = {
        userId: user.id,
        referenceTexts,
        styleProfile,
        isActive: true,
        teamShared: teamShared || false
      };

      const savedStyle = await storage.createPersonalStyle(personalStyleData);

      // Increment usage for personal style analysis
      await storage.incrementUsage(user.id, 'personalStyleAnalyses');
      console.log(`[Usage] Incremented personal style analysis for user ${user.id}`);

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
    try {
      const user = (req as any).user as User;
      const plan = (user.plan as PlanType) || "free";

      // Rate limit check (per minute)
      if (!(await checkOptimizeRateLimit(user.id))) {
        return res.status(429).json({
          message: "För många förfrågningar. Vänta en minut och försök igen.",
        });
      }

      // Check monthly usage limits
      const usage = await storage.getMonthlyUsage(user.id) || {
        textsGenerated: 0,
        areaSearchesUsed: 0,
        textEditsUsed: 0,
        personalStyleAnalyses: 0,
      };

      const limits = PLAN_LIMITS[plan];
      if (usage.textsGenerated >= limits.texts) {
        const upgradeMsg = plan === "free"
          ? `Du har nått din månadsgräns av ${limits.texts} genereringar. Uppgradera till Pro för 15 per månad!`
          : plan === "pro"
            ? `Du har nått din månadsgräns av ${limits.texts} genereringar. Uppgradera till Premium för 50 per månad!`
            : `Du har nått din månadsgräns av ${limits.texts} genereringar. Kontakta oss om du behöver mer.`;
        return res.status(429).json({
          message: upgradeMsg,
          limitReached: true,
          upgradeTo: plan === "free" ? "pro" : plan === "pro" ? "premium" : null,
        });
      }

      const { prompt, type, platform, writingStyle, wordCountMin, wordCountMax, imageUrls } = req.body;
      const style: "factual" | "balanced" | "selling" = (writingStyle === "factual" || writingStyle === "selling") ? writingStyle : "balanced";

      // Bestäm AI-modell baserat på plan
      const aiModel = (plan === "pro" || plan === "premium") ? "gpt-4o" : "gpt-4o-mini";

      // Konkurrentanalys (Pro + Premium-funktion) — använder disposition-data
      let competitorAnalysis = "";
      if (plan === "pro" || plan === "premium") {
        try {
          const pd = req.body.propertyData;
          const area = pd?.area || pd?.address?.split(",").pop()?.trim() || "";
          const propType = type || "lägenhet";
          const price = pd?.price || "";
          const size = pd?.livingArea || "";

          if (area || price) {
            console.log(`[Competitor Analysis] Analyzing: ${propType} in ${area}...`);
            const competitorMessages = [
              {
                role: "system" as const,
                content: `Du är en expert på svensk fastighetsmarknad. Ge KORTA, KONKRETA positioneringstips. Max 150 ord. Svara som punktlista.`
              },
              {
                role: "user" as const,
                content: `Objekt: ${propType}, ${size} kvm i ${area}. Pris: ${price} kr.

Ge mig exakt 3 punkter:
1. UNDVIK: En vanlig klyscha som konkurrenterna använder för denna typ av objekt
2. LYFT: En konkret detalj som sällan nämns men som köpare värdesätter
3. VINKEL: En positioneringsstrategi för just detta läge/typ`
              }
            ];

            const competitorCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: competitorMessages,
              max_tokens: 300,
              temperature: 0.3,
            });

            competitorAnalysis = competitorCompletion.choices[0]?.message?.content || "";
            console.log(`[Competitor Analysis] Done`);
          }
        } catch (e) {
          console.warn("[Competitor Analysis] Failed, continuing:", e);
        }
      }

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
            model: "gpt-4o",
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
            const extractionCompletion = await openai.chat.completions.create({
              model: aiModel,
              messages: extractionMessages,
              max_tokens: 2000,
              temperature: 0.1,
              response_format: { type: "json_object" },
            });
            extractionResult = safeJsonParse(extractionCompletion.choices[0]?.message?.content || "{}");
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

      // Enrichment: Intelligence modules (Pro/Premium)
      if (plan !== "free" && disposition?.property?.address) {
        try {
          const addr = disposition.property.address;
          // Geographic context — works with address string
          const geoContext = getGeographicContext(addr);
          if (geoContext) disposition.geo_context = geoContext;

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
        } catch (e) {
          console.warn("[Intelligence] Enrichment failed, continuing without:", e);
        }
      }

      // STEG 2: Skapa evidence-gated skrivplan med PLAN_PROMPT (Pro/Premium)
      if (plan !== "free") {
        try {
          console.log("[Step 2] Creating evidence-gated writing plan...");
          const planMessages = [
            { role: "system" as const, content: PLAN_PROMPT },
            {
              role: "user" as const,
              content: `DISPOSITION:\n${JSON.stringify(disposition, null, 2)}\n\nTONALITET:\n${JSON.stringify(toneAnalysis, null, 2)}\n\nPLATTFORM: ${platform}\nORDMÅL: ${targetWordMin}-${targetWordMax}`,
            },
          ];

          const planCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
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

      // Matcha exempel från EXAMPLE_DATABASE
      const matchedExamples = matchExamples(disposition, toneAnalysis);
      console.log(`[Step 2b] Matched ${matchedExamples.length} examples`);

      // Hämta personlig stil om den finns
      let personalStylePrompt = "";
      if (plan !== "free") {
        try {
          const personalStyle = await storage.getPersonalStyle(user.id);
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

      // Stilinstruktion baserat på mäklarens val
      const styleInstruction = style === "factual"
        ? `\n# TEXTSTIL: PM-STIL (STRIKT FAKTABASERAD)
Mäklaren vill ha ett faktadokument, inte en säljtext.
- Kronologisk rumsordning: hall → vardagsrum → kök → sovrum → badrum → uteplats → övrigt → läge
- Varje rum = max 2 meningar. Bara mått, material, utrustning.
- INGA säljpunkter, INGA "lyfter", INGA betoning på fördelar.
- Avsluta med fakta om läge (avstånd/namn). Punkt. Slut.
- Tänk: besiktningsprotokoll skrivet av en människa, inte mäklare.\n`
        : style === "selling"
          ? `\n# TEXTSTIL: SÄLJANDE (KLYSCHFRITT ÖVERTYGANDE)
Mäklaren vill maximera intresset — men UTAN klyschor.
- Öppna med de 1-2 starkaste konkreta säljpunkterna (inte känsla, utan fakta som säljer: "Balkong i söderläge 8 kvm" > "fantastisk balkong").
- Betona det som gör objektet unikt TIDIGT — inte sist.
- Välj aktivt VAD du lyfter: hoppa snabbt förbi svaga delar, ge mer utrymme åt starka.
- Sista stycke: läge + en konkret köparnytta (pendlingstid, skola, affär).
- Fortfarande noll klyschor. Sälj med fakta, inte adjektiv.\n`
          : `\n# TEXTSTIL: BALANSERAD (STANDARD)
Fakta i fokus men med naturlig rytm. Lyfter rätt saker utan att sälja hårt.\n`;

      // Typspecifika negativa/positiva exempel
      const propType = (disposition?.property?.type || "lägenhet").toLowerCase();
      let negativeExample: string;
      let positiveExample: string;

      if (propType.includes("villa") || propType.includes("hus")) {
        negativeExample = `"Välkommen till denna fantastiska villa som erbjuder generösa ytor och en ljus och luftig atmosfär. Huset präglas av en genomtänkt planlösning som bjuder på en harmonisk känsla av rymd. Trädgården erbjuder en grön oas perfekt för den som söker lugn och avkoppling. Den strategiskt placerade villan ger en unik möjlighet att njuta av natursköna omgivningar. Kontakta oss för visning!"`;
        positiveExample = `"Björkvägen 14, Löddeköpinge. Villa om 145 kvm på tomt om 750 kvm. Byggår 1978, renoverad 2021.\n\nEntréplan med hall, vardagsrum, kök och badrum. Köket från IKEA 2021 med Bosch-vitvaror. Öppen planlösning mot vardagsrummet.\n\nÖvervåning med fyra sovrum. Helkaklat badrum med dusch och badkar.\n\nStenlagd uteplats i söderläge. Gräsmatta. Garage. Förråd 12 kvm.\n\nLöddeköpinge skola 400 meter. Willys ca 5 minuters promenad. Malmö 15 min med bil."`;
      } else if (propType.includes("radhus")) {
        negativeExample = `"Välkommen till detta charmiga och välplanerade radhus som erbjuder en perfekt kombination av modern komfort och klassisk charm. Den genomtänkta planlösningen bjuder på generösa ytor som skapar en harmonisk känsla. Trädgården erbjuder en härlig plats för avkoppling och sociala tillställningar. Kontakta oss för visning!"`;
        positiveExample = `"Solnavägen 23, Solna. Radhus om 120 kvm med 4 rum och kök.\n\nBottenvåning med kök och vardagsrum i öppen planlösning. Köket från IKEA 2021 med Bosch-vitvaror. Utgång till trädgården.\n\nÖvervåning med tre sovrum och badrum. Huvudsovrummet har walk-in-closet. Badrummet helkaklat med dusch. Laminatgolv.\n\nTrädgård med gräsmatta och uteplats i söderläge. Förråd 10 kvm. Carport.\n\nSkola och förskola i promenadavstånd. Matbutik 300 meter."`;
      } else {
        negativeExample = `"Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en ljus och luftig atmosfär. Bostaden präglas av en genomtänkt planlösning som bjuder på en harmonisk känsla. Köket erbjuder gott om arbetsyta vilket gör det perfekt för den matlagningsintresserade. Kontakta oss för visning!"`;
        positiveExample = `"Storgatan 12, 3 tr, Linköping. Trea om 76 kvm med balkong i söderläge.\n\nHallen har garderob. Vardagsrummet har tre fönster och ekparkett. Takhöjd 2,70 meter.\n\nKöket renoverat 2022 med Ballingslöv-luckor och Siemens-vitvaror. Matplats för fyra.\n\nSovrummet rymmer dubbelsäng. Badrummet helkaklat med dusch och tvättmaskin.\n\nBalkong 4 kvm i söderläge. BRF Storgården, avgift 3 900 kr/mån.\n\nResecentrum 5 minuter. Coop 200 meter."`;
      }

      // Instruktion om intelligence-data om den finns
      let intelligenceInstruction = "";
      if (toneAnalysis.market_position) {
        intelligenceInstruction += `\nMARKNADSPOSITION: Segmentet är "${toneAnalysis.market_position.segment}". Anpassa detaljnivå: luxury=fler material/märken, budget=fokus läge/potential.\n`;
      }
      if (toneAnalysis.architectural_value?.era) {
        intelligenceInstruction += `ARKITEKTUR-EPOK: ${toneAnalysis.architectural_value.era.name || ""}. Nämn husepoken korrekt om det passar.\n`;
      }
      if (toneAnalysis.market_trends) {
        intelligenceInstruction += `MARKNADSTREND: Använd trenddata för att lyfta rätt säljpunkter.\n`;
      }

      const textMessages = [
        {
          role: "system" as const,
          content: `${personalStylePrompt}\n\n${textPrompt}${styleInstruction}`,
        },
        {
          role: "user" as const,
          content: `DISPOSITION:\n${JSON.stringify(disposition, null, 2)}\n\nTONALITET:\n${JSON.stringify(toneAnalysis, null, 2)}\n\nSKRIVPLAN:\n${JSON.stringify(writingPlan, null, 2)}\n\nORDMÅL: ${targetWordMin}-${targetWordMax} ord\n\nPLATTFORM: ${platform}\n\n${intelligenceInstruction}${competitorAnalysis ? `KONKURRENTANALYS:\n${competitorAnalysis}\n\n` : ""}${imageAnalysis ? `BILDANALYS:\n${imageAnalysis}\n\n` : ""}MATCHADE EXEMPEL (imitera stilen EXAKT):\n${matchedExamples.join("\n\n---\n\n")}\n\nNEGATIVT EXEMPEL (skriv ALDRIG så här):\n${negativeExample}\n\nPOSITIVT EXEMPEL (skriv exakt så här):\n${positiveExample}`,
        },
      ];

      console.log("[Step 3] Generating text with full prompt engineering...");

      const textCompletion = await openai.chat.completions.create({
        model: aiModel,
        messages: textMessages,
        max_tokens: 3000,
        temperature: 0.25,
        response_format: { type: "json_object" },
      });

      let result: any;
      try {
        result = safeJsonParse(textCompletion.choices[0]?.message?.content || "{}");
      } catch (e) {
        console.error("[Step 3] Failed to parse AI response:", e);
        result = { improvedPrompt: prompt };
      }

      // STEG 4: Post-processing — rensa förbjudna fraser + lägg till stycken
      if (result.improvedPrompt) {
        result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt);
        result.improvedPrompt = addParagraphs(result.improvedPrompt);
      }
      // Rensa alla extra textfält också
      for (const field of ['socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd', 'headline']) {
        if (result[field]) {
          result[field] = cleanForbiddenPhrases(result[field]);
        }
      }

      // STEG 5: Validering + kirurgisk korrigering
      const violations = validateOptimizationResult(result, platform, targetWordMin, targetWordMax);
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
              model: "gpt-4o-mini",
              messages: correctionMessages,
              max_tokens: 3000,
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
                result.improvedPrompt = cleanForbiddenPhrases(corrected.corrected_text);
                result.improvedPrompt = addParagraphs(result.improvedPrompt);
                console.log(`[Step 5] Surgical correction applied (${textViolations.length} violations fixed, ${wordDiff} words changed)`);
              } else {
                console.warn(`[Step 5] Correction changed too much (${Math.round(wordDiff / originalWords * 100)}%), keeping original`);
                // Kör ändå cleanForbiddenPhrases som fallback
                result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt);
              }
            }
          }
        } catch (e) {
          console.warn("[Step 5] AI correction failed, using original:", e);
        }
      }

      // STEG 6: Faktagranskning (Pro/Premium)
      let factCheckResult: any = null;
      if (plan !== "free" && result.improvedPrompt) {
        try {
          const factCheckMessages = [
            { role: "system" as const, content: FACT_CHECK_PROMPT },
            {
              role: "user" as const,
              content: `DISPOSITION:\n${JSON.stringify(disposition, null, 2)}\n\nGENERERAD TEXT:\n${result.improvedPrompt}`,
            },
          ];

          const factCheckCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: factCheckMessages,
            max_tokens: 1500,
            temperature: 0.1,
            response_format: { type: "json_object" },
          });

          factCheckResult = safeJsonParse(factCheckCompletion.choices[0]?.message?.content || "{}");

          if (factCheckResult.corrected_text && !factCheckResult.fact_check_passed) {
            result.improvedPrompt = cleanForbiddenPhrases(factCheckResult.corrected_text);
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
            model: "gpt-4o-mini",
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

      // Increment usage after successful generation
      await storage.incrementUsage(user.id, 'texts');
      console.log(`[Usage] Incremented text generation for user ${user.id}`);

      const tips = result.text_tips || result.pro_tips || [];
      res.json({
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
        showingInvitation: result.showingInvitation || null,
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
          fact_check_passed: violations.length === 0,
          issues: violations.map(v => ({ quote: v, reason: "" })),
          quality_score: null,
          broker_tips: [],
        },
        wordCount: (result.improvedPrompt || "").split(/\s+/).filter(Boolean).length,
      });
    } catch (err: any) {
      console.error("Optimize error:", err);
      res.status(500).json({ message: err.message || "Optimering misslyckades" });
    }
  });


  // ── AI REWRITE: Inline text editing ──
  app.post("/api/rewrite", requireAuth, async (req, res) => {
    const rewriteUser = (req as any).user as User;
    if ((rewriteUser.plan as PlanType) === "free") {
      return res.status(403).json({ message: "Text-omskrivning är endast för Pro/Premium-användare" });
    }
    try {
      const { selectedText, fullText, instruction } = req.body;
      if (!selectedText || !fullText || !instruction) {
        return res.status(400).json({ message: "Markerad text, fulltext och instruktion krävs" });
      }

      const rewriteCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system" as const,
            content: `Du är en erfaren svensk mäklare med 15 år i branschen. Du skriver om delar av objektbeskrivningar på begäran — klyschfritt, specifikt, mänskligt.

# DIN UPPGIFT
Skriv om den markerade texten enligt instruktionen. Behåll stilen från hela texten.

# RIKTIG MÄKLARSTIL — SÅ HÄR LÅTER DET
BRA: "Balkongen vetter mot söder. Köket renoverat 2021 med Ballingslöv-luckor. Skolan 400 meter."
BRA: "Takhöjd 2,85 meter. Ekparkett genomgående. Hall med garderob."
BRA: "Två sovrum. Huvudsovrummet rymmer dubbelsäng med nattduksbord."
DÅLIGT: "En fantastisk balkong som erbjuder sol hela dagen och ger en harmonisk känsla."
DÅLIGT: "Köket är genomtänkt och stilfullt renoverat vilket gör det perfekt för den matlagningsintresserade."

# FÖRBJUDET — ALDRIG DESSA ORD
erbjuder, bjuder på, präglas av, generös, fantastisk, perfekt, idealisk, underbar, magisk, unik
vilket, som ger en, för den som, i hjärtat av, skapar en, bidrar till, förstärker
inbjudande, harmonisk, tidlös, smakfullt, stilfullt, elegant, exklusivt, imponerande
ljus och luftig, stilrent och modernt, mysigt och ombonat (alla "X och Y"-adjektivpar)
njut av, faciliteter, livsstil, livskvalitet, hög standard, inte bara, utan också
Det finns även, Det finns också, -möjligheter

# REGLER
1. Skriv om BARA den markerade texten — inte resten
2. Behåll ALLA fakta. HITTA ALDRIG PÅ ny fakta som inte finns i originaltexten
3. Korta, direkta meningar. Presens. Varje mening = ett nytt faktum.
4. "Gör mer säljande" = lyft de starkaste befintliga fakta tydligare, inte lägg till adjektiv
5. "Kondensera" = ta bort utfyllnad, behåll alla konkreta fakta
6. "Mer fakta" = be om fler detaljer OM det finns i kontexten — annars kondensera och stärk det som finns
7. Matcha stilen i hela texten exakt

Svara med JSON: {"rewritten": "den omskrivna texten"}`,
          },
          {
            role: "user" as const,
            content: `HELA TEXTEN (för kontext och stil):\n${fullText}\n\nMARKERAD TEXT ATT SKRIVA OM:\n"${selectedText}"\n\nINSTRUKTION: ${instruction}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.15,
        response_format: { type: "json_object" },
      });

      const raw = rewriteCompletion.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { parsed = { rewritten: selectedText }; }

      const rewritten = cleanForbiddenPhrases(parsed.rewritten || selectedText);

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

      // Check usage limits
      const usage = await storage.getMonthlyUsage(user.id) || {
        textsGenerated: 0,
        areaSearchesUsed: 0,
        textEditsUsed: 0,
        personalStyleAnalyses: 0,
      };

      const limits = PLAN_LIMITS[plan];
      if (usage.areaSearchesUsed >= limits.areaSearches) {
        return res.status(429).json({
          message: `Du har nått din gräns för adress-sökningar. Uppgradera till Premium för obegränsad användning!`,
          limitReached: true,
          upgradeTo: "premium",
        });
      }

      const { address } = req.body;
      if (!address) return res.status(400).json({ message: "Adress krävs" });

      // OpenStreetMap: Nominatim + Overpass API (FREE)
      console.log("[Address Lookup] Using OpenStreetMap APIs");

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

        // Increment usage BEFORE sending response (atomic)
        await storage.incrementUsage(user.id, 'areaSearches');
        console.log(`[Usage] Incremented area search for user ${user.id} (OpenStreetMap)`);

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

  // Temporary admin password reset (remove after use)
  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email och lösenord krävs" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      // Hash new password
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await storage.updatePassword(user.id, passwordHash);

      console.log("[Admin Reset] Password updated for user:", user.id);
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

      console.log("[Stripe Checkout] User authenticated:", user.id, user.email);

      const priceId = tier === "pro" ? STRIPE_PRO_PRICE_ID : STRIPE_PREMIUM_PRICE_ID;
      if (!priceId) {
        console.error("[Stripe Checkout] Price ID not configured for tier:", tier);
        return res.status(500).json({ message: "Stripe price not configured" });
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
        return res.status(400).json({ message: "No subscription found" });
      }

      const baseUrl = (process.env.APP_URL || 'https://optiprompt.se').replace(/\/+$/, '');

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/app`,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("Portal error:", err);
      res.status(500).json({ message: err.message || "Could not open portal" });
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
            console.log(`User ${userId} upgraded to ${targetPlan}`);

            // Send subscription confirmation email
            try {
              const user = await storage.getUserById(userId);
              if (user) {
                const { sendSubscriptionConfirmedEmail } = await import('./email');
                const planLabel = targetPlan === 'premium' ? 'Premium' : 'Pro';
                const planPrice = targetPlan === 'premium' ? '599' : '299';
                await sendSubscriptionConfirmedEmail(user.email, planLabel, planPrice, user.email);
                console.log(`[Stripe Webhook] Confirmation email sent to ${user.email}`);
              }
            } catch (emailErr) {
              console.error('[Stripe Webhook] Failed to send confirmation email:', emailErr);
            }
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
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = (invoice as any).subscription;
          if (subscriptionId) {
            await storage.downgradeUserToFree(subscriptionId as string);
            console.log(`Payment failed for subscription ${subscriptionId}`);
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
        return res.status(400).json({ message: "Team name is required" });
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
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const team = await storage.getTeamById(teamId);
      res.json(team);
    } catch (err) {
      console.error("Get team error:", err);
      res.status(500).json({ message: "Failed to get team" });
    }
  });

  app.get("/api/teams/:id/members", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const members = await storage.getTeamMembers(teamId);
      res.json(members);
    } catch (err) {
      console.error("Get team members error:", err);
      res.status(500).json({ message: "Failed to get team members" });
    }
  });

  app.post("/api/teams/:id/invite", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return res.status(403).json({ message: "Only owners and admins can invite members" });
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
        console.log("[Invite] Team invite email sent to:", invite.email);
      }

      res.json({ token: invite.token, email: invite.email, emailSent: true });
    } catch (err) {
      console.error("Create invite error:", err);
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.post("/api/teams/join/:token", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { token } = req.params;

      const invite = await storage.getInviteByToken(token);
      if (!invite) {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }

      if (new Date(invite.expiresAt) < new Date()) {
        await storage.deleteInvite(invite.id);
        return res.status(410).json({ message: "This invite has expired" });
      }

      if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ message: "This invite is for a different email address" });
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
      res.status(500).json({ message: "Failed to join team" });
    }
  });

  app.get("/api/teams/:id/prompts", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const prompts = await storage.getTeamSharedPrompts(teamId);
      res.json(prompts);
    } catch (err) {
      console.error("Get team prompts error:", err);
      res.status(500).json({ message: "Failed to get prompts" });
    }
  });

  app.post("/api/teams/:id/prompts", requirePro, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const teamId = parseInt(req.params.id);
      const { title, content, category } = req.body;

      const membership = await storage.getUserTeamMembership(user.id, teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
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
      res.status(500).json({ message: "Failed to create prompt" });
    }
  });

  app.patch("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const existingPrompt = await storage.getSharedPromptById(promptId);
      if (!existingPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, existingPrompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const prompt = await storage.updateSharedPrompt(promptId, req.body);
      res.json(prompt);
    } catch (err) {
      console.error("Update prompt error:", err);
      res.status(500).json({ message: "Failed to update prompt" });
    }
  });

  app.delete("/api/prompts/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const existingPrompt = await storage.getSharedPromptById(promptId);
      if (!existingPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, existingPrompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      if (!["owner", "admin"].includes(membership.role) && existingPrompt.creatorId !== user.id) {
        return res.status(403).json({ message: "Only team owners, admins, or the creator can delete prompts" });
      }

      await storage.deleteSharedPrompt(promptId);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete prompt error:", err);
      res.status(500).json({ message: "Failed to delete prompt" });
    }
  });

  app.get("/api/prompts/:id/comments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const comments = await storage.getPromptComments(promptId);
      res.json(comments);
    } catch (err) {
      console.error("Get comments error:", err);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  app.post("/api/prompts/:id/comments", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const promptId = parseInt(req.params.id);
      const { content } = req.body;

      const prompt = await storage.getSharedPromptById(promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      const membership = await storage.getUserTeamMembership(user.id, prompt.teamId);
      if (!membership) {
        return res.status(403).json({ message: "Not a member of this team" });
      }

      const comment = await storage.createComment({
        promptId,
        userId: user.id,
        content: content || "",
      });

      res.json(comment);
    } catch (err) {
      console.error("Create comment error:", err);
      res.status(500).json({ message: "Failed to create comment" });
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

      console.log(`[Admin] User ${targetUser.email} (${targetUser.id}) plan set to ${plan}`);

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
      res.status(500).json({ message: err.message || "Failed to set user plan" });
    }
  });

  // TEXTFÖRBÄTTRING - AI-assistent för att skriva om delar av texten
  app.post("/api/improve-text", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { originalText, selectedText, improvementType, context } = req.body;

      if (!selectedText || !improvementType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const plan = user.plan as PlanType;
      if (plan === "free") {
        return res.status(403).json({ message: "Denna funktion är endast för Pro/Premium-användare" });
      }

      console.log(`[Text Improvement] Improving text with type: ${improvementType}`);

      const improvementPrompts: Record<string, string> = {
        more_descriptive: `Gör denna text mer beskrivande genom att lyfta fram KONKRETA detaljer (material, mått, märken, läge). Behåll alla faktapåståenden exakt.`,
        more_selling: `Gör denna text mer säljande genom att lyfta fram KONKRETA fakta och mått. Ersätt vaga påståenden med specifika detaljer (märken, årtal, kvm). Inga klyschor.`,
        more_formal: `Gör denna text mer formell och professionell. Använd korrekta fastighetstermer. Inga AI-klyschor.`,
        more_warm: `Gör denna text mer personlig utan att förlora professionaliteten. Behåll alla faktapåståenden.`,
        fix_claims: `Ersätt klyschor och vaga påståenden med konkreta fakta. Inga "erbjuder", "bjuder på", "generös", "fantastisk", "perfekt".`
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

FÖRBJUDET: erbjuder, bjuder på, präglas av, generös, fantastisk, perfekt, vilket, för den som, drömboende, i hjärtat av, faciliteter, njut av, livsstil, smakfullt, elegant, exklusivt, imponerande, harmonisk, inbjudande, tidlös, inte bara, utan också.

Svara ENDAST med den förbättrade texten, inga förklaringar.`
        },
        {
          role: "user" as const,
          content: selectedText
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 500,
        temperature: 0.1,  // Sänkt från 0.7 för mer fakta-fokuserat
      });

      const rawImprovedText = completion.choices[0]?.message?.content || selectedText;
      const improvedText = cleanForbiddenPhrases(rawImprovedText.trim());

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
