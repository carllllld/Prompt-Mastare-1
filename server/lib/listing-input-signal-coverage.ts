function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function extractWords(value: string): string[] {
  return normalize(value).split(" ").filter((token) => token.length >= 4).slice(0, 6);
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

function parseExpectedNumber(value: string): number | null {
  const digitMatch = value.match(/\d+/);
  if (digitMatch) {
    const num = Number(digitMatch[0]);
    return Number.isFinite(num) ? num : null;
  }
  const normalized = normalize(value);
  for (const [num, words] of Object.entries(SWEDISH_NUMBER_WORDS)) {
    if (words.some((word) => new RegExp(`\\b${word}\\b`, "u").test(normalized))) {
      return Number(num);
    }
  }
  return null;
}

function hasExpectedNumberMention(text: string, expected: number): boolean {
  if (new RegExp(`\\b${expected}\\b`, "u").test(text)) return true;
  const words = SWEDISH_NUMBER_WORDS[expected] || [];
  return words.some((word) => new RegExp(`\\b${word}\\b`, "u").test(text));
}

function mentionsSize(text: string, sourceValue: string): boolean {
  const expected = parseExpectedNumber(sourceValue);
  const hasAreaSignal = /\b(kvm|m2|m²|boarea|kvadrat(?:meter)?)\b/u.test(text);
  if (expected === null) return hasAreaSignal;
  return hasAreaSignal && hasExpectedNumberMention(text, expected);
}

function mentionsRooms(text: string, sourceValue: string): boolean {
  const expected = parseExpectedNumber(sourceValue);
  const hasRoomSignal = /\b(rum|rok|sovrum|sovrummen)\b/u.test(text);
  if (expected === null) return hasRoomSignal;
  return hasRoomSignal && hasExpectedNumberMention(text, expected);
}

function mentionsKitchen(text: string): boolean {
  return /\b(kök|köket|köks)\b/u.test(text);
}

function mentionsBathroom(text: string): boolean {
  return /\b(badrum|badrummet|wc|toalett|gästwc|gäst-wc)\b/u.test(text);
}

function mentionsTransport(text: string): boolean {
  return /\b(kommunikation|kommunikationer|buss|t-bana|tbana|pendeltåg|spårvagn|resecentrum|centralstation|station)\b/u.test(text);
}

function looksInformative(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return Number.isFinite(value) && value > 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^(okänd|n\/a|na|null|undefined)$/i.test(trimmed)) return false;
    return true;
  }
  return false;
}

function matchesSignal(text: string, value: string): boolean {
  const words = extractWords(value);
  const numbers = extractNumbers(value);
  const keywordHits = words.filter((word) => text.includes(word)).length;
  const numberHit = numbers.length === 0 || numbers.some((num) => text.includes(num));
  if (words.length === 0) return numberHit;
  const requiredKeywordHits = words.length >= 4 ? 2 : 1;
  return keywordHits >= requiredKeywordHits && numberHit;
}

function toSignalEntries(source: any): Array<{ path: string; value: string }> {
  const entries: Array<{ path: string; value: string }> = [];

  const walk = (node: any, path: string[]) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      const scalarItems = node.filter((item) => typeof item === "string" || typeof item === "number");
      if (scalarItems.length > 0) {
        entries.push({ path: path.join("."), value: scalarItems.join(", ") });
      }
      return;
    }
    if (typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        walk(value, [...path, key]);
      }
      return;
    }
    if (looksInformative(node)) {
      entries.push({ path: path.join("."), value: String(node) });
    }
  };

  walk(source, []);
  return entries
    .filter((entry) => entry.path.length > 0 && entry.value.length <= 160)
    .slice(0, 80);
}

export interface InputSignalCoverageSummary {
  totalSignals: number;
  usedSignals: number;
  ratio: number;
  critical: Array<{ path: string; used: boolean }>;
  topMissing: string[];
}

export function evaluateInputSignalCoverage(text: string, disposition: any): InputSignalCoverageSummary {
  const normalizedText = normalize(text || "");
  const entries = toSignalEntries(disposition);

  const measured = entries.map((entry) => ({
    ...entry,
    used: matchesSignal(normalizedText, entry.value),
  }));

  const totalSignals = measured.length;
  const usedSignals = measured.filter((item) => item.used).length;
  const ratio = totalSignals === 0 ? 1 : Number((usedSignals / totalSignals).toFixed(3));

  const criticalPathAliases: Array<{ path: string; aliases: string[] }> = [
    { path: "property.address", aliases: ["property.address", "location.address"] },
    { path: "property.size", aliases: ["property.size", "property.living_area", "property.area"] },
    { path: "property.rooms", aliases: ["property.rooms"] },
    { path: "property.kitchen", aliases: ["property.kitchen", "property.materials.kitchen"] },
    { path: "property.bathroom", aliases: ["property.bathroom", "property.materials.bathroom"] },
    { path: "property.transport", aliases: ["property.transport", "location.transport"] },
    { path: "property.balcony.direction", aliases: ["property.balcony.direction", "property.outdoor_space.direction"] },
    { path: "property.year_built", aliases: ["property.year_built", "property.build_year"] },
  ];

  const valueByPath = new Map<string, string>();
  for (const signal of measured) {
    if (!valueByPath.has(signal.path)) valueByPath.set(signal.path, signal.value);
  }

  const critical = criticalPathAliases.map((entry) => {
    const aliasSignals = measured.filter((signal) => entry.aliases.includes(signal.path));
    const directlyUsed = aliasSignals.some((signal) => signal.used);
    if (directlyUsed) return { path: entry.path, used: true };

    const sourceValue = aliasSignals[0]?.value || "";
    let used = false;
    if (entry.path === "property.size") used = mentionsSize(normalizedText, sourceValue);
    else if (entry.path === "property.rooms") used = mentionsRooms(normalizedText, sourceValue);
    else if (entry.path === "property.kitchen") used = mentionsKitchen(normalizedText);
    else if (entry.path === "property.bathroom") used = mentionsBathroom(normalizedText);
    else if (entry.path === "property.transport") used = mentionsTransport(normalizedText);
    else if (entry.path === "property.address") {
      const addressValue = sourceValue || valueByPath.get("property.address") || valueByPath.get("location.address") || "";
      used = addressValue ? matchesSignal(normalizedText, addressValue) : false;
    }

    return { path: entry.path, used };
  });

  const topMissing = measured
    .filter((item) => !item.used)
    .slice(0, 10)
    .map((item) => item.path);

  return {
    totalSignals,
    usedSignals,
    ratio,
    critical,
    topMissing,
  };
}
