function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function extractWords(value: string): string[] {
  return normalize(value).split(" ").filter((token) => token.length >= 4).slice(0, 6);
}

function extractNumbers(value: string): string[] {
  return (value.match(/\d+/g) || []).slice(0, 4);
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
  return keywordHits >= Math.max(1, Math.min(2, words.length)) && numberHit;
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

  const criticalPaths = [
    "property.address",
    "property.size",
    "property.rooms",
    "property.kitchen",
    "property.bathroom",
    "property.transport",
    "property.balcony.direction",
    "property.year_built",
  ];

  const critical = criticalPaths.map((path) => {
    const found = measured.find((entry) => entry.path === path);
    return { path, used: found ? found.used : false };
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
