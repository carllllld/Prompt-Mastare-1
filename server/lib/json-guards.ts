export function extractFirstJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return "{}";
  return text.slice(start, end + 1);
}

export function safeJsonParse(rawText: string): any {
  const extracted = extractFirstJsonObject(rawText || "{}");
  const attempts = [
    extracted,
    extracted
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\u0000/g, "")
      .trim(),
    extracted
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/([}\]"0-9a-zA-Z])\s*(?="[^"]+"\s*:)/g, "$1,")
      .replace(/([}\]"])\s*(?=\{)/g, "$1,")
      .replace(/([}\]"])\s*(?=\[)/g, "$1,")
      .replace(/\u0000/g, "")
      .trim(),
  ];

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (error) {
      lastError = error;
    }
  }

  // VIKTIGT: Returnera fallback istället för att kasta error
  console.warn("[safeJsonParse] All parse attempts failed, returning empty object:", lastError);
  return {};
}

export function extractGeneratedMarketingText(payload: any): string | null {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  const candidateKeys = [
    "improvedPrompt",
    "hemnetText",
    "improvedText",
    "text",
    "rewritten",
    "corrected_text",
    "expanded_text",
    "content",
    "output",
  ];

  for (const key of candidateKeys) {
    if (typeof payload?.[key] === "string" && payload[key].trim()) {
      return payload[key].trim();
    }
  }

  return null;
}

export function extractImprovedPromptFromLooseJson(raw: string): string | null {
  if (!raw) return null;

  const patterns = [
    /"improvedPrompt"\s*:\s*"([\s\S]*?)"\s*(?:,|})/,
    /"hemnetText"\s*:\s*"([\s\S]*?)"\s*(?:,|})/,
    /"improvedText"\s*:\s*"([\s\S]*?)"\s*(?:,|})/,
    /"text"\s*:\s*"([\s\S]*?)"\s*(?:,|})/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match?.[1]) continue;
    const recovered = match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, " ")
      .replace(/\\"/g, '"')
      .trim();
    if (recovered) return recovered;
  }

  return null;
}
