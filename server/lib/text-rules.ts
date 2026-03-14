export type WritingStyle = "factual" | "balanced" | "selling";
export type TargetPlatform = "hemnet" | "booli" | "general";

export const FORBIDDEN_PHRASES = [
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

  // Överanvända AI-fraser i interna kvalitetstester
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

const BALANCED_EXEMPT = new Set([
  "genomtänkt", "smakfullt", "stilfullt", "elegant",
  "attraktivt läge", "naturskönt läge", "populärt område", "familjevänligt område",
  "hög standard",
  "ljus och luftig", "ljust och luftigt",
  "trivsamt boende", "trivsam bostad",
  "rofyllt", "rofylld",
  "genomtänkt planlösning", "smakfullt renoverat", "stilfullt renoverat",
]);

const SELLING_EXEMPT = new Set([
  ...Array.from(BALANCED_EXEMPT),
  "fantastisk", "fantastiskt", "underbar", "imponerande",
  "exklusivt", "lyxigt", "magnifikt", "praktfullt",
  "stilren", "noggrant utvalt", "noggrant utvalda", "omsorgsfullt",
  "en sann pärla",
  "stilrent och modernt", "stilren och modern",
  "modernt och stilrent", "elegant och tidlös", "tidlös och elegant",
  "mysigt och ombonat", "charmigt och välplanerat",
  "praktiskt och snyggt", "fräscht och modernt",
  "trivsam atmosfär", "härlig atmosfär", "mysig atmosfär",
  "inbjudande atmosfär", "luftig atmosfär", "luftig och",
  "stor charm", "med sin charm", "med mycket charm", "charm",
  "drömboende", "drömlägenhet", "drömhem",
  "eftertraktat område", "barnvänligt område",
  "natursköna omgivningar", "en pärla",
  "attraktivt med närhet",
  "hög kvalitet", "livsstil", "livskvalitet",
  "extra komfort", "maximal komfort",
  "trygg boendemiljö", "trygg boendeekonomi", "tryggt boende",
  "inbjuder till", "bjuder in till", "inspirerar till",
  "sociala sammanhang", "sociala tillställningar",
  "omsorgsfullt renoverat", "smakfullt inrett",
  "exklusivt utförande", "lyxigt badrum", "imponerande takhöjd",
]);

export function getExemptPhrases(style: WritingStyle): Set<string> {
  switch (style) {
    case "selling": return SELLING_EXEMPT;
    case "balanced": return BALANCED_EXEMPT;
    case "factual": return new Set();
  }
}

type EvidenceSource = "golden_examples" | "pipeline_tests" | "platform_reality_audit" | "broker_audit_feedback";
type EvidenceStrength = "high" | "medium";

interface PhraseEvidenceEntry {
  phrase: string;
  strength: EvidenceStrength;
  sources: EvidenceSource[];
}

const PLATFORM_CLICHE_WEIGHTS: Record<string, Partial<Record<TargetPlatform, number>>> = {
  "inbjuder till": { hemnet: 2, booli: 1, general: 1 },
  "bjuder in till": { hemnet: 2, booli: 1, general: 1 },
  "inspirerar till": { hemnet: 2, booli: 1, general: 1 },
  "utstrålar": { hemnet: 2, booli: 1, general: 1 },
  "ger en känsla av": { hemnet: 2, booli: 1, general: 1 },
  "skapar en känsla av": { hemnet: 2, booli: 1, general: 1 },
  "detta gör bostaden till": { hemnet: 2, booli: 1, general: 1 },
  "detta gör lägenheten till": { hemnet: 2, booli: 1, general: 1 },
  "detta gör villan till": { hemnet: 2, booli: 1, general: 1 },
  "ett hem att trivas i": { hemnet: 2, booli: 1, general: 1 },
  "sammanfattningsvis": { hemnet: 2, booli: 1, general: 1 },
  "kort sagt": { hemnet: 2, booli: 1, general: 1 },
  "allt sammantaget": { hemnet: 2, booli: 1, general: 1 },
  "missa inte": { hemnet: 3, booli: 3, general: 3 },
  "kontakta oss": { hemnet: 3, booli: 3, general: 3 },
  "för mer information": { hemnet: 3, booli: 3, general: 3 },
  "välkommen till": { hemnet: 3, booli: 3, general: 3 },
  "erbjuder": { hemnet: 3, booli: 3, general: 3 },
  "bjuder på": { hemnet: 3, booli: 3, general: 3 },
  "präglas av": { hemnet: 3, booli: 3, general: 3 },
  "genomsyras av": { hemnet: 3, booli: 3, general: 3 },
};

const ACCEPTED_BROKER_LANGUAGE_EVIDENCE: PhraseEvidenceEntry[] = [
  { phrase: "renoverat kök", strength: "high", sources: ["golden_examples", "pipeline_tests"] },
  { phrase: "helkaklat badrum", strength: "high", sources: ["golden_examples", "pipeline_tests"] },
  { phrase: "stabil förening", strength: "high", sources: ["golden_examples", "platform_reality_audit"] },
  { phrase: "avgift", strength: "high", sources: ["golden_examples", "platform_reality_audit"] },
  { phrase: "boarea", strength: "high", sources: ["platform_reality_audit", "pipeline_tests"] },
  { phrase: "antal rum", strength: "high", sources: ["platform_reality_audit", "pipeline_tests"] },
  { phrase: "balkong i söderläge", strength: "high", sources: ["golden_examples", "pipeline_tests"] },
  { phrase: "uteplats i söderläge", strength: "high", sources: ["golden_examples", "pipeline_tests"] },
  { phrase: "smidig pendling", strength: "high", sources: ["golden_examples", "platform_reality_audit"] },
  { phrase: "närhet till service", strength: "high", sources: ["golden_examples", "platform_reality_audit"] },
  { phrase: "kommunikationer", strength: "high", sources: ["platform_reality_audit", "pipeline_tests"] },
  { phrase: "vardagslogistik", strength: "medium", sources: ["golden_examples", "broker_audit_feedback"] },
  { phrase: "genomtänkt planlösning", strength: "medium", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "ljus och luftig", strength: "medium", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "hög standard", strength: "medium", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "attraktivt läge", strength: "medium", sources: ["pipeline_tests", "broker_audit_feedback"] },
];

const CLICHE_LANGUAGE_EVIDENCE: PhraseEvidenceEntry[] = [
  { phrase: "välkommen till", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "erbjuder", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "bjuder på", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "präglas av", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "genomsyras av", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "för den som", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "i hjärtat av", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "skapar en känsla av", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "missa inte", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "unik chans", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "stadens puls", strength: "high", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "ett hem att trivas i", strength: "medium", sources: ["pipeline_tests", "broker_audit_feedback"] },
  { phrase: "drömboende", strength: "medium", sources: ["pipeline_tests", "broker_audit_feedback"] },
];

const ALWAYS_BLOCKED_BY_EVIDENCE = new Set([
  "välkommen till",
  "erbjuder",
  "erbjuds",
  "bjuder på",
  "präglas av",
  "genomsyras av",
  "för den som",
  "i hjärtat av",
  "missa inte",
  "unik chans",
  "stadens puls",
  "kontakta oss",
  "för mer information",
]);

function normalizePhrase(phrase: string): string {
  return phrase.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePlatform(platform?: string): TargetPlatform {
  const normalized = String(platform || "hemnet").trim().toLowerCase();
  if (normalized === "booli") return "booli";
  if (normalized === "general") return "general";
  return "hemnet";
}

function getPhrasePlatformWeight(phrase: string, platform?: string): number {
  const normalizedPhrase = normalizePhrase(phrase);
  if (!normalizedPhrase) return 0;
  const platformKey = normalizePlatform(platform);
  const explicitWeight = PLATFORM_CLICHE_WEIGHTS[normalizedPhrase]?.[platformKey];
  if (typeof explicitWeight === "number") return explicitWeight;
  return 2;
}

function getStrengthScore(strength: EvidenceStrength): number {
  return strength === "high" ? 2 : 1;
}

export function getBrokerLanguageEvidenceSnapshot(style: WritingStyle, platform?: string): {
  accepted: PhraseEvidenceEntry[];
  cliches: PhraseEvidenceEntry[];
} {
  const exempt = getExemptPhrases(style);
  const platformKey = normalizePlatform(platform);
  const accepted = ACCEPTED_BROKER_LANGUAGE_EVIDENCE.filter((entry) => style !== "factual" || !exempt.has(normalizePhrase(entry.phrase)));
  const cliches = CLICHE_LANGUAGE_EVIDENCE
    .filter((entry) => style === "factual" || shouldBlockPhraseForStyle(entry.phrase, style, platformKey))
    .sort((a, b) => {
      const weightDelta = getPhrasePlatformWeight(b.phrase, platformKey) - getPhrasePlatformWeight(a.phrase, platformKey);
      if (weightDelta !== 0) return weightDelta;
      return getStrengthScore(b.strength) - getStrengthScore(a.strength);
    });
  return { accepted, cliches };
}

export function shouldBlockPhraseForStyle(phrase: string, style: WritingStyle, platform?: string): boolean {
  const normalized = normalizePhrase(phrase);
  if (!normalized) return false;
  if (ALWAYS_BLOCKED_BY_EVIDENCE.has(normalized)) return true;
  const exempt = getExemptPhrases(style);
  if (exempt.has(normalized)) return false;
  const weight = getPhrasePlatformWeight(normalized, platform);
  if (style === "factual") return weight > 0;
  if (style === "balanced") return weight >= 1;
  return weight >= 2;
}

export function countEvidenceBackedBlockedPhrases(style: WritingStyle, platform?: string): number {
  return FORBIDDEN_PHRASES.reduce((count, phrase) => {
    const normalized = normalizePhrase(phrase);
    if (!normalized) return count;
    return shouldBlockPhraseForStyle(normalized, style, platform) ? count + 1 : count;
  }, 0);
}

export function buildBrokerLanguagePolicyPrompt(style: WritingStyle, platform?: string): string {
  const platformKey = normalizePlatform(platform);
  const { accepted, cliches } = getBrokerLanguageEvidenceSnapshot(style, platformKey);
  const acceptedTop = accepted.slice(0, 8).map((entry) => entry.phrase);
  const clicheTop = cliches.slice(0, 8).map((entry) => entry.phrase);

  return [
    "SPRÅKPOLICY (EVIDENSBASERAD):",
    "- Skriv som publicerad svensk mäklare: konkret, verifierbar och köparrelevant prosa.",
    `- Plattformsviktning: ${platformKey} (hårdast filtrering på Hemnet, mer berättande tillåtet på Booli/Egen sida när fakta förblir konkreta).`,
    `- Prioriterade accepterade uttryck (${style}, ${platformKey}): ${acceptedTop.join(", ")}.`,
    `- Högprioriterade klyschor att undvika (${style}, ${platformKey}): ${clicheTop.join(", ")}.`,
    "- Om ett uttryck är abstrakt måste det följas av konkret fakta i samma eller nästa mening.",
  ].join("\n");
}
