function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function extractKeywords(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 4)
    .slice(0, 6);
}

function extractNumbers(value: string): string[] {
  return (value.match(/\d+/g) || []).slice(0, 4);
}

const SWEDISH_NUMBER_WORDS: Record<number, string[]> = {
  1: ["ett", "en", "första"],
  2: ["två", "andra"],
  3: ["tre", "tredje"],
  4: ["fyra", "fjärde"],
  5: ["fem", "femte"],
  6: ["sex", "sjätte"],
  7: ["sju", "sjunde"],
  8: ["åtta", "åttonde"],
  9: ["nio", "nionde"],
  10: ["tio", "tionde"],
  11: ["elva", "elfte"],
  12: ["tolv", "tolfte"],
};

function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${word}(?=[^\\p{L}\\p{N}]|$)`, "u").test(text);
}

function hasExpectedNumberMention(text: string, expectedNumber: string): boolean {
  if (new RegExp(`\\b${expectedNumber}\\b`, "u").test(text)) return true;
  const expected = Number(expectedNumber);
  if (!Number.isFinite(expected)) return false;
  const words = SWEDISH_NUMBER_WORDS[expected] || [];
  return words.some((word) => hasWord(text, word));
}

export interface BlueprintCoverageResult {
  required: number;
  matched: number;
  ratio: number;
  missing: string[];
}

export function evaluateBlueprintCoverage(text: string, requiredFacts: string[]): BlueprintCoverageResult {
  const normalizedText = normalize(text);
  const factList = Array.isArray(requiredFacts) ? requiredFacts.filter((item) => typeof item === "string" && item.trim().length > 0) : [];
  const missing: string[] = [];

  for (const fact of factList) {
    const keywords = extractKeywords(fact);
    const numbers = extractNumbers(fact);
    const keywordHits = keywords.filter((keyword) => normalizedText.includes(keyword)).length;
    const numberHit = numbers.length === 0 || numbers.some((num) => hasExpectedNumberMention(normalizedText, num));
    const requiredKeywordHits = keywords.length === 0 ? 0 : Math.max(1, Math.min(2, keywords.length));
    const matches = keywordHits >= requiredKeywordHits && numberHit;
    if (!matches) {
      missing.push(fact);
    }
  }

  const required = factList.length;
  const matched = Math.max(0, required - missing.length);
  const ratio = required === 0 ? 1 : Number((matched / required).toFixed(3));

  return {
    required,
    matched,
    ratio,
    missing: missing.slice(0, 8),
  };
}
