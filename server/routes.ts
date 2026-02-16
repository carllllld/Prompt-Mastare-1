import type { Express } from "express";
import type { Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import OpenAI from "openai";
import { optimizeRequestSchema, PLAN_LIMITS, WORD_LIMITS, type PlanType, type User } from "@shared/schema";
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

// FÃ¶rbjudna fraser - AI-fraser som avslÃ¶jar genererad text
// VIKTIGT: AnvÃ¤nd KORTA fraser fÃ¶r att fÃ¥nga alla varianter
const FORBIDDEN_PHRASES = [
  // Generiska AI-Ã¶ppningar - KRITISKT
  "vÃ¤lkommen till",
  "vÃ¤lkommen hem",
  "hÃ¤r mÃ¶ts du",
  "hÃ¤r erbjuds",
  "nu finns chansen",
  "missa inte",
  "unik mÃ¶jlighet",
  "unik chans",
  "sÃ¤llsynt tillfÃ¤lle",
  "finner du",
  "utmÃ¤rkt mÃ¶jlighet",
  "stor potential",
  "kontakta oss",
  "fÃ¶r mer information",
  "och visning",
  "i hjÃ¤rtat av",
  "hjÃ¤rtat av",
  "vilket gÃ¶r det enkelt",
  "vilket gÃ¶r det smidigt",
  "vilket gÃ¶r det lÃ¤tt",
  "vilket ger en",
  "ger en rymlig",
  "ger en hÃ¤rlig",
  "ger en luftig",
  "rymlig kÃ¤nsla",
  "hÃ¤rlig plats fÃ¶r",
  "plats fÃ¶r avkoppling",
  "njutning av",
  "mÃ¶jlighet att pÃ¥verka",
  "forma framtiden",
  "fÃ¶r den som",
  "vilket sÃ¤kerstÃ¤ller",
  
  // "erbjuder" i alla former
  " erbjuder ",
  " erbjuds ",
  
  // NYA AI-KLYSCHOR FRÃ…N OUTPUT-ANALYS
  "erbjuder en bra plats",
  "erbjuder en perfekt",
  "erbjuder en fantastisk",
  "skapar en",
  "skapar en miljÃ¶",
  "skapar en avkopplande",
  "Ã¤r ett bra val",
  "Ã¤r ett bra val fÃ¶r",
  "Ã¤r en perfekt plats",
  "Ã¤r en bra plats",
  "Ã¤r en bra plats fÃ¶r",
  "vilket ger ytterligare",
  "vilket ger ytterligare utrymme",
  "den sÃ¶dervÃ¤nda placeringen",
  "den sÃ¶dervÃ¤nda placeringen ger",
  
  // AtmosfÃ¤r/luftig-fraser
  "trivsam atmosfÃ¤r",
  "hÃ¤rlig atmosfÃ¤r",
  "mysig atmosfÃ¤r",
  "inbjudande atmosfÃ¤r",
  "luftig atmosfÃ¤r",
  "luftig och",
  
  // Rofylld/lugn klyschor
  "rofyllt",
  "rofylld",
  
  // Trygg-fraser
  "trygg boendemiljÃ¶",
  "trygg boendeekonomi",
  "tryggt boende",
  
  // Sociala klyschor
  "sociala sammanhang",
  "sociala tillstÃ¤llningar",
  "socialt umgÃ¤nge",
  
  // Komfort-fraser
  "extra komfort",
  "maximal komfort",
  
  // Ã–verdrivna adjektiv
  "fantastisk",
  "underbar",
  "magisk",
  "otrolig",
  "drÃ¶mboende",
  "drÃ¶mlÃ¤genhet",
  "drÃ¶mhem",
  "en sann pÃ¤rla",
  
  // Vardags-klyschor
  "underlÃ¤ttar vardagen",
  "bekvÃ¤mlighet i vardagen",
  "den matlagningsintresserade",
  "god natts sÃ¶mn",
  
  // LÃ¤ges-klyschor
  "eftertraktat boendealternativ",
  "attraktivt lÃ¤ge",
  "attraktivt med nÃ¤rhet",
  "inom rÃ¤ckhÃ¥ll",
  "stadens puls",
  
  // HjÃ¤rta-klyschor
  "hjÃ¤rtat i hemmet",
  "husets hjÃ¤rta",
  "hemmets hjÃ¤rta",
  
  // Andra
  "inte bara ett hem",
  "stark efterfrÃ¥gan",
  "goda arbetsytor",
];

function findRuleViolations(text: string, platform: string = "hemnet"): string[] {
  const violations: string[] = [];
  
  // Check for forbidden phrases
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) {
      violations.push(`FÃ¶rbjuden fras: "${phrase}"`);
    }
  }
  
  // ENKEL VALIDERING - bara ordkrav och fÃ¶rbjudna fraser
  
  // Check for "VÃ¤lkommen" opening (forbidden)
  if (text.toLowerCase().startsWith('vÃ¤lkommen')) {
    violations.push(`BÃ¶rjar med "VÃ¤lkommen" - bÃ¶rja med adress eller lÃ¤ge istÃ¤llet`);
  }
  
  // Check for AI-typical phrases that should not appear
  const aiPhrases = ['tÃ¤nk dig', 'fÃ¶restÃ¤ll dig', 'ljuset dansar', 'doften av', 'kÃ¤nslan av', 'sinnesupplevelse'];
  for (const phrase of aiPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      violations.push(`AI-typisk fras: "${phrase}" - skriv mer sakligt`);
    }
  }
  
  // Check for generic patterns
  const genericPatterns = ['fantastisk lÃ¤ge', 'renoverat med hÃ¶g standard', 'attraktivt', 'idealisk'];
  for (const pattern of genericPatterns) {
    if (text.toLowerCase().includes(pattern)) {
      violations.push(`Generiskt mÃ¶nster: "${pattern}"`);
    }
  }
  
  return violations;
}

// Separat funktion fÃ¶r ordrÃ¤kning (endast fÃ¶r improvedPrompt)
function checkWordCount(text: string, platform: string, targetMin?: number, targetMax?: number): string[] {
  const violations: string[] = [];
  const wordCount = text.split(/\s+/).length;
  
  // AnvÃ¤nd anvÃ¤ndarens valda lÃ¤ngd om den finns, annars plattformens standard
  const minWords = targetMin || (platform === "hemnet" ? 180 : 200);
  const maxWords = targetMax || (platform === "hemnet" ? 500 : 600);
  
  if (wordCount < minWords) {
    violations.push(`FÃ¶r fÃ¥ ord: ${wordCount}/${minWords} krÃ¤vs`);
  }
  if (wordCount > maxWords) {
    violations.push(`FÃ¶r mÃ¥nga ord: ${wordCount}/${maxWords} max`);
  }
  return violations;
}

function validateOptimizationResult(result: any, platform: string = "hemnet", targetMin?: number, targetMax?: number): string[] {
  const violations: string[] = [];
  if (typeof result?.improvedPrompt === "string") {
    violations.push(...findRuleViolations(result.improvedPrompt, platform));
    violations.push(...checkWordCount(result.improvedPrompt, platform, targetMin, targetMax));
  }
  // socialCopy valideras bara fÃ¶r fÃ¶rbjudna fraser, inte ordrÃ¤kning
  if (typeof result?.socialCopy === "string") {
    violations.push(...findRuleViolations(result.socialCopy, platform));
  }
  return Array.from(new Set(violations));
}

// Post-processing: Rensa bort fÃ¶rbjudna fraser automatiskt
// VIKTIGT: LÃ¤ngre fraser FÃ–RST sÃ¥ de matchas innan kortare
// Detta eliminerar behovet av retries fÃ¶r de vanligaste AI-fraserna
const PHRASE_REPLACEMENTS: [string, string][] = [
  // === Ã–PPNINGAR - ta bort helt ===
  ["vÃ¤lkommen till denna", ""],
  ["vÃ¤lkommen till", ""],
  ["vÃ¤lkommen hem till", ""],
  ["hÃ¤r mÃ¶ts du av", ""],
  ["hÃ¤r erbjuds", ""],
  
  // === ERBJUDER-VARIANTER (vanligaste AI-frasen) ===
  ["lÃ¤genheten erbjuder", "lÃ¤genheten har"],
  ["bostaden erbjuder", "bostaden har"],
  ["kÃ¶ket erbjuder", "kÃ¶ket har"],
  ["badrummet erbjuder", "badrummet har"],
  ["balkongen erbjuder", "balkongen har"],
  ["omrÃ¥det erbjuder", "omrÃ¥det har"],
  ["fÃ¶reningen erbjuder", "fÃ¶reningen har"],
  [" erbjuder ", " har "],
  [" erbjuds ", " finns "],
  ["erbjuder", "har"],
  ["erbjuds", "finns"],
  
  // === "VILKET GER/GÃ–R" - vanlig AI-konstruktion ===
  ["vilket gÃ¶r det enkelt att ta sig", "med nÃ¤ra till"],
  ["vilket gÃ¶r det enkelt", ""],
  ["vilket ger en luftig", "med"],
  ["vilket ger en", "med"],
  ["vilket ger", "med"],
  ["som ger en", "med"],
  
  // === "FÃ–R DEN SOM" - vanlig AI-fras ===
  ["perfekt fÃ¶r den som", "passar"],
  ["idealisk fÃ¶r den som", "passar"],
  ["fÃ¶r den matlagningsintresserade", ""],
  ["fÃ¶r den som uppskattar", ""],
  ["fÃ¶r den som gillar", ""],
  ["fÃ¶r den som vill", ""],
  ["fÃ¶r den som sÃ¶ker", ""],
  ["fÃ¶r den som", ""],
  ["perfekt fÃ¶r", "passar"],
  ["idealisk fÃ¶r", "passar"],
  
  // === KONTAKT/CTA - ta bort helt ===
  ["kontakta oss fÃ¶r visning", ""],
  ["kontakta oss", ""],
  ["tveka inte att hÃ¶ra av dig", ""],
  ["tveka inte", ""],
  ["boka visning", ""],
  ["hÃ¶r av dig", ""],
  
  // === PLATS-KLYSCHOR ===
  ["i hjÃ¤rtat av stockholm", "centralt i stockholm"],
  ["i hjÃ¤rtat av", "centralt i"],
  ["hjÃ¤rtat av", "centrala"],
  ["stadens puls", "stadskÃ¤rnan"],
  ["mitt i stadens liv", "centralt"],
  
  // === DRÃ–M-ORD ===
  ["drÃ¶mboende", "bostad"],
  ["drÃ¶mhem", "hem"],
  ["drÃ¶mlÃ¤genhet", "lÃ¤genhet"],
  ["en sann pÃ¤rla", ""],
  ["en riktig pÃ¤rla", ""],
  
  // === LUFTIG/ATMOSFÃ„R ===
  ["luftig och inbjudande atmosfÃ¤r", ""],
  ["luftig atmosfÃ¤r", ""],
  ["ger en luftig kÃ¤nsla", ""],
  ["luftig kÃ¤nsla", ""],
  ["luftig", "rymlig"],
  ["inbjudande atmosfÃ¤r", ""],
  ["trivsam atmosfÃ¤r", ""],
  ["hÃ¤rlig atmosfÃ¤r", ""],
  
  // === ROFYLLD ===
  ["rofyllt lÃ¤ge", "lugnt lÃ¤ge"],
  ["rofylld miljÃ¶", "lugn miljÃ¶"],
  ["rofyllt", "lugnt"],
  ["rofylld", "lugn"],
  
  // === VARDAGEN ===
  ["underlÃ¤ttar vardagen", ""],
  ["bekvÃ¤mlighet i vardagen", ""],
  ["i vardagen", ""],
  
  // === ATTRAKTIVT ===
  ["attraktivt lÃ¤ge", "bra lÃ¤ge"],
  ["attraktivt med nÃ¤rhet", "nÃ¤ra"],
  ["attraktivt", ""],
  
  // === SUPERLATIV ===
  ["fantastisk utsikt", "fin utsikt"],
  ["fantastiskt lÃ¤ge", "bra lÃ¤ge"],
  ["fantastisk", "fin"],
  ["underbar", "fin"],
  ["magisk", ""],
  ["otrolig", ""],
  ["enastÃ¥ende", ""],
  
  // === Ã–VRIGT ===
  ["unik mÃ¶jlighet", ""],
  ["unik chans", ""],
  ["sÃ¤llsynt tillfÃ¤lle", ""],
  ["missa inte", ""],
  ["inom rÃ¤ckhÃ¥ll", "i nÃ¤rheten"],
  ["sociala tillstÃ¤llningar", "middagar"],
  ["sociala sammanhang", "umgÃ¤nge"],
  ["extra komfort", ""],
  ["maximal komfort", ""],
  ["trygg boendemiljÃ¶", "stabil fÃ¶rening"],
  ["trygg boendeekonomi", "stabil ekonomi"],
  ["goda arbetsytor", "bÃ¤nkyta"],
  ["gott om arbetsyta", "bÃ¤nkyta"],
  
  // === NYA FRASER FRÃ…N GRANSKNING ===
  ["sÃ¤ker boendemiljÃ¶", ""],
  ["stadens liv och rÃ¶relse", ""],
  ["mitt i stadens liv", "centralt"],
  ["njuta av eftermiddagssolen", "med eftermiddagssol"],
  ["njuta av kvÃ¤llssolen", "med kvÃ¤llssol"],
  ["njuta av", ""],
  ["den vanliga balkongen", "balkongen"],
  ["trevligt sÃ¤llskap", ""],
  ["med nÃ¤ra till runt", "med nÃ¤ra till"],
  ["nÃ¤ra till runt i staden", "nÃ¤ra tunnelbana"],
  ["med ett bekvÃ¤mt boende med", "med"],
  ["bekvÃ¤mt boende", ""],
  ["det finns mÃ¶jlighet att uppdatera", ""],
  ["om sÃ¥ Ã¶nskas", ""],
  ["efter egna Ã¶nskemÃ¥l", ""],
  ["har potential fÃ¶r modernisering", "kan renoveras"],
  ["potential fÃ¶r", ""],
  ["imponerande takhÃ¶jd", "hÃ¶g takhÃ¶jd"],
  ["imponerande", ""],
  ["unik karaktÃ¤r", "karaktÃ¤r"],
  ["lugn atmosfÃ¤r", ""],
  
  // === "VILKET"-KONSTRUKTIONER (vanlig AI-mÃ¶nster) ===
  ["vilket bidrar till en rymlig", "med rymlig"],
  ["vilket bidrar till", "med"],
  ["vilket skapar rymd", "med hÃ¶g takhÃ¶jd"],
  ["vilket skapar", "och ger"],
  ["vilket gÃ¶r den till ett lÃ¥ngsiktigt val", ""],
  ["vilket gÃ¶r den till", "och Ã¤r"],
  ["vilket gÃ¶r det till en utmÃ¤rkt", "och fungerar som"],
  ["vilket gÃ¶r det till ett", "och Ã¤r ett"],
  ["vilket gÃ¶r det till", "och Ã¤r"],
  ["vilket kan vara en fÃ¶rdel", ""],
  ["vilket kan vara", ""],
  ["vilket passar familjer", "fÃ¶r familjer"],
  ["vilket passar den som sÃ¶ker", "fÃ¶r"],
  ["vilket passar den som", "fÃ¶r"],
  ["vilket passar", "fÃ¶r"],
  ["vilket underlÃ¤ttar resor", "med enkel pendling"],
  ["vilket underlÃ¤ttar pendling", "med enkel pendling"],
  ["vilket underlÃ¤ttar", "med"],
  ["vilket Ã¤r uppskattat av mÃ¥nga", ""],
  ["vilket Ã¤r uppskattat", ""],
  ["vilket Ã¤r", "och Ã¤r"],
  
  // === FLER AI-FRASER FRÃ…N GRANSKNING 2 ===
  ["rymlig atmosfÃ¤r", "rymd"],
  ["med god isolering och energibesparing", ""],
  ["med god isolering", ""],
  ["sociala sammankomster", "umgÃ¤nge"],
  ["med behaglig temperatur Ã¥ret runt", ""],
  ["behaglig temperatur", ""],
  ["harmonisk livsstil", ""],
  ["modern livsstil med alla bekvÃ¤mligheter", ""],
  ["modern livsstil", ""],
  ["alla bekvÃ¤mligheter", ""],
  ["fridfull miljÃ¶", "lugnt lÃ¤ge"],
  ["goda kommunikationsmÃ¶jligheter", "bra kommunikationer"],
  ["kommunikationsmÃ¶jligheter", "kommunikationer"],
  ["rekreation och avkoppling", "friluftsliv"],
  ["karaktÃ¤r och charm", "karaktÃ¤r"],
  
  // === FLER AI-FRASER FRÃ…N GRANSKNING 3 ===
  ["stilren och funktionell matlagningsmiljÃ¶", "funktionellt kÃ¶k"],
  ["funktionell matlagningsmiljÃ¶", "funktionellt kÃ¶k"],
  ["matlagningsmiljÃ¶", "kÃ¶k"],
  ["maximerar anvÃ¤ndningen av varje kvadratmeter", ""],
  ["maximerar anvÃ¤ndningen", ""],
  ["lugn och trygg miljÃ¶", "lugnt omrÃ¥de"],
  ["trygg miljÃ¶", ""],
  ["fokus pÃ¥ kvalitet och hÃ¥llbarhet", ""],
  ["fokus pÃ¥ kvalitet", ""],
  ["ytterligare fÃ¶rstÃ¤rker dess", "med"],
  ["ytterligare fÃ¶rstÃ¤rker", ""],
  ["ett lÃ¥ngsiktigt val fÃ¶r kÃ¶pare", ""],
  ["lÃ¥ngsiktigt val", ""],
  ["gott om utrymme fÃ¶r fÃ¶rvaring", "bra fÃ¶rvaring"],
  ["vÃ¤lplanerad layout", "bra planlÃ¶sning"],
  ["gott inomhusklimat", ""],
  ["bidrar till ett gott", "ger"],
  ["smakfullt renoverat", "renoverat"],
  ["smakfullt inrett", ""],
  ["enhetlig och elegant kÃ¤nsla", ""],
  ["enhetlig och stilren kÃ¤nsla", ""],
  ["fÃ¶r .", ". "],
  
  // === FLER AI-FRASER FRÃ…N GRANSKNING 4 ===
  ["tidslÃ¶s och elegant kÃ¤nsla", ""],
  ["slÃ¤pper in rikligt med ljus", ""],
  ["underlÃ¤ttar umgÃ¤nge med familj och vÃ¤nner", ""],
  ["passande", "lÃ¤mplig"],
  ["en mÃ¶jlighet att fÃ¶rvÃ¤rva", ""],
  ["unik kombination av tradition och modernitet", ""],
  ["kombination av tradition och modernitet", ""],
  ["tradition och modernitet", ""],
  ["ett val fÃ¶r kÃ¶pare", ""],
  ["ett val fÃ¶r", ""],
  ["historiska detaljer", "originaldetaljer"],
  ["moderna bekvÃ¤mligheter", ""],
  ["moderna", ""],
  ["bekvÃ¤mligheter", ""],
  
  // === FLER AI-FRASER FRÃ…N GRANSKNING 5 ===
  ["hÃ¶gkvalitativa material och finish", "hÃ¶gkvalitativa material"],
  ["material och finish", "material"],
  ["klassiska charm", "karaktÃ¤r"],
  ["trevlig plats att vistas pÃ¥", "bra plats"],
  ["plats att vistas pÃ¥", "plats"],
  ["unik kombination av modern komfort och klassisk charm", ""],
  ["kombination av modern komfort och klassisk charm", ""],
  ["modern komfort och klassisk charm", ""],
  ["utmÃ¤rkt val", ""],
  ["smidig pendling", "enkel pendling"],
  ["med kÃ¤nsla av rymd", "med rymd"],
  ["bidrar till husets klassiska charm", "ger karaktÃ¤r"],
  ["med extra utrymme", "med mer plats"],
  ["medkel tillgÃ¥ng", "lÃ¤ttillgÃ¤nglig"],
  ["medkel", "lÃ¤tt"],
  ["stor fÃ¶rdel", "fÃ¶rdel"],
  
  ];

function cleanForbiddenPhrases(text: string): string {
  if (!text) return text;
  let cleaned = text;
  
  // FÃ¶rst: Fixa trasiga ord som AI:n genererar (HELA ORD, inte delar)
  const brokenWordFixes: [RegExp, string][] = [
    [/\bmmÃ¥ngaa\b/gi, "mÃ¥nga"],
    [/\bgmÃ¥ngaavstÃ¥nd\b/gi, "gÃ¥ngavstÃ¥nd"],
    [/\bVkoppling\b/gi, "Avkoppling"],
    [/\bEnna\b/gi, "Denna"],
    [/\bMgÃ¤nge\b/gi, "umgÃ¤nge"],
    [/\bAmiljer\b/gi, "Familjer"],
    [/\bamiljer\b/gi, "familjer"],
    [/\bperfekt plats\b/gi, "bra plats"],
    [/\bperfekt fÃ¶r\b/gi, "passar"],
    [/\bmed mer plats \.\b/gi, "med mer plats."],
    [/\bmed rymd och ljus\.\b/gi, "med god rymd."],
    [/\bPriset \. Enna\b/gi, "Priset fÃ¶r denna"],
    [/\bPriset \.\b/gi, "Priset fÃ¶r denna"],
    [/\b\. Enna\b/gi, ". Denna"],
    [/\bmed , med\b/gi, "med"],
    [/\bmed rymd\b/gi, "med god rymd"],
    [/\bmed mer plats \./gi, "med mer plats."],
    [/\bÃ¤r en perfekt plats \./gi, "passar bra."],
    [/\bperfekt plats \./gi, "bra plats."],
    [/\bFamiljer\./gi, "familjer."],
    // Nya trasiga ord frÃ¥n output
    [/\bsprojsade\b/gi, "sprÃ¶jsade"],
    [/\bTt skapa\b/gi, "fÃ¶r att skapa"],
    [/\bTt ge\b/gi, "fÃ¶r att ge"],
    [/\b. Tt\b/gi, ". FÃ¶r att"],
    [/\b. Vkoppling\b/gi, ". FÃ¶r avkoppling"],
    [/\b. MgÃ¤nge\b/gi, ". FÃ¶r umgÃ¤nge"],
    [/\b. Kad komfort\b/gi, ". Komfort"],
    [/\b. En \./gi, ". En "],
    [/\b. Med\b/gi, ". Med"],
    [/\b. Villan Ã¤r passar\b/gi, ". Villan passar"],
    [/\b. Villan har Ã¤ven\b/gi, ". Villan har"],
    [/\b. OmrÃ¥det Ã¤r familjevÃ¤nligt och har en\b/gi, ". OmrÃ¥det Ã¤r familjevÃ¤nligt"],
    [/\b. Med nÃ¤rhet till kollektivtrafik\b/gi, ". Med nÃ¤rhet till kollektivtrafik"],
    // Fixa ofullstÃ¤ndiga meningar
    [/\bMaterialvalet Ã¤r noggrant utvalda\b/gi, "Materialen Ã¤r noggrant utvalda"],
    [/\bSovrummen Ã¤r utformade\b/gi, "Sovrummen Ã¤r utformade"],
    [/\bTerrassen vetter mot sÃ¶der\b/gi, "Terrassen vetter mot sÃ¶der"],
    [/\bDen Ã¤r passar soliga dagar\b/gi, "Den passar fÃ¶r soliga dagar"],
    [/\bDet finns ett nybyggt uterum\b/gi, "Det finns ett nybyggt uterum"],
    [/\bVillan har Ã¤ven golvvÃ¤rme\b/gi, "Villan har golvvÃ¤rme"],
    [/\bDen generÃ¶sa takhÃ¶jden bidrar till\b/gi, "Den hÃ¶ga takhÃ¶jden bidrar till"],
    [/\bDen generÃ¶sa takhÃ¶jden\b/gi, "Den hÃ¶ga takhÃ¶jden"],
    // Fixa "Tt" i bÃ¶rjan av meningar
    [/\bTt\b/gi, "fÃ¶r att"],
    // Fixa ". En" och ". Med" i slutet av meningar
    [/\b\. En\b/gi, ". En"],
    [/\b\. Med\b/gi, ". Med"],
    // Fixa "Enna" till "Denna"
    [/\bEnna\b/gi, "Denna"],
    // Fixa "Vkoppling" till "Avkoppling"
    [/\bVkoppling\b/gi, "Avkoppling"],
    // Fixa "MgÃ¤nge" till "umgÃ¤nge"
    [/\bMgÃ¤nge\b/gi, "umgÃ¤nge"],
    // Fixa "Kad" till "med"
    [/\bKad komfort\b/gi, "med komfort"],
  ];
  
  for (const [regex, replacement] of brokenWordFixes) {
    cleaned = cleaned.replace(regex, replacement);
  }
  
  // Sedan: ErsÃ¤tt fÃ¶rbjudna fraser
  for (const [phrase, replacement] of PHRASE_REPLACEMENTS) {
    const regex = new RegExp(phrase, "gi");
    cleaned = cleaned.replace(regex, replacement);
  }
  
  // Ta bort dubbla mellanslag
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  // Ta bort meningar som bÃ¶rjar med tomt efter ersÃ¤ttning
  cleaned = cleaned.replace(/\.\s*\./g, ".").replace(/,\s*,/g, ",");
  // Fixa meningar som bÃ¶rjar med liten bokstav efter borttagning
  cleaned = cleaned.replace(/\.\s+([a-zÃ¥Ã¤Ã¶])/g, (match, letter) => `. ${letter.toUpperCase()}`);
  // Ta bort meningar som bara Ã¤r ett ord eller tomma
  cleaned = cleaned.replace(/\.\s*\./g, ".");
  // Fixa "Priset . Enna" -> "Priset fÃ¶r denna"
  cleaned = cleaned.replace(/Priset \. Enna/gi, "Priset fÃ¶r denna");
  cleaned = cleaned.replace(/\. Enna/gi, ". Denna");
  
  return cleaned;
}

// LÃ¤gg till styckeindelning om texten saknar radbrytningar
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

// COMBINED EXTRACTION: Extrahera fakta + ton + skrivplan i ETT steg
const COMBINED_EXTRACTION_PROMPT = `
# UPPGIFT

Du Ã¤r en svensk fastighetsmÃ¤klare med 15 Ã¥rs erfarenhet. I ETT steg ska du:
1. Extrahera ALLA relevanta fakta frÃ¥n rÃ¥data
2. Analysera tonalitet och mÃ¥lgrupp
3. Skapa en skrivplan med evidence-gate

# REGLER

1. HITTA ALDRIG PÃ… â€“ extrahera bara vad som faktiskt finns i rÃ¥data
2. Om info saknas, ange null â€“ gissa ALDRIG
3. AnvÃ¤nd exakta vÃ¤rden frÃ¥n rÃ¥data (kvm, pris, Ã¥r, mÃ¤rken, material)
4. LÃ¤gg till geografisk kontext baserat pÃ¥ platsen
5. Varje claim i skrivplanen MÃ…STE ha evidence frÃ¥n rÃ¥data

# GEOGRAFISK INTELLIGENS

FÃ¶r varje plats, lÃ¤gg till:
- OmrÃ¥dets karaktÃ¤r (stadskÃ¤rna, villaomrÃ¥de, skÃ¤rgÃ¥rd, etc)
- PrisnivÃ¥ (lÃ¥g, medel, hÃ¶g, premium)
- MÃ¥lgrupp (fÃ¶rstagÃ¥ngskÃ¶pare, familjer, etablerade, downsizers)
- Kommunikationstyp (t-bana, pendeltÃ¥g, buss, bil)

# OUTPUT FORMAT (JSON)

{
  "disposition": {
    "property": {
      "type": "lÃ¤genhet/villa/radhus",
      "address": "exakt adress",
      "size": 62,
      "rooms": 3,
      "bedrooms": 2,
      "floor": "3 av 5",
      "year_built": "1930-tal",
      "condition": "gott skick",
      "energy_class": "C",
      "elevator": true,
      "renovations": ["kÃ¶k 2022", "badrum 2020"],
      "materials": {
        "floors": "ekparkett",
        "walls": "mÃ¥lade vÃ¤ggar",
        "kitchen": "stenbÃ¤nk, vita luckor",
        "bathroom": "helkaklat"
      },
      "balcony": { "exists": true, "direction": "sydvÃ¤st", "size": "8 kvm", "type": "inglasad" },
      "ceiling_height": "2.8 meter",
      "layout": "genomgÃ¥ende planlÃ¶sning",
      "storage": ["garderob i sovrum", "fÃ¶rrÃ¥d 4 kvm"],
      "heating": "fjÃ¤rrvÃ¤rme",
      "parking": "garage",
      "special_features": ["golvvÃ¤rme badrum", "Ã¶ppen spis"]
    },
    "economics": {
      "price": 4500000,
      "fee": 4200,
      "price_per_kvm": 72581,
      "association": { "name": "BRF Solhemmet", "status": "stabil ekonomi", "renovations": "stambytt 2019" }
    },
    "location": {
      "area": "Ã–stermalm",
      "municipality": "Stockholm",
      "character": "stadskÃ¤rna, exklusivt",
      "price_level": "premium",
      "target_group": "etablerade",
      "transport": { "type": "tunnelbana", "distance": "5 min till Karlaplan" },
      "amenities": ["Karlaplan", "DjurgÃ¥rden"],
      "services": ["ICA 200m"],
      "parking": "garage i fÃ¶rening",
      "geographic_context": "Centralt Stockholm"
    },
    "unique_features": ["takhÃ¶jd 2.8m", "originaldetaljer", "inglasad balkong"]
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
    "opening": "Adress + typ + unik egenskap (ALDRIG 'VÃ¤lkommen')",
    "paragraphs": [
      {"id": "p1", "goal": "Ã–ppning och lÃ¤ge", "must_include": ["adress", "typ", "storlek"]},
      {"id": "p2", "goal": "PlanlÃ¶sning och rum", "must_include": ["rum", "material", "ljus"]},
      {"id": "p3", "goal": "KÃ¶k och badrum", "must_include": ["utrustning", "renovering"]},
      {"id": "p4", "goal": "Balkong/uteplats", "must_include": ["storlek", "vÃ¤derstreck"]},
      {"id": "p5", "goal": "LÃ¤ge och kommunikationer", "must_include": ["transport", "service"]}
    ],
    "claims": [
      {"claim": "pÃ¥stÃ¥ende som fÃ¥r vara i texten", "evidence": "exakt vÃ¤rde frÃ¥n rÃ¥data"}
    ],
    "must_include": ["obligatoriska fakta som MÃ…STE med"],
    "missing_info": ["info som saknas i rÃ¥data"],
    "forbidden_phrases": ["erbjuder", "perfekt fÃ¶r", "i hjÃ¤rtat av", "vilket gÃ¶r det", "fÃ¶r den som", "drÃ¶mboende", "luftig kÃ¤nsla", "fantastisk", "vÃ¤lkommen till"]
  }
}
`;

// Steg 2: Skapa plan/checklista som steg 3 mÃ¥ste fÃ¶lja
const PLAN_PROMPT = `
# UPPGIFT

Du ska skapa en tydlig plan fÃ¶r objektbeskrivningen utifrÃ¥n DISPOSITIONEN.
Du ska INTE skriva sjÃ¤lva objektbeskrivningen. Du ska bara skapa en plan som steg 3 kan fÃ¶lja utan att behÃ¶va en lÃ¥ng regelprompt.

# KRITISKA REGLER

1. HITTA ALDRIG PÃ… â€“ anvÃ¤nd bara fakta som finns i dispositionen
2. Om fakta saknas: skriv in det i missing_info (och planera inte in det i texten)
3. HÃ¥ll planen kort, konkret och kontrollerbar
4. Anpassa ordantal och upplÃ¤gg efter PLATTFORM (HEMNET eller BOOLI/EGEN SIDA)
5. EVIDENCE-GATE: Varje sakpÃ¥stÃ¥ende som fÃ¥r fÃ¶rekomma i texten MÃ…STE finnas som en post i claims med evidence_path + evidence_value frÃ¥n dispositionen
6. HÃ–GRISK-PÃ…STÃ…ENDEN: Utsikt (t.ex. havsutsikt), eldstad/Ã¶ppen spis, balkongtyp (inglasad), vÃ¤derstreck och kommunikationstyp (pendeltÃ¥g/tunnelbana) fÃ¥r bara finnas i claims om det stÃ¥r explicit i dispositionen
7. ANTI-AI-MALL: forbidden_words mÃ¥ste innehÃ¥lla en baslista med klassiska generiska fraser (plattformsspecifik). Writer kommer fÃ¶lja den listan strikt.

# BASLISTA FÃ–RBJUDNA FRASER (lÃ¤gg in i forbidden_words)

FÃ¶r BOTH: "i hjÃ¤rtat av", "hjÃ¤rtat av", "vilket gÃ¶r det enkelt", "vilket gÃ¶r det smidigt", "vilket gÃ¶r det lÃ¤tt", "rymlig kÃ¤nsla", "hÃ¤rlig plats fÃ¶r", "plats fÃ¶r avkoppling", "njutning av", "mÃ¶jlighet att pÃ¥verka", "forma framtiden", "vilket sÃ¤kerstÃ¤ller"

FÃ¶r BOOLI/EGEN SIDA: lÃ¤gg Ã¤ven in generiska bÃ¤rfraser som ofta gÃ¶r texten AI-mÃ¤ssig, t.ex. "fÃ¶r den som", "vilket ger en"

# OUTPUT FORMAT (JSON)

{
  "platform": "hemnet" | "booli",
  "tone": "professionell svensk mÃ¤klare, saklig och engagerande",
  "word_target": {
    "min": 0,
    "max": 0
  },
  "paragraph_outline": [
    {
      "id": "p1",
      "goal": "Vad stycket ska uppnÃ¥",
      "must_include": ["exakta faktapunkter som MÃ…STE med om de finns"],
      "do_not_include": ["fakta som inte ska vara hÃ¤r"],
      "allowed_flair": "max 1 kort kÃ¤nslodetalj, men endast om den stÃ¶ds av fakta"
    }
  ],
  "must_include_global": ["lista med obligatoriska fakta Ã¶ver hela texten"],
  "forbidden_words": ["ord/fraser som absolut inte fÃ¥r anvÃ¤ndas"],
  "claims": [
    {
      "claim": "kort pÃ¥stÃ¥ende som fÃ¥r fÃ¶rekomma i text",
      "evidence_path": "JSONPath-liknande sÃ¶kvÃ¤g i dispositionen, t.ex. property.size",
      "evidence_value": "vÃ¤rdet frÃ¥n dispositionen"
    }
  ],
  "missing_info": ["fakta som saknas men som normalt behÃ¶vs fÃ¶r komplett annons"],
  "risk_notes": ["varningar: Ã¶verdrifter, oklara uppgifter, juridiska risker"]
}
`;

// === EXEMPELDATABAS - RIKTIGA MÃ„KLARTEXTER ===
const EXAMPLE_DATABASE = {
  // LÃ¤genheter - Premium Innerstad
  premium_ostermalm: [
    {
      text: "KarlavÃ¤gen 45, vÃ¥ning 4 av 5. En vÃ¤lplanerad tvÃ¥a om 58 kvm i klassisk 20-talsfastighet med bevarade originaldetaljer.\n\nLÃ¤genheten har en genomtÃ¤nkt planlÃ¶sning med hall, vardagsrum, sovrum, kÃ¶k och badrum. FrÃ¥n hallen nÃ¥s samtliga rum. Vardagsrummet om cirka 20 kvm har tvÃ¥ fÃ¶nster mot gÃ¥rden och takhÃ¶jd pÃ¥ 2,8 meter. Golven Ã¤r av ekparkett genomgÃ¥ende.\n\nKÃ¶ket Ã¤r utrustat med spis, ugn, kyl, frys och diskmaskin. BÃ¤nkskivorna Ã¤r av laminat och det finns gott om fÃ¶rvaring i Ã¶ver- och underskÃ¥p. KÃ¶ket har fÃ¶nster mot gÃ¥rden.\n\nSovrummet rymmer dubbelsÃ¤ng och har garderob med skjutdÃ¶rrar. Badrummet Ã¤r helkaklat och renoverat 2019 med dusch, wc och handfat. TvÃ¤ttmaskin och torktumlare finns i lÃ¤genheten.\n\nBalkongen pÃ¥ 4 kvm vetter mot vÃ¤ster med eftermiddags- och kvÃ¤llssol. FÃ¶reningen har nyligen renoverat fasaden och taket.\n\nLÃ¤get Ã¤r centralt med tunnelbana pÃ¥ 3 minuters gÃ¥ngavstÃ¥nd. Matbutiker, restauranger och HumlegÃ¥rden finns i nÃ¤romrÃ¥det.",
      metadata: { price_level: "premium", area: "Ã–stermalm", type: "lÃ¤genhet", rooms: 2, size: 58 }
    },
    {
      text: "StrandvÃ¤gen 15, vÃ¥ning 2 av 4. En ljus trea om 78 kvm med balkong i sÃ¶derlÃ¤ge.\n\nLÃ¤genheten har en praktisk planlÃ¶sning med hall, vardagsrum, tvÃ¥ sovrum, kÃ¶k och badrum. Vardagsrummet har stora fÃ¶nster mot gatan och takhÃ¶jd pÃ¥ 2,9 meter. Golven Ã¤r av ekparkett som slipades 2020.\n\nKÃ¶ket har vita luckor, bÃ¤nkskiva i sten och Ã¤r utrustat med spis, ugn, kyl, frys och diskmaskin. Badrummet renoverades 2018 och har dusch, wc, handfat och tvÃ¤ttmaskin.\n\nDet stÃ¶rre sovrummet rymmer dubbelsÃ¤ng och har platsbyggd garderob. Det mindre sovrummet passar som barnrum eller arbetsrum. Balkongen Ã¤r inglasad och vetter mot sÃ¶der.\n\nFastigheten Ã¤r vÃ¤lskÃ¶tt med renoverad fasad och trapphus. Tunnelbana finns pÃ¥ 4 minuters gÃ¥ngavstÃ¥nd och matbutik i samma kvarter.",
      metadata: { price_level: "premium", area: "Ã–stermalm", type: "lÃ¤genhet", rooms: 3, size: 78 }
    }
  ],
  
  // Villor - NaturnÃ¤ra omrÃ¥den
  villa_nature: [
    {
      text: "EkorrvÃ¤gen 10, MÃ¶rtnÃ¤s. En rymlig villa pÃ¥ 165 kvm med 6 rum i lugnt och naturnÃ¤ra omrÃ¥de. Villan har ekparkettgolv och nyrenoverat kÃ¶k frÃ¥n Marbodal 2023.\n\nHuset har en praktisk planlÃ¶sning med socialt kÃ¶k i Ã¶ppen planlÃ¶sning med vardagsrum. KÃ¶ket har vitvaror frÃ¥n Siemens och bÃ¤nkskivor i kvartskomposit. Det finns gott om fÃ¶rvaringsutrymmen i bÃ¥de kÃ¶k och hall.\n\nBadrummet har badkar och golvvÃ¤rme. Samtliga rum har ekparkettgolv och villan har en hÃ¶g takhÃ¶jd pÃ¥ Ã¶ver 3 meter. De sprÃ¶jsade fÃ¶nstren bidrar till husets charm och karaktÃ¤r.\n\nDet finns en hÃ¤rlig terrass i sÃ¶derlÃ¤ge. Dessutom finns ett nybyggt uterum med TV-soffa och extra badrum. UppvÃ¤rmning sker via fjÃ¤rrvÃ¤rme.\n\nFastigheten ligger i MÃ¶rtnÃ¤s med 10 minuters gÃ¥ngavstÃ¥nd till bussen. OmrÃ¥det Ã¤r lugnt och naturnÃ¤ra med goda kommunikationer till centrala VÃ¤rmdÃ¶.",
      metadata: { price_level: "premium", area: "MÃ¶rtnÃ¤s", type: "villa", rooms: 6, size: 165 }
    },
    {
      text: "SkogsvÃ¤gen 25, TÃ¤by. En charmig villa pÃ¥ 140 kvm med 5 rum i barnvÃ¤nligt omrÃ¥de. Villan har renoverats 2021 med nytt kÃ¶k och badrum.\n\nHuset har en Ã¶ppen planlÃ¶sning mellan kÃ¶k och vardagsrum. KÃ¶ket har vitvaror frÃ¥n Smeg och bÃ¤nkskivor i kalksten. Det finns matplats fÃ¶r 6-8 personer.\n\nPÃ¥ Ã¶vervÃ¥ningen finns fyra sovrum och ett familjerum. Huvudsovrummet har walk-in-closet och eget badrum med dusch och badkar.\n\nTomten Ã¤r 850 kvm med trÃ¤dgÃ¥rd, garage och carport. Det finns ett fÃ¶rrÃ¥d pÃ¥ 15 kvm.\n\nLÃ¤get Ã¤r lugnt med 500 meter till skola och fÃ¶rskola. Det tar 20 minuter med bil till Stockholm city.",
      metadata: { price_level: "standard", area: "TÃ¤by", type: "villa", rooms: 5, size: 140 }
    }
  ],
  
  // Radhus - FamiljeomrÃ¥den
  radhus_family: [
    {
      text: "SolnavÃ¤gen 23, Solna. Ett vÃ¤lplanerat radhus pÃ¥ 120 kvm med 4 rum och kÃ¶k i barnvÃ¤nligt omrÃ¥de.\n\nRadhuset har en social planlÃ¶sning med kÃ¶k och vardagsrum i Ã¶ppen planlÃ¶sning pÃ¥ bottenvÃ¥ningen. KÃ¶ket Ã¤r frÃ¥n IKEA och renoverat 2021 med vitvaror frÃ¥n Bosch. Det finns utgÃ¥ng till trÃ¤dgÃ¥rden frÃ¥n vardagsrummet.\n\nPÃ¥ Ã¶vervÃ¥ningen finns tre sovrum och ett badrum. Huvudsovrummet har walk-in-closet. Badrummet Ã¤r helkaklat med dusch och wc. Golven Ã¤r av laminat i hela huset.\n\nTrÃ¤dgÃ¥rden Ã¤r lÃ¤ttskÃ¶tt med grÃ¤smatta och uteplats i sÃ¶derlÃ¤ge. Det finns ett fÃ¶rrÃ¥d pÃ¥ 10 kvm och carport med plats fÃ¶r tvÃ¥ bilar.\n\nLÃ¤get Ã¤r lugnt med promenadavstÃ¥nd till skolor, fÃ¶rskolor och mataffÃ¤r. Det tar 15 minuter med bil till Stockholm city.",
      metadata: { price_level: "standard", area: "Solna", type: "radhus", rooms: 4, size: 120 }
    }
  ],
  
  // Budget - FÃ¶rstagÃ¥ngskÃ¶pare
  budget_first_time: [
    {
      text: "Kyrkogatan 8, VÃ¤sterÃ¥s. En praktisk etta om 34 kvm i centralt lÃ¤ge. LÃ¤genheten Ã¤r nymÃ¥lad 2023.\n\nLÃ¤genheten har en Ã¶ppen planlÃ¶sning med kÃ¶k i samma rum som vardagsrum. KÃ¶ket har spis, kyl och frys. Det finns gott om fÃ¶rvaring i vÃ¤ggskÃ¥p.\n\nGolvet Ã¤r av laminat och vÃ¤ggarna Ã¤r mÃ¥lade i ljusa fÃ¤rger. FÃ¶nstren Ã¤r nya och ger ett bra ljusinslÃ¤pp.\n\nI badrummet finns dusch, wc och handfat. Det Ã¤r helkaklat och renoverat 2022.\n\nLÃ¤get Ã¤r centralt med 5 minuters gÃ¥ngavstÃ¥nd till tÃ¥gstation och city. NÃ¤ra till mataffÃ¤r och service.",
      metadata: { price_level: "budget", area: "VÃ¤sterÃ¥s", type: "lÃ¤genhet", rooms: 1, size: 34 }
    }
  ],
  
  // Standard - Mellanklass
  standard_suburban: [
    {
      text: "BjÃ¶rkÃ¤ngsvÃ¤gen 3, Upplands VÃ¤sby. En vÃ¤lplanerad trea om 85 kvm i barnvÃ¤nligt omrÃ¥de. LÃ¤genheten har balkong i vÃ¤sterlÃ¤ge.\n\nLÃ¤genheten har en social planlÃ¶sning med hall, vardagsrum, kÃ¶k, tvÃ¥ sovrum och badrum. KÃ¶ket Ã¤r frÃ¥n 2018 med vitvaror frÃ¥n Bosch och god bÃ¤nkyta.\n\nVardagsrummet har plats fÃ¶r soffagrupp och matbord. Det finns utgÃ¥ng till balkongen pÃ¥ 6 kvm. Golven Ã¤r av laminat i hela lÃ¤genheten.\n\nBadrummet Ã¤r helkaklat med dusch, wc och handfat. Det finns tvÃ¤ttmaskin och torktumlare.\n\nLÃ¤get Ã¤r lugnt med 300 meter till skola och fÃ¶rskola. Kommunikationer med pendeltÃ¥g tar 35 minuter till Stockholm.",
      metadata: { price_level: "standard", area: "Upplands VÃ¤sby", type: "lÃ¤genhet", rooms: 3, size: 85 }
    },
    {
      text: "EkbacksvÃ¤gen 12, Sollentuna. En radhuslÃ¤genhet om 110 kvm med 4 rum och egen ingÃ¥ng. Bostaden har en liten trÃ¤dgÃ¥rd.\n\nRadhuset har tvÃ¥ plan. Nederplan har hall, kÃ¶k, vardagsrum och badrum. Ã–verplan har tre sovrum.\n\nKÃ¶ket Ã¤r renoverat 2020 med vitvaror frÃ¥n Electrolux och Ã¶ppen planlÃ¶sning till vardagsrummet. Det finns utgÃ¥ng till trÃ¤dgÃ¥rden.\n\nBadrummet nere Ã¤r helkaklat med dusch och wc. Ã–vervÃ¥ningen har ett extra wc.\n\nTomten Ã¤r 150 kvm med grÃ¤smatta och uteplats. LÃ¤get Ã¤r lugnt med 10 minuters gÃ¥ngavstÃ¥nd till tÃ¥gstation.",
      metadata: { price_level: "standard", area: "Sollentuna", type: "radhus", rooms: 4, size: 110 }
    }
  ],
  
  // Luxury - Exklusivt
  luxury_waterfront: [
    {
      text: "Strandpromenaden 1, SaltsjÃ¶baden. En exklusiv villa pÃ¥ 280 kvm med sjÃ¶tomt och privat brygga. Villan har panoramautsikt Ã¶ver BaggensfjÃ¤rden.\n\nHuset har tre plan med totalt sju rum. BottenvÃ¥ningen har ett stort kÃ¶k frÃ¥n KvÃ¤num med matplats fÃ¶r 12 personer. Det finns also ett vardagsrum med Ã¶ppen spis.\n\nÃ–vervÃ¥ningen har fyra sovrum varav tvÃ¥ med eget badrum. Huvudsovrummet har walk-in-closet och utgÃ¥ng till balkong med sjÃ¶utsikt.\n Tomten Ã¤r 1200 kvm med Ã¤ngar ner till vattnet. Det finns en 25 meter lÃ¥ng brygga och boeplatser fÃ¶r tvÃ¥ bÃ¥tar.\n\nLÃ¤get Ã¤r exklusivt i SaltsjÃ¶baden med 5 minuter till SaltsjÃ¶badens station. NÃ¤ra till golfbana och tennisclub.",
      metadata: { price_level: "luxury", area: "SaltsjÃ¶baden", type: "villa", rooms: 7, size: 280 }
    },
    {
      text: "KarlavÃ¤gen 88, Stockholm. En penthouselÃ¤genhet om 220 kvm med takterrass pÃ¥ 80 kvm. LÃ¤genheten har 360-gradersutsikt Ã¶ver Stockholm.\n\nLÃ¤genheten har en Ã¶ppen planlÃ¶sning med kÃ¶k frÃ¥n 2022. KÃ¶ket har vitvaror frÃ¥n Gaggenau och en 8 meter lÃ¥ng kÃ¶ksÃ¶.\n\nVardagsrummet har 5 meter i takhÃ¶jd och stora fÃ¶nsterpartier. Det finns tre sovrum varav ett med egen terrass.\n\nBadrummen Ã¤r helkaklade med marmor och golvvÃ¤rme. Det finns tvÃ¥ gÃ¤strum och ett kontor.\n\nFastigheten har hiss direkt till lÃ¤genheten. LÃ¤get Ã¤r centralt pÃ¥ Ã–stermalm med 2 minuter till HumlegÃ¥rden.",
      metadata: { price_level: "luxury", area: "Ã–stermalm", type: "lÃ¤genhet", rooms: 4, size: 220 }
    }
  ],
  
  // New Build - Nya bostÃ¤der
  new_build: [
    {
      text: "Nya Gatan 5, Hammarby SjÃ¶stad. En nybyggd tvÃ¥a om 62 kvm med balkong i sÃ¶derlÃ¤ge. Inflyttning 2024.\n\nLÃ¤genheten har en modern planlÃ¶sning med kÃ¶k i Ã¶ppen planlÃ¶sning med vardagsrum. KÃ¶ket har vitvaror frÃ¥n Miele och integrerade vitvaruskÃ¥p.\n\nGolven Ã¤r av ekparkett och vÃ¤ggarna Ã¤r mÃ¥lade i neutrala fÃ¤rger. FÃ¶nstren Ã¤r energisnÃ¥la med 3-glas.\n\nBadrummet Ã¤r helkaklat med dusch, wc och handfat. Det finns tvÃ¤ttmaskin och torktumlare.\n\nFastigheten har cykelfÃ¶rrÃ¥d och Ã¶vernattningslÃ¤genhet. LÃ¤get Ã¤r populÃ¤rt i Hammarby SjÃ¶stad med 200 meter till tvÃ¤rbanan.",
      metadata: { price_level: "premium", area: "Hammarby SjÃ¶stad", type: "lÃ¤genhet", rooms: 2, size: 62 }
    },
    {
      text: "SolhÃ¶jden 3, TÃ¤by. En nybyggd villa pÃ¥ 185 kvm med 5 rum och carport. ByggÃ¥r 2023.\n\nVillan har en modern arkitektur med stora fÃ¶nsterpartier och Ã¶ppen planlÃ¶sning. KÃ¶ket har vitvaror frÃ¥n Siemens och stenbÃ¤nkskiva.\n\nHuset har tre sovrum pÃ¥ Ã¶vervÃ¥ningen och ett familjerum. Det finns tvÃ¥ badrum varav ett med badkar.\n\nTomten Ã¤r 600 kvm med stenlagd uteplats och grÃ¤smatta. Det finns carport med plats fÃ¶r tvÃ¥ bilar och fÃ¶rrÃ¥d.\n\nLÃ¤get Ã¤r barnvÃ¤nligt i TÃ¤by med 500 meter till skola. Det tar 20 minuter med bil till Stockholm.",
      metadata: { price_level: "premium", area: "TÃ¤by", type: "villa", rooms: 5, size: 185 }
    }
  ],
  
  // Urban - CitylÃ¤genheter
  urban_city: [
    {
      text: "Drottninggatan 25, Norrmalm. En etta om 42 kvm i centrala Stockholm. LÃ¤genheten har hÃ¶ga fÃ¶nster och trÃ¤golv.\n\nLÃ¤genheten har en Ã¶ppen planlÃ¶sning med kÃ¶k i samma rum som vardagsrum. KÃ¶ket har spis, kyl, frys och diskmaskin.\n\nGolvet Ã¤r av originalparkett frÃ¥n 1910. VÃ¤ggarna Ã¤r mÃ¥lade i ljusa fÃ¤rger. FÃ¶nstren Ã¤r stora och ger gott om ljus.\n\nBadrummet Ã¤r helkaklat med dusch och wc. Det Ã¤r nyrenoverat 2022.\n\nLÃ¤get Ã¤r centralt med 3 minuter till T-Centralen. NÃ¤ra till restauranger, butiker och HÃ¶torget.",
      metadata: { price_level: "premium", area: "Norrmalm", type: "lÃ¤genhet", rooms: 1, size: 42 }
    },
    {
      text: "Vasagatan 18, Vasastan. En tvÃ¥a om 68 kvm med klassiska detaljer. LÃ¤genheten har balkong mot innergÃ¥rden.\n\nLÃ¤genheten har en genomtÃ¤nkt planlÃ¶sning med hall, vardagsrum, sovrum, kÃ¶k och badrum. FrÃ¥n hallen nÃ¥s samtliga rum.\n\nVardagsrummet har en Ã¶ppen spis och stora fÃ¶nster mot gÃ¥rden. KÃ¶ket har vitvaror och gott om fÃ¶rvaring.\n\nSovrummet rymmer dubbelsÃ¤ng och har inbyggda garderober. Badrummet Ã¤r renoverat 2020 med dusch och wc.\n\nLÃ¤get Ã¤r centralt med 5 minuter till Odenplan. NÃ¤ra till Vasaparken och Stadsbiblioteket.",
      metadata: { price_level: "premium", area: "Vasastan", type: "lÃ¤genhet", rooms: 2, size: 68 }
    }
  ]
};

// --- HEMNET FORMAT: Professionell mÃ¤klarstil ---
const HEMNET_TEXT_PROMPT = `
Du Ã¤r en svensk fastighetsmÃ¤klare med 15 Ã¥rs erfarenhet. Skriv en objektbeskrivning fÃ¶r Hemnet.

ANVÃ„ND ALL KONTEXT NEDAN:
- DISPOSITION: Fakta om objektet
- TONALITETSANALYS: MÃ¥lgrupp och stil
- EXEMPELMATCHNING: BÃ¤st lÃ¤mpade exempeltexter

# EXEMPELTEXTER (studera stilen noggrant â€” kortare och mer koncis Ã¤n Booli)

EXEMPEL 1 - LÃ¤genhet Vasastan:
"Vasagatan 18, Vasastan. En tvÃ¥a om 68 kvm med klassiska detaljer och balkong mot innergÃ¥rden.

LÃ¤genheten har en genomtÃ¤nkt planlÃ¶sning med hall, vardagsrum, sovrum, kÃ¶k och badrum. FrÃ¥n hallen nÃ¥s samtliga rum. Vardagsrummet har en Ã¶ppen spis och stora fÃ¶nster mot gÃ¥rden.

KÃ¶ket har vitvaror och gott om fÃ¶rvaring. Sovrummet rymmer dubbelsÃ¤ng och har inbyggda garderober. Badrummet Ã¤r renoverat 2020 med dusch och wc.

LÃ¤get Ã¤r centralt med 5 minuter till Odenplan. NÃ¤ra till Vasaparken och Stadsbiblioteket."

EXEMPEL 2 - Villa TÃ¤by:
"SkogsvÃ¤gen 25, TÃ¤by. En villa pÃ¥ 140 kvm med 5 rum i barnvÃ¤nligt omrÃ¥de. Villan har renoverats 2021 med nytt kÃ¶k och badrum.

Huset har en Ã¶ppen planlÃ¶sning mellan kÃ¶k och vardagsrum. KÃ¶ket har vitvaror frÃ¥n Smeg och bÃ¤nkskivor i kalksten. Det finns matplats fÃ¶r 6-8 personer.

PÃ¥ Ã¶vervÃ¥ningen finns fyra sovrum och ett familjerum. Huvudsovrummet har walk-in-closet och eget badrum.

Tomten Ã¤r 850 kvm med trÃ¤dgÃ¥rd, garage och carport. LÃ¤get Ã¤r lugnt med 500 meter till skola och fÃ¶rskola."

# STRUKTUR (Hemnet â€” koncis och faktabaserad)
1. Ã–PPNING: Adress + typ + storlek + rum + unik egenskap (1-2 meningar)
2. PLANLÃ–SNING: Hur rummen ligger, material, ljusinslÃ¤pp (2-3 meningar)
3. KÃ–K: Utrustning, material, renovering med Ã¥rtal (2-3 meningar)
4. BADRUM: Material, utrustning, renovering med Ã¥rtal (1-2 meningar)
5. SOVRUM: Antal, storlek, garderober (1-2 meningar)
6. BALKONG/UTEPLATS: Storlek, vÃ¤derstreck (1-2 meningar)
7. LÃ„GE: OmrÃ¥de, avstÃ¥nd till kommunikationer och service (2-3 meningar)

# SKRIVREGLER
- BÃ¶rja med adressen â€” ALDRIG med "VÃ¤lkommen"
- AnvÃ¤nd ENDAST exakt fakta frÃ¥n dispositionen â€” INGET HITTA PÃ…
- Skriv fullstÃ¤ndiga meningar, separera stycken med \\n\\n
- Hemnet-stil: koncis, saklig, professionell â€” inga utsvÃ¤vningar
- NÃ¤mn exakta mÃ¥tt, Ã¥rtal, mÃ¤rken och material som finns i dispositionen
- HITTA ALDRIG PÃ… mÃ¤rken, mÃ¥tt, Ã¥rtal, material eller detaljer som inte finns i rÃ¥data

# FÃ–RBJUDNA FRASER (ANVÃ„ND ALDRIG)
erbjuder, erbjuds, perfekt, idealisk, fantastisk, drÃ¶mboende, luftig kÃ¤nsla, i hjÃ¤rtat av, stadens puls, fÃ¶r den som, vilket gÃ¶r det, vÃ¤lkommen till, underbar, magisk

OUTPUT (JSON):
{
  "highlights": ["Viktig punkt 1", "Viktig punkt 2", "Viktig punkt 3"],
  "improvedPrompt": "Texten med stycken separerade av \\n\\n",
  "analysis": {"target_group": "MÃ¥lgrupp", "area_advantage": "LÃ¤gesfÃ¶rdelar", "pricing_factors": "VÃ¤rdehÃ¶jande"},
  "socialCopy": "Kort text max 280 tecken utan emoji",
  "missing_info": ["Saknad info"],
  "pro_tips": ["Tips"]
}
`;

// --- BOOLI/EGEN SIDA: Exempelbaserad mÃ¤klarstil ---
const BOOLI_TEXT_PROMPT_WRITER = `
Du Ã¤r en svensk fastighetsmÃ¤klare med 15 Ã¥rs erfarenhet. Skriv en objektbeskrivning fÃ¶r Booli/egen sida baserat pÃ¥ DISPOSITIONEN.

# TONALITET OCH STIL
AnvÃ¤nd samma stil som exemplen nedan: professionell, detaljerad, sÃ¤ljande men saklig. Fler detaljer Ã¤n Hemnet, inklusive pris och ekonomi.

# EXEMPELTEXTER (studera dessa noggrant)

EXEMPEL 1 - LÃ¤genhet Ã–stermalm:
"KarlavÃ¤gen 45, vÃ¥ning 4 av 5. En vÃ¤lplanerad tvÃ¥a om 58 kvm i klassisk 20-talsfastighet med bevarade originaldetaljer och hÃ¶ga tak.

LÃ¤genheten har en genomtÃ¤nkt planlÃ¶sning med hall, vardagsrum, sovrum, kÃ¶k och badrum. FrÃ¥n hallen nÃ¥s samtliga rum. Vardagsrummet om cirka 20 kvm har tvÃ¥ fÃ¶nster mot gÃ¥rden och takhÃ¶jd pÃ¥ 2,8 meter. Golven Ã¤r av ekparkett genomgÃ¥ende och har slipats 2020.

KÃ¶ket Ã¤r utrustat med spis, ugn, kyl, frys och diskmaskin frÃ¥n Bosch. BÃ¤nkskivorna Ã¤r av laminat och det finns gott om fÃ¶rvaring i Ã¶ver- och underskÃ¥p. KÃ¶ket har fÃ¶nster mot gÃ¥rden och ger ett bra ljusinslÃ¤pp.

Sovrummet rymmer dubbelsÃ¤ng och har garderob med skjutdÃ¶rrar. Badrummet Ã¤r helkaklat och renoverat 2019 med dusch, wc och handfat. TvÃ¤ttmaskin och torktumlare finns i lÃ¤genheten.

Balkongen pÃ¥ 4 kvm vetter mot vÃ¤ster med eftermiddags- och kvÃ¤llssol. FÃ¶reningen har nyligen renoverat fasaden och taket. MÃ¥nadsavgiften Ã¤r 4 200 kr och inkluderar vÃ¤rme, vatten och kabel-tv.

LÃ¤get Ã¤r centralt med tunnelbana pÃ¥ 3 minuters gÃ¥ngavstÃ¥nd. Matbutiker, restauranger och HumlegÃ¥rden finns i nÃ¤romrÃ¥det. Fastigheten har en stabil ekonomi med lÃ¥g belÃ¥ning."

EXEMPEL 2 - Villa MÃ¶rtnÃ¤s:
"EkorrvÃ¤gen 10, MÃ¶rtnÃ¤s. En rymlig villa pÃ¥ 165 kvm med 6 rum i lugnt och naturnÃ¤ra omrÃ¥de. Villan har ekparkettgolv och nyrenoverat kÃ¶k frÃ¥n Marbodal 2023.

Huset har en praktisk planlÃ¶sning med socialt kÃ¶k i Ã¶ppen planlÃ¶sning med vardagsrum. KÃ¶ket har vitvaror frÃ¥n Siemens och bÃ¤nkskivor i kvartskomposit. Det finns gott om fÃ¶rvaringsutrymmen i bÃ¥de kÃ¶k och hall.

Badrummet har badkar och golvvÃ¤rme. Samtliga rum har ekparkettgolv och villan har en hÃ¶g takhÃ¶jd pÃ¥ Ã¶ver 3 meter. De sprÃ¶jsade fÃ¶nstren bidrar till husets charm och karaktÃ¤r.

Det finns en hÃ¤rlig terrass i sÃ¶derlÃ¤ge. Dessutom finns ett nybyggt uterum med TV-soffa och extra badrum. UppvÃ¤rmning sker via fjÃ¤rrvÃ¤rme och golvvÃ¤rme.

Fastigheten ligger i MÃ¶rtnÃ¤s med 10 minuters gÃ¥ngavstÃ¥nd till bussen. OmrÃ¥det Ã¤r lugnt och naturnÃ¤ra med goda kommunikationer till centrala VÃ¤rmdÃ¶. Tomten Ã¤r 825 kvm med grÃ¤smatta och planteringar.

UtgÃ¥ngspris Ã¤r 12 000 000 kr."

EXEMPEL 3 - Radhus Solna:
"SolnavÃ¤gen 23, Solna. Ett vÃ¤lplanerat radhus pÃ¥ 120 kvm med 4 rum och kÃ¶k i barnvÃ¤nligt omrÃ¥de. Radhuset har en lÃ¤ttskÃ¶tt trÃ¤dgÃ¥rd och carport.

Radhuset har en social planlÃ¶sning med kÃ¶k och vardagsrum i Ã¶ppen planlÃ¶sning pÃ¥ bottenvÃ¥ningen. KÃ¶ket Ã¤r frÃ¥n IKEA och renoverat 2021 med vitvaror frÃ¥n Bosch. Det finns utgÃ¥ng till trÃ¤dgÃ¥rden frÃ¥n vardagsrummet.

PÃ¥ Ã¶vervÃ¥ningen finns tre sovrum och ett badrum. Huvudsovrummet har walk-in-closet. Badrummet Ã¤r helkaklat med dusch och wc. Golven Ã¤r av laminat i hela huset.

TrÃ¤dgÃ¥rden Ã¤r lÃ¤ttskÃ¶tt med grÃ¤smatta och uteplats i sÃ¶derlÃ¤ge. Det finns ett fÃ¶rrÃ¥d pÃ¥ 10 kvm och carport med plats fÃ¶r tvÃ¥ bilar. Tomten Ã¤r 350 kvm.

LÃ¤get Ã¤r lugnt med promenadavstÃ¥nd till skolor, fÃ¶rskolor och mataffÃ¤r. Det tar 15 minuter med bil till Stockholm city. MÃ¥nadsavgiften Ã¤r 2 800 kr.

UtgÃ¥ngspris Ã¤r 6 500 000 kr."

# STRUKTUR (fÃ¶lj exakt som exemplen)
1. Ã–PPNING: Adress + typ + storlek + rum + unik egenskap (1-2 meningar)
2. PLANLÃ–SNING: Hur rummen ligger, material, ljusinslÃ¤pp, takhÃ¶jd (2-3 meningar)
3. KÃ–K: MÃ¤rke, material, vitvaror, renovering med Ã¥rtal (2-3 meningar)
4. BADRUM: Material, utrustning, renovering med Ã¥rtal (2-3 meningar)
5. SOVRUM: Antal, storlek, garderober, ljus (2-3 meningar)
6. BALKONG/UTEPLATS: Storlek i kvm, vÃ¤derstreck, anvÃ¤ndning (2-3 meningar)
7. EXTRA: Uterum, fÃ¶rrÃ¥d, parkering, andra utrymmen (1-2 meningar)
8. FÃ–RENING/FASTIGHET: Renoveringar, ekonomi, avgift (1-2 meningar)
9. LÃ„GE: OmrÃ¥de, karaktÃ¤r, avstÃ¥nd till kommunikationer (2-3 meningar)
10. PRIS: Ange utgÃ¥ngspris om det finns i dispositionen (1 mening)

# SKRIVREGLER (som i exemplen)
- BÃ¶rja med adress: "KarlavÃ¤gen 45..."
- AnvÃ¤nd exakta mÃ¥tt: "58 kvm", "2,8 meter", "4 kvm", "825 kvm"
- AnvÃ¤nd exakta Ã¥rtal: "renoverad 2019", "nyrenoverat 2023"
- AnvÃ¤nd exakta avstÃ¥nd: "3 minuters gÃ¥ngavstÃ¥nd", "10 minuters gÃ¥ngavstÃ¥nd"
- NÃ¤mn mÃ¤rken: "Marbodal", "Siemens", "Bosch", "IKEA"
- Inkludera ekonomi: mÃ¥nadsavgift, utgÃ¥ngspris

# FÃ–RBJUDNA ORD (anvÃ¤nd ALDRIG)
erbjuder, erbjuds, perfekt, idealisk, fantastisk, underbar, magisk, drÃ¶mboende, luftig kÃ¤nsla, i hjÃ¤rtat av, stadens puls, fÃ¶r den som, vilket gÃ¶r det, vÃ¤lkommen till

# KRAV
- Minst 200 ord
- AnvÃ¤nd BARA fakta frÃ¥n dispositionen
- Skriv fullstÃ¤ndiga meningar
- Varje stycke ska ha 2-3 meningar
- Separera stycken med \\n\\n

OUTPUT (JSON):
{
  "highlights": ["Viktig punkt 1", "Viktig punkt 2", "Viktig punkt 3"],
  "improvedPrompt": "Texten med stycken separerade av \\n\\n",
  "analysis": {"target_group": "MÃ¥lgrupp", "area_advantage": "LÃ¤gesfÃ¶rdelar", "pricing_factors": "VÃ¤rdehÃ¶jande"},
  "socialCopy": "Kort text max 280 tecken utan emoji",
  "missing_info": ["Saknad info som behÃ¶vs fÃ¶r komplett annons"],
  "pro_tips": ["Tips till mÃ¤klaren"]
}
`;

// [Dead code removed: _UNUSED_BOOLI_TEXT_PROMPT + BOOLI_EXPERT_PROMPT â€” ~300 lines of unused prompts]
const _UNUSED_BOOLI_TEXT_PROMPT = `REMOVED`;
const BOOLI_EXPERT_PROMPT = `REMOVED`;

// Lokal exempelmatchning â€“ ingen AI-anrop behÃ¶vs
function matchExamples(disposition: any, toneAnalysis: any): string[] {
  const type = (disposition?.property?.type || 'lÃ¤genhet').toLowerCase();
  const priceLevel = (toneAnalysis?.price_category || 'standard').toLowerCase();

  let candidates: any[] = [];

  if (type.includes('villa')) {
    candidates = [...EXAMPLE_DATABASE.villa_nature];
    if (priceLevel === 'luxury') candidates = [...EXAMPLE_DATABASE.luxury_waterfront, ...candidates];
  } else if (type.includes('radhus')) {
    candidates = [...EXAMPLE_DATABASE.radhus_family, ...EXAMPLE_DATABASE.standard_suburban];
  } else {
    if (priceLevel === 'luxury') {
      candidates = [...EXAMPLE_DATABASE.luxury_waterfront, ...EXAMPLE_DATABASE.premium_ostermalm];
    } else if (priceLevel === 'premium') {
      candidates = [...EXAMPLE_DATABASE.premium_ostermalm, ...EXAMPLE_DATABASE.urban_city];
    } else if (priceLevel === 'budget') {
      candidates = [...EXAMPLE_DATABASE.budget_first_time, ...EXAMPLE_DATABASE.standard_suburban];
    } else {
      candidates = [...EXAMPLE_DATABASE.standard_suburban, ...EXAMPLE_DATABASE.budget_first_time];
    }
  }

  // Prioritera nyproduktion om relevant
  const yearBuilt = disposition?.property?.year_built;
  if (yearBuilt && (String(yearBuilt).includes('202') || String(yearBuilt).includes('nyproduktion'))) {
    candidates = [...EXAMPLE_DATABASE.new_build, ...candidates];
  }

  return candidates.slice(0, 2).map((ex: any) => ex.text);
}

// Faktagranskning â€“ ALDRIG omskrivning, bara rapportering
const FACT_CHECK_PROMPT = `
# UPPGIFT

Granska objektbeskrivningen mot dispositionen. Ã„NDRA ALDRIG texten. Rapportera bara fel.

# REGLER

1. Kontrollera att ALLA fakta i texten finns i dispositionen
2. Flagga pÃ¥hittade detaljer (mÃ¤rken, mÃ¥tt, Ã¥rtal som inte finns i rÃ¥data)
3. Flagga juridiskt problematiska pÃ¥stÃ¥enden
4. SKRIV ALDRIG om texten â€“ rapportera bara
5. Kontrollera att inga fÃ¶rbjudna AI-fraser smugit sig in

# OUTPUT FORMAT (JSON)

{
  "fact_check_passed": true,
  "issues": [
    {"type": "fabricated/inaccurate/legal/ai_phrase", "quote": "den problematiska frasen", "reason": "varfÃ¶r det Ã¤r fel"}
  ],
  "quality_score": 0.95,
  "broker_tips": ["konkret tips fÃ¶r mÃ¤klaren"]
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
      res.status(500).json({ message: "Kunde inte hÃ¤mta anvÃ¤ndarstatus" });
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
          message: `Du har nÃ¥tt din mÃ¥nadsgrÃ¤ns av ${monthlyLimit} objektbeskrivningar. Uppgradera till Pro fÃ¶r fler!`,
          limitReached: true,
        });
      }

      const { prompt, type, platform, wordCountMin, wordCountMax, imageUrls } = req.body;

      // BestÃ¤m AI-modell baserat pÃ¥ plan
      const aiModel = plan === "pro" ? "gpt-4o" : "gpt-4o-mini";

      // Konkurrentanalys (Pro-funktion)
      let competitorAnalysis = "";
      if (plan === "pro") {
        console.log(`[Competitor Analysis] Analyzing market position...`);
        
        // Extrahera grundlÃ¤ggande info frÃ¥n prompten fÃ¶r analys
        const propertyInfo = {
          area: prompt.match(/i\s+([A-Za-z-]+)/i)?.[1] || "okÃ¤nt omrÃ¥de",
          type: type || "lÃ¤genhet",
          price: prompt.match(/(\d+\s*(?:k|tk|m|mn|kr))/i)?.[1] || "ej specificerat"
        };

        const competitorMessages = [
          {
            role: "system" as const,
            content: `Du Ã¤r en expert pÃ¥ svensk fastighetsmarknad. Analysera konkurrenslÃ¤get fÃ¶r ett objekt och ge konkreta rÃ¥d fÃ¶r hur det ska positioneras fÃ¶r att sticka ut. Var realistisk och baserad pÃ¥ faktiska marknadsfÃ¶rhÃ¥llanden.`
          },
          {
            role: "user" as const,
            content: `Analysera detta objekt och ge konkreta positioningstips:

OBJEKTINFO:
- OmrÃ¥de: ${propertyInfo.area}
- Typ: ${propertyInfo.type}
- Pris: ${propertyInfo.price}
- Originalbeskrivning: ${prompt}

Ge mig:
1. Vanliga klyschor och svaga formuleringar som konkurrenterna anvÃ¤nder (undvik dessa)
2. Unika sÃ¤ljpunkter som konkurrenterna sÃ¤llan nÃ¤mner (fokusera pÃ¥ dessa)
3. Positioneringstips fÃ¶r att sticka ut i mÃ¤ngden
4. Specifika detaljer som Ã¤r vÃ¤rda att lyfta fram

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
            content: "Du Ã¤r en expert pÃ¥ att analysera fastighetsbilder. Beskriv vad du ser i bilderna: rum, material, stil, skick, ljusfÃ¶rhÃ¥llanden, utsikt, och andra relevanta detaljer fÃ¶r en fastighetsbeskrivning. Var specifik och faktabaserad."
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
      
      // BestÃ¤m ordgrÃ¤nser baserat pÃ¥ plan
      let targetWordMin: number;
      let targetWordMax: number;
      
      if (plan === "pro" && wordCountMin && wordCountMax) {
        // Pro-anvÃ¤ndare kan vÃ¤lja eget intervall (inom grÃ¤nser)
        targetWordMin = Math.max(WORD_LIMITS.pro.min, Math.min(wordCountMin, WORD_LIMITS.pro.max));
        targetWordMax = Math.max(WORD_LIMITS.pro.min, Math.min(wordCountMax, WORD_LIMITS.pro.max));
      } else if (plan === "pro") {
        // Pro-anvÃ¤ndare utan val fÃ¥r default
        targetWordMin = WORD_LIMITS.pro.default.min;
        targetWordMax = WORD_LIMITS.pro.default.max;
      } else {
        // Free-anvÃ¤ndare fÃ¥r fast intervall
        targetWordMin = WORD_LIMITS.free.min;
        targetWordMax = WORD_LIMITS.free.max;
      }
      
      console.log(`[Config] Plan: ${plan}, Model: ${aiModel}, Words: ${targetWordMin}-${targetWordMax}`);

      // === OPTIMIZED PIPELINE: 3 CORE STEPS ===
      
      // Step 1: Combined extraction (facts + tone + writing plan) - 1 API call
      console.log("[Step 1] Combined extraction: facts, tone, and writing plan...");
      
      const dispositionMessages = [
        {
          role: "system" as const,
          content: COMBINED_EXTRACTION_PROMPT + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content: `RÃ…DATA: ${prompt}${imageAnalysis ? `\n\nBILDANALYS: ${imageAnalysis}` : ''}${competitorAnalysis ? `\n\nKONKURRENTANALYS: ${competitorAnalysis}` : ''}\n\nPLATTFORM: ${platform === "hemnet" ? "HEMNET" : "BOOLI/EGEN SIDA"}\n\nÃ–NSKAT ORDANTAL: ${targetWordMin}-${targetWordMax} ord`,
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
      let disposition: any;
      try {
        disposition = safeJsonParse(dispositionText);
      } catch (e) {
        console.warn("[Step 1] Disposition JSON parse failed, retrying once...", e);
        const dispositionRetry = await openai.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system" as const,
              content:
                COMBINED_EXTRACTION_PROMPT +
                "\n\nSvara ENDAST med ett giltigt JSON-objekt. Inga trailing commas. Inga kommentarer.",
            },
            { role: "user" as const, content: `RÃ…DATA: ${prompt}` },
          ],
          max_tokens: 3000,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
        const dispositionRetryText = dispositionRetry.choices[0]?.message?.content || "{}";
        try {
          disposition = safeJsonParse(dispositionRetryText);
        } catch (e2) {
          return res.status(422).json({
            message: "Kunde inte tolka data. FÃ¶rsÃ¶k igen.",
          });
        }
      }
      
      // Extract sub-fields from combined extraction
      const rawDisposition = disposition;
      if (rawDisposition.disposition) {
        disposition = rawDisposition.disposition;
      }
      const toneAnalysis = rawDisposition.tone_analysis || {};
      const writingPlan = rawDisposition.writing_plan || {};
      console.log("[Step 1] Combined extraction completed");

      // Step 2: Local example matching - 0 API calls
      console.log("[Step 2] Local example matching...");
      const matchedExamples = matchExamples(disposition, toneAnalysis);
      console.log(`[Step 2] Matched ${matchedExamples.length} examples`);


      // Step 3: Text generation - 1 API call (single version, no A/B waste)
      console.log("[Step 3] Generating text...");

      // Single text generation (no A/B waste - always use BOOLI_TEXT_PROMPT_WRITER for booli)
      const textPrompt = platform === "hemnet" ? HEMNET_TEXT_PROMPT : BOOLI_TEXT_PROMPT_WRITER;
      
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
            "\n\nINSTRUKTIONER:\n" +
            "1. FÃ¶lj skrivplanen exakt\n" +
            "2. AnvÃ¤nd BARA fakta frÃ¥n dispositionen â€“ hitta ALDRIG pÃ¥\n" +
            "3. FÃ¶lj tonalitetsguiden\n" +
            `4. Skriv ${targetWordMin}-${targetWordMax} ord\n` +
            "5. Skriv som en erfaren mÃ¤klare â€“ saklig, konkret, trovÃ¤rdig\n" +
            "6. Skriv i samma stil som exempeltexterna",
        },
      ];

      const textCompletion = await openai.chat.completions.create({
        model: aiModel,
        messages: textMessages,
        max_tokens: 4000,
        temperature: 0.35,
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
      
      // Post-processing - rensa fÃ¶rbjudna fraser
      if (result.improvedPrompt) {
        result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt);
      }
      if (result.socialCopy) {
        result.socialCopy = cleanForbiddenPhrases(result.socialCopy);
      }
      console.log("[Post-processing] Automatic phrase cleanup done before validation");

      // Validering - nu kÃ¶rs den pÃ¥ redan rensad text
      let violations = validateOptimizationResult(result, platform, targetWordMin, targetWordMax);
      console.log("[AI Validation] Text generation violations:", violations.length > 0 ? violations : "NONE");
      
      // Retry loop - skickar befintlig text och ber AI:n BARA fixa specifika fel
      const maxAttempts = 2;
      let attempts = 0;
      while (violations.length > 0 && attempts < maxAttempts) {
        attempts++;
        console.log(`[AI Validation] Retry attempt ${attempts} due to violations:`, violations);
        
        const violationList = violations.map(v => `- ${v}`).join("\n");
        const currentText = result.improvedPrompt || "";

        const retryCompletion = await openai.chat.completions.create({
          model: aiModel,
          messages: [
            {
              role: "system" as const,
              content: `Du Ã¤r en textredaktÃ¶r. Din uppgift Ã¤r att REDIGERA den befintliga texten och BARA fixa de specifika felen som listas. Ã„ndra sÃ¥ lite som mÃ¶jligt â€” behÃ¥ll resten av texten EXAKT som den Ã¤r.

FÃ–RBJUDNA ORD som ALDRIG fÃ¥r finnas:
erbjuder, erbjuds, perfekt fÃ¶r, idealisk fÃ¶r, fÃ¶r den som, vilket gÃ¶r det enkelt, vilket ger en, kontakta oss, tveka inte, stadens puls, i hjÃ¤rtat av, drÃ¶mboende, drÃ¶mhem, luftig kÃ¤nsla, fantastisk, underbar, magisk

REGLER:
- Om texten har fÃ¶rbjudna fraser: ersÃ¤tt BARA de fraserna med neutrala alternativ.
- Om texten Ã¤r fÃ¶r kort: lÃ¤gg till 2-3 meningar med konkreta fakta frÃ¥n dispositionen.
- Ã„NDRA ALDRIG meningar som inte innehÃ¥ller fel.

Returnera JSON: {"improvedPrompt": "den redigerade texten"}`,
            },
            {
              role: "user" as const,
              content:
                "BEFINTLIG TEXT ATT REDIGERA:\n\n" +
                currentText +
                "\n\n---\n\nFEL ATT FIXA:\n" +
                violationList +
                "\n\n---\n\nDISPOSITION (fÃ¶r att lÃ¤gga till fakta om texten Ã¤r fÃ¶r kort):\n" +
                JSON.stringify(disposition, null, 2) +
                "\n\nFixa BARA felen ovan. Ã„ndra sÃ¥ lite som mÃ¶jligt av resten.",
            },
          ],
          max_tokens: 4000,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });

        const retryText = retryCompletion.choices[0]?.message?.content || "{}";
        try {
          const retryResult = safeJsonParse(retryText);
          // KRITISKT: ErsÃ¤tt BARA texten, behÃ¥ll original highlights/analysis/socialCopy/tips
          if (retryResult.improvedPrompt) {
            result.improvedPrompt = retryResult.improvedPrompt;
          }
          // BehÃ¥ll socialCopy bara om retryn inte hade en â€” annars kan AI:n ha skrivit om den
          // Original socialCopy frÃ¥n steg 3 Ã¤r alltid bÃ¤ttre
        } catch (e) {
          console.warn("[AI Validation] Retry JSON parse failed, continuing to next attempt...", e);
          violations = ["Ogiltig JSON i modellens svar"]; 
          continue;
        }
        
        // VIKTIGT: KÃ¶r cleanForbiddenPhrases efter varje retry ocksÃ¥
        if (result.improvedPrompt) {
          result.improvedPrompt = cleanForbiddenPhrases(result.improvedPrompt);
        }
        if (result.socialCopy) {
          result.socialCopy = cleanForbiddenPhrases(result.socialCopy);
        }
        
        violations = validateOptimizationResult(result, platform, targetWordMin, targetWordMax);
        console.log("[AI Validation] After retry " + attempts + " violations:", violations.length > 0 ? violations : "NONE");
      }
      
      // Om det fortfarande finns violations efter retries — returnera texten ändå med varningar
      // Bättre att ge användaren en text med mindre brister än att ge ett tomt felmeddelande
      if (violations.length > 0) {
        console.warn("[Validation] Still has violations after retries, returning text with warnings:", violations);
      }

      // Step 4: Fact-check review (NEVER rewrites text) - 1 API call
      console.log("[Step 4] Fact-check review...");
      
      const factCheckMessages = [
        {
          role: "system" as const,
          content: FACT_CHECK_PROMPT + "\n\nSvara ENDAST med ett giltigt JSON-objekt.",
        },
        {
          role: "user" as const,
          content: `OBJEKTBESKRIVNING:\n${result.improvedPrompt}\n\nDISPOSITION:\n${JSON.stringify(disposition, null, 2)}`,
        },
      ];

      let factCheck: any = { fact_check_passed: true, issues: [], quality_score: 0.9, broker_tips: [] };
      try {
        const factCheckCompletion = await openai.chat.completions.create({
          model: aiModel,
          messages: factCheckMessages,
          max_tokens: 1000,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
        factCheck = safeJsonParse(factCheckCompletion.choices[0]?.message?.content || "{}");
      } catch (e) {
        console.warn("[Step 4] Fact-check failed, continuing...", e);
      }
      console.log("[Step 4] Fact-check:", factCheck.fact_check_passed ? "PASSED" : "ISSUES FOUND", factCheck.issues?.length || 0, "issues");
      
      result.factCheck = factCheck;

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
          result.analysis?.target_group ? "MÃ¥lgrupp: " + result.analysis.target_group : null,
          result.analysis?.area_advantage ? "OmrÃ¥de: " + result.analysis.area_advantage : null,
          result.analysis?.pricing_factors ? "Prisfaktorer: " + result.analysis.pricing_factors : null,
          result.analysis?.association_status ? "FÃ¶rening: " + result.analysis.association_status : null,
        ].filter(Boolean) as string[],
        suggestions: result.pro_tips || [],
        socialCopy: result.socialCopy || null,
      });

      // AI-fÃ¶rbÃ¤ttringsanalys (kÃ¶rs efter textgenerering)
      let improvementSuggestions = undefined;
      if (plan === "pro") {
        console.log("[Improvement Analysis] Analyzing generated text for improvements...");
        
        const improvementPrompt = `Analysera denna objektbeskrivning och ge fÃ¶rbÃ¤ttringsfÃ¶rslag:

OBJEKTBESKRIVNING:
${result.improvedPrompt}

MÃ…LGRUPP: ${result.analysis?.target_group || "OkÃ¤nd"}

Ge feedback pÃ¥:
1. Ton och sprÃ¥k - passar det mÃ¥lgruppen?
2. MÃ¥lgruppsanpassning - hur vÃ¤l passar texten mÃ¥lgruppen?
3. Saknade element - vad skulle kunna fÃ¶rbÃ¤ttra texten?
4. Styrkor - vad Ã¤r bra med texten?

Svara med JSON i formatet:
{
  "tone": "beskrivning av ton och om den passar",
  "target_audience_fit": "hur vÃ¤l texten passar mÃ¥lgruppen",
  "missing_elements": ["element 1", "element 2"],
  "strengths": ["styrka 1", "styrka 2"]
}`;

        const improvementMessages = [
          {
            role: "system" as const,
            content: "Du Ã¤r en expert pÃ¥ fastighetstexter och marknadsfÃ¶ring. Ge konstruktiv feedback.",
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

      res.json({
        originalPrompt: prompt,
        improvedPrompt: result.improvedPrompt || prompt,
        highlights: result.highlights || [],
        analysis: result.analysis || {},
        improvements: result.missing_info || [],
        suggestions: result.pro_tips || [],
        pro_tips: result.pro_tips || [],
        critical_gaps: result.critical_gaps || [],
        socialCopy: result.socialCopy || null,
        improvement_suggestions: improvementSuggestions,
        factCheck: result.factCheck || null,
        wordCount: (result.improvedPrompt || "").split(/\s+/).filter(Boolean).length,
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
      res.status(500).json({ message: "Kunde inte hÃ¤mta historik" });
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
      res.status(500).json({ message: "Kunde inte hÃ¤mta team" });
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
          message: "Du har skickat fÃ¶r mÃ¥nga inbjudningar. VÃ¤nligen vÃ¤nta en timme." 
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

  // TEXTFÃ–RBÃ„TTRING - AI-assistent fÃ¶r att skriva om delar av texten
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
        return res.status(403).json({ message: "Denna funktion Ã¤r endast fÃ¶r Pro-anvÃ¤ndare" });
      }

      console.log(`[Text Improvement] Improving text with type: ${improvementType}`);

      const improvementPrompts = {
        more_descriptive: `GÃ¶r denna text mer beskrivande och levande fÃ¶r fastighetsmÃ¤klare. AnvÃ¤nd sensoriska detaljer och skapa en starkare bild fÃ¶r lÃ¤saren. BehÃ¥ll den faktiska informationen.`,
        more_selling: `GÃ¶r denna text mer sÃ¤ljande och Ã¶vertygande. Fokusera pÃ¥ fÃ¶rdelar fÃ¶r kÃ¶paren, skapa brÃ¥dska och framhÃ¤va unika vÃ¤rden. AnvÃ¤nd mÃ¤klarbranschens bÃ¤sta praxis.`,
        more_formal: `GÃ¶r denna text mer formell och professionell. AnvÃ¤nd korrekta fastighetstermer och en ton som passar fÃ¶r hÃ¶gkvalitativa objekt.`,
        more_warm: `GÃ¶r denna text mer personlig och inbjudande. Skapa en kÃ¤nsla av hem och vÃ¤lbefinnande utan att fÃ¶rlora professionaliteten.`,
        fix_claims: `FÃ¶rbÃ¤ttra denna text genom att ersÃ¤tta klyschor och svaga pÃ¥stÃ¥enden med konkreta fakta och starka argument. AnvÃ¤nd mÃ¤klarbranschen kunskaper.`
      };

      const prompt = improvementPrompts[improvementType] || improvementPrompts.more_descriptive;

      const messages = [
        {
          role: "system" as const,
          content: `Du Ã¤r en expert pÃ¥ svenska fastighetstexter med 15 Ã¥rs erfarenhet som mÃ¤klare. Du kan allt om svensk fastighetslagstiftning, marknadspsykologi och effektiva sÃ¤ljstrategier. Dina texter Ã¤r alltid klyschfria, faktabaserade och sÃ¤ljande.

KONTEXT: ${context || 'Ingen extra kontext'}

ORIGINALTEXT: ${originalText}

VALD TEXT ATT FÃ–RBÃ„TTRA: ${selectedText}

${prompt}

Svara ENDAST med den fÃ¶rbÃ¤ttrade texten, inga fÃ¶rklaringar.`
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
      res.status(500).json({ message: err.message || "TextfÃ¶rbÃ¤ttring misslyckades" });
    }
  });

  return httpServer;
}
