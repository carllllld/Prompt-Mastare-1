import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import OpenAI from "openai";
import { optimizeRequestSchema, PLAN_LIMITS, type PlanType, type User } from "@shared/schema";
import { requireAuth, requirePro } from "./auth";
import { sendTeamInviteEmail } from "./email";

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
];

function findRuleViolations(text: string, platform: string = "hemnet"): string[] {
  const violations: string[] = [];
  
  // Check for forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push(`Förbjuden fras: "${phrase}"`);
    }
  }
  
  // Check for incomplete/broken sentences
  // - Extract sentences WITH their punctuation so we can validate them correctly
  // - Catch cases like "ljus och ." or missing final punctuation
  const sentenceMatches = text.match(/[^.!?]+[.!?]/g) || [];
  const trailing = text.replace(/\s+/g, " ").trim();
  if (trailing.length > 0 && !/[.!?]$/.test(trailing)) {
    violations.push(`Ofullständig mening (saknar avslutande skiljetecken): "${trailing.substring(0, 70)}..."`);
  }
  for (const s of sentenceMatches) {
    const trimmed = s.replace(/\s+/g, " ").trim();
    if (trimmed.length < 6) continue;
    if (/\b(och|med|som)\s*[.!?]$/.test(trimmed)) {
      violations.push(`Trasig mening: "${trimmed.substring(0, 70)}"`);
    }
  }
  
  // Check for repeated phrases (2+ words repeated within 50 words)
  const words = text.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = words[i] + ' ' + words[i + 1];
    const nextWords = words.slice(i + 2, i + 52).join(' ');
    if (nextWords.includes(phrase)) {
      violations.push(`Upprepad fras: "${phrase}"`);
    }
  }
  
  // NEW: Quality validation checks
  const sensoryWords = ['ljus', 'ljud', 'känsla', 'doft', 'syn', 'hörsel', 'känns', 'luktar', 'ser', 'låter'];
  const sensoryCount = sensoryWords.filter(word => text.toLowerCase().includes(word)).length;
  const requiredSensory = platform === "hemnet" ? 3 : 4;
  if (sensoryCount < requiredSensory) {
    violations.push(`För få sinnesdetaljer: ${sensoryCount}/${requiredSensory} krävs`);
  }
  
  // Check for dramatic hook (not "Välkommen")
  if (text.toLowerCase().startsWith('välkommen')) {
    violations.push(`Börjar med "Välkommen" - använd dramatisk hook istället`);
  }
  
  // Check for lifestyle scenes
  const lifestyleWords = ['här', 'vaknar', 'intas', 'blir', 'scen', 'samlas', 'liv', 'bor'];
  const lifestyleCount = lifestyleWords.filter(word => text.toLowerCase().includes(word)).length;
  const requiredLifestyle = platform === "hemnet" ? 2 : 3;
  if (lifestyleCount < requiredLifestyle) {
    violations.push(`För få lifestyle-scener: ${lifestyleCount}/${requiredLifestyle} krävs`);
  }
  
  // Check for future vision
  if (!text.toLowerCase().includes('tänk dig') && !text.toLowerCase().includes('framtid')) {
    violations.push(`Saknar future vision ("tänk dig..." eller "framtid")`);
  }
  
  // Check for competitive edge
  const competitiveWords = ['till skillnad från', 'detta är det enda', 'medan andra', 'unik', 'sällsynt'];
  const hasCompetitive = competitiveWords.some(word => text.toLowerCase().includes(word));
  if (!hasCompetitive) {
    violations.push(`Saknar competitive edge (varför detta vinner)`);
  }
  
  // Check for generic patterns
  const genericPatterns = ['fantastisk läge', 'renoverat med hög standard', 'attraktivt', 'idealisk'];
  for (const pattern of genericPatterns) {
    if (text.toLowerCase().includes(pattern)) {
      violations.push(`Generiskt mönster: "${pattern}"`);
    }
  }
  
  // Check word count
  const wordCount = text.split(/\s+/).length;
  const minWords = platform === "hemnet" ? 250 : 400;
  const maxWords = platform === "hemnet" ? 450 : 700;
  if (wordCount < minWords) {
    violations.push(`För få ord: ${wordCount}/${minWords} krävs`);
  }
  if (wordCount > maxWords) {
    violations.push(`För många ord: ${wordCount}/${maxWords} max`);
  }
  
  return violations;
}

function validateOptimizationResult(result: any, platform: string = "hemnet"): string[] {
  const violations: string[] = [];
  if (typeof result?.improvedPrompt === "string") {
    violations.push(...findRuleViolations(result.improvedPrompt, platform));
  }
  if (typeof result?.socialCopy === "string") {
    violations.push(...findRuleViolations(result.socialCopy, platform));
  }
  return Array.from(new Set(violations));
}

// Post-processing: Rensa bort förbjudna fraser automatiskt
// VIKTIGT: Längre fraser FÖRST så de matchas innan kortare
const PHRASE_REPLACEMENTS: [string, string][] = [
  // Öppningar - ta bort helt
  ["välkommen till denna", ""],
  ["välkommen till", ""],
  ["välkommen hem till", ""],
  ["här möts du av", ""],
  ["här erbjuds", ""],
  
  // Erbjuder-varianter
  [" erbjuder ", " har "],
  [" erbjuds ", " finns "],
  
  // Luftig/atmosfär
  ["luftig och inbjudande atmosfär", "generös rumskänsla"],
  ["luftig atmosfär", "generös rumskänsla"],
  ["luftig", "rymlig"],
  ["inbjudande atmosfär", ""],
  ["trivsam atmosfär", ""],
  ["härlig atmosfär", ""],
  
  // Rofylld
  ["rofyllt läge", "tyst läge"],
  ["rofylld miljö", "lugn miljö"],
  ["rofyllt", "tyst"],
  ["rofylld", "lugn"],
  
  // Vardagen
  ["vilket ger i vardagen", ""],
  ["underlättar vardagen", ""],
  ["bekvämlighet i vardagen", ""],
  ["i vardagen", ""],
  
  // Attraktivt
  ["attraktivt läge", "bra läge"],
  ["attraktivt med närhet", "nära"],
  ["attraktivt", "bra"],
  
  // Övrigt
  ["inom räckhåll", "i närheten"],
  ["sociala tillställningar", "middagar"],
  ["sociala sammanhang", "umgänge"],
  ["extra komfort", ""],
  ["maximal komfort", ""],
  ["trygg boendemiljö", "stabil förening"],
  ["trygg boendeekonomi", "stabil ekonomi"],
  ["goda arbetsytor", "bänkyta"],
  ["gott om arbetsyta", "bänkyta"],
  ["fantastisk", "fin"],
  ["underbar", "fin"],
  ["magisk", ""],
  ["otrolig", ""],
  ["unik möjlighet", ""],
  ["unik chans", ""],
  ["sällsynt tillfälle", ""],
  ["missa inte", ""],
];

function cleanForbiddenPhrases(text: string): string {
  if (!text) return text;
  let cleaned = text;
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

const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

// --- 2-STEGS GENERATION ---

// Steg 1: Extrahera fakta och skapa disposition
const DISPOSITION_PROMPT = `
# UPPGIFT

Extrahera ALLA relevanta fakta från rådata och skapa en strukturerad disposition. Skriv INGEN text, bara fakta.

# REGLER

1. Hitta ALDRIG på – extrahera bara vad som faktiskt finns i rådata
2. Använd exakta värden från rådata (kvm, pris, år, etc)
3. Strukturera i JSON enligt formatet nedan
4. Om info saknas, lämna fältet tomt eller null

# INPUT FORMAT

Rådata innehåller vanligtvis: adress, typ, kvm, rum, våning, balkong, material, avgift, pris, etc.

# OUTPUT FORMAT (JSON)

{
  "property": {
    "type": "lägenhet/villa/radhus/nyproduktion/fritidshus",
    "address": "exakt adress från rådata",
    "size": 62,
    "rooms": 3,
    "floor": "3 av 5",
    "year_built": "1930-tal",
    "renovations": ["kök 2022", "badrum 2020", "fönster 2021"],
    "materials": {
      "floors": "parkettgolv i ek",
      "walls": "målade väggar, originalsnickerier",
      "kitchen": "marmor bänkskiva",
      "bathroom": "kakel och klinker",
      "windows": "träfönster med 3-glas",
      "doors": "originaldörrar med höga socklar"
    },
    "balcony": {
      "exists": true,
      "direction": "sydväst",
      "size": "8 kvm",
      "type": "inglasad balkong"
    },
    "windows": {
      "description": "stora fönsterpartier med djupa nischer",
      "directions": ["mot gata", "mot gård"],
      "special": "överljus i vardagsrum"
    },
    "ceiling_height": "2.8 meter",
    "layout": "genomgående planlösning, sovrum i fil",
    "storage": ["garderob i sovrum", "förråd i källare 4 kvm"],
    "heating": "fjärrvärme, golvvärme badrum",
    "ventilation": "FTX-ventilation"
  },
  "economics": {
    "price": 4500000,
    "fee": 4200,
    "association": {
      "name": "BRF Solhemmet",
      "status": "stabil ekonomi, låg belåning 15%",
      "renovations": "stambytt 2019, fönsterbytte 2021",
      "fund": "underhållsfond 2.3 MSEK",
      "insurance": "försäkring ingår i avgiften"
    },
    "running_costs": {
      "heating": "1200 kr/år",
      "water": "300 kr/mån",
      "garbage": "150 kr/mån"
    }
  },
  "location": {
    "area": "Östermalm",
    "subarea": "stadskärnan",
    "transport": ["tunnelbana 5 min till Karlaplan", "buss 2 min", "cykel 10 min till city"],
    "amenities": ["Karlaplan", "Östermalms saluhall", "Djurgården", "Vasaparken"],
    "schools": ["Högstadiet 300m", "Gymnasium 500m"],
    "services": ["ICA 200m", "Apotek 150m", "Systembolaget 300m"],
    "character": "lugn gata med villaområden, nära citypuls"
  },
  "unique_features": ["takhöjd 2.8m med originalstuckatur", "eldstad i vardagsrum", "bevarade originaldetaljer", "inglasad balkong", "genomgående planlösning"],
  "legal_info": {
    "leasehold": null,
    "planning_area": "bostadsområde",
    "building_permit": "bygglov 1930"
  },
  "platform": "hemnet/booli"
}
`;

// Steg 2: Skapa plan/checklista som steg 3 måste följa
const PLAN_PROMPT = `
# UPPGIFT

Du ska skapa en tydlig plan för objektbeskrivningen utifrån DISPOSITIONEN.
Du ska INTE skriva själva objektbeskrivningen. Du ska bara skapa en plan som steg 3 kan följa utan att behöva en lång regelprompt.

# KRITISKA REGLER

1. HITTA ALDRIG PÅ – använd bara fakta som finns i dispositionen
2. Om fakta saknas: skriv in det i missing_info (och planera inte in det i texten)
3. Håll planen kort, konkret och kontrollerbar
4. Anpassa ordantal och upplägg efter PLATTFORM (HEMNET eller BOOLI/EGEN SIDA)
5. EVIDENCE-GATE: Varje sakpåstående som får förekomma i texten MÅSTE finnas som en post i claims med evidence_path + evidence_value från dispositionen
6. HÖGRISK-PÅSTÅENDEN: Utsikt (t.ex. havsutsikt), eldstad/öppen spis, balkongtyp (inglasad), väderstreck och kommunikationstyp (pendeltåg/tunnelbana) får bara finnas i claims om det står explicit i dispositionen
7. ANTI-AI-MALL: forbidden_words måste innehålla en baslista med klassiska generiska fraser (plattformsspecifik). Writer kommer följa den listan strikt.

# BASLISTA FÖRBJUDNA FRASER (lägg in i forbidden_words)

För BOTH: "i hjärtat av", "hjärtat av", "vilket gör det enkelt", "vilket gör det smidigt", "vilket gör det lätt", "rymlig känsla", "härlig plats för", "plats för avkoppling", "njutning av", "möjlighet att påverka", "forma framtiden", "vilket säkerställer"

För BOOLI/EGEN SIDA: lägg även in generiska bärfraser som ofta gör texten AI-mässig, t.ex. "för den som", "vilket ger en"

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

// Steg 2: Skriv final text baserat på disposition

// --- HEMNET FORMAT: steg 3 (skrivare) ---
const HEMNET_TEXT_PROMPT = `
# UPPGIFT

Skriv objektbeskrivningen för HEMNET baserat på DISPOSITION och PLAN.

# KRITISKA REGLER

1. Följ PLANENS paragraph_outline exakt (ordning, vad som måste med per stycke)
2. Använd bara fakta som finns i DISPOSITIONEN
3. Använd INTE ord/fraser i PLAN.forbidden_words
4. Håll dig inom PLAN.word_target
5. Om något saknas i dispositionen: skriv inte om det (lägg istället i missing_info i output)
6. EVIDENCE-GATE: Alla konkreta sakpåståenden (t.ex. utsikt, balkongtyp, väderstreck, eldstad, material, kommunikationer, föreningens status/åtgärder) får bara skrivas om de finns i PLAN.claims. Om det inte finns i PLAN.claims: skriv det inte alls.
7. Stil: professionell svensk mäklare, saklig och engagerande, juridiskt korrekt (inga garantier, inga överdrifter)

# OUTPUT FORMAT (JSON)

{
  "highlights": ["✓ ..."],
  "improvedPrompt": "Text med stycken separerade av \\n\\n",
  "analysis": {
    "target_group": "...",
    "area_advantage": "...",
    "pricing_factors": "..."
  },
  "socialCopy": "Kort text för sociala medier (max 280 tecken, ingen emoji)",
  "missing_info": ["Info som saknas i rådata"],
  "pro_tips": ["Tips till mäklaren"]
}
`;

// --- BOOLI/EGEN SIDA: steg 3 (skrivare) ---
const BOOLI_TEXT_PROMPT_WRITER = `
# UPPGIFT

Skriv objektbeskrivningen för BOOLI/EGEN SIDA baserat på DISPOSITION och PLAN.

# KRITISKA REGLER

1. Följ PLANENS paragraph_outline exakt (ordning, vad som måste med per stycke)
2. Använd bara fakta som finns i DISPOSITIONEN
3. Använd INTE ord/fraser i PLAN.forbidden_words
4. Håll dig inom PLAN.word_target
5. Om något saknas i dispositionen: skriv inte om det (lägg istället i missing_info i output)
6. EVIDENCE-GATE: Alla konkreta sakpåståenden (t.ex. utsikt, balkongtyp, väderstreck, eldstad, material, kommunikationer, föreningens status/åtgärder) får bara skrivas om de finns i PLAN.claims. Om det inte finns i PLAN.claims: skriv det inte alls.
7. Stil: professionell svensk mäklare, saklig och engagerande, juridiskt korrekt (inga garantier, inga överdrifter)

# OUTPUT FORMAT (JSON)

{
  "highlights": ["✓ ..."],
  "improvedPrompt": "Text med stycken separerade av \\n\\n",
  "analysis": {
    "target_group": "...",
    "area_advantage": "...",
    "pricing_factors": "..."
  },
  "socialCopy": "Kort text för sociala medier (max 280 tecken, ingen emoji)",
  "missing_info": ["Info som saknas i rådata"],
  "pro_tips": ["Tips till mäklaren"]
}
`;

// --- BOOLI/EGEN SIDA FORMAT (berättande, livsstil) ---
const BOOLI_TEXT_PROMPT = `
# KRITISKA REGLER (BRYT ALDRIG DESSA)

1. BÖRJA ALDRIG MED "Välkommen" – börja med adressen eller området
2. SKRIV ALDRIG dessa ord: erbjuder, erbjuds, perfekt, idealisk, rofylld, attraktivt, fantastisk, underbar, luftig, trivsam, inom räckhåll
3. DELA UPP I 6-8 STYCKEN med \\n\\n mellan varje stycke
4. 450-600+ ORD – berättande och utförlig
5. HITTA ALDRIG PÅ – använd bara fakta från dispositionen

# DIN UPPGIFT

Skriv en objektbeskrivning för BOOLI/egen sida. Fokus på livsstil, känsla och berättelse. Texten ska kunna publiceras direkt utan redigering.

# STRUKTUR (Booli/egen sida - världens bästa berättelser)

STYCKE 1 - EPIC HOOK: Dramatisk öppning som skapar omedelbar längtan
STYCKE 2 - SENSORY JOURNEY: Genomgående sinnesupplevelse (5 sinnen)
STYCKE 3 - EMOTIONAL LANDSCAPE: Känslomässig resa genom bostaden
STYCKE 4 - LIFESTYLE NARRATIVE: Hur livet utspelar sig här - scenerier
STYCKE 5 - ARCHITECTURAL POETRY: Material, hantverk, detaljer med känsla
STYCKE 6 - TEMPORAL DIMENSION: Hur bostaden lever genom dygnet/året
STYCKE 7 - INVESTMENT WISDOM: Trygghet, ekonomi, framtid
STYCKE 8 - COMMUNITY TAPESTRY: Områdets puls, grannskap, gemenskap
STYCKE 9 - FUTURE VISION: Drömbild för köparens liv här
STYCKE 10 - LEGACY STATEMENT: Varför detta blir en del av deras historiaen

# BOOLI-SKRIVSTIL - VÄRLDENS BÄSTA BERÄTTELSKRIVARE

- **EPIC STORYTELLING:** Skriv som en författare som målar upp en drömvärld
- **SENSORY IMMERSION:** 5 sinnesintryck som skapar total upplevelse
- **EMOTIONAL ARCHITECTURE:** Bygg känslor från nyfikenhet till djup längtan
- **LIFESTYLE NARRATIVE:** Visa exakt HUR livet utspelar sig här
- **ARCHITECTURAL POETRY:** Material och hantverk med känslomässig resonance
- **TEMPORAL DIMENSION:** Hur bostaden lever genom dygnet/året/årstiderna
- **INVESTMENT WISDOM:** Trygghet, ekonomi, framtid som investering
- **COMMUNITY INTEGRATION:** Områdets puls, grannskap, gemenskap
- **FUTURE VISION:** Drömbild för köparens liv här
- **LEGACY IMPACT:** Varför detta blir en del av deras historia
- **VIKTIGT:** Inkludera ekonomiska detaljer (avgift, belåning, fond) för trygghet och investeringsperspektiv

# MASTERCLASS TEKNIKER - FORMELBASERADE

**1. EPIC HOOK (Välj en och fyll i):**
- "I en av [område]s mest [adjektiv] [årtal]s [fastighetstyp], där [egenskap 1] möter [egenskap 2], ligger..."
- "Hemligheten bakom [unikt detalj] på [adress] är inte bara en [objekttyp] – det är en portal till [dröm]..."

**2. SENSORY JOURNEY (Använd minst 4):**
- **SYN:** "Ljuset [verb] på [yta] och träffar [material] som [effekt]"
- **LJUD:** "[Ljudkälla] [verb], ersatt av [positivt ljud] där [detalj]"
- **KÄNSLA:** "[Material] [verb] dina [kroppsdel] som [jämförelse] på [tid]"
- **DOFT:** "Doften av [källa] blandas med [sekundär doft] från [plats]"
- **SMACK:** "Känslan av [yta] under [fingertyp] [verb] [egenskap]"

**3. EMOTIONAL LANDSCAPE (Bygg i steg):**
- Stycke 1: Använd "nyfikenhet" + "upptäckt" + "hemlighet"
- Stycke 2: Använd "fascination" + "dröm" + "längtan"
- Stycke 3: Använd "måste-ha" + "sällsynt" + "möjlighet"
- Stycke 4: Använd "trygghet" + "framtid" + "glädje"

**4. LIFESTYLE SCENES (Skapa 3+ scener):**
- "[Tidpunkt] [verb] du till [sinnesupplevelse] som [effekt]"
- "[Tidpunkt] blir [rum] [funktion] där [personer] [aktivitet]"
- "[Årstid] [verb] [plats] med [detalj] där [livsstilsaktivitet]"

**5. ARCHITECTURAL POETRY (Använd material från disposition):**
- "Varje [detalj] och [material] berättar [historia] från [tid] då [kvalitet]"
- "[Specifik detalj] i [plats] är som [jämförelse] som [effekt]"

**6. TEMPORAL DIMENSION (Beskriv 3 årstider/tider):**
- "På [årstid] är [plats] [beskrivning] där [aktivitet] sker"
- "På [årstid] blir [element] hjärtat i [rum] där [effekt]"
- "På [årstid] [verb] [bostad] med [sinnesupplevelse] och känns som [jämförelse]"

**7. INVESTMENT WISDOM (Använd ekonomi från disposition):**
- "Föreningens [ekonomisk detalj] är inte bara [siffra] – det är [trygghet] för [framtid]"
- "[Renovering] [årtal] är inte bara [åtgärd] – det är [garanti] för [resultat]"

**8. COMMUNITY TAPESTRY:**
- "Grannskapet här är som [jämförelse] där [gemenskap] och [delning]"
- "Områdets puls med [detaljer] skapar [känsla] som [jämförelse]"

**9. FUTURE VISION (Skapa 2+ framtidsvisioner):**
- "Tänk dig [aktivitet] du kommer att [utföra], [tidpunkt] du kommer att [uppleva], [minne] du kommer att [skapa]"
- "Om [antal] år kommer du minnas [specifik detalj] när du [aktivitet]"

**10. LEGACY IMPACT:**
- "Detta är inte bara en [objekttyp] – det är [metafor] av [livsbetydelse]"

# KVALITETSCHECK INNAN DU SLUTFÖR:
✅ Har jag använt minst 4 sinnesdetaljer (syn, ljud, känsla, doft, smak)?
✅ Börjar texten med en dramatisk hook (inte "Välkommen")?
✅ Finns minst 3 lifestyle-scener (hur man BOR här)?
✅ Har jag emotional landscape (nyfikenhet → fascination → längtan)?
✅ Är ALLA material från disposition med (parkett, kakel, marmor, etc)?
✅ Har jag temporal dimension (minst 2 årstider/tider)?
✅ Inkluderar jag ekonomiska detaljer (avgift, belåning, fond)?
✅ Har jag community tapestry (områdets puls)?
✅ Har jag future vision (tänk dig...)?
✅ Har jag legacy impact (livsbetydelse)?
✓ Skriv ENDAST när allt är klart

# FÖLJ ALDRIG DESSA MÖNSTER:
❌ "Perfekt för..." → Beskriv specifik scen istället
❌ "Fantastisk läge" → Beskriv exakt vad läget ger
❌ "Renoverat med hög standard" → Namnge material och år
❌ Generiska adjektiv → Använd max 3 per text (Booli tillåter mer)
❌ Kopiera exempel → Fyll i formler med data från disposition

# EXEMPEL BOOLI/EGEN SIDA - MED MASTERCLASS TEKNIKER

"I en av Östermalms mest eftertraktade 30-talsfastigheter, där sekelskiftets charm möter 2020-talets elegans, ligger denna trea om 62 kvadratmeter där takhöjden på 2.8 meter och den bevarade originalstuckaturen omedelbart skapar en känsla av att du har hittat något unikt.

Här kliver du in i en värld där historien möter nutiden. Ljuset dansar på de vita väggarna och träffar det genomgående parkettgolvet i ek som ekar av sekelskiftets själ. I vardagsrummet sprakar elden i eldstaden på kalla kvällar, medan tystnaden från innergården bara avbryts av fågelkvitter – den enda musiken du hör i stadens puls. Doften av nybryggt kaffe från köket 2022 blandas med den svaga parfymen från de gamla träbokhyllorna, och känslan av den kalla marmorn i köksbänken under dina fingertoppar är en påminnelse om kvalitet.

Här vaknar du till solsken som strömmar in genom de stora fönsterpartierna och träffar din blick. Kvällarna blir förlängningen av vardagsrummet där vänner samlas för middagar och vin, medan den öna planlösningen mot köket gör att matlagningen blir en del av sällskapet. Köket är en dröm för den matglada med sin marmor bänkskiva och integrerade Siemens vitvaror – här lagas det söndagsmiddagar medan gästerna sätter sig vid matplatsen med utsikt över den lugna innergården. Sovrummet vetter mot samma tysta gård och erbjuder en fristad från stadens puls, en plats där du kan återhämta dig själv.

Badrummet är ett eget spa med kakel i dämpade toner och golvvärme som omsluter dina fötter som en varm kram på kalla morgnar. Den inglasade balkongen i sydväst blir förlängningen av vardagsrummet – här intas morgonkaffet i solen medan staden vaknar, här avslutas dagen med ett glas vin och utsikt över gårdens grönska. På sommaren är balkongen scenen för grillkvällar och solnedgångar, på vintern blir eldstaden hjärtat i hemmet där värmen sprider och skapar en oas av komfort.

Föreningen BRF Solhemmet är ett tryggt kapital med bara 15% belåning och hela 2.3 miljoner i underhållsfond – en ekonomisk trygghet som är mer än bara siffror. Stambytet 2019 och fönsterbytet 2021 är inte bara renoveringar – det är en garanti för ett bekymmersfritt boende i många år framöver, en investering i din frid.

Områdets puls med caféer, butiker och parker skapar en levande vardag som få andra platser kan matcha, och ändå är gatan lugn och innergården en oas av grön ro. Grannskapet här är som en liten by där alla känner varandra och delar både glädje och omsorg.

Tänk dig de middagar du kommer att bjuda in, de morgnar du vaknar till med en känsla av mening, de livsminnen du kommer att skapa här. Detta är inte bara en bostad – det är kapitlet i första kapitlet av ditt livs nästa berättelse."

# OUTPUT FORMAT (JSON)

{
  "highlights": ["✓ Punkt 1", "✓ Punkt 2", "✓ Punkt 3", "✓ Punkt 4", "✓ Punkt 5"],
  "improvedPrompt": "Objektbeskrivningen med stycken separerade av \\n\\n",
  "analysis": {
    "target_group": "Vem passar bostaden för",
    "area_advantage": "Områdets styrkor",
    "pricing_factors": "Prishöjande faktorer"
  },
  "socialCopy": "Kort text för sociala medier (max 280 tecken, ingen emoji)",
  "missing_info": ["Info som saknas i rådata"],
  "pro_tips": ["Tips till mäklaren"]
}
`;

// Expertversion för pro-användare

const BOOLI_EXPERT_PROMPT = `
// ... rest of the code remains the same ...
- Målgrupp: Unga yrkesverksamma, tech-branschen
- Säljargument: Vattennära nyproduktion, Göteborgs framtid, gång till tech-jobb

*Askim/Hovås*
- Karaktär: Exklusiva villor, havsnära, country club-känsla
- Pendling: Bil, expressbuss
- Målgrupp: Höginkomsttagare, etablerade familjer
- Säljargument: Havsvy, västkustkänsla, exklusivitet

**MALMÖ**

*Centrum (Davidshall, Rörsjöstaden, Möllan)*
- Karaktär: Jugend, sekelskifte, multikulturell energi
- Pendling: Cykel, buss, Citytunneln till Köpenhamn 30 min
- Målgrupp: Unga kosmopoliter, Köpenhamns-pendlare
- Säljargument: Köpenhamn-access, europeisk stadskänsla, prisvärt jämfört med Stockholm

*Västra Hamnen*
- Karaktär: Nyproduktion, Turning Torso, hållbarhet, havsutsikt
- Pendling: Gång/cykel till centrum, Citytunneln nära
- Målgrupp: Designmedvetna, miljöfokuserade
- Säljargument: Skandinaviens mest hållbara stadsdel, Öresund vid fötterna

*Limhamn/Bunkeflo*
- Karaktär: Villa- och radhusområden, havsnära, familjevänligt
- Pendling: Buss, cykel till centrum
- Målgrupp: Barnfamiljer, kitesurf-entusiaster
- Säljargument: Strandpromenader, Sibbarp, villaträdgårdar

### MARKNADSTRENDER 2025-2026

**Ränteklimat & Köpbeteende**
- Köpare är mer prismedvetna, betona kostnadseffektivitet (avgift, el, värme)
- Budgivningar lugnare, köpare har tid att utvärdera
- Fler förhandlingar, säljargument måste vara konkreta

**Energi & Driftskostnader (KRITISKT)**
- Energiklass A-C är starkt säljande, nämn alltid energiklass om känd
- Värmepumpar, solceller, FTX-ventilation = konkreta besparingar
- "Låg elförbrukning" är mer säljande än "renoverat kök" för många köpare
- Fjärrvärme ses positivt, stabila kostnader

**Hållbarhet & Miljö**
- Laddstolpar för elbil är nu förväntat, inte bonus
- Cykelrum och cykelservice-stationer värderas högt
- Grön innergård, urban odling, biodiversitet = moderna säljargument

**Hybridarbete & Hemmakontor**
- Extra rum/arbetsyta är extremt värderat
- "Avskilt hemmakontor" slår "sovrum 3" för många köpare
- Fiber obligatoriskt, nämn alltid hastighet om känd

**Balkong & Uteplats**
- Post-pandemin: balkong/terrass är avgörande för prissättning
- Söder-/västerläge i Stockholm adderar betydande värde
- Inglasad balkong = extra boyta året runt

**Föreningsekonomi (Bostadsrätt)**
- Köpare granskar årsredovisningar hårdare
- Låg belåningsgrad i föreningen är starkt säljargument
- Kommande renoveringar (stambyten etc.) måste adresseras proaktivt

### BOSTADSRÄTTSFÖRENINGEN (BRF) – KRITISKT SÄLJARGUMENT

**TOPPFÖRDELAR ATT ALLTID NÄMNA (om tillgängligt):**
1. **Skuldfri förening**, "Föreningen har inga banklån" → extremt starkt säljargument
2. **Föreningen äger marken**, eliminerar osäkerhet om tomträttsavgäld
3. **Låg månadsavgift**, ange exakt belopp: "Endast 2 890 kr/mån"
4. **Stambytt**, "Stambytt 2022" med årtal är viktigt
5. **Stabil ekonomi**, "Välskött förening med god ekonomi"

**ASSOCIATIONSDETALJER ATT INKLUDERA:**
- Gemensamma utrymmen: gym, bastu, takterrass, gästlägenhet, cykelrum
- Tvättstuga med moderna maskiner, eller tvättmaskin i lägenheten
- Hiss (kritiskt för äldre byggnader)
- Garage/P-plats i föreningen (ange kostnad om känd)
- Förråd i källare (ange storlek om möjligt)

**VARNINGSFLAGGOR ATT HANTERA PROAKTIVT:**
Om det finns kommande renoveringar → presentera positivt: "Föreningen planerar stamrenovering 2026 med god framförhållning och transparent kommunikation"

### ÖPPNINGSMALLAR (BÖRJA ALDRIG MED "VÄLKOMMEN")

**STANDARD (de flesta objekt):**
"På [adress], i [fastighetsbeskrivning], ligger denna [typ] om [X] kvm."
Exempel: "På Karlavägen 45, i en välbevarad 1920-talsfastighet, ligger denna ljusa tvåa om 58 kvm."

**PREMIUM (4M+ kr, exklusiva lägen):**
"[Läge/adress] – [unik detalj]."
Exempel: "Strandvägen 15 – sekelskiftesvåning med bevarade originaldetaljer och fri utsikt över Nybroviken."

**EXKLUSIVT (8M+ kr, villor, unika objekt):**
"I [område], [lägesbeskrivning], ligger denna [typ]."
Exempel: "I Saltsjöbadens mest eftersökta del, med egen strandlinje mot Baggensfjärden, ligger denna arkitektritade villa."

**CHARM-FOKUS (sekelskifte, karaktär):**
"[Årtal] års [arkitektur] i denna [typ] på [adress]."
Exempel: "1912 års jugendarkitektur i denna karaktärsfulla hörnlägenhet vid Odenplan."

### KÖPARPSYKOLOGI & MÅLGRUPPER

**Förstagångsköpare (25-35)**
- Prioriterar: Pris, läge, balkong, socialt område
- Oro: Råd med räntor, föreningens ekonomi
- Språk: Energiskt men inte naivt, betona investeringspotential

**Unga Familjer (30-40)**
- Prioriterar: Skolor, förskolor, barnvänligt, sovrumsantal, förråd
- Oro: Trafik, lekplatser, framtida behov
- Språk: Trygghet, "plats att växa", närhet till natur

**Etablerade Familjer (40-55)**
- Prioriterar: Kvalitet, utrymme, trädgård, garage, status
- Oro: Underhåll, grannskap
- Språk: Premium, "väletablerat", långsiktig investering

**Downsizers (55+)**
- Prioriterar: Hiss, tillgänglighet, lågt underhåll, service i närheten
- Oro: Trappor, tunga trädgårdar
- Språk: "Bekymmersfritt boende", "allt på ett plan", närhet till vård/service

**Investerare**
- Prioriterar: Hyresavkastning, läge, renoveringspotential
- Språk: Siffror, avkastning, utvecklingsområden

### ERSÄTTNINGSSTRATEGIER (KLYSCH → KONKRET)
| Klysch | Ersättning |
|--------|------------|
| "Högt i tak" | "3.2 meters takhöjd med bevarad originalstuckatur" |
| "Ljust" | "Sydvästläge med kvällssol på balkongen till 21:00 sommartid" |
| "Nära till allt" | "400m till Odenplans tunnelbana, 7 min promenad till Vasaparken" |
| "Renoverat" | "Nytt kök 2023: Siemens-vitvaror, induktionshäll, kvartskomposit" |
| "Fin utsikt" | "Fri sikt över Riddarfjärden från vardagsrummets tre fönster" |
| "Rymlig" | "72 kvm fördelat på 3 rum med separat kök" |
| "Modern standard" | "Helrenoverat 2022 med originalbevarade stuckaturer" |
| "Lugnt område" | "Stilla gata med <50 bilar/dag enligt trafikmätning" |
| "Bra förening" | "Skuldfri förening med 2.3 MSEK i underhållsfond" |
| "Nära naturen" | "5 minuters cykel till Djurgårdens ekbackar" |

**PREMIUM ADJEKTIV (använd sparsamt, max 2-3 per text):**
- Tidlös, sofistikerad, raffinerad
- Generös (endast med mått), ståtlig
- Påkostad (endast med specifikation)
- Välbevarad, autentisk, gedigen
- Eftertraktad (om läge)

**STILREGLER:**
- Använd metriska mått och årtal som bevis
- Namnge specifika märken, material, arkitekter
- Första meningen ska vara en "hook" – specifik och intresseväckande
- Varje stycke ska ge ny information
- Sista stycket ska öppna för framtiden (livsstil, potential)
- INGA emojis under några omständigheter
- Skriv för att läsas högt – naturlig svenska, ingen "mäklarsvenska"
- Balansera fakta (kvm, rum, våning) med känsla (ljus, atmosfär, livsstil)
- Nämn säsongsvariationer: "Sommarmorgnar på balkongen" / "Vinterkvällar vid brasan"
`;

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // User status endpoint
  app.get("/api/user/status", async (req, res) => {
    try {
      const userId = req.session?.userId;
      const tzOffset = parseInt(req.query.tz as string) || 0;

      const now = new Date();
      const userNow = new Date(now.getTime() - tzOffset * 60000);
      const tomorrow = new Date(userNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const resetTime = new Date(tomorrow.getTime() + tzOffset * 60000);

      if (userId) {
        const user = await storage.getUserById(userId);
        if (user) {
          const plan = (user.plan as PlanType) || "free";
          const monthlyLimit = PLAN_LIMITS[plan];
          const promptsUsedToday = user.promptsUsedToday || 0;

          return res.json({
            plan,
            promptsUsedToday,
            promptsRemaining: Math.max(0, monthlyLimit - promptsUsedToday),
            monthlyLimit,
            isLoggedIn: true,
            resetTime: resetTime.toISOString(),
            stripeCustomerId: user.stripeCustomerId || null,
          });
        }
      }

      res.json({
        plan: "free",
        promptsUsedToday: 0,
        promptsRemaining: PLAN_LIMITS.free,
        monthlyLimit: PLAN_LIMITS.free,
        isLoggedIn: false,
        resetTime: resetTime.toISOString(),
      });
    } catch (err) {
      console.error("User status error:", err);
      res.status(500).json({ message: "Kunde inte hämta användarstatus" });
    }
  });

  // Optimize endpoint
  app.post("/api/optimize", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const plan = (user.plan as PlanType) || "free";
      const promptsUsedToday = user.promptsUsedToday || 0;

      const monthlyLimit = PLAN_LIMITS[plan];
      if (promptsUsedToday >= monthlyLimit) {
        return res.status(429).json({
          message: `Du har nått din månadsgräns av ${monthlyLimit} objektbeskrivningar. Uppgradera till Pro för fler!`,
          limitReached: true,
        });
      }

      const { prompt, type, platform } = req.body;

      // === 2-STEGS GENERATION ===
      
      // Steg 1: Extrahera fakta och skapa disposition
      console.log("[Step 1] Extracting facts and creating disposition...");
      
      const dispositionMessages = [
        {
          role: "system" as const,
          content: DISPOSITION_PROMPT + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content: `RÅDATA: ${prompt}`,
        },
      ];

      const dispositionCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: dispositionMessages,
        max_tokens: 2000,
        temperature: 0.1, // Låg temperatur för faktaextrahering
        response_format: { type: "json_object" },
      });

      const dispositionText = dispositionCompletion.choices[0]?.message?.content || "{}";
      let disposition: any;
      try {
        disposition = safeJsonParse(dispositionText);
      } catch (e) {
        console.warn("[Step 1] Disposition JSON parse failed, retrying once...", e);
        const dispositionRetry = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system" as const,
              content:
                DISPOSITION_PROMPT +
                "\n\nSvara ENDAST med ett giltigt JSON-objekt. Inga trailing commas. Inga kommentarer.",
            },
            { role: "user" as const, content: `RÅDATA: ${prompt}` },
          ],
          max_tokens: 2000,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
        const dispositionRetryText = dispositionRetry.choices[0]?.message?.content || "{}";
        try {
          disposition = safeJsonParse(dispositionRetryText);
        } catch (e2) {
          return res.status(422).json({
            message: "Kunde inte tolka disposition (ogiltig JSON). Försök igen.",
          });
        }
      }
      console.log("[Step 1] Disposition created:", JSON.stringify(disposition, null, 2));

      // Steg 2: Skapa plan/checklista
      console.log("[Step 2] Creating plan/checklist...");

      const planMessages = [
        {
          role: "system" as const,
          content: PLAN_PROMPT + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content:
            "DISPOSITION: " +
            JSON.stringify(disposition, null, 2) +
            "\n\nPLATTFORM: " +
            (platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"),
        },
      ];

      const planCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: planMessages,
        max_tokens: 1400,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const planText = planCompletion.choices[0]?.message?.content || "{}";
      let generationPlan: any;
      try {
        generationPlan = safeJsonParse(planText);
      } catch (e) {
        console.warn("[Step 2] Plan JSON parse failed, retrying once...", e);
        const planRetry = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system" as const,
              content:
                PLAN_PROMPT +
                "\n\nSvara ENDAST med ett giltigt JSON-objekt. Inga trailing commas. Inga kommentarer.",
            },
            {
              role: "user" as const,
              content:
                "DISPOSITION: " +
                JSON.stringify(disposition, null, 2) +
                "\n\nPLATTFORM: " +
                (platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"),
            },
          ],
          max_tokens: 1400,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });
        const planRetryText = planRetry.choices[0]?.message?.content || "{}";
        try {
          generationPlan = safeJsonParse(planRetryText);
        } catch (e2) {
          return res.status(422).json({
            message: "Kunde inte tolka plan (ogiltig JSON). Försök igen.",
          });
        }
      }
      console.log("[Step 2] Plan created:", JSON.stringify(generationPlan, null, 2));

      // Steg 3: Skriv final text baserat på disposition + plan
      console.log("[Step 3] Writing final text based on disposition + plan...");

      // Välj rätt prompt baserat på plattform
      const selectedPrompt = platform === "hemnet" ? HEMNET_TEXT_PROMPT : BOOLI_TEXT_PROMPT_WRITER;
      console.log("[Step 3] Using " + platform.toUpperCase() + " writer prompt...");
      
      const textMessages = [
        {
          role: "system" as const,
          content: selectedPrompt + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content:
            "DISPOSITION: " +
            JSON.stringify(disposition, null, 2) +
            "\n\nPLAN: " +
            JSON.stringify(generationPlan, null, 2) +
            "\n\nPLATTFORM: " +
            (platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"),
        },
      ];

      const textCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: textMessages,
        max_tokens: 4000,
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const textResultText = textCompletion.choices[0]?.message?.content || "{}";
      let result: any;
      try {
        result = safeJsonParse(textResultText);
      } catch (e) {
        console.warn("[Step 3] Text JSON parse failed, retrying once...", e);
        const textRetry = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system" as const,
              content:
                selectedPrompt +
                "\n\nSvara ENDAST med ett giltigt JSON-objekt. Inga trailing commas. Inga kommentarer.",
            },
            {
              role: "user" as const,
              content:
                "DISPOSITION: " +
                JSON.stringify(disposition, null, 2) +
                "\n\nPLAN: " +
                JSON.stringify(generationPlan, null, 2) +
                "\n\nPLATTFORM: " +
                (platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"),
            },
          ],
          max_tokens: 4000,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });
        const textRetryText = textRetry.choices[0]?.message?.content || "{}";
        try {
          result = safeJsonParse(textRetryText);
        } catch (e2) {
          return res.status(422).json({
            message: "Kunde inte tolka textresultat (ogiltig JSON). Försök igen.",
          });
        }
      }

      // Validering och retries för text-steget
      let violations = validateOptimizationResult(result, platform);
      console.log("[AI Validation] Text generation violations:", violations.length > 0 ? violations : "NONE");
      
      // Retry loop
      // - Booli behöver ofta fler omtag för att undvika mallfraser
      // - Vi vill ALDRIG returnera en text som fortfarande bryter mot reglerna
      const maxAttempts = platform === "hemnet" ? 2 : 5;
      let attempts = 0;
      while (violations.length > 0 && attempts < maxAttempts) {
        attempts++;
        console.log(`[AI Validation] Retry attempt ${attempts} due to violations:`, violations);
        
        const violationList = violations.map(v => `- ${v}`).join("\n");

        const retryCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            ...textMessages,
            {
              role: "user" as const,
              content:
                "STOPP! Texten bryter mot kvalitetsreglerna. Du måste skriva om den.\n\n" +
                "FEL SOM MÅSTE ÅTGÄRDAS (ta bort/skriv om):\n" +
                violationList +
                "\n\nREGLER:\n" +
                "1. Använd inga fraser som matchar listan ovan (de är förbjudna).\n" +
                "2. Ersätt varje mallfras med KONKRET fakta från DISPOSITION/PLAN.\n" +
                "3. Om du saknar fakta: TA BORT meningen helt (hitta inte på).\n" +
                "4. Behåll säljig, professionell mäklar-svenska utan AI-klyschor.\n\n" +
                "Returnera ENDAST JSON med omskriven text.",
            },
          ],
          max_tokens: 4000,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const retryText = retryCompletion.choices[0]?.message?.content || "{}";
        try {
          result = safeJsonParse(retryText);
        } catch (e) {
          console.warn("[AI Validation] Retry JSON parse failed, continuing to next attempt...", e);
          violations = ["Ogiltig JSON i modellens svar"]; 
          continue;
        }
        violations = validateOptimizationResult(result, platform);
        console.log("[AI Validation] After retry " + attempts + " violations:", violations.length > 0 ? violations : "NONE");
      }
      
      if (violations.length > 0) {
        console.warn("[AI Validation] ERROR: Still has violations after retries:", violations);
        return res.status(422).json({
          message:
            "Kunde inte generera en text utan förbjudna mallfraser efter flera försök. Försök igen.",
          violations,
        });
      }

      // POST-PROCESSING: Rensa bort förbjudna fraser och lägg till stycken
      if (result.improvedPrompt) {
        result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt);
        result.improvedPrompt = addParagraphs(result.improvedPrompt);
      }
      if (result.socialCopy) {
        result.socialCopy = cleanForbiddenPhrases(result.socialCopy);
      }
      console.log("[Post-processing] Text cleaned and paragraphs added");

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
        suggestions: result.pro_tips || [],
        socialCopy: result.socialCopy || null,
      });

      res.json({
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt || prompt,
        highlights: result.highlights || [],
        analysis: result.analysis || {},
        improvements: result.missing_info || [],
        suggestions: result.pro_tips || [],
        socialCopy: result.socialCopy || null
      });
    } catch (err: any) {
      console.error("Optimize error:", err);
      res.status(500).json({ message: err.message || "Optimering misslyckades" });
    }
  });


  // Stripe checkout
  app.post("/api/stripe/create-checkout", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as User;
      const { tier } = req.body;

      console.log("[Stripe Checkout] User authenticated:", user.id, user.email);

      const priceId = tier === "basic" ? STRIPE_BASIC_PRICE_ID : STRIPE_PRO_PRICE_ID;
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
          const targetPlan = session.metadata?.targetPlan as "basic" | "pro";

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

  return httpServer;
}
