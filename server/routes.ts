import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
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
  
  // Dela upp i stycken om ~3-4 meningar vardera
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];
  
  for (let i = 0; i < sentences.length; i++) {
    currentParagraph.push(sentences[i]);
    // Skapa nytt stycke efter 3-4 meningar
    if (currentParagraph.length >= 3 && i < sentences.length - 2) {
      paragraphs.push(currentParagraph.join(" "));
      currentParagraph = [];
    }
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
const EXAMPLE_DATABASE: Record<string, {text: string, metadata: {type: string, rooms: number, size: number}}[]> = {
  // SMÅ LÄGENHETER (1-2 rum, under 55 kvm)
  small_apartment: [
    {
      text: "Kyrkogatan 8, 3 tr, Västerås. Etta om 34 kvm med nymålade väggar 2023.\n\nÖppen planlösning med kök och vardagsrum i samma rum. Köket har spis, kyl och frys. Förvaring i väggskåp.\n\nLaminatgolv. Fönstren är nya med bra ljusinsläpp.\n\nBadrummet är helkaklat och renoverat 2022 med dusch, wc och handfat.\n\n5 minuter till tågstationen. ICA Nära i kvarteret.",
      metadata: { type: "lägenhet", rooms: 1, size: 34 }
    },
    {
      text: "Andra Långgatan 15, 2 tr, Göteborg. Tvåa om 48 kvm med balkong mot gården.\n\nHallen har garderob. Vardagsrummet har två fönster och takhöjd 2,60 meter. Ekparkett genomgående.\n\nKöket har vita luckor och vitvaror från Electrolux 2020. Plats för två vid fönstret.\n\nSovrummet rymmer dubbelsäng. Badrummet är helkaklat med dusch och tvättmaskin.\n\nBalkongen på 3 kvm vetter mot väster. Avgift 3 200 kr/mån.\n\nSpårvagn Järntorget 2 minuter. Coop på Andra Långgatan.",
      metadata: { type: "lägenhet", rooms: 2, size: 48 }
    }
  ],

  // MELLANSTORA LÄGENHETER (2-3 rum, 55-85 kvm)
  medium_apartment: [
    {
      text: "Drottninggatan 42, 4 tr, Uppsala. Trea om 74 kvm med genomgående planlösning.\n\nHallen har garderob. Vardagsrummet mot gatan har tre fönster och takhöjd 2,85 meter. Ekparkett genomgående.\n\nKöket är renoverat 2021 med luckor från Ballingslöv och bänkskiva i komposit. Vitvaror från Siemens. Plats för matbord vid fönstret.\n\nSovrummet mot gården rymmer dubbelsäng och har garderob. Det mindre rummet fungerar som arbetsrum. Badrummet är helkaklat, renoverat 2019, med dusch och tvättmaskin.\n\nBalkongen på 5 kvm vetter mot söder. BRF Solgården har stambyte 2018. Avgift 4 100 kr/mån.\n\nCentralstationen 8 minuters promenad. ICA Nära i kvarteret. Stadstradgarden 200 meter.",
      metadata: { type: "lägenhet", rooms: 3, size: 74 }
    },
    {
      text: "Rönnvägen 12, 1 tr, Malmö. Tvåa om 62 kvm med balkong i söderläge.\n\nHallen har platsbyggd garderob. Vardagsrummet har stort fönsterparti och takhöjd 2,55 meter. Laminatgolv genomgående.\n\nKöket har bänkskiva i laminat och vitvaror från Bosch 2022. Matplats för fyra vid fönstret.\n\nSovrummet rymmer dubbelsäng och har garderob med skjutdörrar. Badrummet är helkaklat med dusch, wc och tvättmaskin. Golvvärme.\n\nBalkongen på 4 kvm vetter mot söder. Avgift 3 650 kr/mån.\n\nBuss 5 minuter till Triangeln. Coop 300 meter. Pildammsparken 10 minuters promenad.",
      metadata: { type: "lägenhet", rooms: 2, size: 62 }
    }
  ],

  // STORA LÄGENHETER (4+ rum, 85+ kvm)
  large_apartment: [
    {
      text: "Kungsgärdsgatan 7, 2 tr, Uppsala. Fyra om 105 kvm med balkong i västerläge.\n\nHallen har platsbyggd garderob och klinker. Vardagsrummet har tre fönster och takhöjd 2,70 meter. Ekparkett genomgående.\n\nKöket är från Marbodal 2020 med stenbänkskiva och vitvaror från Siemens. Plats för matbord för sex.\n\nHuvudsovrummet rymmer dubbelsäng och har garderob. Två mindre sovrum. Badrummet är helkaklat med badkar och dusch. Separat toalett.\n\nBalkongen på 8 kvm vetter mot väster. BRF Kungsparken har stambyte 2020. Avgift 5 800 kr/mån.\n\nCentralstationen 5 minuter. Coop Forum 400 meter.",
      metadata: { type: "lägenhet", rooms: 4, size: 105 }
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
      text: "Granlundsvägen 3, Umeå. Villa om 160 kvm på tomt om 1 100 kvm. Byggår 1985.\n\nEntréplan ha hall, vardagsrum, kök och gästrum. Köket har vitvaror från Electrolux och bänkskiva i trä. Vardagsrummet har eldstad.\n\nÖvervåningen har tre sovrum och badrum med badkar. Huvudsovrummet har garderob.\n\nKällare med tvättstuga och förråd. Tomten har garage, gräsmatta och uteplats. Bergvärme.\n\nGrubbeskolan 300 meter. ICA Maxi 5 minuter med bil. E4:an 3 km.",
      metadata: { type: "villa", rooms: 5, size: 160 }
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
    }
  ]
};

// --- HEMNET FORMAT: World-class prompt med examples-first-teknik ---
const HEMNET_TEXT_PROMPT = `Du skriver Hemnet-annonser som Sveriges bästa mäklare. Studera exemplen nedan — imitera stilen EXAKT.

# SÅ HÄR LÅTER EN RIKTIG MÄKLARE (memorera rytmen)

EXEMPEL A — Lägenhet:
"Drottninggatan 42, 4 tr, Uppsala. Trea om 74 kvm med genomgående planlösning.

Hallen har garderob. Vardagsrummet mot gatan har tre fönster och takhöjd 2,85 meter. Ekparkett genomgående.

Köket renoverat 2021 med Ballingslöv-luckor, kompositbänk och Siemens-vitvaror. Matplats vid fönstret.

Sovrummet mot gården rymmer dubbelsäng och har garderob. Det mindre rummet fungerar som arbetsrum. Badrummet helkaklat, renoverat 2019, med dusch och tvättmaskin.

Balkong 5 kvm i söderläge. BRF Solgården, stambyte 2018. Avgift 4 100 kr/mån.

Centralstationen 8 minuters promenad. ICA Nära i kvarteret. Stadsparken 200 meter."

EXEMPEL B — Villa:
"Björkvägen 14, Löddeköpinge. Villa om 145 kvm på tomt om 750 kvm. Byggår 1978, renoverad 2021.

Entréplan med hall, vardagsrum, kök och badrum. Köket från IKEA 2021 med Bosch-vitvaror. Öppen planlösning mot vardagsrummet.

Övervåning med fyra sovrum. Helkaklat badrum med dusch och badkar.

Stenlagd uteplats i söderläge. Gräsmatta. Garage. Förråd 12 kvm.

Löddeköpinge skola 400 meter. Willys ca 5 minuters promenad. Malmö 15 min med bil."

# ANALYS AV EXEMPLEN — DET HÄR GÖR DEM BRA:
- Första meningen: gatuadress + typ + kvm. Punkt. Klar.
- Varje mening = ETT nytt faktum. Noll utfyllnad.
- Rumsnamnet startar meningen: "Köket har...", "Balkongen vetter...", "Hallen har..."
- INGA adjektiv som "fantastisk", "generös", "underbar", "perfekt"
- INGA bisatser med "vilket", "som ger en", "där man kan"
- INGA "Det finns" eller "Den har" som meningsstart (max 1 gång i hela texten)
- Avstånd varieras: "8 minuters promenad", "i kvarteret", "200 meter", "15 min med bil"
- Slutar med LÄGE — aldrig med känsla eller uppmaning

# FÖRBJUDET (använd ALDRIG dessa — de avslöjar AI direkt)
erbjuder, bjuder på, präglas av, genomsyras av, generös, fantastisk, perfekt, idealisk, underbar, magisk, unik, dröm-, en sann pärla, faciliteter, njut av, livsstil, livskvalitet, hög standard, smakfullt, stilfullt, elegant, exklusivt, omsorgsfullt, genomtänkt, imponerande, harmonisk, inbjudande, lockande, inspirerande, karaktärsfull, tidlös, betagande
vilket, som ger en, för den som, i hjärtat av, skapar en, bidrar till, förstärker, adderar, inte bara...utan också
kontakta oss, boka visning, missa inte, välkommen till, välkommen hem, här finns, här kan du
ljus och luftig, stilrent och modernt, mysigt och ombonat, elegant och tidlös (alla "X och Y"-adjektivpar)
Det finns även, Det finns också, -möjligheter (förvaringsmöjligheter, odlingsmöjligheter etc)

# MENINGSRYTM (följ detta mönster)
- Starta VARJE mening med ett NYTT subjekt: rumsnamn, material, platsnamn, årtal
- BRA: "Köket har...", "Ekparkett genomgående.", "Balkong 5 kvm.", "Centralstationen 8 min."
- DÅLIGT: "Det finns golvvärme.", "Den har garderob.", "Det finns även förråd."
- VARIERA meningslängd: 4–12 ord. Blanda korta fakta med lite längre.
- Max 1 bisats per stycke. Föredra punkt + ny mening.

# STRUKTUR
1. ÖPPNING: Gatuadress, ort, typ, kvm, rum. MAX 2 meningar.
2. PLANLÖSNING: Hall → vardagsrum. Takhöjd, golv, ljus om det finns.
3. KÖK: Märke, årtal, bänkskiva, vitvaror — BARA från dispositionen.
4. SOVRUM: Antal, storlek, garderober.
5. BADRUM: Renoveringsår, material, utrustning.
6. UTEPLATS: Storlek kvm, väderstreck.
7. ÖVRIGT: Förråd, garage, golvvärme, energiklass — UTAN "Det finns".
8. FÖRENING: BRF-namn, avgift, stambyte — om det finns.
9. LÄGE: Platser med namn + avstånd. VARIERA format. Hitta inte på.
Saknas info → HOPPA ÖVER punkten. Hitta ALDRIG på.

# EXTRA TEXTER (generera ALLA)

RUBRIK (headline, max 70 tecken):
Format: "Gatuadress — Typ + unik egenskap"
Ex: "Drottninggatan 42 — Ljus trea med balkong i söderläge"
Ex: "Björkvägen 14 — Renoverad villa med garage och stor tomt"

INSTAGRAM (instagramCaption, 3-5 meningar):
Börja med gatunamnet. Lyft 2-3 konkreta fakta (kvm, material, årtal). Avsluta med storlek.
Inga emoji. Inga utropstecken. Inga "njut av" eller "faciliteter".
Lägg till exakt 5 relevanta hashtags på EGEN rad.
Ex: "Drottninggatan 42, Uppsala. Trea med Ballingslöv-kök och balkong i söderläge. Ekparkett och takhöjd 2,85 m. 74 kvm.

#Uppsala #Hemnet #Lägenhet #Balkong #TillSalu"

VISNINGSINBJUDAN (showingInvitation, max 80 ord):
Börja "Visning — [gatuadress]". Nämn typ + kvm + 2 konkreta höjdpunkter med mått/märke/årtal.
ALDRIG "njut av", "välkommen", "missa inte", "faciliteter".
Avsluta med:
"Tid: [TID]
Plats: [ADRESS]
Anmälan: [KONTAKT]"
Ex: "Visning — Drottninggatan 42, Uppsala. Trea om 74 kvm med Ballingslöv-kök renoverat 2021 och balkong i söderläge. Ekparkett och takhöjd 2,85 meter.

Tid: [TID]
Plats: Drottninggatan 42, 4 tr
Anmälan: [KONTAKT]"

KORTANNONS (shortAd, max 40 ord):
Gatuadress + typ + kvm + 1-2 unika säljpunkter. Kompakt. För print/banner.
Ex: "Drottninggatan 42, Uppsala. 3 rok, 74 kvm. Ballingslöv-kök 2021. Balkong söderläge. Ekparkett."

# OUTPUT (JSON)
{"highlights":["konkret säljpunkt 1","konkret säljpunkt 2","konkret säljpunkt 3"],"improvedPrompt":"Hemnet-texten med stycken separerade av \\n\\n","headline":"Max 70 tecken","instagramCaption":"Instagram-text + hashtags på egen rad","showingInvitation":"Visningsinbjudan max 80 ord","shortAd":"Kompakt annons max 40 ord","socialCopy":"Max 280 tecken, gatunamn + 2 fakta","analysis":{"target_group":"Målgrupp","area_advantage":"Lägesfördelar","pricing_factors":"Värdehöjande"},"missing_info":["Saknad info"],"pro_tips":["Tips"]}

# LÄS DETTA SIST — DET VIKTIGASTE

1. Börja med gatuadressen. ALDRIG "Välkommen", "Här", "Denna", "I".
2. Hitta ALDRIG på. Varje påstående måste finnas i dispositionen.
3. NOLL förbjudna ord. Noll "erbjuder", "bjuder på", "generös", "fantastisk", "vilket".
4. Varje mening = ny fakta. Noll utfyllnad. Noll upprepning.
5. VARIERA meningsstarter. Max 1x "Det finns" i hela texten. Börja med rummet.
6. VARIERA avstånd. Aldrig 2x "ligger X bort". Blanda: meter, minuter, "nära X".
7. Sista stycket = LÄGE. Aldrig känsla, aldrig uppmaning, aldrig sammanfattning.
8. Generera ALLA fält: headline, instagramCaption, showingInvitation, shortAd, socialCopy.
9. Skriv som exemplen ovan. Kort. Rakt. Specifikt. Mänskligt.`;

// --- BOOLI/EGEN SIDA: World-class prompt med examples-first-teknik ---
const BOOLI_TEXT_PROMPT_WRITER = `Du skriver objektbeskrivningar för Booli/egen mäklarsida som Sveriges bästa mäklare. Studera exemplen — imitera stilen EXAKT. Booli tillåter mer detalj och pris.

# SÅ HÄR LÅTER EN RIKTIG MÄKLARE (memorera rytmen)

EXEMPEL A — Lägenhet:
"Kungsgärdsgatan 7, 2 tr, Uppsala. Fyra om 105 kvm med balkong i västerläge.

Hallen har platsbyggd garderob och klinker. Vardagsrummet har tre fönster och takhöjd 2,70 meter. Ekparkett genomgående.

Köket från Marbodal 2020 med stenbänkskiva och Siemens-vitvaror. Matplats för sex personer.

Huvudsovrummet rymmer dubbelsäng och har garderob. Två mindre sovrum. Badrummet helkaklat med badkar och dusch. Separat toalett.

Balkong 8 kvm i västerläge. BRF Kungsparken, stambyte 2020. Avgift 5 800 kr/mån.

Centralstationen 5 minuter. Coop Forum 400 meter. Utgångspris 4 200 000 kr."

EXEMPEL B — Villa:
"Tallvägen 8, Djursholm. Villa om 180 kvm på tomt om 920 kvm. Byggår 1962, tillbyggd 2015.

Entréplan med hall, vardagsrum med eldstad, kök och ett sovrum. Köket från HTH 2015 med granitbänk och induktionshäll. Vardagsrummet har utgång till altanen.

Övervåning med tre sovrum och badrum med badkar och golvvärme. Huvudsovrummet har garderob och fönster åt två håll.

Källare med tvättstuga, förråd och extra rum. Altan 25 kvm i västerläge med pergola. Dubbelgarage och uppfart för två bilar.

Djursholms samskola 600 meter. Mörby centrum ca 10 minuters promenad. Utgångspris 12 500 000 kr."

# DET HÄR GÖR EXEMPLEN BRA:
- Gatuadress + typ + kvm i första meningen. Punkt.
- Varje mening = ETT nytt faktum. Noll utfyllnad.
- Rumsnamnet startar meningen. ALDRIG "Det finns" eller "Den har" som meningsstart (max 1x).
- INGA adjektiv: "fantastisk", "generös", "underbar", "perfekt" förekommer INTE.
- INGA bisatser: "vilket", "som ger en", "där man kan" förekommer INTE.
- Avstånd varieras: "5 minuter", "400 meter", "ca 10 minuters promenad"
- Slutar med LÄGE + PRIS — aldrig känsla

# FÖRBJUDET (avslöjar AI direkt)
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
2. PLANLÖSNING: Hall → vardagsrum. Takhöjd, golv, ljus.
3. KÖK: Märke, årtal, bänkskiva, vitvaror, matplats.
4. SOVRUM: Antal, storlek, garderober.
5. BADRUM: Renoveringsår, material, utrustning.
6. UTEPLATS: Storlek kvm, väderstreck.
7. ÖVRIGT: Förråd, garage, golvvärme, energiklass — UTAN "Det finns".
8. FÖRENING: BRF-namn, avgift, stambyte.
9. LÄGE: Platser med namn + avstånd. VARIERA format.
10. PRIS: Utgångspris om det finns.
Saknas info → HOPPA ÖVER. Hitta ALDRIG på.

# EXTRA TEXTER (generera ALLA)

RUBRIK (headline, max 70 tecken):
"Gatuadress — Typ + unik egenskap"
Ex: "Tallvägen 8 — Villa med eldstad och dubbelgarage"

INSTAGRAM (instagramCaption, 3-5 meningar):
Gatunamnet först. 2-3 konkreta fakta. Avsluta med storlek. Inga emoji/utropstecken.
5 hashtags på EGEN rad.
Ex: "Tallvägen 8, Djursholm. Villa med HTH-kök, eldstad och altan i västerläge. Tomt 920 kvm. Dubbelgarage. 180 kvm.

#Djursholm #Villa #Hemnet #TillSalu #Stockholm"

VISNINGSINBJUDAN (showingInvitation, max 80 ord):
"Visning — [gatuadress]". Typ + kvm + 2 konkreta höjdpunkter.
Avsluta: "Tid: [TID]\\nPlats: [ADRESS]\\nAnmälan: [KONTAKT]"

KORTANNONS (shortAd, max 40 ord):
Gatuadress + typ + kvm + 1-2 säljpunkter. Kompakt.
Ex: "Tallvägen 8, Djursholm. Villa 180 kvm. HTH-kök 2015. Eldstad. Tomt 920 kvm. Dubbelgarage."

# OUTPUT (JSON)
{"highlights":["konkret säljpunkt 1","konkret säljpunkt 2","konkret säljpunkt 3"],"improvedPrompt":"Texten med stycken separerade av \\n\\n","headline":"Max 70 tecken","instagramCaption":"Instagram + hashtags","showingInvitation":"Max 80 ord","shortAd":"Max 40 ord","socialCopy":"Max 280 tecken","analysis":{"target_group":"Målgrupp","area_advantage":"Lägesfördelar","pricing_factors":"Värdehöjande"},"missing_info":["Saknad info"],"text_tips":["Texttips för förbättring"]}

# LÄS DETTA SIST — DET VIKTIGASTE

1. Börja med gatuadressen. ALDRIG "Välkommen", "Här", "Denna", "I".
2. Hitta ALDRIG på. Varje påstående måste finnas i dispositionen.
3. NOLL förbjudna ord. Noll "erbjuder", "bjuder på", "generös", "fantastisk", "vilket".
4. Varje mening = ny fakta. Noll utfyllnad. Noll upprepning.
5. VARIERA meningsstarter. Max 1x "Det finns" i hela texten.
6. VARIERA avstånd. Aldrig 2x "ligger X bort".
7. Sista stycket = LÄGE + PRIS. Aldrig känsla, aldrig uppmaning.
8. Generera ALLA fält: headline, instagramCaption, showingInvitation, shortAd, socialCopy.
9. Skriv som exemplen ovan. Kort. Rakt. Specifikt. Mänskligt.`;

// [Dead code removed: _UNUSED_BOOLI_TEXT_PROMPT + BOOLI_EXPERT_PROMPT — ~300 lines of unused prompts]
const _UNUSED_BOOLI_TEXT_PROMPT = `REMOVED`;
const BOOLI_EXPERT_PROMPT = `REMOVED`;

// Lokal exempelmatchning — enkel typ+storlek, fungerar för ALLA städer i Sverige
function matchExamples(disposition: any, _toneAnalysis: any): string[] {
  const type = (disposition?.property?.type || 'lägenhet').toLowerCase();
  const size = Number(disposition?.property?.size) || 0;

  let candidates: {text: string, metadata: any}[] = [];

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
          const nextReset = new Date(userNow);
          nextReset.setMonth(planStartAt.getMonth());
          nextReset.setFullYear(planStartAt.getFullYear() + 1);
          nextReset.setDate(planStartAt.getDate());
          nextReset.setHours(0, 0, 0, 0);
          
          // Om nästa reset har passerat, lägg till ett år
          if (nextReset <= userNow) {
            nextReset.setFullYear(nextReset.getFullYear() + 1);
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
      
      // Check monthly usage limits
      const usage = await storage.getMonthlyUsage(user.id) || {
        textsGenerated: 0,
        areaSearchesUsed: 0,
        textEditsUsed: 0,
        personalStyleAnalyses: 0,
      };
      
      const limits = PLAN_LIMITS[plan];
      if (usage.textsGenerated >= limits.texts) {
        return res.status(429).json({
          message: `Du har nått din månadsgräns av ${limits.texts} objektbeskrivningar. Uppgradera till Pro för fler!`,
          limitReached: true,
          upgradeTo: plan === "free" ? "pro" : "premium",
        });
      }

      const { prompt, type, platform, wordCountMin, wordCountMax, imageUrls } = req.body;

      // Bestäm AI-modell baserat på plan
      const aiModel = plan === "pro" ? "gpt-4o" : "gpt-4o-mini";

      // Konkurrentanalys (Pro-funktion)
      let competitorAnalysis = "";
      if (plan === "pro") {
        console.log(`[Competitor Analysis] Analyzing market position...`);
        
        // Extrahera grundläggande info från prompten för analys
        const propertyInfo = {
          area: prompt.match(/i\s+([A-Za-z-]+)/i)?.[1] || "okänt område",
          type: type || "lägenhet",
          price: prompt.match(/(\d+\s*(?:k|tk|m|mn|kr))/i)?.[1] || "ej specificerat"
        };

        const competitorMessages = [
          {
            role: "system" as const,
            content: `Du är en expert på svensk fastighetsmarknad. Analysera konkurrensläget för ett objekt och ge konkreta råd för hur det ska positioneras för att sticka ut. Var realistisk och baserad på faktiska marknadsförhållanden.`
          },
          {
            role: "user" as const,
            content: `Analysera detta objekt och ge konkreta positioningstips:

OBJEKTINFO:
- Område: ${propertyInfo.area}
- Typ: ${propertyInfo.type}
- Pris: ${propertyInfo.price}
- Originalbeskrivning: ${prompt}

Ge mig:
1. Vanliga klyschor och svaga formuleringar som konkurrenterna använder (undvik dessa)
2. Unika säljpunkter som konkurrenterna sällan nämner (fokusera på dessa)
3. Positioneringstips för att sticka ut i mängden
4. Specifika detaljer som är värda att lyfta fram

Svara kortfattat och konkret.`
          }
        ];

        const competitorCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: competitorMessages,
          max_tokens: 800,
          temperature: 0.3,
        });

        competitorAnalysis = competitorCompletion.choices[0]?.message?.content || "";
        console.log(`[Competitor Analysis] Completed: ${competitorAnalysis.substring(0, 100)}...`);
      }
      
      // Bildanalys om bilder finns
      let imageAnalysis = "";
      if (imageUrls && imageUrls.length > 0 && plan === "pro") {
        console.log(`[Image Analysis] Analyzing ${imageUrls.length} images (Pro feature)...`);
        
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
      }
      
      // Bestäm ordgränser baserat på plan
      let targetWordMin: number;
      let targetWordMax: number;
      
      if (plan === "pro" && wordCountMin && wordCountMax) {
        // Pro-användare kan välja eget intervall (inom gränser)
        targetWordMin = Math.max(WORD_LIMITS.pro.min, Math.min(wordCountMin, WORD_LIMITS.pro.max));
        targetWordMax = Math.max(WORD_LIMITS.pro.min, Math.min(wordCountMax, WORD_LIMITS.pro.max));
      } else if (plan === "pro") {
        // Pro-användare utan val får default
        targetWordMin = WORD_LIMITS.pro.default.min;
        targetWordMax = WORD_LIMITS.pro.default.max;
      } else {
        // Free-användare får fast intervall
        targetWordMin = WORD_LIMITS.free.min;
        targetWordMax = WORD_LIMITS.free.max;
      }
      
      console.log(`[Config] Plan: ${plan}, Model: ${aiModel}, Words: ${targetWordMin}-${targetWordMax}`);

      // === OPTIMIZED PIPELINE ===
      const propertyData = req.body.propertyData;
      
      let disposition: any;
      let toneAnalysis: any;
      let writingPlan: any;
      let personalStylePrompt = "";

      // Hämta personlig stil för Pro-användare
      if (plan === "pro") {
        try {
          const personalStyle = await storage.getPersonalStyle(user.id);
          if (personalStyle && personalStyle.isActive) {
            console.log("[Personal Style] Using user's personal writing style");
            personalStylePrompt = generatePersonalizedPrompt(personalStyle.referenceTexts, personalStyle.styleProfile);
          }
        } catch (error) {
          console.error("[Personal Style] Failed to load personal style:", error);
        }
      }

      if (propertyData && propertyData.address) {
        // SNABB VÄG: Strukturerad data från formuläret → hoppa över AI-extraktion (0 API-anrop)
        console.log("[Step 1] FAST PATH: Using structured form data directly (skipping AI extraction)");
        const structured = buildDispositionFromStructuredData(propertyData);
        disposition = structured.disposition;
        toneAnalysis = structured.tone_analysis;
        writingPlan = structured.writing_plan;
        
        // === ENHANCED INTELLIGENCE INTEGRATION ===
        // Add geographic intelligence
        const geoContext = getGeographicContext(propertyData.address);
        if (geoContext.city) {
          disposition.location.city = geoContext.city.name;
          disposition.location.area_type = geoContext.district?.characteristics.areaType;
          disposition.location.price_level = geoContext.district?.characteristics.avgPricePerKvm || geoContext.city.propertyCharacteristics.avgPricePerKvm;
          disposition.location.nearby_amenities = geoContext.nearbyAmenities;
          disposition.location.transport_options = geoContext.transportOptions;
          disposition.location.area_characteristics = geoContext.areaCharacteristics;
        }
        
        // Add market intelligence
        if (geoContext.city) {
          const marketData = getMarketTrends2025(geoContext.city.name.toLowerCase());
          if (marketData) {
            toneAnalysis.market_trends = marketData.priceDevelopment;
            toneAnalysis.key_drivers = marketData.keyDrivers;
            toneAnalysis.risks = marketData.risks;
            toneAnalysis.opportunities = marketData.opportunities;
          }
          
          const marketPosition = analyzeMarketPosition(
            Number(propertyData.price) || 0,
            Number(propertyData.livingArea) || 0,
            geoContext.city.name.toLowerCase()
          );
          toneAnalysis.market_segment = marketPosition.segment;
          toneAnalysis.market_comparison = marketPosition.marketComparison;
          toneAnalysis.market_recommendation = marketPosition.recommendation;
        }
        
        // Add architectural intelligence
        const archAnalysis = analyzeArchitecturalValue(
          propertyData.buildYear || "2000",
          [propertyData.flooring || "", propertyData.kitchenDescription || "", propertyData.bathroomDescription || ""],
          [propertyData.specialFeatures || ""]
        );
        if (archAnalysis.era) {
          disposition.property.architectural_era = archAnalysis.era.name;
          disposition.property.architectural_style = archAnalysis.era.characteristics.style;
          disposition.property.maintenance_profile = archAnalysis.maintenanceProfile;
          disposition.property.energy_profile = archAnalysis.energyProfile;
          disposition.property.modernization_potential = archAnalysis.modernizationPotential;
        }
        
        // Add BRF intelligence for apartments
        if (propertyData.propertyType === "apartment" && propertyData.brfName) {
          const brfAnalysis = analyzeBRFEconomy(
            propertyData.brfName,
            {
              equityRatio: 45, // Would come from actual data
              monthlyFee: Number(propertyData.monthlyFee) || 0,
              debtPerSqm: 8000, // Would come from actual data
              operatingResult: 100000, // Would come from actual data
              reserveFund: 500000, // Would come from actual data
              totalApartments: 50, // Would come from actual data
              yearBuilt: propertyData.buildYear || "2000",
              lastMajorRenovation: "2020",
              upcomingRenovations: []
            },
            geoContext.city?.name.toLowerCase() || "stockholm",
            (geoContext.district?.characteristics.areaType === "waterfront" || geoContext.district?.characteristics.areaType === "industrial") ? "urban_center" : (geoContext.district?.characteristics.areaType || "urban_center")
          );
          disposition.economics.association = {
            name: propertyData.brfName,
            financial_health: brfAnalysis.financialHealth,
            warning_signs: generateBRFWarningSigns(brfAnalysis),
            market_position: brfAnalysis.marketPosition
          };
        }
        
        // Add buyer psychology intelligence
        const buyerSegment = identifyBuyerSegment(
          35, // Would come from user data or target market
          "medium",
          "couple",
          propertyData.propertyType || "apartment",
          geoContext.city?.name || "Stockholm",
          Number(propertyData.price) || 0
        );
        if (buyerSegment) {
          const psychologicalProfile = generatePsychologicalProfile(propertyData, buyerSegment);
          toneAnalysis.target_buyer_segment = buyerSegment.name;
          toneAnalysis.buyer_motivations = psychologicalProfile.segment.motivations.primary;
          toneAnalysis.buyer_concerns = psychologicalProfile.segment.concerns.major;
          toneAnalysis.psychological_triggers = psychologicalProfile.triggers.map(t => t.trigger);
          toneAnalysis.messaging_strategy = psychologicalProfile.messaging_strategy.key_messages;
        }
        
        console.log("[Step 1] Enhanced disposition with intelligence databases");
      } else {
        // FALLBACK: För gammal klient eller API-anrop utan propertyData
        console.log("[Step 1] FALLBACK: AI extraction from raw text...");
        
        const dispositionMessages = [
          {
            role: "system" as const,
            content: COMBINED_EXTRACTION_PROMPT + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
          },
          {
            role: "user" as const,
            content: `RÅDATA: ${prompt}${imageAnalysis ? `\n\nBILDANALYS: ${imageAnalysis}` : ''}${competitorAnalysis ? `\n\nKONKURRENTANALYS: ${competitorAnalysis}` : ''}\n\nPLATTFORM: ${platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"}\n\nÖNSKAT ORDANTAL: ${targetWordMin}-${targetWordMax} ord`,
          },
        ];

        const dispositionCompletion = await openai.chat.completions.create({
          model: aiModel,
          messages: dispositionMessages,
          max_tokens: 3000,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });

        const dispositionText = dispositionCompletion.choices[0]?.message?.content || "{}";
        let rawDisposition: any;
        try {
          rawDisposition = safeJsonParse(dispositionText);
        } catch (e) {
          console.warn("[Step 1] Disposition JSON parse failed, retrying...", e);
          const dispositionRetry = await openai.chat.completions.create({
            model: aiModel,
            messages: [
              {
                role: "system" as const,
                content: COMBINED_EXTRACTION_PROMPT + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
              },
              { role: "user" as const, content: `RÅDATA: ${prompt}` },
            ],
            max_tokens: 3000,
            temperature: 0.1,
            response_format: { type: "json_object" },
          });
          const retryText = dispositionRetry.choices[0]?.message?.content || "{}";
          try {
            rawDisposition = safeJsonParse(retryText);
          } catch (e2) {
            return res.status(422).json({ message: "Kunde inte tolka data. Försök igen." });
          }
        }
        
        disposition = rawDisposition.disposition || rawDisposition;
        toneAnalysis = rawDisposition.tone_analysis || {};
        writingPlan = rawDisposition.writing_plan || {};
        console.log("[Step 1] AI extraction completed");
      }

      // Step 2: Local example matching - 0 API calls
      console.log("[Step 2] Local example matching...");
      const matchedExamples = matchExamples(disposition, toneAnalysis);
      console.log(`[Step 2] Matched ${matchedExamples.length} examples`);


      // Step 3: Text generation - 1 API call (single version, no A/B waste)
      console.log("[Step 3] Generating text...");

      // Single text generation (no A/B waste - always use BOOLI_TEXT_PROMPT_WRITER for booli)
      let textPrompt = platform === "hemnet" ? HEMNET_TEXT_PROMPT : BOOLI_TEXT_PROMPT_WRITER;
      
      // Lägg till personlig stil om den finns
      if (personalStylePrompt) {
        textPrompt = personalStylePrompt + "\n\n" + textPrompt;
        console.log("[Personal Style] Personalized prompt integrated");
      }
      
      const textMessages = [
        {
          role: "system" as const,
          content: textPrompt + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content:
            "DISPOSITION: " +
            JSON.stringify(disposition, null, 2) +
            "\n\nSKRIVPLAN: " +
            JSON.stringify(writingPlan, null, 2) +
            "\n\nTONALITET: " +
            JSON.stringify(toneAnalysis, null, 2) +
            "\n\nEXEMPELTEXTER (skriv i samma professionella stil):\n" +
            matchedExamples.map((ex: string, i: number) => `EXEMPEL ${i + 1}:\n${ex}`).join("\n\n") +
            "\n\nPLATTFORM: " +
            (platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA") +
            `\n\nORDANTAL: ${targetWordMin}-${targetWordMax} ord` +
            "\n\n--- DÅLIGT vs BRA (studera noga) ---\n" +
            "1. ÖPPNING:\n" +
            "DÅLIGT: \"Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor i hjärtat av staden.\"\n" +
            "BRA: \"Storgatan 12, 3 tr, Linköping. Trea om 76 kvm med balkong i söderläge.\"\n\n" +
            "2. KÖK:\n" +
            "DÅLIGT: \"Köket präglas av moderna material och bjuder på generös arbetsyta, vilket skapar en härlig plats.\"\n" +
            "BRA: \"Köket renoverat 2021 med Ballingslöv-luckor, kompositbänk och Siemens-vitvaror. Matplats vid fönstret.\"\n\n" +
            "3. MENINGSSTARTER:\n" +
            "DÅLIGT: \"Den har energiklass C. Det finns golvvärme. Det finns även laddstation. Det finns också förråd.\"\n" +
            "BRA: \"Energiklass C. Golvvärme i badrum och hall. Laddstation för elbil. Förråd 5 kvm.\"\n\n" +
            "4. AVSTÅND:\n" +
            "DÅLIGT: \"Skolan ligger 400 meter bort. ICA ligger 600 meter bort. Stationen ligger 1 km bort.\"\n" +
            "BRA: \"Skolan 400 meter. ICA ca 5 minuters promenad. Nära pendeltågsstationen.\"\n\n" +
            "5. AVSLUTNING:\n" +
            "DÅLIGT: \"Med sin ljusa och luftiga planlösning är detta ett hem att trivas i. Kontakta oss för visning.\"\n" +
            "BRA: (Sista stycket = LÄGE med platser och avstånd. Punkt. Slut.)\n\n" +
            "6. ADJEKTIVPAR:\n" +
            "DÅLIGT: \"Ljus och luftig lägenhet med stilrent och modernt kök.\"\n" +
            "BRA: \"Ljus lägenhet med modernt kök.\"\n\n" +
            "7. INSTAGRAM:\n" +
            "DÅLIGT: \"Njut av denna fantastiska bostad med smakfullt renoverat kök! #drömhem #perfekt\"\n" +
            "BRA: \"Storgatan 12, Linköping. Trea med Ballingslöv-kök och balkong söderläge. 76 kvm.\\n\\n#Linköping #Hemnet #Lägenhet #Balkong #TillSalu\"\n" +
            "\n--- REGLER (obligatoriska) ---\n" +
            "1. Börja med gatuadress — ALDRIG 'Välkommen', 'Här', 'Denna', 'I'\n" +
            "2. BARA fakta från dispositionen — HITTA ALDRIG PÅ\n" +
            "3. Varje mening = ny fakta. Noll utfyllnad.\n" +
            "4. FÖRBJUDET: erbjuder, bjuder på, präglas av, generös, fantastisk, perfekt, vilket, som ger en, för den som, i hjärtat av, faciliteter, njut av, livsstil, smakfullt, stilfullt, elegant, imponerande, harmonisk, inbjudande, tidlös, inte bara, utan också, ljus och luftig, stilrent och modernt, -möjligheter\n" +
            "5. Max 1x 'Det finns' i HELA texten. Börja med rummet: 'Köket har...', 'Balkongen vetter...'\n" +
            "6. Variera avstånd: meter, minuter, 'nära X', 'i kvarteret' — aldrig 2x 'ligger X bort'\n" +
            "7. Sista stycket = LÄGE (+ PRIS om Booli). Aldrig känsla/uppmaning/sammanfattning.\n" +
            "8. Generera ALLA fält: headline, instagramCaption, showingInvitation, shortAd, socialCopy\n" +
            "9. Instagram: gatunamn först, inga emoji/utropstecken, 5 hashtags på EGEN rad\n" +
            "\n--- LÄS SIST ---\n" +
            "Skriv som en riktig mäklare. Kort. Rakt. Specifikt. Varje mening ett nytt faktum. Noll AI-klyschor. Gatuadress först. Läge sist.",
        },
      ];

      const textCompletion = await openai.chat.completions.create({
        model: aiModel,
        messages: textMessages,
        max_tokens: 4000,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const textRaw = textCompletion.choices[0]?.message?.content || "{}";
      let result: any;
      try {
        result = safeJsonParse(textRaw);
      } catch (e) {
        console.warn("[Step 3] Text generation JSON parse failed...", e);
        result = { improvedPrompt: "Text kunde inte genereras" };
      }
      
      result.writingPlan = writingPlan;
      console.log("[Step 3] Text generated:", result.improvedPrompt?.substring(0, 200) + "...");
      
      // Post-processing - rensa förbjudna fraser
      if (result.improvedPrompt) {
        result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt);
      }
      if (result.socialCopy) {
        result.socialCopy = cleanForbiddenPhrases(result.socialCopy);
      }
      if (result.headline) {
        result.headline = cleanForbiddenPhrases(result.headline);
      }
      if (result.instagramCaption) {
        result.instagramCaption = cleanForbiddenPhrases(result.instagramCaption);
      }
      if (result.showingInvitation) {
        result.showingInvitation = cleanForbiddenPhrases(result.showingInvitation);
      }
      if (result.shortAd) {
        result.shortAd = cleanForbiddenPhrases(result.shortAd);
      }
      console.log("[Post-processing] Automatic phrase cleanup done before validation");

      // Step 2: Validation + Direct Correction (no retries needed)
      console.log("[Step 2] AI validation and correction...");
      
      const validationMessages = [
        {
          role: "system" as const,
          content: `Hitta förbjudna fraser i texten och ersätt dem med korrekta alternativ.

# REGLER

1. Hitta ALLA förbjudna AI-fraser (397 st)
2. Ersätt dem med specifika fakta från dispositionen
3. Behåll alla korrekta delar av texten
4. Se till att texten fortfarande flyter naturligt
5. Använd gatuadress som öppning, aldrig "Välkommen"

# OUTPUT FORMAT (JSON)

{
  "corrected_text": "Hela den korrigerade texten här",
  "corrections": [
    {"from": "förbjuden fras", "to": "korrekt fras", "reason": "AI-klyscha ersatt med fakta"}
  ],
  "violations_remaining": 0
}

Svara ENDAST med giltigt JSON-objekt.`,
        },
        {
          role: "user" as const,
          content: `TEXT TO CORRECT:\n${result.improvedPrompt}\n\nDISPOSITION FOR FACTS:\n${JSON.stringify(disposition, null, 2)}`,
        },
      ];

      let validationResult: any = { corrected_text: result.improvedPrompt, corrections: [], violations_remaining: 0 };
      try {
        const validationCompletion = await openai.chat.completions.create({
          model: aiModel,
          messages: validationMessages,
          max_tokens: 3000,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
        validationResult = safeJsonParse(validationCompletion.choices[0]?.message?.content || "{}");
        
        // Använd korrigerad text
        if (validationResult.corrected_text && validationResult.corrected_text !== result.improvedPrompt) {
          console.log("[Step 2] Using corrected text from validation");
          result.improvedPrompt = validationResult.corrected_text;
        }
      } catch (e) {
        console.warn("[Step 2] Validation failed, continuing...", e);
      }
      console.log("[Step 2] Validation corrections:", validationResult.corrections?.length || 0, "fixes applied");

      // Step 3: Fact-check review (NEVER rewrites text) - 1 API call

      // Final post-processing: add paragraphs
      if (result.improvedPrompt) {
        result.improvedPrompt = addParagraphs(result.improvedPrompt);
      }
      console.log("[Pipeline] Complete - 3 API calls used (free) / 5-6 (pro)");

      // Increment usage
      await storage.incrementUserPrompts(user.id);
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
        suggestions: result.text_tips || [],
        socialCopy: result.socialCopy || null,
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
            model: aiModel,
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

      res.json({
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt || prompt,
        highlights: result.highlights || [],
        analysis: result.analysis || {},
        improvements: result.missing_info || [],
        suggestions: result.text_tips || [],
        text_tips: result.text_tips || [],
        critical_gaps: result.critical_gaps || [],
        socialCopy: result.socialCopy || null,
        headline: result.headline || null,
        instagramCaption: result.instagramCaption || null,
        showingInvitation: result.showingInvitation || null,
        shortAd: result.shortAd || null,
        improvement_suggestions: improvementSuggestions,
        factCheck: result.factCheck || null,
        wordCount: (result.improvedPrompt || "").split(/\s+/).filter(Boolean).length,
      });
    } catch (err: any) {
      console.error("Optimize error:", err);
      res.status(500).json({ message: err.message || "Optimering misslyckades" });
    }
  });


  // ── AI REWRITE: Inline text editing ──
  app.post("/api/rewrite", requireAuth, async (req, res) => {
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
            content: `Du är en svensk fastighetsmäklare. Skriver om en del av en objektbeskrivning med samma professionella stil som riktiga mäklare.

# EXEMPEL PÅ RIKTIG MÄKLARSTIL
"Balkongen vetter mot söder. Köket renoverat 2021 med Ballingslöv-luckor. Skolan 400 meter. ICA 5 minuter."

NOTERA: Korta meningar. Fakta-fokuserat. Inga adjektiv som "fantastisk", "generös". Inga bisatser med "vilket".

# FÖRBJUDET (använd ALDRIG)
erbjuder, bjuder på, präglas av, generös, fantastisk, perfekt, idealisk, vilket, som ger en, för den som, i hjärtat av, faciliteter, njut av, livsstil, smakfullt, stilfullt, elegant, imponerande, harmonisk, inbjudande, tidlös, ljus och luftig, stilrent och modernt, mysigt och ombonat, inte bara, utan också, bidrar till, förstärker, skapar en känsla, -möjligheter, Det finns även, Det finns också

# INSTRUKTIONER
1. Skriv om BARA den markerade texten enligt instruktionen
2. Behåll ALLA fakta från originaltexten. HITTA ALDRIG PÅ ny fakta.
3. Använd samma korta, direkta stil som exemplet ovan
4. Korta meningar. Presens. Ingen utfyllnad.
5. Om instruktionen säger "gör mer säljande" → lägg till KONKRETA fakta, inte adjektiv

Svara med JSON: {"rewritten": "den omskrivna texten"}`,
          },
          {
            role: "user" as const,
            content: `HELA TEXTEN (för kontext och stil):\n${fullText}\n\nMARKERAD TEXT ATT SKRIVA OM:\n"${selectedText}"\n\nINSTRUKTION: ${instruction}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.2,
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
        const nominatimData = await nominatimRes.json() as any;
        const location = nominatimData[0];

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
        const overpassData = await overpassRes.json() as any;

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

        res.json({ 
          formattedAddress, 
          places: places.slice(0, 6), 
          transport, 
          neighborhood,
          source: "openstreetmap"
        });
        
        // Increment usage for area search
        await storage.incrementUsage(user.id, 'areaSearches');
        console.log(`[Usage] Incremented area search for user ${user.id} (OpenStreetMap)`);
        
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

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;

      console.log("[Stripe Checkout] Creating checkout session with base URL:", baseUrl);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}?success=true`,
        cancel_url: `${baseUrl}?canceled=true`,
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

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: baseUrl,
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
      const adminKey = req.query.adminKey as string;
      const expectedKey = process.env.ADMIN_KEY || "change-this-secret-key";

      if (adminKey !== expectedKey) {
        return res.status(403).json({ message: "Invalid admin key" });
      }

      const { userId, email, plan } = req.body;

      if (!plan || !["free", "basic", "pro"].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan. Must be 'free', 'basic', or 'pro'" });
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
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { originalText, selectedText, improvementType, context } = req.body;

      if (!selectedText || !improvementType) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const plan = user.plan;
      if (plan !== "pro") {
        return res.status(403).json({ message: "Denna funktion är endast för Pro-användare" });
      }

      console.log(`[Text Improvement] Improving text with type: ${improvementType}`);

      const improvementPrompts = {
        more_descriptive: `Gör denna text mer beskrivande och levande för fastighetsmäklare. Använd sensoriska detaljer och skapa en starkare bild för läsaren. Behåll den faktiska informationen.`,
        more_selling: `Gör denna text mer säljande och övertygande. Fokusera på fördelar för köparen, skapa brådska och framhäva unika värden. Använd mäklarbranschens bästa praxis.`,
        more_formal: `Gör denna text mer formell och professionell. Använd korrekta fastighetstermer och en ton som passar för högkvalitativa objekt.`,
        more_warm: `Gör denna text mer personlig och inbjudande. Skapa en känsla av hem och välbefinnande utan att förlora professionaliteten.`,
        fix_claims: `Förbättra denna text genom att ersätta klyschor och svaga påståenden med konkreta fakta och starka argument. Använd mäklarbranschen kunskaper.`
      };

      const prompt = improvementPrompts[improvementType] || improvementPrompts.more_descriptive;

      const messages = [
        {
          role: "system" as const,
          content: `Du är en expert på svenska fastighetstexter med 15 års erfarenhet som mäklare. Du kan allt om svensk fastighetslagstiftning, marknadspsykologi och effektiva säljstrategier. Dina texter är alltid klyschfria, faktabaserade och säljande.

KONTEXT: ${context || 'Ingen extra kontext'}

ORIGINALTEXT: ${originalText}

VALD TEXT ATT FÖRBÄTTRA: ${selectedText}

${prompt}

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
        temperature: 0.7,
      });

      const improvedText = completion.choices[0]?.message?.content || selectedText;

      res.json({
        originalText: selectedText,
        improvedText: improvedText.trim(),
        improvementType: improvementType
      });

    } catch (err: any) {
      console.error("Text improvement error:", err);
      res.status(500).json({ message: err.message || "Textförbättring misslyckades" });
    }
  });

  return httpServer;
}
