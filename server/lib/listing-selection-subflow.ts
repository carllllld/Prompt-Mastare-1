export function buildPolishedCandidateResult(params: {
  currentResult: any;
  polishedRaw: any;
  polishedText: string;
  sanitizeField: (value: unknown) => string | null;
}): any {
  const polishedResult = {
    ...params.currentResult,
    ...params.polishedRaw,
    improvedPrompt: params.polishedText,
  };

  for (const field of ["socialCopy", "instagramCaption", "showingInvitation", "shortAd", "headline"]) {
    polishedResult[field] = params.sanitizeField(polishedResult[field]);
  }

  return polishedResult;
}

export function buildPolishAttemptSnapshot(params: {
  currentResult: any;
  polishedResult: any;
  polishedText: string;
  validateResult: (value: any) => any[];
  getNonWordCountViolations: (violations: any[]) => any[];
  analyzeTextQuality: (text: string) => number;
  countWords: (text: string) => number;
  isStrongCandidate: (text: string) => boolean;
  hasCorruptedArtifacts: (text: string) => boolean;
}) {
  const currentAllViolations = params.validateResult(params.currentResult);
  const polishedAllViolations = params.validateResult(params.polishedResult);
  const currentViolations = params.getNonWordCountViolations(currentAllViolations);
  const polishedViolations = params.getNonWordCountViolations(polishedAllViolations);
  const currentText = params.currentResult?.improvedPrompt || "";
  const currentScore = params.analyzeTextQuality(currentText);
  const polishedScore = params.analyzeTextQuality(params.polishedText);

  return {
    currentAllViolations,
    polishedAllViolations,
    currentViolations,
    polishedViolations,
    currentScore,
    polishedScore,
    currentWordCount: params.countWords(currentText),
    polishedWordCount: params.countWords(params.polishedText),
    currentIsStrongCandidate: params.isStrongCandidate(currentText),
    polishedIsStrongCandidate: params.isStrongCandidate(params.polishedText),
    polishedHasCorruptedArtifacts: params.hasCorruptedArtifacts(params.polishedText),
  };
}

export function buildStep3CandidateSnapshot(params: {
  result: any;
  validateResult: (value: any) => any[];
  getNonWordCountViolations: (violations: any[]) => any[];
  analyzeTextQuality: (text: string) => number;
  countWords: (text: string) => number;
}) {
  const text = params.result?.improvedPrompt || "";
  const allViolations = params.validateResult(params.result);
  const violations = params.getNonWordCountViolations(allViolations);

  return {
    wordCount: params.countWords(text),
    violations,
    score: params.analyzeTextQuality(text),
  };
}

export function buildPolishRewriteEvaluationInput(params: {
  polishAttemptSnapshot: {
    currentScore: number;
    currentViolations: any[];
    currentWordCount: number;
    currentIsStrongCandidate: boolean;
    polishedScore: number;
    polishedViolations: any[];
    polishedWordCount: number;
    polishedIsStrongCandidate: boolean;
    polishedHasCorruptedArtifacts: boolean;
  };
  minimumPublishableWordMin: number;
}) {
  return {
    current: {
      qualityScore: params.polishAttemptSnapshot.currentScore,
      nonWordCountViolations: params.polishAttemptSnapshot.currentViolations,
      wordCount: params.polishAttemptSnapshot.currentWordCount,
      isStrongPublishableCandidate: params.polishAttemptSnapshot.currentIsStrongCandidate,
    },
    proposed: {
      qualityScore: params.polishAttemptSnapshot.polishedScore,
      nonWordCountViolations: params.polishAttemptSnapshot.polishedViolations,
      wordCount: params.polishAttemptSnapshot.polishedWordCount,
      isStrongPublishableCandidate: params.polishAttemptSnapshot.polishedIsStrongCandidate,
      hasCorruptedArtifacts: params.polishAttemptSnapshot.polishedHasCorruptedArtifacts,
    },
    minimumPublishableWordMin: params.minimumPublishableWordMin,
    improvementKind: "polish" as const,
  };
}

export function buildCandidatePolishRequestInput(params: {
  cleanDisposition: unknown;
  cleanWritingPlan: unknown;
  result: unknown;
  violations?: string[]; // Specific violations to fix
  currentScore?: number; // Current quality score
  targetMinWords?: number; // Minimum word count to maintain
}) {
  const violationContext = params.violations && params.violations.length > 0
    ? `\n\nSPECIFIKA PROBLEM ATT FIXA:\n${params.violations.map(v => `- ${v}`).join('\n')}`
    : '';

  const scoreContext = params.currentScore
    ? `\n\nNUVARANDE KVALITET: ${params.currentScore.toFixed(2)}/1.0. Mål: höja till minst ${Math.min(params.currentScore + 0.05, 0.9).toFixed(2)}.`
    : '';

  const wordContext = params.targetMinWords
    ? `\n\nORDANTAL: Behåll minst ${params.targetMinWords} ord. Om texten är kort, utveckla stycken mer istället för att korta.`
    : '';

  return [
    {
      role: "developer" as const,
      content: `Du är en av Sveriges skickligaste fastighetsmäklare och språkredaktör med öga för detaljer.

UPPGIFT:
Förbättra specifika delar av objektbeskrivningen - behåll det som funkar, skriv om det som är svagt.

ANALYSMETOD:
1. Läs igenom texten och identifiera svaga stycken/meningar
2. Bevara starka stycken exakt som de är
3. Skriv om svaga delar för att höja kvaliteten
4. Behåll alla fakta korrekta

VAD SOM ÄR SVAGT (prioritet):${violationContext}${scoreContext}${wordContext}

FÖRBÄTTRA SÅ HÄR:
- Första stycket ska vara starkt och konkret (inte generiskt)
- Fixa mekanisk rytm - variera meningslängd och struktur
- Gör svaga meningar mer mänskliga och mindre som listor
- Selektiv betoning - ge de bästa detaljerna mer utrymme
- Behåll naturligt styckeflöde

DU FÅR INTE:
- Ändra fakta eller hitta på nya detaljer
- Göra texten mer klyschig
- Förkorta om det inte behövs (behåll eller öka ordantal)
- Skriva om hela texten - bara de svaga delarna

Svara med JSON: { "improvedPrompt": "...", "headline": "...", "changesMade": "kort beskrivning av vad som ändrades" }`
    },
    {
      role: "user" as const,
      content: `DISPOSITION:\n${JSON.stringify(params.cleanDisposition, null, 2)}\n\nSKRIVPLAN:\n${JSON.stringify(params.cleanWritingPlan, null, 2)}\n\nTEXT ATT FÖRFINA:\n${JSON.stringify(params.result, null, 2)}`
    }
  ];
}

export function buildCandidatePolishResponseArtifacts(params: {
  outputText: string | null | undefined;
  parseJson: (value: string) => any;
  extractMarketingText: (value: any) => string | null;
  finalizeText: (value: string | null) => string | null;
}) {
  const polishedRaw = params.parseJson(params.outputText || "{}");
  const polishedText = params.finalizeText(params.extractMarketingText(polishedRaw));

  return {
    polishedRaw,
    polishedText,
  };
}

export function buildCandidatePolishOutcome(params: {
  currentResult: any;
  polishedRaw: any;
  polishedText: string;
  sanitizeField: (value: unknown) => string | null;
  validateResult: (value: any) => any[];
  getNonWordCountViolations: (violations: any[]) => any[];
  analyzeTextQuality: (text: string) => number;
  countWords: (text: string) => number;
  isStrongCandidate: (text: string) => boolean;
  hasCorruptedArtifacts: (text: string) => boolean;
  minimumPublishableWordMin: number;
}): {
  polishedResult: any;
  polishAttemptSnapshot: ReturnType<typeof buildPolishAttemptSnapshot>;
  polishEvaluationInput: ReturnType<typeof buildPolishRewriteEvaluationInput>;
} {
  const polishedResult = buildPolishedCandidateResult({
    currentResult: params.currentResult,
    polishedRaw: params.polishedRaw,
    polishedText: params.polishedText,
    sanitizeField: params.sanitizeField,
  });

  const polishAttemptSnapshot = buildPolishAttemptSnapshot({
    currentResult: params.currentResult,
    polishedResult,
    polishedText: params.polishedText,
    validateResult: params.validateResult,
    getNonWordCountViolations: params.getNonWordCountViolations,
    analyzeTextQuality: params.analyzeTextQuality,
    countWords: params.countWords,
    isStrongCandidate: params.isStrongCandidate,
    hasCorruptedArtifacts: params.hasCorruptedArtifacts,
  });

  return {
    polishedResult,
    polishAttemptSnapshot,
    polishEvaluationInput: buildPolishRewriteEvaluationInput({
      polishAttemptSnapshot,
      minimumPublishableWordMin: params.minimumPublishableWordMin,
    }),
  };
}

export function buildCandidatePolishDecisionArtifacts(params: {
  accepted: boolean;
  reason: string;
  polishAttemptSnapshot: {
    currentScore: number;
    polishedScore: number;
    currentViolations: any[];
    polishedViolations: any[];
  };
}) {
  if (params.accepted) {
    return {
      shouldApplyPolish: true,
      logMessage: `[Step 3 Polish] Accepted polished winner. Score ${params.polishAttemptSnapshot.currentScore.toFixed(2)} -> ${params.polishAttemptSnapshot.polishedScore.toFixed(2)}, violations ${params.polishAttemptSnapshot.currentViolations.length} -> ${params.polishAttemptSnapshot.polishedViolations.length}`,
    };
  }

  return {
    shouldApplyPolish: false,
    logMessage: `[Step 3 Polish] Kept selected candidate. Reason: ${params.reason}. Score ${params.polishAttemptSnapshot.currentScore.toFixed(2)} vs ${params.polishAttemptSnapshot.polishedScore.toFixed(2)}, violations ${params.polishAttemptSnapshot.currentViolations.length} vs ${params.polishAttemptSnapshot.polishedViolations.length}`,
  };
}

export function buildCandidatePolishSettlement(params: {
  polishEvaluationInput: ReturnType<typeof buildPolishRewriteEvaluationInput>;
  polishAttemptSnapshot: ReturnType<typeof buildPolishAttemptSnapshot>;
  evaluateCandidate: (value: ReturnType<typeof buildPolishRewriteEvaluationInput>) => {
    acceptance: {
      accept: boolean;
      reason: string;
    };
  };
  coordinateAcceptance: (value: {
    accepted: boolean;
    currentViolationCount: number;
    nextViolationCount: number;
    rejectionReason: string;
  }) => {
    accepted: boolean;
    reason: string;
  };
}) {
  const polishEvaluation = params.evaluateCandidate(params.polishEvaluationInput);
  const polishCoordination = params.coordinateAcceptance({
    accepted: polishEvaluation.acceptance.accept,
    currentViolationCount: params.polishAttemptSnapshot.currentAllViolations.length,
    nextViolationCount: params.polishAttemptSnapshot.polishedAllViolations.length,
    rejectionReason: polishEvaluation.acceptance.reason,
  });

  return {
    polishEvaluation,
    polishCoordination,
    polishDecisionArtifacts: buildCandidatePolishDecisionArtifacts({
      accepted: polishCoordination.accepted,
      reason: polishCoordination.reason,
      polishAttemptSnapshot: params.polishAttemptSnapshot,
    }),
  };
}
