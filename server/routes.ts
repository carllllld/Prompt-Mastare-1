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
];

function findRuleViolations(text: string, platform: string = "hemnet"): string[] {
  const violations: string[] = [];
  
  // Check for forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push(`Förbjuden fras: "${phrase}"`);
    }
  }
  
  // ENKEL VALIDERING - bara ordkrav och förbjudna fraser
  
  // Check for "Välkommen" opening (forbidden)
  if (text.toLowerCase().startsWith('välkommen')) {
    violations.push(`Börjar med "Välkommen" - börja med adress eller läge istället`);
  }
  
  // Check for AI-typical phrases that should not appear
  const aiPhrases = ['tänk dig', 'föreställ dig', 'ljuset dansar', 'doften av', 'känslan av', 'sinnesupplevelse'];
  for (const phrase of aiPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      violations.push(`AI-typisk fras: "${phrase}" - skriv mer sakligt`);
    }
  }
  
  // Check for generic patterns
  const genericPatterns = ['fantastisk läge', 'renoverat med hög standard', 'attraktivt', 'idealisk'];
  for (const pattern of genericPatterns) {
    if (text.toLowerCase().includes(pattern)) {
      violations.push(`Generiskt mönster: "${pattern}"`);
    }
  }
  
  return violations;
}

// Separat funktion för ordräkning (endast för improvedPrompt)
function checkWordCount(text: string, platform: string): string[] {
  const violations: string[] = [];
  const wordCount = text.split(/\s+/).length;
  const minWords = platform === "hemnet" ? 180 : 200;
  const maxWords = platform === "hemnet" ? 500 : 600;
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
    violations.push(...checkWordCount(result.improvedPrompt, platform));
  }
  // socialCopy valideras bara för förbjudna fraser, inte ordräkning
  if (typeof result?.socialCopy === "string") {
    violations.push(...findRuleViolations(result.socialCopy, platform));
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
  
  ];

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

const STRIPE_BASIC_PRICE_ID = process.env.STRIPE_BASIC_PRICE_ID;
const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

// --- 2-STEGS GENERATION ---

// Steg 1: Extrahera fakta + geografisk kontext
const DISPOSITION_PROMPT = `
# UPPGIFT

Du är en svensk fastighetsmäklare med 15 års erfarenhet. Extrahera ALLA relevanta fakta från rådata och lägg till geografisk kontext. Skriv INGEN text, bara fakta.

# REGLER

1. Hitta ALDRIG på – extrahera bara vad som faktiskt finns i rådata
2. Lägg till geografisk kontext baserat på platsen
3. Använd exakta värden från rådata (kvm, pris, år, etc)
4. Strukturera i JSON enligt formatet nedan
5. Om info saknas, lämna fältet tomt eller null

# GEOGRAFISK INTELLIGENS

För varje plats, lägg till:
- Områdets karaktär (stadskärna, villaområde, skärgård, etc)
- Prisnivå (låg, medel, hög, premium)
- Målgrupp (förstagångsköpare, familjer, etablerade, downsizers)
- Kommunikationstyp (t-bana, pendeltåg, buss, bil)
- Närliggande städer/områden

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
    "price_per_kvm": 72581,
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
    "municipality": "Stockholm",
    "region": "Stockholms län",
    "character": "stadskärna, exklusivt",
    "price_level": "premium",
    "target_group": "etablerade, investerare",
    "transport": {
      "type": "tunnelbana",
      "distance": "5 min till Karlaplan",
      "details": ["tunnelbana 5 min till Karlaplan", "buss 2 min", "cykel 10 min till city"]
    },
    "amenities": ["Karlaplan", "Östermalms saluhall", "Djurgården", "Vasaparken"],
    "schools": ["Högstadiet 300m", "Gymnasium 500m"],
    "services": ["ICA 200m", "Apotek 150m", "Systembolaget 300m"],
    "nearby_areas": ["Djurgården", "Norrmalm", "Vasastan"],
    "geographic_context": "Centralt Stockholm, exklusivt innerstadsområde"
  },
  "unique_features": ["takhöjd 2.8m med originalstuckatur", "eldstad i vardagsrum", "bevarade originaldetaljer", "inglasad balkong", "genomgående planlösning"],
  "legal_info": {
    "leasehold": null,
    "planning_area": "bostadsområde",
    "building_permit": "bygglov 1930"
  },
  "platform": "hemnet/booli",
  "tone_analysis": {
    "price_category": "premium",
    "location_category": "urban_premium",
    "property_category": "character_apartment",
    "writing_style": "sophisticated_professional"
  }
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

// === EXEMPELDATABAS - RIKTIGA MÄKLARTEXTER ===
const EXAMPLE_DATABASE = {
  // Lägenheter - Premium Innerstad
  premium_ostermalm: [
    {
      text: "Karlavägen 45, våning 4 av 5. En välplanerad tvåa om 58 kvm i klassisk 20-talsfastighet med bevarade originaldetaljer.\n\nLägenheten har en genomtänkt planlösning med hall, vardagsrum, sovrum, kök och badrum. Från hallen nås samtliga rum. Vardagsrummet om cirka 20 kvm har två fönster mot gården och takhöjd på 2,8 meter. Golven är av ekparkett genomgående.\n\nKöket är utrustat med spis, ugn, kyl, frys och diskmaskin. Bänkskivorna är av laminat och det finns gott om förvaring i över- och underskåp. Köket har fönster mot gården.\n\nSovrummet rymmer dubbelsäng och har garderob med skjutdörrar. Badrummet är helkaklat och renoverat 2019 med dusch, wc och handfat. Tvättmaskin och torktumlare finns i lägenheten.\n\nBalkongen på 4 kvm vetter mot väster med eftermiddags- och kvällssol. Föreningen har nyligen renoverat fasaden och taket.\n\nLäget är centralt med tunnelbana på 3 minuters gångavstånd. Matbutiker, restauranger och Humlegården finns i närområdet.",
      metadata: { price_level: "premium", area: "Östermalm", type: "lägenhet", rooms: 2, size: 58 }
    },
    {
      text: "Strandvägen 15, våning 2 av 4. En ljus trea om 78 kvm med balkong i söderläge.\n\nLägenheten har en praktisk planlösning med hall, vardagsrum, två sovrum, kök och badrum. Vardagsrummet har stora fönster mot gatan och takhöjd på 2,9 meter. Golven är av ekparkett som slipades 2020.\n\nKöket har vita luckor, bänkskiva i sten och är utrustat med spis, ugn, kyl, frys och diskmaskin. Badrummet renoverades 2018 och har dusch, wc, handfat och tvättmaskin.\n\nDet större sovrummet rymmer dubbelsäng och har platsbyggd garderob. Det mindre sovrummet passar som barnrum eller arbetsrum. Balkongen är inglasad och vetter mot söder.\n\nFastigheten är välskött med renoverad fasad och trapphus. Tunnelbana finns på 4 minuters gångavstånd och matbutik i samma kvarter.",
      metadata: { price_level: "premium", area: "Östermalm", type: "lägenhet", rooms: 3, size: 78 }
    }
  ],
  
  // Villor - Naturnära områden
  villa_nature: [
    {
      text: "Ekorrvägen 10, Mörtnäs. En rymlig villa på 165 kvm med 6 rum i lugnt och naturnära område. Villan har ekparkettgolv och nyrenoverat kök från Marbodal 2023.\n\nHuset har en praktisk planlösning med socialt kök i öppen planlösning med vardagsrum. Köket har vitvaror från Siemens och bänkskivor i kvartskomposit. Det finns gott om förvaringsutrymmen i både kök och hall.\n\nBadrummet har badkar och golvvärme. Samtliga rum har ekparkettgolv och villan har en hög takhöjd på över 3 meter. De spröjsade fönstren bidrar till husets charm och karaktär.\n\nDet finns en härlig terrass i söderläge. Dessutom finns ett nybyggt uterum med TV-soffa och extra badrum. Uppvärmning sker via fjärrvärme.\n\nFastigheten ligger i Mörtnäs med 10 minuters gångavstånd till bussen. Området är lugnt och naturnära med goda kommunikationer till centrala Värmdö.",
      metadata: { price_level: "premium", area: "Mörtnäs", type: "villa", rooms: 6, size: 165 }
    },
    {
      text: "Skogsvägen 25, Täby. En charmig villa på 140 kvm med 5 rum i barnvänligt område. Villan har renoverats 2021 med nytt kök och badrum.\n\nHuset har en öppen planlösning mellan kök och vardagsrum. Köket har vitvaror från Smeg och bänkskivor i kalksten. Det finns matplats för 6-8 personer.\n\nPå övervåningen finns fyra sovrum och ett familjerum. Huvudsovrummet har walk-in-closet och eget badrum med dusch och badkar.\n\nTomten är 850 kvm med trädgård, garage och carport. Det finns ett förråd på 15 kvm.\n\nLäget är lugnt med 500 meter till skola och förskola. Det tar 20 minuter med bil till Stockholm city.",
      metadata: { price_level: "standard", area: "Täby", type: "villa", rooms: 5, size: 140 }
    }
  ],
  
  // Radhus - Familjeområden
  radhus_family: [
    {
      text: "Solnavägen 23, Solna. Ett välplanerat radhus på 120 kvm med 4 rum och kök i barnvänligt område.\n\nRadhuset har en social planlösning med kök och vardagsrum i öppen planlösning på bottenvåningen. Köket är från IKEA och renoverat 2021 med vitvaror från Bosch. Det finns utgång till trädgården från vardagsrummet.\n\nPå övervåningen finns tre sovrum och ett badrum. Huvudsovrummet har walk-in-closet. Badrummet är helkaklat med dusch och wc. Golven är av laminat i hela huset.\n\nTrädgården är lättskött med gräsmatta och uteplats i söderläge. Det finns ett förråd på 10 kvm och carport med plats för två bilar.\n\nLäget är lugnt med promenadavstånd till skolor, förskolor och mataffär. Det tar 15 minuter med bil till Stockholm city.",
      metadata: { price_level: "standard", area: "Solna", type: "radhus", rooms: 4, size: 120 }
    }
  ],
  
  // Budget - Förstagångsköpare
  budget_first_time: [
    {
      text: "Kyrkogatan 8, Västerås. En praktisk etta om 34 kvm i centralt läge. Lägenheten är nymålad 2023.\n\nLägenheten har en öppen planlösning med kök i samma rum som vardagsrum. Köket har spis, kyl och frys. Det finns gott om förvaring i väggskåp.\n\nGolvet är av laminat och väggarna är målade i ljusa färger. Fönstren är nya och ger ett bra ljusinsläpp.\n\nI badrummet finns dusch, wc och handfat. Det är helkaklat och renoverat 2022.\n\nLäget är centralt med 5 minuters gångavstånd till tågstation och city. Nära till mataffär och service.",
      metadata: { price_level: "budget", area: "Västerås", type: "lägenhet", rooms: 1, size: 34 }
    }
  ]
};

// --- HEMNET FORMAT: 5-STEGS PIPELINE - KORREKT ARKITEKTUR ---
const HEMNET_TEXT_PROMPT = `
Du är en svensk fastighetsmäklare med 15 års erfarenhet. Skriv en objektbeskrivning för Hemnet.

ANVÄND ALL KONTEXT NEDAN:
- DISPOSITION: Fakta om objektet
- TONALITETSANALYS: Målgrupp och stil
- EXEMPELMATCHNING: Bäst lämpade exempeltexter

# SKRIVREGLER
1. Minst 180 ord
2. Använd BARA fakta från dispositionen
3. Börja med adressen
4. Skriv fullständiga meningar
5. Separera stycken med \\n\\n

# FÖRBJUDNA FRASER (ANVÄND ALDRIG)
erbjuder, erbjuds, perfekt, idealisk, fantastisk, drömboende, luftig känsla, i hjärtat av, stadens puls, för den som, vilket gör det, välkommen till

OUTPUT (JSON):
{
  "highlights": ["Viktig punkt 1", "Viktig punkt 2", "Viktig punkt 3"],
  "improvedPrompt": "Texten med stycken separerade av \\n\\n",
  "analysis": {"target_group": "Målgrupp", "area_advantage": "Lägesfördelar", "pricing_factors": "Värdehöjande"},
  "socialCopy": "Kort text max 280 tecken utan emoji",
  "missing_info": ["Saknad info"],
  "pro_tips": ["Tips"]
}
`;

// --- BOOLI/EGEN SIDA: Exempelbaserad mäklarstil ---
const BOOLI_TEXT_PROMPT_WRITER = `
Du är en svensk fastighetsmäklare med 15 års erfarenhet. Skriv en objektbeskrivning för Booli/egen sida baserat på DISPOSITIONEN.

# TONALITET OCH STIL
Använd samma stil som exemplen nedan: professionell, detaljerad, säljande men saklig. Fler detaljer än Hemnet, inklusive pris och ekonomi.

# EXEMPELTEXTER (studera dessa noggrant)

EXEMPEL 1 - Lägenhet Östermalm:
"Karlavägen 45, våning 4 av 5. En välplanerad tvåa om 58 kvm i klassisk 20-talsfastighet med bevarade originaldetaljer och höga tak.

Lägenheten har en genomtänkt planlösning med hall, vardagsrum, sovrum, kök och badrum. Från hallen nås samtliga rum. Vardagsrummet om cirka 20 kvm har två fönster mot gården och takhöjd på 2,8 meter. Golven är av ekparkett genomgående och har slipats 2020.

Köket är utrustat med spis, ugn, kyl, frys och diskmaskin från Bosch. Bänkskivorna är av laminat och det finns gott om förvaring i över- och underskåp. Köket har fönster mot gården och ger ett bra ljusinsläpp.

Sovrummet rymmer dubbelsäng och har garderob med skjutdörrar. Badrummet är helkaklat och renoverat 2019 med dusch, wc och handfat. Tvättmaskin och torktumlare finns i lägenheten.

Balkongen på 4 kvm vetter mot väster med eftermiddags- och kvällssol. Föreningen har nyligen renoverat fasaden och taket. Månadsavgiften är 4 200 kr och inkluderar värme, vatten och kabel-tv.

Läget är centralt med tunnelbana på 3 minuters gångavstånd. Matbutiker, restauranger och Humlegården finns i närområdet. Fastigheten har en stabil ekonomi med låg belåning."

EXEMPEL 2 - Villa Mörtnäs:
"Ekorrvägen 10, Mörtnäs. En rymlig villa på 165 kvm med 6 rum i lugnt och naturnära område. Villan har ekparkettgolv och nyrenoverat kök från Marbodal 2023.

Huset har en praktisk planlösning med socialt kök i öppen planlösning med vardagsrum. Köket har vitvaror från Siemens och bänkskivor i kvartskomposit. Det finns gott om förvaringsutrymmen i både kök och hall.

Badrummet har badkar och golvvärme. Samtliga rum har ekparkettgolv och villan har en hög takhöjd på över 3 meter. De spröjsade fönstren bidrar till husets charm och karaktär.

Det finns en härlig terrass i söderläge. Dessutom finns ett nybyggt uterum med TV-soffa och extra badrum. Uppvärmning sker via fjärrvärme och golvvärme.

Fastigheten ligger i Mörtnäs med 10 minuters gångavstånd till bussen. Området är lugnt och naturnära med goda kommunikationer till centrala Värmdö. Tomten är 825 kvm med gräsmatta och planteringar.

Utgångspris är 12 000 000 kr."

EXEMPEL 3 - Radhus Solna:
"Solnavägen 23, Solna. Ett välplanerat radhus på 120 kvm med 4 rum och kök i barnvänligt område. Radhuset har en lättskött trädgård och carport.

Radhuset har en social planlösning med kök och vardagsrum i öppen planlösning på bottenvåningen. Köket är från IKEA och renoverat 2021 med vitvaror från Bosch. Det finns utgång till trädgården från vardagsrummet.

På övervåningen finns tre sovrum och ett badrum. Huvudsovrummet har walk-in-closet. Badrummet är helkaklat med dusch och wc. Golven är av laminat i hela huset.

Trädgården är lättskött med gräsmatta och uteplats i söderläge. Det finns ett förråd på 10 kvm och carport med plats för två bilar. Tomten är 350 kvm.

Läget är lugnt med promenadavstånd till skolor, förskolor och mataffär. Det tar 15 minuter med bil till Stockholm city. Månadsavgiften är 2 800 kr.

Utgångspris är 6 500 000 kr."

# STRUKTUR (följ exakt som exemplen)
1. ÖPPNING: Adress + typ + storlek + rum + unik egenskap (1-2 meningar)
2. PLANLÖSNING: Hur rummen ligger, material, ljusinsläpp, takhöjd (2-3 meningar)
3. KÖK: Märke, material, vitvaror, renovering med årtal (2-3 meningar)
4. BADRUM: Material, utrustning, renovering med årtal (2-3 meningar)
5. SOVRUM: Antal, storlek, garderober, ljus (2-3 meningar)
6. BALKONG/UTEPLATS: Storlek i kvm, väderstreck, användning (2-3 meningar)
7. EXTRA: Uterum, förråd, parkering, andra utrymmen (1-2 meningar)
8. FÖRENING/FASTIGHET: Renoveringar, ekonomi, avgift (1-2 meningar)
9. LÄGE: Område, karaktär, avstånd till kommunikationer (2-3 meningar)
10. PRIS: Ange utgångspris om det finns i dispositionen (1 mening)

# SKRIVREGLER (som i exemplen)
- Börja med adress: "Karlavägen 45..."
- Använd exakta mått: "58 kvm", "2,8 meter", "4 kvm", "825 kvm"
- Använd exakta årtal: "renoverad 2019", "nyrenoverat 2023"
- Använd exakta avstånd: "3 minuters gångavstånd", "10 minuters gångavstånd"
- Nämn märken: "Marbodal", "Siemens", "Bosch", "IKEA"
- Inkludera ekonomi: månadsavgift, utgångspris

# FÖRBJUDNA ORD (använd ALDRIG)
erbjuder, erbjuds, perfekt, idealisk, fantastisk, underbar, magisk, drömboende, luftig känsla, i hjärtat av, stadens puls, för den som, vilket gör det, välkommen till

# KRAV
- Minst 200 ord
- Använd BARA fakta från dispositionen
- Skriv fullständiga meningar
- Varje stycke ska ha 2-3 meningar
- Separera stycken med \\n\\n

OUTPUT (JSON):
{
  "highlights": ["Viktig punkt 1", "Viktig punkt 2", "Viktig punkt 3"],
  "improvedPrompt": "Texten med stycken separerade av \\n\\n",
  "analysis": {"target_group": "Målgrupp", "area_advantage": "Lägesfördelar", "pricing_factors": "Värdehöjande"},
  "socialCopy": "Kort text max 280 tecken utan emoji",
  "missing_info": ["Saknad info som behövs för komplett annons"],
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

      // === 3-STEGS GENERATION ===
      
      // Steg 1: Extrahera fakta + geografisk kontext
      console.log("[Step 1] Extracting facts and geographic context...");
      
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

      // Steg 2: Tonalitetsanalys baserat på pris, läge och typ
      console.log("[Step 2] Analyzing tone based on price, location and property type...");
      
      const toneAnalysisPrompt = `
# UPPGIFT

Analysera objektet och bestäm optimal tonalitet och stil för objektbeskrivningen.

# INPUT
DISPOSITION: ${JSON.stringify(disposition, null, 2)}

# OUTPUT FORMAT (JSON)
{
  "tone_profile": {
    "price_category": "budget/standard/premium/luxury",
    "location_category": "suburban/urban/city_center/waterfront",
    "property_category": "apartment/villa/radhouse/new_build",
    "target_audience": "first_time_buyers/families/established/downsizers/investors",
    "writing_style": "casual/professional/sophisticated/luxury",
    "key_selling_points": ["3-5 viktigaste försäljningsargument"],
    "local_context": "geografisk kontext och områdets karaktär"
  }
}
`;

      const toneMessages = [
        {
          role: "system" as const,
          content: toneAnalysisPrompt + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content: "Analysera detta objekt och bestäm tonalitet.",
        },
      ];

      const toneCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: toneMessages,
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const toneText = toneCompletion.choices[0]?.message?.content || "{}";
      let toneAnalysis: any;
      try {
        toneAnalysis = safeJsonParse(toneText);
      } catch (e) {
        console.warn("[Step 2] Tone analysis JSON parse failed, using default...", e);
        toneAnalysis = {
          tone_profile: {
            price_category: "standard",
            location_category: "urban",
            property_category: "apartment",
            target_audience: "families",
            writing_style: "professional",
            key_selling_points: ["Bra läge", "Välskött"],
            local_context: "Standard område"
          }
        };
      }
      console.log("[Step 2] Tone analysis completed:", JSON.stringify(toneAnalysis, null, 2));

      // Steg 3: Exempelmatchning - välj bäst lämpade exempeltexter
      console.log("[Step 3] Selecting best matching example texts...");
      
      const exampleMatchingPrompt = `
# UPPGIFT

Välj de 3 bästa exempeltexterna från databasen som bäst matchar objektet. Använd tonalitetsanalysen för att hitta de mest relevanta exemplen.

# INPUT
DISPOSITION: ${JSON.stringify(disposition, null, 2)}
TONALITETSANALYS: ${JSON.stringify(toneAnalysis, null, 2)}

# EXEMPELDATABAS
${JSON.stringify(EXAMPLE_DATABASE, null, 2)}

# OUTPUT FORMAT (JSON)
{
  "selected_examples": [
    {
      "text": "hela exempeltexten",
      "metadata": {...},
      "relevance_score": 0.95,
      "match_reasons": ["anledning 1", "anledning 2"]
    }
  ],
  "selection_strategy": "hur exemplen valdes",
  "writing_guidance": "specifik vägledning baserat på valda exempel"
}
`;

      const exampleMessages = [
        {
          role: "system" as const,
          content: exampleMatchingPrompt + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content: "Välj de 3 bästa exempeltexterna för detta objekt.",
        },
      ];

      const exampleCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: exampleMessages,
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const exampleText = exampleCompletion.choices[0]?.message?.content || "{}";
      let exampleSelection: any;
      try {
        exampleSelection = safeJsonParse(exampleText);
      } catch (e) {
        console.warn("[Step 3] Example matching JSON parse failed, using defaults...", e);
        exampleSelection = {
          selected_examples: EXAMPLE_DATABASE.premium_ostermalm.slice(0, 2),
          selection_strategy: "default_fallback",
          writing_guidance: "Använd professionell mäklarstil"
        };
      }
      console.log("[Step 3] Example selection completed:", JSON.stringify(exampleSelection, null, 2));

      // Steg 4: Skriv objektbeskrivning baserat på disposition + tonalitet + exempel
      console.log("[Step 4] Writing property description with full context...");

      // Välj rätt prompt baserat på plattform
      const selectedPrompt = platform === "hemnet" ? HEMNET_TEXT_PROMPT : BOOLI_TEXT_PROMPT_WRITER;
      console.log("[Step 2] Using " + platform.toUpperCase() + " writer prompt...");
      
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
            "\n\nTONALITETSANALYS: " +
            JSON.stringify(toneAnalysis, null, 2) +
            "\n\nEXEMPELMATCHNING: " +
            JSON.stringify(exampleSelection, null, 2) +
            "\n\nPLATTFORM: " +
            (platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA") +
            "\n\nANPASSA texten efter ALL kontext:\n" +
            "1. Använd exakt samma stil som de valda EXEMPELTEXTERNA\n" +
            "2. Följ tonalitetsanalysen för målgruppen och prisnivån\n" +
            "3. Använd bara fakta från dispositionen\n" +
            "4. Skriv som en erfaren mäklare med 15 års erfarenhet",
        },
      ];

      const textCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: textMessages,
        max_tokens: 4000,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const textResultText = textCompletion.choices[0]?.message?.content || "{}";
      let result: any;
      try {
        result = safeJsonParse(textResultText);
      } catch (e) {
        console.warn("[Step 2] Text JSON parse failed, retrying once...", e);
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

      // POST-PROCESSING FÖRST: Fixa vanliga AI-fraser automatiskt innan validering
      // Detta eliminerar de flesta retries eftersom fraserna fixas direkt
      if (result.improvedPrompt) {
        result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt);
      }
      if (result.socialCopy) {
        result.socialCopy = cleanForbiddenPhrases(result.socialCopy);
      }
      console.log("[Post-processing] Automatic phrase cleanup done before validation");

      // Validering - nu körs den på redan rensad text
      let violations = validateOptimizationResult(result, platform);
      console.log("[AI Validation] Text generation violations:", violations.length > 0 ? violations : "NONE");
      
      // Retry loop - skickar befintlig text och ber AI:n BARA fixa specifika fel
      const maxAttempts = platform === "hemnet" ? 2 : 4;
      let attempts = 0;
      while (violations.length > 0 && attempts < maxAttempts) {
        attempts++;
        console.log(`[AI Validation] Retry attempt ${attempts} due to violations:`, violations);
        
        const violationList = violations.map(v => `- ${v}`).join("\n");
        const currentText = result.improvedPrompt || "";

        const retryCompletion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system" as const,
              content: `Du är en textredaktör. Din uppgift är att REDIGERA den befintliga texten och BARA fixa de specifika felen som listas. Ändra så lite som möjligt - behåll resten av texten exakt som den är.

FÖRBJUDNA ORD som ALDRIG får finnas:
- erbjuder, erbjuds, erbjuda
- perfekt för, idealisk för, för den som
- vilket gör det enkelt, vilket ger en
- kontakta oss, tveka inte, stadens puls
- i hjärtat av, drömboende, drömhem
- luftig känsla, fantastisk, underbar, magisk

Om texten är för kort: lägg till 2-3 meningar med konkreta fakta från dispositionen.
Om texten har förbjudna fraser: ersätt BARA de fraserna med neutrala alternativ.

Returnera JSON: {"improvedPrompt": "den redigerade texten", "highlights": [...], "analysis": {...}, "socialCopy": "...", "missing_info": [...], "pro_tips": [...]}`,
            },
            {
              role: "user" as const,
              content:
                "BEFINTLIG TEXT ATT REDIGERA:\n\n" +
                currentText +
                "\n\n---\n\nFEL ATT FIXA:\n" +
                violationList +
                "\n\n---\n\nDISPOSITION (för att lägga till fakta om texten är för kort):\n" +
                JSON.stringify(disposition, null, 2) +
                "\n\nFixa BARA felen ovan. Ändra så lite som möjligt av resten.",
            },
          ],
          max_tokens: 4000,
          temperature: 0.1,
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
        
        // VIKTIGT: Kör cleanForbiddenPhrases efter varje retry också
        if (result.improvedPrompt) {
          result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt);
        }
        if (result.socialCopy) {
          result.socialCopy = cleanForbiddenPhrases(result.socialCopy);
        }
        
        violations = validateOptimizationResult(result, platform);
        console.log("[AI Validation] After retry " + attempts + " violations:", violations.length > 0 ? violations : "NONE");
      }
      
      // Steg 5: Kvalitetskontroll och juridisk granskning
      console.log("[Step 5] Quality control and legal review...");
      
      const qualityControlPrompt = `
# UPPGIFT

Du är en erfaren fastighetsmäklare med 15 års erfarenhet och juridisk kompetens. Granska den genererade objektbeskrivningen för kvalitet och juridisk korrekthet.

# INPUT
GENERERAD TEXT: ${result.improvedPrompt || ""}
DISPOSITION: ${JSON.stringify(disposition, null, 2)}
PLATTFORM: ${platform}

# GRANSKNINGSKRITER
1. JURIDISK KORREKTHET:
   - Alla fakta måste vara korrekta och från dispositionen
   - Inga överdrivna eller vilseledande påståenden
   - Följ FMI:s regler för objektbeskrivningar

2. SPRÅKQUALITET:
   - Professionell mäklarstil utan AI-klyschor
   - Fullständiga meningar utan avbrott
   - Korrekt grammatik och stavning

3. SÄLJSTYRKA:
   - Konkreta och säljande formuleringar
   - Relevant information för målgruppen
   - Bra flöde och struktur

# OUTPUT FORMAT (JSON)
{
  "quality_score": 0.95,
  "legal_compliance": "passed/failed",
  "language_quality": "excellent/good/fair/poor",
  "sales_effectiveness": "high/medium/low",
  "issues_found": [
    {
      "type": "legal/language/sales",
      "severity": "high/medium/low",
      "description": "beskrivning av problemet",
      "suggestion": "förslag på förbättring"
    }
  ],
  "final_text": "eventuellt korrigerad text om stora fel",
  "approval": "approved/needs_revision"
}
`;

      const qualityMessages = [
        {
          role: "system" as const,
          content: qualityControlPrompt + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content: "Granska denna objektbeskrivning för kvalitet och juridisk korrekthet.",
        },
      ];

      const qualityCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: qualityMessages,
        max_tokens: 1500,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const qualityText = qualityCompletion.choices[0]?.message?.content || "{}";
      let qualityReview: any;
      try {
        qualityReview = safeJsonParse(qualityText);
      } catch (e) {
        console.warn("[Step 5] Quality control JSON parse failed, using defaults...", e);
        qualityReview = {
          quality_score: 0.8,
          legal_compliance: "passed",
          language_quality: "good",
          sales_effectiveness: "medium",
          issues_found: [],
          final_text: result.improvedPrompt,
          approval: "approved"
        };
      }
      console.log("[Step 5] Quality control completed:", JSON.stringify(qualityReview, null, 2));
      
      // Uppdatera resultat med kvalitetskontroll
      if (qualityReview.final_text && qualityReview.final_text !== result.improvedPrompt) {
        result.improvedPrompt = qualityReview.final_text;
        console.log("[Step 5] Text updated by quality control");
      }
      
      // Lägg till kvalitetsdata i resultatet
      result.qualityControl = qualityReview;
      
      if (violations.length > 0) {
        console.warn("[AI Validation] ERROR: Still has violations after retries:", violations);
        return res.status(422).json({
          message:
            "Kunde inte generera en text utan förbjudna mallfraser efter flera försök. Försök igen.",
          violations,
        });
      }

      // Lägg till stycken (cleanForbiddenPhrases körs redan före validering)
      if (result.improvedPrompt) {
        result.improvedPrompt = addParagraphs(result.improvedPrompt);
      }
      console.log("[Post-processing] Paragraphs added");

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
