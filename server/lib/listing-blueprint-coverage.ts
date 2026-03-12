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
    const numberHit = numbers.length === 0 || numbers.some((num) => normalizedText.includes(num));
    const matches = keywordHits >= Math.max(1, Math.min(2, keywords.length)) && numberHit;
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
