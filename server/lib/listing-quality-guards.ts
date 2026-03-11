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

export function applyStageQualityBudget(params: {
  improvementKind: RewriteAcceptanceInput["improvementKind"];
  beforeText: string;
  afterText: string;
  beforeWordCount: number;
  afterWordCount: number;
  beforeViolations: string[];
  afterViolations: string[];
  hasCorruptedArtifactsAfter: boolean;
  minimumPublishableWordMin: number;
}): QualityBudgetDecision {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const changeRatio = estimateTextChangeRatio(params.beforeText, params.afterText);

  const beforeHasParagraphs = /\n\s*\n/.test(params.beforeText);
  const afterHasParagraphs = /\n\s*\n/.test(params.afterText);
  const nearPublishableFloor = params.beforeWordCount >= params.minimumPublishableWordMin - 20;
  const violationDelta = params.afterViolations.length - params.beforeViolations.length;

  if (params.hasCorruptedArtifactsAfter) {
    blockingReasons.push("förslag innehåller korrupta ordartefakter");
  }

  if (beforeHasParagraphs && !afterHasParagraphs && params.afterWordCount >= 120) {
    blockingReasons.push("förslag tappade styckesindelning");
  }

  if (nearPublishableFloor && params.afterWordCount < params.beforeWordCount - 8) {
    blockingReasons.push("förslag kortade texten för mycket nära publicerbar nivå");
  }

  if (params.improvementKind === "surgical") {
    if (changeRatio > 0.6) {
      blockingReasons.push("surgical-förslag skrev om för stor del av texten");
    }
    if (violationDelta > 1) {
      blockingReasons.push("surgical-förslag introducerade för många nya fel");
    }
  }

  if (params.improvementKind === "fact_check" && violationDelta > 0) {
    blockingReasons.push("fact-check-förslag ökade antalet kvalitetsfel");
  }

  if (params.improvementKind === "expansion") {
    if (params.afterWordCount <= params.beforeWordCount) {
      blockingReasons.push("expansion ökade inte textens längd");
    }
    if (violationDelta > 2) {
      blockingReasons.push("expansion introducerade för många kvalitetsfel");
    }
  }

  if (changeRatio > 0.45 && params.improvementKind !== "expansion") {
    warnings.push("hög textändring i steg som normalt ska vara konservativa");
  }
  if (violationDelta === 1) {
    warnings.push("förslaget introducerade ett nytt kvalitetsfel");
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
