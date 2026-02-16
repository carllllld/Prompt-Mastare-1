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
  
  // AI-fraser som riktiga mÃ¤klare ALDRIG anvÃ¤nder
  "generÃ¶sa ytor",
  "generÃ¶s takhÃ¶jd",
  "generÃ¶st tilltaget",
  "generÃ¶st med",
  "bjuder pÃ¥",
  "prÃ¤glas av",
  "genomsyras av",
  "andas lugn",
  "andas charm",
  "andas historia",
  "prÃ¤glad av",
  "stor charm",
  "med sin charm",
  "med mycket charm",
  "trivsamt boende",
  "trivsam bostad",
  "en bostad som",
  "en lÃ¤genhet som",
  "ett hem som",
  "hÃ¤r finns",
  "hÃ¤r kan du",
  "hÃ¤r bor du",
  "strategiskt placerad",
  "strategiskt lÃ¤ge",
  
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
  const aiPhrases = [
    'tÃ¤nk dig', 'fÃ¶restÃ¤ll dig', 'ljuset dansar', 'doften av', 'kÃ¤nslan av', 'sinnesupplevelse',
    'harmoniskt samspel', 'tidlÃ¶s elegans', 'tidlÃ¶s charm', 'en oas', 'en fristad',
    'inbjuder till', 'bjuder in till', 'lockar till', 'inspirerar till',
    'med andra ord', 'kort sagt', 'sammanfattningsvis',
    'inte bara', 'utan ocksÃ¥',
    'generÃ¶sa ytor', 'generÃ¶s takhÃ¶jd', 'generÃ¶st tilltaget',
    'bjuder pÃ¥', 'prÃ¤glas av', 'genomsyras av',
    'andas lugn', 'andas charm', 'andas historia',
    'en bostad som', 'en lÃ¤genhet som', 'ett hem som',
    'hÃ¤r kan du', 'hÃ¤r bor du', 'hÃ¤r finns',
    'strategiskt lÃ¤ge', 'strategiskt placerad',
  ];
  for (const phrase of aiPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      violations.push(`AI-typisk fras: "${phrase}" - skriv mer sakligt`);
    }
  }
  
  // Check for generic patterns
  const genericPatterns = ['fantastisk lÃ¤ge', 'renoverat med hÃ¶g standard', 'attraktivt', 'idealisk', 'perfekt fÃ¶r'];
  for (const pattern of genericPatterns) {
    if (text.toLowerCase().includes(pattern)) {
      violations.push(`Generiskt mÃ¶nster: "${pattern}"`);
    }
  }
  
  // Check for forbidden openings
  const lowerText = text.toLowerCase().trim();
  if (lowerText.startsWith('hÃ¤r ')) {
    violations.push(`BÃ¶rjar med "HÃ¤r" - bÃ¶rja med gatuadress istÃ¤llet`);
  }
  if (lowerText.startsWith('denna ') || lowerText.startsWith('dette ')) {
    violations.push(`BÃ¶rjar med "Denna" - bÃ¶rja med gatuadress istÃ¤llet`);
  }
  if (lowerText.startsWith('i ') && !lowerText.match(/^i [a-zÃ¥Ã¤Ã¶]+(gatan|vÃ¤gen|stigen)/)) {
    violations.push(`BÃ¶rjar med "I" - bÃ¶rja med gatuadress istÃ¤llet`);
  }
  
  // Check for CTA endings (forbidden)
  const ctaPhrases = ['kontakta oss', 'boka visning', 'tveka inte', 'hÃ¶r av dig', 'fÃ¶r mer information'];
  const lastSentences = text.slice(-200).toLowerCase();
  for (const cta of ctaPhrases) {
    if (lastSentences.includes(cta)) {
      violations.push(`Uppmaning i slutet: "${cta}" - avsluta med lÃ¤gesbeskrivning istÃ¤llet`);
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
  
  // === AI-FRASER SOM RIKTIGA MÃ„KLARE ALDRIG ANVÃ„NDER ===
  ["generÃ¶sa ytor", "stora ytor"],
  ["generÃ¶s takhÃ¶jd", "hÃ¶g takhÃ¶jd"],
  ["generÃ¶st tilltaget", "stort"],
  ["generÃ¶st med", "med"],
  ["bjuder pÃ¥ utsikt", "har utsikt"],
  ["bjuder pÃ¥", "har"],
  ["prÃ¤glas av lugn", "Ã¤r lugnt"],
  ["prÃ¤glas av", "har"],
  ["genomsyras av", "har"],
  ["andas lugn", "Ã¤r lugnt"],
  ["andas charm", "har karaktÃ¤r"],
  ["andas historia", "har originaldetaljer"],
  ["prÃ¤glad av", "med"],
  ["stor charm", "karaktÃ¤r"],
  ["strategiskt placerad", "centralt belÃ¤gen"],
  ["strategiskt lÃ¤ge", "centralt lÃ¤ge"],
  ["trivsamt boende", ""],
  ["trivsam bostad", ""],
  ["hÃ¤r finns", "det finns"],
  ["hÃ¤r kan du", ""],
  ["hÃ¤r bor du", ""],
  
  // === NYA FRASER FRÃ…N OUTPUT-TEST 2026-02 ===
  ["skapa minnen", ""],
  ["utmÃ¤rkt val fÃ¶r den som", ""],
  ["utmÃ¤rkt val", ""],
  ["gott om utrymme fÃ¶r lek och avkoppling", "stor tomt"],
  ["gott om utrymme", ""],
  ["lek och avkoppling", ""],
  ["natur och stadsliv", ""],
  ["bekvÃ¤mt boende", ""],
  ["rymligt intryck", ""],
  ["gÃ¶r det enkelt att umgÃ¥s", ""],
  ["gÃ¶r det enkelt att", ""],
  ["gÃ¶r det mÃ¶jligt att", ""],
  ["ett omrÃ¥de fÃ¶r familjer", ""],
  ["i mycket gott skick", "i gott skick"],
  ["ligger centralt i ett omrÃ¥de", ""],
  ["ligger centralt i", "ligger i"],
  
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
4. AnvÃ¤nd BARA fakta frÃ¥n rÃ¥data â€" lÃ¤gg ALDRIG till avstÃ¥nd, platser eller detaljer som inte stÃ¥r i rÃ¥data
5. Varje claim i skrivplanen MÃ…STE ha evidence frÃ¥n rÃ¥data

# KLASSIFICERING (baserat pÃ¥ rÃ¥data â€" hitta ALDRIG pÃ¥ nya fakta)

Kategorisera objektet utifrÃ¥n vad som FINNS i rÃ¥data:
- OmrÃ¥destyp (stadskÃ¤rna, villaomrÃ¥de, fÃ¶rort, etc) â€" baserat pÃ¥ adress/omrÃ¥de
- PrisnivÃ¥ (budget, standard, premium, luxury) â€" baserat pÃ¥ pris och kvm-pris
- MÃ¥lgrupp (fÃ¶rstagÃ¥ngskÃ¶pare, familjer, etablerade, downsizers) â€" baserat pÃ¥ storlek och lÃ¤ge
- VIKTIGT: LÃ¤gg INTE till kommunikationer, butiker eller avstÃ¥nd som inte stÃ¥r i rÃ¥data

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
      "area": "omrÃ¥desnamn frÃ¥n rÃ¥data",
      "municipality": "kommun frÃ¥n rÃ¥data",
      "character": "stadskÃ¤rna/villaomrÃ¥de/fÃ¶rort/etc",
      "price_level": "budget/standard/premium/luxury",
      "target_group": "baserat pÃ¥ storlek och lÃ¤ge",
      "transport": "BARA frÃ¥n rÃ¥data, annars null",
      "amenities": ["BARA platser nÃ¤mnda i rÃ¥data"],
      "services": ["BARA service nÃ¤mnd i rÃ¥data"],
      "parking": "frÃ¥n rÃ¥data eller null"
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

FÃ¶r BOTH: "i hjÃ¤rtat av", "hjÃ¤rtat av", "vilket gÃ¶r det enkelt", "vilket gÃ¶r det smidigt", "vilket gÃ¶r det lÃ¤tt", "rymlig kÃ¤nsla", "hÃ¤rlig plats fÃ¶r", "plats fÃ¶r avkoppling", "njutning av", "mÃ¶jlighet att pÃ¥verka", "forma framtiden", "vilket sÃ¤kerstÃ¤ller", "generÃ¶sa ytor", "generÃ¶s takhÃ¶jd", "bjuder pÃ¥", "prÃ¤glas av", "genomsyras av", "andas lugn", "andas charm", "erbjuder", "fantastisk", "perfekt", "drÃ¶mboende", "en sann pÃ¤rla", "VÃ¤lkommen", "HÃ¤r finns", "hÃ¤r kan du"

FÃ¶r BOOLI/EGEN SIDA: lÃ¤gg Ã¤ven in generiska bÃ¤rfraser som ofta gÃ¶r texten AI-mÃ¤ssig, t.ex. "fÃ¶r den som", "vilket ger en", "en bostad som", "ett hem som"

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

// === EXEMPELDATABAS â€" RIKSTÃ„CKANDE MÃ„KLARTEXTER ===
// Kategoriserade efter BOSTADSTYP + STORLEK (fungerar fÃ¶r ALLA stÃ¤der i Sverige)
const EXAMPLE_DATABASE: Record<string, {text: string, metadata: {type: string, rooms: number, size: number}}[]> = {
  // SMÃ… LÃ„GENHETER (1-2 rum, under 55 kvm)
  small_apartment: [
    {
      text: "Kyrkogatan 8, 3 tr, VÃ¤sterÃ¥s. Etta om 34 kvm med nymÃ¥lade vÃ¤ggar 2023.\n\nÃ–ppen planlÃ¶sning med kÃ¶k och vardagsrum i samma rum. KÃ¶ket har spis, kyl och frys. FÃ¶rvaring i vÃ¤ggskÃ¥p.\n\nLaminatgolv. FÃ¶nstren Ã¤r nya med bra ljusinslÃ¤pp.\n\nBadrummet Ã¤r helkaklat och renoverat 2022 med dusch, wc och handfat.\n\n5 minuter till tÃ¥gstationen. ICA Nära i kvarteret.",
      metadata: { type: "lÃ¤genhet", rooms: 1, size: 34 }
    },
    {
      text: "Andra LÃ¥nggatan 15, 2 tr, GÃ¶teborg. TvÃ¥a om 48 kvm med balkong mot gÃ¥rden.\n\nHallen har garderob. Vardagsrummet har tvÃ¥ fÃ¶nster och takhÃ¶jd 2,60 meter. Ekparkett genomgÃ¥ende.\n\nKÃ¶ket har vita luckor och vitvaror frÃ¥n Electrolux 2020. Plats fÃ¶r tvÃ¥ vid fÃ¶nstret.\n\nSovrummet rymmer dubbelsÃ¤ng. Badrummet Ã¤r helkaklat med dusch och tvÃ¤ttmaskin.\n\nBalkongen pÃ¥ 3 kvm vetter mot vÃ¤ster. Avgift 3 200 kr/mÃ¥n.\n\nSpÃ¥rvagn JÃ¤rntorget 2 minuter. Coop pÃ¥ Andra LÃ¥nggatan.",
      metadata: { type: "lÃ¤genhet", rooms: 2, size: 48 }
    }
  ],

  // MELLANSTORA LÃ„GENHETER (2-3 rum, 55-85 kvm)
  medium_apartment: [
    {
      text: "Drottninggatan 42, 4 tr, Uppsala. Trea om 74 kvm med genomgÃ¥ende planlÃ¶sning.\n\nHallen har garderob. Vardagsrummet mot gatan har tre fÃ¶nster och takhÃ¶jd 2,85 meter. Ekparkett genomgÃ¥ende.\n\nKÃ¶ket Ã¤r renoverat 2021 med luckor frÃ¥n BallingslÃ¶v och bÃ¤nkskiva i komposit. Vitvaror frÃ¥n Siemens. Plats fÃ¶r matbord vid fÃ¶nstret.\n\nSovrummet mot gÃ¥rden rymmer dubbelsÃ¤ng och har garderob. Det mindre rummet fungerar som arbetsrum. Badrummet Ã¤r helkaklat, renoverat 2019, med dusch och tvÃ¤ttmaskin.\n\nBalkongen pÃ¥ 5 kvm vetter mot sÃ¶der. BRF SolgÃ¥rden har stambyte 2018. Avgift 4 100 kr/mÃ¥n.\n\nCentralstationen 8 minuters promenad. ICA NÃ¤ra i kvarteret. Stadstradgarden 200 meter.",
      metadata: { type: "lÃ¤genhet", rooms: 3, size: 74 }
    },
    {
      text: "RÃ¶nnvÃ¤gen 12, 1 tr, MalmÃ¶. TvÃ¥a om 62 kvm med balkong i sÃ¶derlÃ¤ge.\n\nHallen har platsbyggd garderob. Vardagsrummet har stort fÃ¶nsterparti och takhÃ¶jd 2,55 meter. Laminatgolv genomgÃ¥ende.\n\nKÃ¶ket har bÃ¤nkskiva i laminat och vitvaror frÃ¥n Bosch 2022. Matplats fÃ¶r fyra vid fÃ¶nstret.\n\nSovrummet rymmer dubbelsÃ¤ng och har garderob med skjutdÃ¶rrar. Badrummet Ã¤r helkaklat med dusch, wc och tvÃ¤ttmaskin. GolvvÃ¤rme.\n\nBalkongen pÃ¥ 4 kvm vetter mot sÃ¶der. Avgift 3 650 kr/mÃ¥n.\n\nBuss 5 minuter till Triangeln. Coop 300 meter. Pildammsparken 10 minuters promenad.",
      metadata: { type: "lÃ¤genhet", rooms: 2, size: 62 }
    }
  ],

  // STORA LÃ„GENHETER (4+ rum, 85+ kvm)
  large_apartment: [
    {
      text: "KungsgÃ¤rdsgatan 7, 2 tr, Uppsala. Fyra om 105 kvm med balkong i vÃ¤sterlÃ¤ge.\n\nHallen har platsbyggd garderob och klinker. Vardagsrummet har tre fÃ¶nster och takhÃ¶jd 2,70 meter. Ekparkett genomgÃ¥ende.\n\nKÃ¶ket Ã¤r frÃ¥n Marbodal 2020 med stenbÃ¤nkskiva och vitvaror frÃ¥n Siemens. Plats fÃ¶r matbord fÃ¶r sex.\n\nHuvudsovrummet rymmer dubbelsÃ¤ng och har garderob. TvÃ¥ mindre sovrum. Badrummet Ã¤r helkaklat med badkar och dusch. Separat toalett.\n\nBalkongen pÃ¥ 8 kvm vetter mot vÃ¤ster. BRF Kungsparken har stambyte 2020. Avgift 5 800 kr/mÃ¥n.\n\nCentralstationen 5 minuter. Coop Forum 400 meter.",
      metadata: { type: "lÃ¤genhet", rooms: 4, size: 105 }
    }
  ],

  // VILLOR
  villa: [
    {
      text: "TallvÃ¤gen 8, Djursholm. Villa om 180 kvm pÃ¥ tomt om 920 kvm. ByggÃ¥r 1962, tillbyggd 2015.\n\nEntrÃ©plan har hall, vardagsrum med eldstad, kÃ¶k och ett sovrum. KÃ¶ket Ã¤r frÃ¥n HTH 2015 med bÃ¤nkskiva i granit och induktionshÃ¤ll. Vardagsrummet har utgÃ¥ng till altanen.\n\nÃ–vervÃ¥ningen har tre sovrum och badrum med badkar och golvvÃ¤rme. Huvudsovrummet har garderob och fÃ¶nster Ã¥t tvÃ¥ hÃ¥ll.\n\nKÃ¤llaren har tvÃ¤ttstuga, fÃ¶rrÃ¥d och ett extra rum. Altanen i vÃ¤sterlÃ¤ge Ã¤r 25 kvm med pergola. Dubbelgarage och uppfart fÃ¶r tvÃ¥ bilar.\n\nDjursholms samskola 600 meter. MÃ¶rby centrum 10 minuters promenad.",
      metadata: { type: "villa", rooms: 5, size: 180 }
    },
    {
      text: "BjÃ¶rkvÃ¤gen 14, LÃ¶ddeköpinge. Villa om 145 kvm pÃ¥ tomt om 750 kvm. ByggÃ¥r 1978, renoverad 2021.\n\nEntrÃ©plan har hall, vardagsrum, kÃ¶k och badrum. KÃ¶ket Ã¤r frÃ¥n IKEA 2021 med vitvaror frÃ¥n Bosch. Ã–ppen planlÃ¶sning mot vardagsrummet.\n\nÃ–vervÃ¥ningen har fyra sovrum. Badrummet Ã¤r helkaklat med dusch och badkar.\n\nTomten har grÃ¤smatta, stenlagd uteplats i sÃ¶derlÃ¤ge och garage. FÃ¶rrÃ¥d pÃ¥ 12 kvm.\n\nLÃ¶ddeköpinge skola 400 meter. Willys 5 minuters promenad. Malmö 15 minuter med bil.",
      metadata: { type: "villa", rooms: 5, size: 145 }
    },
    {
      text: "GranlundsvÃ¤gen 3, UmeÃ¥. Villa om 160 kvm pÃ¥ tomt om 1 100 kvm. ByggÃ¥r 1985.\n\nEntrÃ©plan har hall, vardagsrum, kÃ¶k och gÃ¤strum. KÃ¶ket har vitvaror frÃ¥n Electrolux och bÃ¤nkskiva i trÃ¤. Vardagsrummet har eldstad.\n\nÃ–vervÃ¥ningen har tre sovrum och badrum med badkar. Huvudsovrummet har garderob.\n\nKÃ¤llare med tvÃ¤ttstuga och fÃ¶rrÃ¥d. Tomten har garage, grÃ¤smatta och uteplats. BergvÃ¤rme.\n\nGrubbeskolan 300 meter. ICA Maxi 5 minuter med bil. E4:an 3 km.",
      metadata: { type: "villa", rooms: 5, size: 160 }
    }
  ],

  // RADHUS
  radhus: [
    {
      text: "SolnavÃ¤gen 23, Solna. Radhus om 120 kvm med 4 rum och kÃ¶k.\n\nBottenvÃ¥ningen har kÃ¶k och vardagsrum i Ã¶ppen planlÃ¶sning. KÃ¶ket Ã¤r frÃ¥n IKEA 2021 med vitvaror frÃ¥n Bosch. UtgÃ¥ng till trÃ¤dgÃ¥rden frÃ¥n vardagsrummet.\n\nÃ–vervÃ¥ningen har tre sovrum och badrum. Huvudsovrummet har walk-in-closet. Badrummet Ã¤r helkaklat med dusch. Laminatgolv genomgÃ¥ende.\n\nTrÃ¤dgÃ¥rden har grÃ¤smatta och uteplats i sÃ¶derlÃ¤ge. FÃ¶rrÃ¥d 10 kvm. Carport fÃ¶r tvÃ¥ bilar.\n\nSkola och fÃ¶rskola i promenadavstÃ¥nd. Matbutik 300 meter.",
      metadata: { type: "radhus", rooms: 4, size: 120 }
    },
    {
      text: "Ekbacken 5, Partille. Radhus om 110 kvm med 4 rum. ByggÃ¥r 1995.\n\nBottenvÃ¥ning med hall, kÃ¶k och vardagsrum. KÃ¶ket har vitvaror frÃ¥n Electrolux och laminatbÃ¤nk. UtgÃ¥ng till uteplats.\n\nÃ–vervÃ¥ning med tre sovrum och badrum med dusch. Laminatgolv genomgÃ¥ende.\n\nUteplats i sÃ¶derlÃ¤ge pÃ¥ 15 kvm. FÃ¶rrÃ¥d. P-plats.\n\nSkola 400 meter. ICA 5 minuter. SpÃ¥rvagn till GÃ¶teborg centrum 20 minuter.",
      metadata: { type: "radhus", rooms: 4, size: 110 }
    }
  ]
};

// --- HEMNET FORMAT: Sandwich-teknik fÃ¶r maximal AI-lydnad ---
const HEMNET_TEXT_PROMPT = `Du Ã¤r en svensk fastighetsmÃ¤klare. Skriv en Hemnet-annons OCH 4 extra marknadsföringstexter.

# KRITISKT â€" LÃ„S DETTA FÃ–RST

ALDRIG GÃ–R:
- BÃ¶rja med "VÃ¤lkommen", "HÃ¤r", "Denna" eller "I". BÃ¶rja ALLTID med gatuadressen.
- AnvÃ¤nd "erbjuder", "bjuder pÃ¥", "prÃ¤glas av", "generÃ¶s", "fantastisk", "perfekt", "idealisk", "drÃ¶m-", "en sann pÃ¤rla"
- AnvÃ¤nd "vilket", "som ger en", "fÃ¶r den som", "i hjÃ¤rtat av", "skapar en", "genomsyras"
- AnvÃ¤nd "kontakta oss", "boka visning", "missa inte", "unik mÃ¶jlighet"
- HITTA PÃ… fakta. Om mÃ¤rke/mÃ¥tt/Ã¥rtal/avstÃ¥nd inte finns i dispositionen â€" UTELÃ„MNA det.
- Skriva lÃ¥nga meningar med bisatser.
- Skriva sammanfattande/emotionella stycken i slutet. INGA "skapa minnen", "utmÃ¤rkt val", "bekvÃ¤mt boende", "lek och avkoppling". Sista stycket ska vara LÃ„GE eller PRIS â€" aldrig kÃ¤nslor.

ALLTID GÃ–R:
- BÃ¶rja med "Gatuadress, vÃ¥ning/ort. Typ om X kvm..."
- Korta meningar. En ny faktauppgift per mening. Ingen utfyllnad.
- AnvÃ¤nd EXAKTA vÃ¤rden frÃ¥n dispositionen: kvm, Ã¥rtal, mÃ¤rken, material.
- AnvÃ¤nd platser med NAMN och AVSTÅND om de finns i dispositionen.
- Skriv i presens.

# STRUKTUR FÃ–R OBJEKTBESKRIVNING

1. Ã–PPNING: Adress, vÃ¥ning, typ, kvm, rum.
2. PLANLÃ–SNING: Hall, vardagsrum, takhÃ¶jd, golv, ljus.
3. KÃ–K: MÃ¤rke, Ã¥rtal, bÃ¤nkskiva, vitvaror. Bara frÃ¥n dispositionen.
4. SOVRUM: Antal, storlek, garderober.
5. BADRUM: Ã…rtal, kakel, dusch/badkar, tvÃ¤ttmaskin.
6. BALKONG/UTEPLATS: Storlek kvm, vÃ¤derstreck.
7. FÃ–RENING: BRF-namn, avgift, stambyte â€" om det finns.
8. LÃ„GE: Platser med namn och avstÃ¥nd frÃ¥n dispositionen. HITTA INTE PÃ… platser.

Om info saknas fÃ¶r en punkt â€" HOPPA Ã–VER den.

# EXTRA TEXTER (generera ALLA frÃ¥n samma disposition)

RUBRIK (max 70 tecken): Gatuadress + typ + unik egenskap. Ex: "Birger Jarlsgatan 22 â€" Ljus trea med balkong i sÃ¶derlÃ¤ge"
INSTAGRAM (3-5 meningar): BÃ¶rja med gatunamnet. 2-3 sÃ¤ljpunkter. Avsluta med storlek. Inga emoji/utropstecken. LÃ¤gg till 5 hashtags pÃ¥ egen rad.
VISNINGSINBJUDAN (max 80 ord): BÃ¶rja "Visning â€" [adress]". Typ, storlek, 2 hÃ¶jdpunkter. Avsluta med "Tid: [TID]\\nPlats: [ADRESS]\\nAnmÃ¤lan: [KONTAKT]".
KORTANNONS (max 40 ord): Gatuadress, typ, kvm, 1-2 sÃ¤ljpunkter. FÃ¶r print/banner/Google Ads.

# OUTPUT (JSON)

{"highlights":["sÃ¤ljpunkt 1","sÃ¤ljpunkt 2","sÃ¤ljpunkt 3"],"improvedPrompt":"Objektbeskrivningen med stycken separerade av \\n\\n","headline":"Rubrik max 70 tecken","instagramCaption":"Instagram-text med hashtags","showingInvitation":"Visningsinbjudan-mejl","shortAd":"Kort annonstext max 40 ord","socialCopy":"Max 280 tecken","analysis":{"target_group":"MÃ¥lgrupp","area_advantage":"LÃ¤gesfÃ¶rdelar","pricing_factors":"VÃ¤rdehÃ¶jande faktorer"},"missing_info":["Saknad info"],"pro_tips":["Tips"]}

# PÃ…MINNELSE â€" VIKTIGAST

1. BÃ¶rja med gatuadressen. ALDRIG "VÃ¤lkommen" eller "HÃ¤r".
2. HITTA ALDRIG PÃ… fakta. Bara det som stÃ¥r i dispositionen.
3. Inga fÃ¶rbjudna ord: erbjuder, bjuder pÃ¥, prÃ¤glas av, generÃ¶s, fantastisk, perfekt, vilket, som ger en.
4. Korta meningar. Ingen utfyllnad. Varje mening = ny fakta.
5. Avsluta ALDRIG med uppmaning.
6. INGA emotionella slutstycken. Sista stycket = LÃ„GE eller PRIS.
7. Generera ALLA fÃ¤lt: headline, instagramCaption, showingInvitation, shortAd.`;

// --- BOOLI/EGEN SIDA: Sandwich-teknik fÃ¶r maximal AI-lydnad ---
const BOOLI_TEXT_PROMPT_WRITER = `Du Ã¤r en svensk fastighetsmÃ¤klare. Skriv en objektbeskrivning fÃ¶r Booli/egen sida OCH 4 extra marknadsföringstexter.

# KRITISKT â€" LÃ„S DETTA FÃ–RST

ALDRIG GÃ–R:
- BÃ¶rja med "VÃ¤lkommen", "HÃ¤r", "Denna" eller "I". BÃ¶rja ALLTID med gatuadressen.
- AnvÃ¤nd "erbjuder", "bjuder pÃ¥", "prÃ¤glas av", "generÃ¶s", "fantastisk", "perfekt", "idealisk", "drÃ¶m-", "en sann pÃ¤rla"
- AnvÃ¤nd "vilket", "som ger en", "fÃ¶r den som", "i hjÃ¤rtat av", "skapar en", "genomsyras"
- AnvÃ¤nd "kontakta oss", "boka visning", "missa inte", "unik mÃ¶jlighet"
- HITTA PÃ… fakta. Om mÃ¤rke/mÃ¥tt/Ã¥rtal/avstÃ¥nd inte finns i dispositionen â€" UTELÃ„MNA det.
- Skriva lÃ¥nga meningar med bisatser.
- Skriva sammanfattande/emotionella stycken i slutet. INGA "skapa minnen", "utmÃ¤rkt val", "bekvÃ¤mt boende", "lek och avkoppling". Sista stycket ska vara LÃ„GE eller PRIS â€" aldrig kÃ¤nslor.

ALLTID GÃ–R:
- BÃ¶rja med "Gatuadress, vÃ¥ning/ort. Typ om X kvm..."
- Korta meningar. En ny faktauppgift per mening. Ingen utfyllnad.
- AnvÃ¤nd EXAKTA vÃ¤rden frÃ¥n dispositionen: kvm, Ã¥rtal, mÃ¤rken, material.
- Inkludera ekonomi: avgift, utgÃ¥ngspris â€" om det finns i dispositionen.
- Skriv i presens.

# STRUKTUR FÃ–R OBJEKTBESKRIVNING (mer detaljerad Ã¤n Hemnet)

1. Ã–PPNING: Adress, vÃ¥ning, typ, kvm, rum.
2. PLANLÃ–SNING: Hall, vardagsrum, takhÃ¶jd, golv, ljus.
3. KÃ–K: MÃ¤rke, Ã¥rtal, bÃ¤nkskiva, vitvaror, matplats.
4. SOVRUM: Antal, storlek, garderober.
5. BADRUM: Ã…rtal, kakel, dusch/badkar, tvÃ¤ttmaskin.
6. BALKONG/UTEPLATS: Storlek kvm, vÃ¤derstreck.
7. EXTRA: FÃ¶rrÃ¥d, parkering, garage, uterum.
8. FÃ–RENING: BRF-namn, avgift, stambyte â€" om det finns.
9. LÃ„GE: Platser med namn och avstÃ¥nd frÃ¥n dispositionen. HITTA INTE PÃ… platser.
10. PRIS: UtgÃ¥ngspris om det finns.

Om info saknas fÃ¶r en punkt â€" HOPPA Ã–VER den.

# EXTRA TEXTER (generera ALLA frÃ¥n samma disposition)

RUBRIK (max 70 tecken): Gatuadress + typ + unik egenskap. Ex: "TallvÃ¤gen 8 â€" Villa med eldstad och dubbelgarage"
INSTAGRAM (3-5 meningar): BÃ¶rja med gatunamnet. 2-3 sÃ¤ljpunkter. Avsluta med storlek. Inga emoji/utropstecken. LÃ¤gg till 5 hashtags pÃ¥ egen rad.
VISNINGSINBJUDAN (max 80 ord): BÃ¶rja "Visning â€" [adress]". Typ, storlek, 2 hÃ¶jdpunkter. Avsluta med "Tid: [TID]\\nPlats: [ADRESS]\\nAnmÃ¤lan: [KONTAKT]".
KORTANNONS (max 40 ord): Gatuadress, typ, kvm, 1-2 sÃ¤ljpunkter. FÃ¶r print/banner/Google Ads.

# OUTPUT (JSON)

{"highlights":["sÃ¤ljpunkt 1","sÃ¤ljpunkt 2","sÃ¤ljpunkt 3"],"improvedPrompt":"Objektbeskrivningen med stycken separerade av \\n\\n","headline":"Rubrik max 70 tecken","instagramCaption":"Instagram-text med hashtags","showingInvitation":"Visningsinbjudan-mejl","shortAd":"Kort annonstext max 40 ord","socialCopy":"Max 280 tecken","analysis":{"target_group":"MÃ¥lgrupp","area_advantage":"LÃ¤gesfÃ¶rdelar","pricing_factors":"VÃ¤rdehÃ¶jande faktorer"},"missing_info":["Saknad info"],"pro_tips":["Tips"]}

# PÃ…MINNELSE â€" VIKTIGAST

1. BÃ¶rja med gatuadressen. ALDRIG "VÃ¤lkommen" eller "HÃ¤r".
2. HITTA ALDRIG PÃ… fakta. Bara det som stÃ¥r i dispositionen.
3. Inga fÃ¶rbjudna ord: erbjuder, bjuder pÃ¥, prÃ¤glas av, generÃ¶s, fantastisk, perfekt, vilket, som ger en.
4. Korta meningar. Ingen utfyllnad. Varje mening = ny fakta.
5. Avsluta ALDRIG med uppmaning.
6. INGA emotionella slutstycken. Sista stycket = LÃ„GE eller PRIS.
7. Generera ALLA fÃ¤lt: headline, instagramCaption, showingInvitation, shortAd.`;

// [Dead code removed: _UNUSED_BOOLI_TEXT_PROMPT + BOOLI_EXPERT_PROMPT â€” ~300 lines of unused prompts]
const _UNUSED_BOOLI_TEXT_PROMPT = `REMOVED`;
const BOOLI_EXPERT_PROMPT = `REMOVED`;

// Lokal exempelmatchning â€" enkel typ+storlek, fungerar fÃ¶r ALLA stÃ¤der i Sverige
function matchExamples(disposition: any, _toneAnalysis: any): string[] {
  const type = (disposition?.property?.type || 'lÃ¤genhet').toLowerCase();
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

// Bygg disposition direkt frÃ¥n strukturerad formulÃ¤rdata â€" HOPPA Ã–VER AI-extraktion
function buildDispositionFromStructuredData(pd: any): { disposition: any, tone_analysis: any, writing_plan: any } {
  const typeLabels: Record<string, string> = {
    apartment: "lÃ¤genhet", house: "villa", townhouse: "radhus", villa: "villa",
  };
  const propertyType = typeLabels[pd.propertyType] || pd.propertyType || "lÃ¤genhet";
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
      pd.kitchenDescription ? "kÃ¶k" : null,
      pd.balconyArea ? "balkong/uteplats" : null,
    ].filter(Boolean).slice(0, 3),
  };

  const writing_plan = {
    opening: `${pd.address} â€" ${propertyType} om ${size} kvm`,
    must_include: [
      pd.address && "adress", pd.livingArea && "storlek", pd.totalRooms && "rum",
      pd.kitchenDescription && "kÃ¶k", pd.bathroomDescription && "badrum",
      pd.balconyArea && "balkong", pd.area && "lÃ¤ge",
    ].filter(Boolean),
    forbidden_phrases: ["erbjuder", "perfekt fÃ¶r", "i hjÃ¤rtat av", "vilket", "fÃ¶r den som", "fantastisk", "vÃ¤lkommen"],
  };

  return { disposition, tone_analysis, writing_plan };
}

// Faktagranskning â€" ALDRIG omskrivning, bara rapportering
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

      // === OPTIMIZED PIPELINE ===
      const propertyData = req.body.propertyData;
      
      let disposition: any;
      let toneAnalysis: any;
      let writingPlan: any;

      if (propertyData && propertyData.address) {
        // SNABB VÃ„G: Strukturerad data frÃ¥n formulÃ¤ret â†' hoppa Ã¶ver AI-extraktion (0 API-anrop)
        console.log("[Step 1] FAST PATH: Using structured form data directly (skipping AI extraction)");
        const structured = buildDispositionFromStructuredData(propertyData);
        disposition = structured.disposition;
        toneAnalysis = structured.tone_analysis;
        writingPlan = structured.writing_plan;
        console.log("[Step 1] Structured disposition built from form data");
      } else {
        // FALLBACK: FÃ¶r gammal klient eller API-anrop utan propertyData
        console.log("[Step 1] FALLBACK: AI extraction from raw text...");
        
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
              { role: "user" as const, content: `RÃ…DATA: ${prompt}` },
            ],
            max_tokens: 3000,
            temperature: 0.1,
            response_format: { type: "json_object" },
          });
          const retryText = dispositionRetry.choices[0]?.message?.content || "{}";
          try {
            rawDisposition = safeJsonParse(retryText);
          } catch (e2) {
            return res.status(422).json({ message: "Kunde inte tolka data. FÃ¶rsÃ¶k igen." });
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
            `\n\nORDANTAL: ${targetWordMin}-${targetWordMax} ord` +
            "\n\n--- EXEMPEL PÃ… DÅLIGT vs BRA ---\n" +
            "DÅLIGT: \"Välkommen till denna fantastiska lägenhet som erbjuder generösa ytor och en ljus atmosfär, vilket gör det till ett perfekt hem för den som söker ett drömboende i hjärtat av staden.\"\n" +
            "BRA: \"Storgatan 12, 3 tr, Linköping. Trea om 76 kvm med balkong i söderläge. Ekparkett genomgående. Takhöjd 2,70 meter.\"\n\n" +
            "DÅLIGT: \"Köket präglas av moderna material och bjuder på generös arbetsyta, vilket skapar en härlig plats för matlagning.\"\n" +
            "BRA: \"Köket är renoverat 2021 med luckor från Ballingslöv och bänkskiva i komposit. Vitvaror från Siemens. Plats för matbord vid fönstret.\"\n\n" +
            "DÅLIGT: \"Kontakta oss för visning av detta unika hem.\"\n" +
            "BRA: (Avsluta med läge-info, ALDRIG med uppmaning)\n\n" +
            "DÅLIGT: \"Den öppna planlösningen gör det enkelt att umgås och skapa minnen. Den stora tomten har gott om utrymme för lek och avkoppling. Med närhet till natur och stadsliv är detta ett utmärkt val för den som söker ett bekvämt boende.\"\n" +
            "BRA: (Avsluta med fakta om LÄGE eller PRIS — ALDRIG med emotionella sammanfattningar)\n" +
            "\n--- REGLER ---\n" +
            "1. Börja med gatuadress — ALDRIG 'Välkommen' eller 'Här'\n" +
            "2. Använd BARA fakta från dispositionen — HITTA ALDRIG PÅ\n" +
            "3. Korta meningar. Varje mening = ny fakta. Ingen utfyllnad.\n" +
            "4. FÖRBJUDET: erbjuder, bjuder på, präglas av, generös, fantastisk, perfekt, vilket, som ger en, för den som, i hjärtat av, drömboende, skapa minnen, utmärkt val, bekvämt boende, gott om utrymme\n" +
            "5. Skriv i samma stil som exempeltexterna\n" +
            "6. Avsluta ALDRIG med uppmaning eller emotionellt slutstycke\n" +
            "7. Sista stycket ska vara LÄGE eller PRIS — aldrig känslor\n" +
            "\n--- VIKTIGAST (läs detta sist) ---\n" +
            "Börja med gatuadressen. HITTA INTE PÅ fakta. Inga förbjudna ord. Korta meningar. Sista stycket = LÄGE eller PRIS. Aldrig emotionell sammanfattning.",
        },
      ];

      const textCompletion = await openai.chat.completions.create({
        model: aiModel,
        messages: textMessages,
        max_tokens: 4000,
        temperature: 0.25,
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
              content: `Du Ã¤r en textredaktÃ¶r. Fixa BARA de listade felen. Ã„ndra sÃ¥ lite som mÃ¶jligt.

ERSÃ„TTNINGAR:
- "erbjuder"/"erbjuds" â†' "har"
- "bjuder pÃ¥" â†' "har"
- "prÃ¤glas av"/"genomsyras av" â†' "har"
- "generÃ¶s"/"generÃ¶sa"/"generÃ¶st" â†' ta bort, anvÃ¤nd exakt mÃ¥tt istÃ¤llet
- "fantastisk"/"perfekt"/"idealisk"/"underbar"/"magisk" â†' ta bort helt
- "vilket"/"som ger en"/"fÃ¶r den som" â†' dela upp i tvÃ¥ korta meningar
- "i hjÃ¤rtat av" â†' "centralt i" eller "i"
- "VÃ¤lkommen"/"HÃ¤r" i bÃ¶rjan â†' bÃ¶rja med gatuadressen
- "kontakta oss"/"boka visning" â†' ta bort hela meningen
- "drÃ¶mboende"/"drÃ¶mhem"/"en sann pÃ¤rla" â†' ta bort helt

REGLER:
- Om texten Ã¤r fÃ¶r kort: lÃ¤gg till fakta frÃ¥n dispositionen. Korta meningar.
- HITTA ALDRIG PÃ… fakta.
- Ã„NDRA ALDRIG meningar utan fel.

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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system" as const,
            content: `Du är en svensk fastighetsmäklare och textredaktör. Du ska skriva om EN specifik del av en objektbeskrivning.

REGLER:
- Skriv om BARA den markerade texten enligt instruktionen.
- Behåll samma stil och ton som resten av texten.
- HITTA ALDRIG PÅ fakta som inte finns i originaltexten.
- Inga förbjudna ord: erbjuder, fantastisk, perfekt, vilket, som ger en, för den som, i hjärtat av.
- Korta meningar. Presens. Ingen utfyllnad.
- Svara med JSON: {"rewritten": "den omskrivna texten"}`,
          },
          {
            role: "user" as const,
            content: `HELA TEXTEN (för kontext):\n${fullText}\n\nMARKERAD TEXT ATT SKRIVA OM:\n"${selectedText}"\n\nINSTRUKTION: ${instruction}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.25,
        response_format: { type: "json_object" },
      });

      const raw = rewriteCompletion.choices[0]?.message?.content || "{}";
      let parsed: any;
      try { parsed = JSON.parse(raw); } catch { parsed = { rewritten: selectedText }; }

      const rewritten = cleanForbiddenPhrases(parsed.rewritten || selectedText);
      const newFullText = fullText.replace(selectedText, rewritten);

      res.json({ rewritten, newFullText });
    } catch (err: any) {
      console.error("Rewrite error:", err);
      res.status(500).json({ message: err.message || "Omskrivning misslyckades" });
    }
  });

  // ── ADDRESS LOOKUP: Auto-fill nearby places ──
  app.post("/api/address-lookup", requireAuth, async (req, res) => {
    try {
      const { address } = req.body;
      if (!address) return res.status(400).json({ message: "Adress krävs" });

      const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

      if (googleApiKey) {
        // Google Places: geocode → nearby search
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ", Sverige")}&key=${googleApiKey}`
        );
        const geoData = await geoRes.json() as any;
        const location = geoData.results?.[0]?.geometry?.location;

        if (!location) {
          return res.json({ places: [], message: "Adressen kunde inte hittas" });
        }

        const types = [
          { type: "transit_station", label: "Kollektivtrafik" },
          { type: "school", label: "Skola" },
          { type: "supermarket", label: "Matbutik" },
          { type: "park", label: "Park" },
          { type: "restaurant", label: "Restaurang" },
        ];

        const places: any[] = [];
        for (const { type, label } of types) {
          const nearbyRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=1500&type=${type}&key=${googleApiKey}&language=sv`
          );
          const nearbyData = await nearbyRes.json() as any;
          const first = nearbyData.results?.[0];
          if (first) {
            const dist = haversineDistance(
              location.lat, location.lng,
              first.geometry.location.lat, first.geometry.location.lng
            );
            places.push({
              name: first.name,
              type: label,
              distance: dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`,
              distanceMeters: Math.round(dist),
            });
          }
        }

        const formattedAddress = geoData.results?.[0]?.formatted_address || address;
        const transport = places
          .filter((p: any) => p.type === "Kollektivtrafik")
          .map((p: any) => `${p.name} ${p.distance}`)
          .join(", ") || null;
        const neighborhood = places
          .filter((p: any) => p.type !== "Kollektivtrafik")
          .slice(0, 4)
          .map((p: any) => `${p.name} (${p.type.toLowerCase()}) ${p.distance}`)
          .join(". ") || null;

        res.json({ formattedAddress, places, transport, neighborhood });
      } else {
        // Fallback: Use OpenAI to generate likely nearby places based on address knowledge
        const aiRes = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system" as const,
              content: `Du är en svensk stadsplaneringsexpert. Baserat på en adress i Sverige, ange troliga närliggande platser. BARA platser du är SÄKER på existerar nära adressen. Om du inte vet — svara med tomma arrays.

Svara med JSON:
{"transport":"Närmaste kollektivtrafik med ungefärligt avstånd","neighborhood":"Närmaste butiker, skolor, parker med ungefärligt avstånd","places":[{"name":"Platsnamn","type":"Typ","distance":"Avstånd"}]}`,
            },
            { role: "user" as const, content: `Adress: ${address}, Sverige` },
          ],
          max_tokens: 500,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });

        const raw = aiRes.choices[0]?.message?.content || "{}";
        let parsed: any;
        try { parsed = JSON.parse(raw); } catch { parsed = { places: [] }; }
        res.json({
          formattedAddress: address,
          places: parsed.places || [],
          transport: parsed.transport || null,
          neighborhood: parsed.neighborhood || null,
          source: "ai-estimated",
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
