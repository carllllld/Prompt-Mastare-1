export type WritingStyle = "factual" | "balanced" | "selling";
export type TargetPlatform = "hemnet" | "booli" | "general";

// RACIONALISERAD: 32 phrases. Endast verkliga AI-klyschor som en erfaren mäklare ALDRIG skulle skriva.
// Legitim mäklarvokabulär är TILLÅTEN (t.ex. "smidig pendling", "populärt område", "ljust").
export const FORBIDDEN_PHRASES = [
  // === KRITISKA AI-ÖPPNINGAR (endast AI använder dessa) ===
  "välkommen till",
  "välkommen hem",
  "här möts du",
  "här erbjuds",
  "nu finns chansen",
  "missa inte",
  "unik möjlighet",
  "unik chans",
  "kan erbjuda",
  "kan bjuda på",
  "perfekt för",
  "den perfekta",
  "det perfekta hemmet",

  // === EMOTIONELLA AI-VERB (aldrig i riktig mäklartext) ===
  "andas lugn",
  "andas charm",
  "andas historia",
  "utstrålar",
  "präglas av",
  "genomsyras av",

  // === AI-KÄNSLOSSPRÅK ===
  "ger en känsla av",
  "skapar en känsla av",
  "skapa minnen",

  // === AI-MÅLGRUPPSTEMPLATES ===
  "för den som",
  "om du är den som",

  // === POETISK AI-ÖVERDRIFT ===
  "i hjärtat av",
  "hjärtat av",
  "husets hjärta",

  // === ÖVERDRIVNA ADJEKTIV (endast AI använder dessa i överdrift) ===
  "fantastisk bostad",
  "underbar bostad",
  "magisk",
  "otrolig utsikt",
  "drömhem",

  // === AI-SLUTSATSFRASER ===
  "allt sammantaget",
  "sammanfattningsvis",
  "detta gör bostaden till",
  "detta gör villan till",
];

// === HEMNET-SPECIFIKA REGLER ===
// Hemnet tillåter INTE ekonomihänvisningar eller pris/avgift i objektbeskrivningen
export const HEMNET_FORBIDDEN_PATTERNS = [
  // Ekonomihänvisningar
  { pattern: /ekonomi.*redovisas/gi, message: "Ekonomihänvisning inte tillåten i objektbeskrivning" },
  { pattern: /se.*ekonomi.*fält/gi, message: "Hänvisning till ekonomifält inte tillåten" },
  { pattern: /pris.*avgift.*drift/gi, message: "Ekonomisk information ska endast stå i dedikerade fält" },
  { pattern: /läs mer.*ekonomi/gi, message: "Ekonomihänvisning inte tillåten" },
  
  // Avgift i löptext (Hemnet-regel: endast i dedikerat fält)
  { pattern: /\d+\s*kr\/mån/gi, message: "Avgift får inte stå i objektbeskrivning" },
  { pattern: /\d+\s*kronor.*månad/gi, message: "Avgift får inte stå i objektbeskrivning" },
  { pattern: /månadsavgift.*\d+/gi, message: "Avgift får inte stå i objektbeskrivning" },
  
  // Pris i löptext
  { pattern: /\d+\s*mkr/gi, message: "Pris får inte stå i objektbeskrivning" },
  { pattern: /\d+\s*miljoner/gi, message: "Pris får inte stå i objektbeskrivning" },
  { pattern: /utgångspris.*\d+/gi, message: "Pris får inte stå i objektbeskrivning" }
];

// === OTYDLIGA PÅSTÅENDEN SOM KRÄVER BEVIS ===
export const UNVERIFIABLE_CLAIMS = [
  { claim: "i nyskick", requiresEvidence: "renoveringsår för hela bostaden eller besiktning" },
  { claim: "mycket gott skick", requiresEvidence: "specifika renoveringar eller besiktning" },
  { claim: "fräscht", requiresEvidence: "renoveringsår eller målning" },
  { claim: "välskött", requiresEvidence: "underhållshistorik eller besiktning" },
  { claim: "genomgående fint skick", requiresEvidence: "besiktning eller omfattande renovering" },
  { claim: "toppskick", requiresEvidence: "renoveringsår eller besiktning" },
  { claim: "perfekt skick", requiresEvidence: "renoveringsår eller besiktning" }
];

const BALANCED_EXEMPT = new Set([
  // Legitimate broker language that's allowed in balanced style
  "genomtänkt", "smakfullt", "stilfullt", "elegant",
  "attraktivt läge", "naturskönt läge", "populärt område", "familjevänligt område",
  "hög standard", "hög kvalitet",
  "ljus och luftig", "ljust och luftigt",
  "trivsamt boende", "trivsam bostad",
  "genomtänkt planlösning", "smakfullt renoverat", "stilfullt renoverat",
  "rymlig känsla", "rymligt intryck",
  "attraktivt med närhet",
  "är en bra plats", "är en bra plats för",
  "bekvämt boende",
  "njutning av", "njut av",
  "förvaringsmöjligheter", "parkeringsmöjligheter",
  // Accepted broker language from ACCEPTED_BROKER_LANGUAGE_EVIDENCE
  "kommunikationer",
  "smidig pendling",
  "närhet till service",
  "i mycket gott skick",
  "gott om utrymme",
  "ligger centralt i",
  "det finns även",
  "det finns också",
  // Mild hyperbole acceptable in balanced style (not AI-clichés)
  "magisk", "otrolig",
]);

const SELLING_EXEMPT = new Set([
  ...Array.from(BALANCED_EXEMPT),
  // Additional phrases allowed in selling style
  "fantastisk", "fantastiskt", "underbar",
  "stilren",
  "en sann pärla",
  "drömboende", "drömlägenhet", "drömhem",
  // More expressive language acceptable in selling style
  "unik möjlighet",
  "välkommen hem",
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
  { phrase: "i mycket gott skick", strength: "medium", sources: ["platform_reality_audit", "broker_audit_feedback"] },
  { phrase: "gott om utrymme", strength: "medium", sources: ["platform_reality_audit", "broker_audit_feedback"] },
  { phrase: "ligger centralt i", strength: "medium", sources: ["platform_reality_audit", "broker_audit_feedback"] },
  { phrase: "natur och stadsliv", strength: "medium", sources: ["platform_reality_audit", "broker_audit_feedback"] },
  { phrase: "det finns även", strength: "medium", sources: ["platform_reality_audit", "broker_audit_feedback"] },
  { phrase: "det finns också", strength: "medium", sources: ["platform_reality_audit", "broker_audit_feedback"] },
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
