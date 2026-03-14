import type { PlanType } from "@shared/schema";
import type { WritingStyle, ListingGenerationBlueprint } from "./listing-orchestrator";

export interface CandidateSnapshot {
  label: string;
  qualityScore: number;
  nonWordCountViolations: string[];
  wordCount: number;
  weakHemnetDetailCount: number;
  totalScore: number;
}

export interface TextSnapshot {
  qualityScore: number;
  nonWordCountViolations: string[];
  wordCount: number;
  isStrongPublishableCandidate: boolean;
  hasCorruptedArtifacts?: boolean;
}

export interface CandidateSelectionResult {
  selectedLabel: string;
  canSkipPolish: boolean;
  shouldTryPolish: boolean;
  strategy: "accept" | "polish";
}

export interface RewriteAcceptanceInput {
  current: TextSnapshot;
  proposed: TextSnapshot;
  minimumPublishableWordMin: number;
  improvementKind: "polish" | "surgical" | "expansion" | "fact_check" | "rescue";
}

export interface RewriteAcceptanceResult {
  accept: boolean;
  reason: string;
}

export interface BrokerAuditDecisionInput {
  strongCandidateFastPath: boolean;
  finalMainWordCount: number;
  finalStrongWordFloor: number;
  finalGenericBrokerPhraseCount: number;
  finalNarrativeIntegrityIssueCount: number;
  finalExtraFieldViolationCount?: number;
  blueprintCoverageRatio?: number;
  inputSignalCoverageRatio?: number;
  missingCriticalSignalCount?: number;
  localNonWordViolationCount?: number;
  analyzedQualityScore?: number;
}

export interface BrokerAuditDecisionResult {
  canSkipExternalAudit: boolean;
  reason: string;
}

function getQualityThreshold(plan: PlanType): number {
  if (plan === "premium") return 0.92; // Increased from 0.88
  if (plan === "pro") return 0.85; // Increased from 0.84
  return 0.80; // Increased from 0.79
}

export function chooseBestCandidate(
  candidates: CandidateSnapshot[],
  plan: PlanType,
  blueprint: ListingGenerationBlueprint,
  judgeChoiceLabel?: string | null,
): CandidateSelectionResult {
  const fallback = [...candidates].sort((a, b) => b.totalScore - a.totalScore)[0];
  const judged = judgeChoiceLabel
    ? candidates.find((candidate) => candidate.label === judgeChoiceLabel)
    : null;
  const judgedPenalty = judged ? (judged.nonWordCountViolations.length - fallback.nonWordCountViolations.length) : 0;
  const judgedQualityDelta = judged ? (judged.qualityScore - fallback.qualityScore) : 0;
  const shouldOverrideJudged = Boolean(judged)
    && judgedPenalty >= 2
    && judgedQualityDelta < 0.04;
  const selected = shouldOverrideJudged ? fallback : (judged || fallback);

  const publishable = selected.wordCount >= blueprint.qualityThresholds.minimumPublishableWordMin;
  const cleanEnough = selected.nonWordCountViolations.length === 0;
  const highQuality = selected.qualityScore >= getQualityThreshold(plan);
  // Stricter check: any weak detail is a penalty for premium
  const weakDetailPenalty = plan === 'premium' ? selected.weakHemnetDetailCount > 0 : selected.weakHemnetDetailCount > 1;
  const canSkipPolish = publishable && cleanEnough && highQuality && !weakDetailPenalty;

  return {
    selectedLabel: selected.label,
    canSkipPolish,
    shouldTryPolish: !canSkipPolish,
    strategy: canSkipPolish ? "accept" : "polish",
  };
}

export function decideRewriteAcceptance(input: RewriteAcceptanceInput): RewriteAcceptanceResult {
  const { current, proposed, minimumPublishableWordMin, improvementKind } = input;

  const currentViolationCount = current.nonWordCountViolations.length;
  const proposedViolationCount = proposed.nonWordCountViolations.length;
  const improvesViolations = proposedViolationCount < currentViolationCount;
  const keepsViolationsFlat = proposedViolationCount === currentViolationCount;
  const improvesScoreMeaningfully = proposed.qualityScore >= current.qualityScore + 0.03;
  const doesNotHurtScore = proposed.qualityScore >= current.qualityScore - 0.02;
  const currentPublishable = current.wordCount >= minimumPublishableWordMin;
  const dropsBelowPublishable = currentPublishable && proposed.wordCount < minimumPublishableWordMin;

  if (dropsBelowPublishable) {
    return { accept: false, reason: `${improvementKind} drops text below publishable floor` };
  }

  // Expansion: More tolerant to minor issues if word count increases significantly.
  if (improvementKind === "expansion") {
    if (proposed.wordCount <= current.wordCount) {
      return { accept: false, reason: "expansion did not increase text length" };
    }
    const wordGain = proposed.wordCount - current.wordCount;
    const violationIncrease = proposedViolationCount - currentViolationCount;
    if (wordGain >= 15 && violationIncrease <= 2) {
      return { accept: true, reason: "expansion added significant length with acceptable violation increase" };
    }
    if (violationIncrease > 1) {
      return { accept: false, reason: "expansion introduced too many new violations" };
    }
    return { accept: true, reason: "expansion improved length without worsening quality significantly" };
  }

  // Surgical/Polish: Must improve quality, but can tolerate a minor score drop if violations are fixed.
  if (improvementKind === "surgical" || improvementKind === "polish") {
    if (improvesViolations && doesNotHurtScore) {
      return { accept: true, reason: `${improvementKind} removed violations without significant score drop` };
    }
    if (improvesViolations && proposed.qualityScore > 0.75) {
        return { accept: true, reason: `${improvementKind} removed violations and score is still acceptable` };
    }
    if (keepsViolationsFlat && improvesScoreMeaningfully) {
        return { accept: true, reason: `${improvementKind} improved score meaningfully without adding violations` };
    }
    return { accept: false, reason: `${improvementKind} did not provide enough quality improvement` };
  }

  // Fact Check: High priority on not introducing new issues.
  if (improvementKind === "fact_check") {
    if (proposedViolationCount > currentViolationCount) {
      return { accept: false, reason: "fact-check rewrite introduced new violations" };
    }
    if (keepsViolationsFlat && !doesNotHurtScore) {
      return { accept: false, reason: "fact-check rewrite lowered quality without improving violations" };
    }
    return { accept: true, reason: "fact-check rewrite preserved or improved quality" };
  }

  // Rescue: Most lenient. The goal is to get *something* usable.
  if (improvementKind === "rescue") {
    if (proposed.qualityScore > current.qualityScore + 0.1) {
        return { accept: true, reason: "rescue rewrite significantly improved quality score" };
    }
    if (proposedViolationCount <= currentViolationCount + 1 && proposed.wordCount >= minimumPublishableWordMin) {
      return { accept: true, reason: "rescue rewrite produced a publishable text" };
    }
    return { accept: false, reason: "rescue rewrite did not produce a usable text" };
  }

  // Default catch-all
  if (improvesViolations || (keepsViolationsFlat && improvesScoreMeaningfully)) {
    return { accept: true, reason: `${improvementKind} improved the text enough to keep` };
  }

  return { accept: false, reason: `${improvementKind} did not improve quality enough` };
}

export function decideBrokerAuditStrategy(input: BrokerAuditDecisionInput): BrokerAuditDecisionResult {
  const extraFieldViolationCount = typeof input.finalExtraFieldViolationCount === "number" ? input.finalExtraFieldViolationCount : 0;
  const blueprintCoverageRatio = typeof input.blueprintCoverageRatio === "number" ? input.blueprintCoverageRatio : 1;
  const inputSignalCoverageRatio = typeof input.inputSignalCoverageRatio === "number" ? input.inputSignalCoverageRatio : 1;
  const missingCriticalSignalCount = typeof input.missingCriticalSignalCount === "number" ? input.missingCriticalSignalCount : 0;
  const localNonWordViolationCount = typeof input.localNonWordViolationCount === "number" ? input.localNonWordViolationCount : 0;
  const analyzedQualityScore = typeof input.analyzedQualityScore === "number" ? input.analyzedQualityScore : 0;

  const strictTopBrokerSkip = input.strongCandidateFastPath
    && input.finalMainWordCount >= input.finalStrongWordFloor
    && input.finalGenericBrokerPhraseCount === 0
    && input.finalNarrativeIntegrityIssueCount === 0
    && extraFieldViolationCount === 0
    && blueprintCoverageRatio >= 0.7
    && inputSignalCoverageRatio >= 0.55
    && missingCriticalSignalCount === 0;
  const strongLocalSkip = input.finalMainWordCount >= input.finalStrongWordFloor
    && input.finalGenericBrokerPhraseCount <= 1
    && input.finalNarrativeIntegrityIssueCount === 0
    && extraFieldViolationCount === 0
    && localNonWordViolationCount === 0
    && blueprintCoverageRatio >= 0.75
    && inputSignalCoverageRatio >= 0.6
    && missingCriticalSignalCount === 0
    && analyzedQualityScore >= 0.82;
  const canSkipExternalAudit = strictTopBrokerSkip || strongLocalSkip;

  return {
    canSkipExternalAudit,
    reason: canSkipExternalAudit
      ? (strictTopBrokerSkip ? "strong local candidate satisfies top-broker criteria" : "strong local candidate satisfies calibrated local quality criteria")
      : "external broker audit required because local top-broker criteria are not fully satisfied",
  };
}

export function summarizeAgentStageDecision(params: {
  stage: string;
  action: string;
  reason: string;
}): string {
  return `[Agent Decision:${params.stage}] ${params.action} — ${params.reason}`;
}
