import { FORBIDDEN_PHRASES, shouldBlockPhraseForStyle, WritingStyle } from "./text-rules";

const PLATFORM_RULES: Record<string, Array<{ pattern: RegExp; message: string }>> = {
  hemnet: [
    { pattern: /\benergiklass\b/i, message: "Energiklass ska inte nämnas i Hemnet-huvudtexten då den visas separat i annonsen." },
    { pattern: /\benergiprestanda\b/i, message: "Energiprestanda ska inte nämnas i Hemnet-huvudtexten då den visas separat i annonsen." },
  ],
  booli: [],
};

function countGenericBrokerPhrases(text: string): number {
  if (!text) return 0;

  const genericPatterns = [
    /\bflexibla användningsmöjligheter\b/gi,
    /\bnaturliga flöden\b/gi,
    /\btrevligt umgänge\b/gi,
    /\bhelheten känns lättmöblerad\b/gi,
    /\bsjälvklar del av huset\b/gi,
    /\bbra förutsättningar för sol\b/gi,
    /\bkombinera pendling, ärenden och fritid\b/gi,
    /\bväl placerat för ett vardagsliv\b/gi,
    /\bsamlade för en enkel vardag\b/gi,
    /\bgenomgående välhållet\b/gi,
    /\bligger bra placerat\b/gi,
  ];

  return genericPatterns.reduce((count, pattern) => count + ((text.match(pattern) || []).length > 0 ? 1 : 0), 0);
}

function detectNarrativeIntegrityIssues(text: string): string[] {
  if (!text) return [];

  const issues: string[] = [];
  const integrityPatterns: Array<[RegExp, string]> = [
    [/\b(börja|fortsätta|avsluta|skapa|leva|njuta|använda|samla)\s+[A-ZÅÄÖ][a-zåäö]+(?:en|et|ar|or)?\s+(?:är|har|ger|blir|finns)\b/g, 'Avhuggen eller felaktigt sammanfogad mening'],
    [/\b[A-ZÅÄÖ][a-zåäö]+\s+Den\s+[a-zåäö]+\b/g, 'Felaktig satsövergång i löptext'],
  ];

  for (const [pattern, message] of integrityPatterns) {
    if (pattern.test(text)) {
      issues.push(message);
    }
  }

  return issues;
}

function hasHarmfulRepeatedPhraseRun(text: string): boolean {
  if (!text) return false;
  const repeatedPattern = /\b([A-Za-zÅÄÖåäö]{2,}(?:\s+[A-Za-zÅÄÖåäö]{2,}){0,2})\s+\1(?:\s+\1)+\b/gu;
  for (const match of text.matchAll(repeatedPattern)) {
    const phrase = String(match[1] || "").trim();
    if (!phrase) continue;
    if (/^[A-ZÅÄÖ\s]+$/.test(phrase)) continue;
    const words = phrase.split(/\s+/).filter(Boolean);
    if (words.every((word) => word.length <= 2)) continue;
    return true;
  }
  return false;
}

export function findRuleViolations(text: string, platform: string = "hemnet", style: WritingStyle = "balanced"): string[] {
  const violations: string[] = [];
  const lowerText = text.toLowerCase().trim();
  const sentences = text.split(/(?<=[.!?])\s+/);
  const firstSentence = sentences[0]?.trim() || "";
  const lastSentence = sentences[sentences.length - 1]?.trim() || "";
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount >= 120 && !/\n\s*\n/.test(text)) {
    violations.push("Saknar tydlig styckeindelning i huvudtexten.");
  }

  const platformKey = platform.toLowerCase();
  const platformRules = PLATFORM_RULES[platformKey] || [];
  for (const rule of platformRules) {
    if (rule.pattern.test(text)) {
      violations.push(rule.message);
    }
  }

  const corruptedPatterns: Array<[RegExp, string]> = [
    [/\bköketför att\b/gi, 'Trasigt ord: "köketför att"'],
    [/\bvardagsrummetför att\b/gi, 'Trasigt ord: "vardagsrummetför att"'],
    [/\bsovrumetför att\b/gi, 'Trasigt ord: "sovrumetför att"'],
    [/\bbadrummetför att\b/gi, 'Trasigt ord: "badrummetför att"'],
    [/\bhallenför att\b/gi, 'Trasigt ord: "hallenför att"'],
    [/\bsödterass\b/gi, 'Felstavat ord: "södterass"'],
    [/\bvälsköför att\b/gi, 'Trasigt ord: "välsköför att"'],
    [/\banvändningssäför att\b/gi, 'Trasigt ord: "användningssäför att"'],
  ];
  for (const [pattern, message] of corruptedPatterns) {
    if (pattern.test(text)) {
      violations.push(message);
    }
  }

  const mechanicalQualityPatterns: Array<[RegExp, string]> = [
    [/\benergiklass(?:en)?\s+är\s+(?:fiber|installerat|parkering|buss)\b/i, 'Trasig energiklass-/teknikmening'],
    [/\benergiklass\s+[A-G]\.\s+fiber\s+är\s+installerat\b/i, 'Mekanisk teknikrad efter energiklass'],
    [/\bparkering\s+har\s+(?:laddplats|garage|carport|plats)\b/i, 'Mekanisk parkeringsfras: "Parkering har ..."'],
    [/\bnär det passar med en måltid\s+buss\s+tar\b/i, 'Saknad meningsgräns före kommunikationsmening'],
    [/\b(kikka|come 2 eat|chopchop asian express värmdö)[^.!?\n]{0,90}när det passar med en måltid\b/i, 'Svag servicefras i lägesstycke'],
    [/\bbörja\s+[A-ZÅÄÖ][a-zåäö]+\b/i, 'Avhuggen mening efter "börja"'],
    [/\bavgift\s+om\s+\d{1,6}\s+[A-ZÅÄÖ][a-zåäö]+\b/, 'Trasig avgiftsmening: saknar enhet (kr/mån, kr/år) och meningsgräns'],
    [/\d{1,6}\s+[A-ZÅÄÖ][a-zåäö]+\s+ligger\s+nära\b/i, 'Trasig meningsövergång: siffra direkt följt av nytt stycke utan punkt'],
    [/\bavgift(?:en)?\s+på\s+\d{1,6}(?!\s*(?:kr|:-|\/mån|\/år|sek))\b/i, 'Avgift saknar enhet (kr/mån, kr/år)'],
    [/\b(?:avgift|driftkostnad|driftskostnad|månadskostnad|kostnad)(?:en)?\s+(?:om|på)\s+(?:\d{1,3}(?:[ \u00A0]\d{3})*|\d{4,7})(?!\s*(?:kr|kronor|sek|:-|\/mån|\/månad|\/år|per månad|per år))\b/i, 'Kostnad saknar enhet (kr/mån, kr/år)'],
    [/\b\d{1,3}(?:[ \u00A0]\d{3})?\s+[A-ZÅÄÖ][a-zåäö]{2,}\s+(?:fungerar|ligger|har|är|ger|tar)\b/u, 'Sannolik saknad punkt mellan siffra och ny mening'],
  ];
  for (const [pattern, message] of mechanicalQualityPatterns) {
    if (pattern.test(text)) {
      violations.push(message);
    }
  }
  if (hasHarmfulRepeatedPhraseRun(text)) {
    violations.push('Upprepad fras flera gånger i rad');
  }

  const narrativeIntegrityIssues = detectNarrativeIntegrityIssues(text);
  for (const issue of narrativeIntegrityIssues) {
    violations.push(issue);
  }

  const genericBrokerPhraseCount = countGenericBrokerPhrases(text);
  if (genericBrokerPhraseCount >= 2) {
    violations.push(`För många generiska mäklarabstraktioner i huvudtexten (${genericBrokerPhraseCount} träffar)`);
  }

  if (style === "factual") {
    const factualStyleDriftPatterns: Array<[RegExp, string]> = [
      [/\b(charmig|elegant|stilfull|smakfull|lyxig|magisk|underbar|otrolig|fantastisk|drömboende)\b/gi, "Factual-stil: värdeladdade adjektiv ska undvikas."],
      [/\b(inbjuder till|andas|skapar en känsla av|för den som|livsstil)\b/gi, "Factual-stil: säljande/berättande fraser ska undvikas."],
    ];
    for (const [pattern, message] of factualStyleDriftPatterns) {
      if (pattern.test(text)) {
        violations.push(message);
      }
    }
  }

  for (const phrase of FORBIDDEN_PHRASES) {
    const normalizedPhrase = phrase.trim();
    const isSingleWordPhrase = /^[A-Za-zÅÄÖåäö0-9-]+$/.test(normalizedPhrase);
    const criticalSingleWordPhrases = new Set(["erbjuder", "erbjuds", "fantastisk", "underbar", "magisk", "otrolig"]);
    if (style !== "factual" && isSingleWordPhrase && !criticalSingleWordPhrases.has(normalizedPhrase.toLowerCase())) continue;
    if (!shouldBlockPhraseForStyle(normalizedPhrase, style, platform)) continue;
    if (lowerText.includes(phrase.toLowerCase())) {
      violations.push(`Förbjuden fras: "${phrase}"`);
    }
  }

  if (lowerText.startsWith('välkommen')) {
    violations.push('Börjar med "Välkommen" — börja med gatuadress');
  }
  if (lowerText.startsWith('här ')) {
    violations.push('Börjar med "Här" — börja med gatuadress');
  }
  if (lowerText.startsWith('denna ') || lowerText.startsWith('dette ')) {
    violations.push('Börjar med "Denna" — börja med gatuadress');
  }
  if (lowerText.startsWith('i ') && !lowerText.match(/^i [a-zåäö]+(gatan|vägen|stigen|gränd)/)) {
    violations.push('Börjar med "I" — börja med gatuadress');
  }

  if (platform === 'hemnet') {
    if (/^en\s+(etta|tvåa|trea|fyra|femma|villa|radhus|lägenhet)\s+om\s+\d+/i.test(firstSentence) && !/(söderläge|västerläge|uteplats|terrass|balkong|utsikt|gård|kvällssol|lugn|renoverat kök|takhöjd|genomgående)/i.test(firstSentence)) {
      violations.push('Generisk öppning utan tydlig stark detalj — första meningen måste kännas som publicerad mäklartext.');
    }

    if (lastSentence && /^\b(ica|coop|willys|hemköp|centrum|skola|förskola|resecentrum|centralstationen?)\b/i.test(lastSentence) && !/(promenad|buss|pendling|vardag|nära|runt hörnet|i kvarteret|på cykel)/i.test(lastSentence)) {
      violations.push('Svagt lägesslut — sista meningen känns som uppräkning i stället för selektiv lägesprosa.');
    }
  }

  const detFinnsCount = (lowerText.match(/\bdet finns\b/g) || []).length;
  const denHarCount = (lowerText.match(/\bden har\b/g) || []).length;
  if (detFinnsCount > 1) {
    violations.push(`"Det finns" upprepas ${detFinnsCount} gånger (max 1). Variera meningsstarter.`);
  }
  if (denHarCount > 2) {
    violations.push(`"Den har" upprepas ${denHarCount} gånger (max 2). Variera meningsstarter.`);
  }

  const liggerCount = (lowerText.match(/\bligger\s+\d+/g) || []).length;
  if (liggerCount > 1) {
    violations.push(`"ligger [avstånd]" upprepas ${liggerCount} gånger (max 1). Variera avståndsformat.`);
  }

  if (sentences.length >= 5) {
    const starters: Record<string, number> = {};
    for (const s of sentences) {
      const firstWord = s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-zåäö]/g, '');
      if (firstWord && firstWord.length > 1) {
        starters[firstWord] = (starters[firstWord] || 0) + 1;
      }
    }
    for (const [word, count] of Object.entries(starters)) {
      if (count >= 3 && !['brf', 'avgift'].includes(word)) {
        violations.push(`Monoton meningsstart: "${word}" börjar ${count} meningar. Variera.`);
      }
    }
  }

  const last200 = lowerText.slice(-200);
  const ctaEndings = ['kontakta oss', 'boka visning', 'tveka inte', 'hör av dig', 'för mer information'];
  for (const ending of ctaEndings) {
    if (last200.includes(ending)) {
      violations.push(`CTA-slut: "${ending}" — avsluta utan uppmaning till kontakt i huvudtexten.`);
    }
  }
  if (platform === "hemnet") {
    const emotionalEndings = [
      'skapa minnen', 'drömboende', 'drömhem', 'välkommen hem',
      'allt du behöver', 'allt man kan önska', 'ett hem att trivas i',
      'detta gör bostaden', 'detta gör lägenheten', 'detta gör villan',
      'sammanfattningsvis', 'kort sagt', 'allt sammantaget',
    ];
    for (const ending of emotionalEndings) {
      if (last200.includes(ending)) {
        violations.push(`Emotionellt Hemnet-slut: "${ending}" — avsluta med konkret läges- eller vardagsnytta.`);
      }
    }
  }

  const vilketCount = (lowerText.match(/\bvilket\b/g) || []).length;
  if (vilketCount > 1) {
    violations.push(`"vilket" upprepas ${vilketCount} gånger (max 1). Dela upp i korta meningar.`);
  }

  const slashTerms = (text.match(/\b[A-Za-zÅÄÖåäö]+\s*\/\s*[A-Za-zÅÄÖåäö]+\b/g) || []).slice(0, 3);
  for (const term of slashTerms) {
    violations.push(`Osäker slash-terminologi i löptext: "${term}" — välj en konsekvent term.`);
  }

  return violations;
}

export function checkWordCount(text: string, platform: string, targetMin?: number, targetMax?: number): string[] {
  const violations: string[] = [];
  const wordCount = text.split(/\s+/).length;

  const minWords = targetMin || (platform === "hemnet" ? 180 : 200);
  const maxWords = targetMax || (platform === "hemnet" ? 500 : 600);

  if (wordCount < minWords) {
    violations.push(`För få ord: ${wordCount}/${minWords} krävs`);
  }
  if (wordCount > maxWords) {
    violations.push(`För många ord: ${wordCount}/${maxWords} max`);
  }
  return violations;
}

export function isDispositionLikeOutput(text: string): boolean {
  if (!text) return false;

  const normalized = text.toLowerCase();
  const strongMarkers = [
    'objektdisposition',
    '=== grundinformation ===',
    '=== ytor ===',
    '=== byggnad ===',
    '=== planlösning & rum ===',
    '=== kök ===',
    '=== badrum ===',
    '=== läge & omgivning ===',
    '=== försäljningsargument ===',
    '=== trädgård & uteplats ===',
    '=== särskilda egenskaper ===',
  ];
  const strongHitCount = strongMarkers.filter((marker) => normalized.includes(marker)).length;
  if (strongHitCount >= 2) return true;

  const colonFieldMarkers = [
    'typ:',
    'adress:',
    'pris:',
    'boarea:',
    'tomtarea:',
    'antal rum:',
    'sovrum:',
    'byggår:',
    'energiklass:',
    'kommunikationer:',
    'parkering:',
  ];
  const colonHitCount = colonFieldMarkers.filter((marker) => normalized.includes(marker)).length;
  const lineCount = text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const headingLineCount = text.split(/\r?\n/).filter((line) => /^={3,}|^[A-ZÅÄÖ\s&]+:$/.test(line.trim())).length;

  return colonHitCount >= 5 || (headingLineCount >= 3 && lineCount >= 8);
}

function isMainTextOnlyViolation(violation: string): boolean {
  return (
    violation.startsWith("Saknar tydlig styckeindelning") ||
    violation.startsWith("Börjar med ") ||
    violation.startsWith("Generisk öppning") ||
    violation.startsWith("Svagt lägesslut") ||
    violation.startsWith('"Det finns" upprepas') ||
    violation.startsWith('"Den har" upprepas') ||
    violation.startsWith('"ligger [avstånd]" upprepas') ||
    violation.startsWith("Monoton meningsstart") ||
    violation.startsWith("CTA-slut") ||
    violation.startsWith("Emotionellt Hemnet-slut") ||
    violation.startsWith('"vilket" upprepas') ||
    violation.startsWith("Energiklass ska inte nämnas") ||
    violation.startsWith("Energiprestanda ska inte nämnas") ||
    violation.startsWith("Kostnad saknar enhet") ||
    violation.startsWith("Avgift saknar enhet") ||
    violation.startsWith("Sannolik saknad punkt") ||
    violation.startsWith("För många generiska mäklarabstraktioner")
  );
}

function findAuxFieldViolations(
  field: "socialCopy" | "instagramCaption" | "showingInvitation" | "shortAd" | "headline",
  text: string,
  platform: string,
  style: WritingStyle
): string[] {
  const violations = findRuleViolations(text, platform, style).filter((violation) => !isMainTextOnlyViolation(violation));
  const words = text.split(/\s+/).filter(Boolean);
  const sentenceCount = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean).length;

  if (field === "headline") {
    if (words.length > 9) violations.push("Rubrik är för lång (max 9 ord).");
    if (/[.!?…]$/.test(text.trim())) violations.push("Rubrik ska inte avslutas med punkt eller utropstecken.");
    if (/[#@]/.test(text)) violations.push("Rubrik ska vara ren annonsrubrik utan hashtags eller @-taggar.");
  }

  if (field === "socialCopy") {
    if (sentenceCount > 3) violations.push("socialCopy är för lång; håll till max 3 meningar.");
    if (!/[.!?…]$/.test(text.trim())) violations.push("socialCopy ska avslutas med korrekt sluttecken.");
  }

  if (field === "instagramCaption") {
    if (sentenceCount > 3) violations.push("instagramCaption är för lång; håll till max 3 meningar.");
    if (!/[.!?…]$/.test(text.trim())) violations.push("instagramCaption ska avslutas med korrekt sluttecken.");
    if (!/[🌞🌅🏡✨🌿☀️🌳📍🛁🛋️🏠]/u.test(text)) violations.push("instagramCaption bör innehålla minst en relevant emoji.");
  }

  if (field === "showingInvitation") {
    if (!/\bvisning\b/i.test(text)) violations.push("showingInvitation ska tydligt nämna visning.");
    if (/\[(?:TID|KONTAKT)\]/i.test(text)) violations.push("showingInvitation innehåller oupplösta platshållare ([TID]/[KONTAKT]).");
  }

  if (field === "shortAd") {
    if (sentenceCount > 2) violations.push("shortAd ska vara max 2 meningar.");
    if (words.length > 32) violations.push("shortAd är för lång (max 32 ord).");
  }

  return violations;
}

export function validateOptimizationResult(result: any, platform: string = "hemnet", targetMin?: number, targetMax?: number, style: WritingStyle = "balanced"): string[] {
  const violations: string[] = [];
  if (typeof result?.improvedPrompt === "string") {
    if (isDispositionLikeOutput(result.improvedPrompt)) {
      violations.push("Huvudtexten är en objektdisposition eller rå faktalista i stället för en löpande objektbeskrivning.");
    }
    violations.push(...findRuleViolations(result.improvedPrompt, platform, style));
    violations.push(...checkWordCount(result.improvedPrompt, platform, targetMin, targetMax));
  }
  const extraFields = ['socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd', 'headline'];
  for (const field of extraFields) {
    if (typeof result?.[field] === "string" && result[field].length > 0) {
      const fieldViolations = findAuxFieldViolations(field as "socialCopy" | "instagramCaption" | "showingInvitation" | "shortAd" | "headline", result[field], platform, style);
      for (const v of fieldViolations) {
        violations.push(`[${field}] ${v}`);
      }
    }
  }

  for (const field of ['socialCopy', 'instagramCaption', 'showingInvitation', 'shortAd', 'headline']) {
    if (typeof result?.[field] === "string" && isDispositionLikeOutput(result[field])) {
      violations.push(`[${field}] Är en disposition/faktalista i stället för färdig marknadstext.`);
    }
  }

  const textFields = [result?.improvedPrompt, result?.socialCopy, result?.instagramCaption, result?.showingInvitation, result?.shortAd, result?.headline]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const joinedText = textFields.join("\n").toLowerCase();
  const outdoorTerms = ["balkong", "terrass", "altan", "uteplats"].filter((term) => joinedText.includes(term));
  if (outdoorTerms.length > 1) {
    violations.push(`Blandad uteplatsterminologi mellan textfält: ${outdoorTerms.join(", ")}`);
  }

  const riskNotes = Array.isArray(result?.analysis?.risk_notes)
    ? result.analysis.risk_notes.join(" ").toLowerCase()
    : "";
  if (riskNotes.includes("oklar") && /\b(exakt|garanterat|säkerställt)\b/i.test(joinedText)) {
    violations.push("Texten uttrycker för hög säkerhet trots markerad osäkerhet i analys/risk_notes.");
  }

  return violations;
}
