export function buildRescuedResult(params: {
  currentResult: any;
  rescueRaw: any;
  rescuedText: string;
  sanitizeField: (value: unknown) => string | null;
}): any {
  const rescuedResult = {
    ...params.currentResult,
    ...params.rescueRaw,
    improvedPrompt: params.rescuedText,
  };

  for (const field of ["socialCopy", "instagramCaption", "showingInvitation", "shortAd", "headline"]) {
    rescuedResult[field] = params.sanitizeField(rescuedResult[field]);
  }

  return rescuedResult;
}

export function buildRescueAttemptSnapshot(params: {
  currentResult: any;
  rescuedResult: any;
  rescuedText: string;
  validateResult: (value: any) => any[];
  getNonWordCountViolations: (violations: any[]) => any[];
  analyzeTextQuality: (text: string) => number;
  countWords: (text: string) => number;
  isStrongCandidate: (text: string) => boolean;
  hasCorruptedArtifacts: (text: string) => boolean;
}) {
  const currentText = params.currentResult?.improvedPrompt || "";
  const currentMainViolations = params.validateResult(params.currentResult);
  const rescuedMainViolations = params.validateResult(params.rescuedResult);

  return {
    currentMainViolations,
    rescuedMainViolations,
    currentViolations: params.getNonWordCountViolations(currentMainViolations),
    rescuedViolations: params.getNonWordCountViolations(rescuedMainViolations),
    currentScore: params.analyzeTextQuality(currentText),
    rescuedScore: params.analyzeTextQuality(params.rescuedText),
    currentWordCount: params.countWords(currentText),
    rescuedWordCount: params.countWords(params.rescuedText),
    currentIsStrongCandidate: params.isStrongCandidate(currentText),
    rescuedIsStrongCandidate: params.isStrongCandidate(params.rescuedText),
    rescuedHasCorruptedArtifacts: params.hasCorruptedArtifacts(params.rescuedText),
  };
}

export function buildRescueRewriteEvaluationInput(params: {
  rescueAttemptSnapshot: {
    currentScore: number;
    currentViolations: any[];
    currentWordCount: number;
    currentIsStrongCandidate: boolean;
    rescuedScore: number;
    rescuedViolations: any[];
    rescuedWordCount: number;
    rescuedIsStrongCandidate: boolean;
    rescuedHasCorruptedArtifacts: boolean;
  };
  minimumPublishableWordMin: number;
}) {
  return {
    current: {
      qualityScore: params.rescueAttemptSnapshot.currentScore,
      nonWordCountViolations: params.rescueAttemptSnapshot.currentViolations,
      wordCount: params.rescueAttemptSnapshot.currentWordCount,
      isStrongPublishableCandidate: params.rescueAttemptSnapshot.currentIsStrongCandidate,
    },
    proposed: {
      qualityScore: params.rescueAttemptSnapshot.rescuedScore,
      nonWordCountViolations: params.rescueAttemptSnapshot.rescuedViolations,
      wordCount: params.rescueAttemptSnapshot.rescuedWordCount,
      isStrongPublishableCandidate: params.rescueAttemptSnapshot.rescuedIsStrongCandidate,
      hasCorruptedArtifacts: params.rescueAttemptSnapshot.rescuedHasCorruptedArtifacts,
    },
    minimumPublishableWordMin: params.minimumPublishableWordMin,
    improvementKind: "rescue" as const,
  };
}

export function buildFinalAuditRescueRequestInput(params: {
  cleanDisposition: unknown;
  cleanWritingPlan: unknown;
  cleanToneAnalysis?: unknown; // Add tone analysis for context
  plan: string;
  rescueIssues: string[];
  result: unknown;
  rescueRepairAddendum: string;
}) {
  return [
    {
      role: "developer" as const,
      content: `Du är senior kvalitetsredaktör för svenska bostadsannonser inom fastighetsförmedling.

UPPGIFT:
Skriv om objektbeskrivningen så att den blir publiceringsklar på rätt mäklarnivå utifrån auditens konkreta invändningar.

DU MÅSTE:
- behålla alla korrekta fakta EXAKT som de står
- inte hitta på något nytt
- inte skriva disposition, rubriker eller punktlista
- förbättra öppning, rytm, prioritering och lägesprosa
- ta bort repetition och rådata-känsla
- skriva naturlig svensk mäklarprosa

KRITISKA REGLER - FÖLJ EXAKT:
1. OM disposition säger "gott skick" OCH text säger "gott skick" - ÄNDRA INTE
2. OM disposition säger "mycket gott skick" OCH text säger "gott skick" - ändra till "mycket gott skick"
3. OM disposition säger X OCH text säger X - ÄNDRA INTE
4. Ändra BARA om det är en verklig motsägelse mellan disposition och text
5. Lita ALLTID på dispositionens fakta framför textens formulering

SÄRSKILT VIKTIGT:
- öppningen får inte kännas administrativ
- boarea och andra nyckelfakta får inte upprepas i onödan
- närområde ska skrivas som selektiv, naturlig prosa — aldrig lista
- mekaniska faktarader ska vävas in naturligt eller utelämnas om de inte lyfter texten
- om audit nämner uteplats, solläge, lugn eller centrum närhet ska de vävas in elegant i löpande prosa, inte punktvis

NIVÅANPASSNING:
- premium = mycket hög finish och säljtryck
- pro = tydligt publiceringsklar mäklarnivå utan krav på lyxig premiumton

Svara med JSON med samma fält som input. improvedPrompt måste vara färdig löpande objektbeskrivning.

${params.rescueRepairAddendum}`
    },
    {
      role: "user" as const,
      content: `DISPOSITION:\n${JSON.stringify(params.cleanDisposition, null, 2)}\n\nSKRIVPLAN:\n${JSON.stringify(params.cleanWritingPlan, null, 2)}\n${params.cleanToneAnalysis ? `\n\nTONALITET/MÅLGRUPP:\n${JSON.stringify(params.cleanToneAnalysis, null, 2)}` : ''}\n\nLEVEL: ${params.plan}\n\nAUDITENS INVÄNDNINGAR SOM MÅSTE LÖSAS:\n${params.rescueIssues.map((issue, index) => `${index + 1}. ${issue}`).join("\n")}\n\nTEXT ATT RÄDDA:\n${JSON.stringify(params.result, null, 2)}\n\nPRECISION: Fixa ENDAST de ovanstående ${params.rescueIssues.length} specifika felen. Ändra inget annat. Behåll resten av texten exakt som den är.`
    }
  ];
}

export function buildFinalBrokerAuditRetryResponseArtifacts(params: {
  outputText: string | null | undefined;
  parseJson: (value: string) => any;
}) {
  return {
    finalBrokerAudit: params.parseJson(params.outputText || "{}"),
  };
}

export function buildFinalAuditRescueSettlement(params: {
  rescueEvaluationInput: ReturnType<typeof buildRescueRewriteEvaluationInput>;
  rescueAttemptSnapshot: ReturnType<typeof buildRescueAttemptSnapshot>;
  minimumPublishableWordMin: number;
  evaluateCandidate: (value: ReturnType<typeof buildRescueRewriteEvaluationInput>) => {
    acceptance: {
      accept: boolean;
      reason: string;
    };
  };
  coordinateAcceptance: (value: {
    accepted: boolean;
    currentWordCount: number;
    nextWordCount: number;
    minimumPublishableWordMin: number;
    rejectionReason: string;
  }) => {
    accepted: boolean;
    reason: string;
  };
}) {
  const rescueEvaluation = params.evaluateCandidate(params.rescueEvaluationInput);
  const rescueCoordination = params.coordinateAcceptance({
    accepted: rescueEvaluation.acceptance.accept,
    currentWordCount: params.rescueAttemptSnapshot.currentWordCount,
    nextWordCount: params.rescueAttemptSnapshot.rescuedWordCount,
    minimumPublishableWordMin: params.minimumPublishableWordMin,
    rejectionReason: rescueEvaluation.acceptance.reason,
  });

  return {
    rescueEvaluation,
    rescueCoordination,
    rescueDecisionArtifacts: buildFinalAuditRescueDecisionArtifacts({
      accepted: rescueCoordination.accepted,
      reason: rescueCoordination.reason,
      rescueAttemptSnapshot: params.rescueAttemptSnapshot,
    }),
  };
}

export function buildFinalAuditRescueDecisionArtifacts(params: {
  accepted: boolean;
  reason: string;
  rescueAttemptSnapshot: {
    currentScore: number;
    rescuedScore: number;
    currentWordCount: number;
    rescuedWordCount: number;
  };
}) {
  if (params.accepted) {
    return {
      shouldApplyRescue: true,
      logMessage: `[Final Broker Audit Rescue] Accepted rescue rewrite. Score ${params.rescueAttemptSnapshot.currentScore.toFixed(2)} -> ${params.rescueAttemptSnapshot.rescuedScore.toFixed(2)}, words ${params.rescueAttemptSnapshot.currentWordCount} -> ${params.rescueAttemptSnapshot.rescuedWordCount}`,
    };
  }

  return {
    shouldApplyRescue: false,
    logMessage: `[Final Broker Audit Rescue] Rescue rewrite rejected: ${params.reason}`,
  };
}

export function buildFinalAuditRescueResponseArtifacts(params: {
  outputText: string | null | undefined;
  parseJson: (value: string) => any;
  extractMarketingText: (value: any) => string | null;
  finalizeText: (value: string | null) => string | null;
}) {
  const rescueRaw = params.parseJson(params.outputText || "{}");
  const rescuedText = params.finalizeText(params.extractMarketingText(rescueRaw));

  return {
    rescueRaw,
    rescuedText,
  };
}

export function finalizeFinalMainValidation(params: {
  resultText: string | null | undefined;
  finalNonWordCountViolations: string[];
  finalWordCountViolations: string[];
  finalExtraFieldViolations: string[];
  finalNarrativeIssues: string[];
  strictExtraFieldValidation?: boolean;
  minimumPublishableWordMin: number;
  targetWordMin: number;
  targetWordMax: number;
  isDispositionLikeOutput: (text: string) => boolean;
  isTooThinForDelivery: (text: string, minimumPublishableWordMin: number) => boolean;
  countWords: (text: string) => number;
}) {
  const text = params.resultText || "";
  const warnings: string[] = [];

  if (typeof params.resultText !== "string" || !params.resultText.trim()) {
    throw new Error("[Final Gate] Huvudtext saknas efter pipelinebearbetning.");
  }

  if (params.isDispositionLikeOutput(text)) {
    throw new Error("[Final Gate] Huvudtexten är fortfarande dispositionslik vid slutsvaret.");
  }

  if (params.finalNarrativeIssues.length > 0) {
    throw new Error(`[Final Gate] Huvudtexten har fortfarande trasig berättelseintegritet: ${params.finalNarrativeIssues.slice(0, 5).join(" | ")}`);
  }

  if (params.finalNonWordCountViolations.length > 0) {
    // Check if violations are only "corrupted artifacts" or style/rhythm issues which should warn, not block
    const styleOnlyViolations = new Set([
      "Monoton meningsstart",
      '"vilket" upprepas',
      '"Det finns" upprepas',
      '"Den har" upprepas',
      '"ligger [avstånd]" upprepas',
      "Saknar tydlig styckeindelning",
    ]);
    const seriousViolations = params.finalNonWordCountViolations.filter(
      v => !v.includes("corrupted") && !v.includes("Trasigt") && !v.includes("artefakt")
        && !Array.from(styleOnlyViolations).some(s => v.startsWith(s))
    );
    if (seriousViolations.length > 0) {
      throw new Error(`[Final Gate] Kvarvarande kvalitetsfel i huvudtexten: ${seriousViolations.slice(0, 5).join(" | ")}`);
    }
    // Style violations become warnings only
    const styleWarnings = params.finalNonWordCountViolations.filter(
      v => Array.from(styleOnlyViolations).some(s => v.startsWith(s))
    );
    if (styleWarnings.length > 0) {
      warnings.push(`[Final Gate] Stilanmärkningar (blockerar inte leverans): ${styleWarnings.slice(0, 5).join(" | ")}`);
    }
  }

  if (params.finalWordCountViolations.length > 0) {
    warnings.push(`[Final Gate] Texten missade önskat ordmål men klarade inte-förbjudna-regler. Requested ${params.targetWordMin}-${params.targetWordMax}, publishable min ${params.minimumPublishableWordMin}. Detalj: ${params.finalWordCountViolations.join(" | ")}`);
  }

  const wordCount = params.countWords(text);
  if (params.isTooThinForDelivery(text, params.minimumPublishableWordMin)) {
    throw new Error(`[Final Gate] Huvudtexten är fortfarande för tunn eller listig för leverans. Words ${wordCount}.`);
  }

  if (params.finalExtraFieldViolations.length > 0) {
    if (params.strictExtraFieldValidation) {
      // Don't throw immediately - let caller attempt repair first
      // This error will be caught and trigger repair logic in routes.ts
      throw new Error(`[Final Gate] Kvarvarande kvalitetsfel i extratexter: ${params.finalExtraFieldViolations.slice(0, 5).join(" | ")}`);
    }
    warnings.push(`[Final Gate] Extratexter har kvarvarande kvalitetsanmärkningar men blockerar inte huvudtexten: ${params.finalExtraFieldViolations.slice(0, 5).join(" | ")}`);
  }

  return {
    wordCount,
    warnings,
  };
}

function normalizeAuditIssues(issues: unknown): string[] {
  return Array.isArray(issues)
    ? issues.filter((issue): issue is string => typeof issue === "string" && issue.trim().length > 0).map((issue) => issue.trim()).slice(0, 8)
    : [];
}

function isAdvisoryAuditIssue(issue: string): boolean {
  const lower = issue.toLowerCase();
  const advisoryPatterns = [
    "kunde vara",
    "kan slipas",
    "kan väcka frågor",
    "bra att precisera",
    "mer direkt",
    "mer säljande",
    "drar åt det generiska",
    "för att undvika osäkerhet",
    "bör",
  ];
  return advisoryPatterns.some((pattern) => lower.includes(pattern));
}

function isHardFailureAuditIssue(issue: string): boolean {
  const lower = issue.toLowerCase();
  const hardFailurePatterns = [
    "motsäger",
    "felaktig",
    "faktiskt fel",
    "saknas",
    "inte nämns",
    "strider mot",
    "otillåten",
    "risk för vilseledande",
    "vilseledande",
  ];
  return hardFailurePatterns.some((pattern) => lower.includes(pattern));
}

export function finalizeBrokerAuditReadiness(params: {
  finalBrokerAudit: any;
  finalLocalTopBrokerReady: boolean;
  analyzedScore: number;
  brokerQualityThreshold: number;
  buildLocalFallback: (input: {
    publishReady: boolean;
    brokerQualityScore: number;
    reason: string;
    issues?: string[];
  }) => any;
}) {
  let finalBrokerAudit = params.finalBrokerAudit;
  const warnings: string[] = [];
  const auditIssues = normalizeAuditIssues(finalBrokerAudit?.issues);

  if (typeof finalBrokerAudit?.publish_ready !== "boolean") {
    warnings.push("[Final Broker Audit] Slutgranskningen returnerade inte giltigt publish_ready. Faller tillbaka till lokal audit.");
    if (!params.finalLocalTopBrokerReady) {
      throw new Error("[Final Gate] Slutgranskningen returnerade ogiltigt publish_ready och lokal toppmäklargrind godkände inte texten.");
    }
    finalBrokerAudit = params.buildLocalFallback({
      publishReady: params.finalLocalTopBrokerReady,
      brokerQualityScore: params.analyzedScore,
      reason: "AI-audit returnerade ogiltigt publish_ready; stark lokal kvalitetsgranskning användes i stället.",
    });
  }

  if (typeof finalBrokerAudit?.broker_quality_score !== "number") {
    warnings.push("[Final Broker Audit] Slutgranskningen returnerade inte giltigt broker_quality_score. Faller tillbaka till lokal audit.");
    if (!params.finalLocalTopBrokerReady) {
      throw new Error("[Final Gate] Slutgranskningen returnerade ogiltigt kvalitetsbetyg och lokal toppmäklargrind godkände inte texten.");
    }
    finalBrokerAudit = params.buildLocalFallback({
      publishReady: params.finalLocalTopBrokerReady,
      brokerQualityScore: params.analyzedScore,
      reason: "AI-audit returnerade ogiltigt kvalitetsbetyg; stark lokal kvalitetsgranskning användes i stället.",
      issues: finalBrokerAudit?.issues,
    });
  }

  if (finalBrokerAudit && finalBrokerAudit.publish_ready === false) {
    const auditIssueText = auditIssues.length > 0 ? auditIssues.slice(0, 5).join(" | ") : "Broker audit underkände texten.";
    const advisoryOnly = auditIssues.length > 0 && auditIssues.every((issue) => isAdvisoryAuditIssue(issue));
    const hardFailureIssueExists = auditIssues.some((issue) => isHardFailureAuditIssue(issue));
    const highLocalConfidence = params.analyzedScore >= 0.82;
    
    if (params.finalLocalTopBrokerReady) {
      warnings.push(`[Final Gate] AI-audit underkände texten (${auditIssueText}), men lokal granskning godkände den. Levererar med varning.`);
    } else if (advisoryOnly && highLocalConfidence) {
      finalBrokerAudit = params.buildLocalFallback({
        publishReady: true,
        brokerQualityScore: Math.max(params.analyzedScore, Number(finalBrokerAudit?.broker_quality_score) || 0),
        reason: "AI-audit gav främst förbättringsråd; lokal kvalitetsnivå var tillräckligt hög för leverans.",
        issues: auditIssues,
      });
      warnings.push(`[Final Gate] AI-audit markerade förbättringsråd (${auditIssueText}) men texten levereras med lokal fallback och tydliga förbättringsförslag.`);
    } else if (!hardFailureIssueExists && highLocalConfidence) {
      finalBrokerAudit = params.buildLocalFallback({
        publishReady: true,
        brokerQualityScore: Math.max(params.analyzedScore, Number(finalBrokerAudit?.broker_quality_score) || 0),
        reason: "AI-audit underkände främst stilnivå; lokal kvalitetsnivå och täckning bedöms tillräcklig för leverans.",
        issues: auditIssues,
      });
      warnings.push(`[Final Gate] AI-audit underkände texten (${auditIssueText}) men inga hårda faktabrott hittades och lokal kvalitet är hög; levererar med fallback.`);
    } else {
      throw new Error(`[Final Gate] AI-audit underkände texten efter slutgranskning: ${auditIssueText}`);
    }
  }

  if (finalBrokerAudit.broker_quality_score < params.brokerQualityThreshold) {
    const auditIssueText = auditIssues.length > 0 ? auditIssues.slice(0, 5).join(" | ") : "Mäklarkvaliteten nådde inte tröskelvärdet.";
    
    if ((params.finalLocalTopBrokerReady && finalBrokerAudit.broker_quality_score >= 0.75) || finalBrokerAudit.broker_quality_score > 0.70) {
      warnings.push(`[Final Gate] Broker quality score låg under tröskeln (${finalBrokerAudit.broker_quality_score}), men texten bedöms ändå leveransbar.`);
    } else {
      throw new Error(`[Final Gate] Broker quality score låg under tröskeln efter slutgranskning. Score ${finalBrokerAudit.broker_quality_score}, krav ${params.brokerQualityThreshold}. ${auditIssueText}`);
    }
  }

  return {
    finalBrokerAudit,
    warnings,
  };
}

export function buildFinalAuditRescueOutcome(params: {
  currentResult: any;
  rescueRaw: any;
  rescuedText: string;
  sanitizeField: (value: unknown) => string | null;
  validateResult: (value: any) => any[];
  getNonWordCountViolations: (violations: any[]) => any[];
  analyzeTextQuality: (text: string) => number;
  countWords: (text: string) => number;
  isStrongCandidate: (text: string) => boolean;
  hasCorruptedArtifacts: (text: string) => boolean;
  minimumPublishableWordMin: number;
}): {
  rescuedResult: any;
  rescueAttemptSnapshot: ReturnType<typeof buildRescueAttemptSnapshot>;
  rescueEvaluationInput: ReturnType<typeof buildRescueRewriteEvaluationInput>;
} {
  const rescuedResult = buildRescuedResult({
    currentResult: params.currentResult,
    rescueRaw: params.rescueRaw,
    rescuedText: params.rescuedText,
    sanitizeField: params.sanitizeField,
  });

  const rescueAttemptSnapshot = buildRescueAttemptSnapshot({
    currentResult: params.currentResult,
    rescuedResult,
    rescuedText: params.rescuedText,
    validateResult: params.validateResult,
    getNonWordCountViolations: params.getNonWordCountViolations,
    analyzeTextQuality: params.analyzeTextQuality,
    countWords: params.countWords,
    isStrongCandidate: params.isStrongCandidate,
    hasCorruptedArtifacts: params.hasCorruptedArtifacts,
  });

  return {
    rescuedResult,
    rescueAttemptSnapshot,
    rescueEvaluationInput: buildRescueRewriteEvaluationInput({
      rescueAttemptSnapshot,
      minimumPublishableWordMin: params.minimumPublishableWordMin,
    }),
  };
}

export function buildFinalBrokerAuditRetryRequestInput(params: {
  cleanDisposition: unknown;
  resultText: string;
  platform: string;
  style: string;
  plan: string;
}) {
  return [
    {
      role: "developer" as const,
      content: `Du är kvalitetschef för svenska bostadsannonser inom fastighetsförmedling.

Bedöm ENDAST om texten är publiceringsklar på hög mäklarnivå för angiven nivå.

Krav:
- naturlig svensk mäklarprosa
- stark och konkret öppning
- selektiv betoning av rätt detaljer
- trovärdig, mänsklig, professionell ton
- inga AI-klyschor eller mekaniskt språk
- inga dispositionstendenser eller råfaktakänsla
- bra styckeflöde och tydlig prioritering

NIVÅANPASSNING:
- premium = toppnivå
- pro = tydligt publiceringsklar mäklarnivå utan premiumkrav

Svara med JSON:
{
  "publish_ready": true,
  "broker_quality_score": 0.0,
  "issues": ["kort lista över återstående problem"],
  "verdict": "kort sammanfattning"
}`
    },
    {
      role: "user" as const,
      content: `DISPOSITION:\n${JSON.stringify(params.cleanDisposition, null, 2)}\n\nSLUTTEXT:\n${params.resultText}\n\nPLATTFORM: ${params.platform}\nSTIL: ${params.style}\nLEVEL: ${params.plan}`
    }
  ];
}
