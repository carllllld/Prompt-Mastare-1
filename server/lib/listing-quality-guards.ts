import type { RewriteAcceptanceInput } from "./listing-decision-engine";

export interface QualityBudgetDecision {
  accept: boolean;
  blockingReasons: string[];
  warnings: string[];
  changeRatio: number;
}

export interface FinalGateABReport {
  baselinePass: boolean;
  strictPass: boolean;
  tolerantPass: boolean;
  recommendation: "baseline" | "strict" | "tolerant" | "manual_review";
  notes: string[];
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-zåäö0-9]+/i)
    .filter(Boolean);
}

export function estimateTextChangeRatio(beforeText: string, afterText: string): number {
  const beforeTokens = tokenize(beforeText);
  const afterTokens = tokenize(afterText);
  if (beforeTokens.length === 0 && afterTokens.length === 0) return 0;
  if (beforeTokens.length === 0 || afterTokens.length === 0) return 1;

  const beforeSet = new Set(beforeTokens);
  const afterSet = new Set(afterTokens);
  let overlap = 0;
  for (const token of beforeSet) {
    if (afterSet.has(token)) overlap++;
  }

  const unionSize = new Set([...beforeSet, ...afterSet]).size || 1;
  return 1 - overlap / unionSize;
}

// OPTIMIZED: Reduced from 8 → 3 blocking reasons. Focus on critical issues only.
// This allows improvements to proceed even if they're not perfect, as long as they don't break the text.
export function applyStageQualityBudget(params: {
  improvementKind: RewriteAcceptanceInput["improvementKind"];
  beforeText: string;
  afterText: string;
  beforeWordCount: number;
  afterWordCount: number;
  beforeViolations: string[];
  afterViolations: string[];
  beforeQualityScore?: number;
  afterQualityScore?: number;
  hasCorruptedArtifactsAfter: boolean;
  minimumPublishableWordMin: number;
}): QualityBudgetDecision {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const changeRatio = estimateTextChangeRatio(params.beforeText, params.afterText);

  const beforeHasParagraphs = /\n\s*\n/.test(params.beforeText);
  const afterHasParagraphs = /\n\s*\n/.test(params.afterText);
  const violationDelta = params.afterViolations.length - params.beforeViolations.length;

  // === BLOCKING REASON 1: Corrupted artifacts (CRITICAL) ===
  if (params.hasCorruptedArtifactsAfter) {
    blockingReasons.push("förslag innehåller korrupta ordartefakter");
  }

  // === BLOCKING REASON 2: Lost paragraph structure (CRITICAL) ===
  if (beforeHasParagraphs && !afterHasParagraphs && params.afterWordCount >= 120) {
    blockingReasons.push("förslag tappade styckesindelning");
  }

  // === BLOCKING REASON 3: Introduced >2 new violations (CRITICAL) ===
  // Allow improvements that reduce violations OR add max 2 violations
  if (violationDelta > 2) {
    blockingReasons.push(`förslag introducerade ${violationDelta} nya kvalitetsfel (max 2 tillåtet)`);
  }

  // === WARNINGS (non-blocking, informational only) ===
  if (changeRatio > 0.5 && params.improvementKind !== "expansion") {
    warnings.push("hög textändring i konservativt steg");
  }
  if (violationDelta === 1 || violationDelta === 2) {
    warnings.push(`förslaget introducerade ${violationDelta} nya kvalitetsfel`);
  }
  const hasQualitySignals = typeof params.beforeQualityScore === "number" && typeof params.afterQualityScore === "number";
  const qualityDrop = hasQualitySignals ? (params.beforeQualityScore! - params.afterQualityScore!) : 0;
  if (qualityDrop > 0.03) {
    warnings.push(`kvalitetspoäng sjönk med ${qualityDrop.toFixed(3)}`);
  }

  return {
    accept: blockingReasons.length === 0,
    blockingReasons,
    warnings,
    changeRatio,
  };
}

export function evaluateFinalGateAB(params: {
  wordCount: number;
  minimumPublishableWordMin: number;
  nonWordViolationCount: number;
  narrativeIssueCount: number;
  hasParagraphs: boolean;
  brokerQualityScore: number;
  analyzedQualityScore: number;
}): FinalGateABReport {
  const baselinePass = params.wordCount >= params.minimumPublishableWordMin
    && params.nonWordViolationCount === 0
    && params.narrativeIssueCount === 0;

  const strictPass = baselinePass
    && params.hasParagraphs
    && params.brokerQualityScore >= 0.8
    && params.analyzedQualityScore >= 0.82;

  const tolerantPass = params.wordCount >= Math.max(120, params.minimumPublishableWordMin - 15)
    && params.nonWordViolationCount <= 1
    && params.narrativeIssueCount === 0
    && params.brokerQualityScore >= 0.72;

  const notes: string[] = [];
  if (!params.hasParagraphs && params.wordCount >= 120) notes.push("saknar stycken i lång text");
  if (params.nonWordViolationCount > 0) notes.push("har kvarvarande kvalitetsfel");
  if (params.brokerQualityScore < 0.8) notes.push("broker_quality_score under strikt nivå");

  let recommendation: FinalGateABReport["recommendation"] = "baseline";
  if (strictPass && !baselinePass) recommendation = "strict";
  else if (!baselinePass && tolerantPass) recommendation = "tolerant";
  else if (!baselinePass && !tolerantPass) recommendation = "manual_review";

  return {
    baselinePass,
    strictPass,
    tolerantPass,
    recommendation,
    notes,
  };
}
