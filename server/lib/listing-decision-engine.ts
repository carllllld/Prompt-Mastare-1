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
}

export interface BrokerAuditDecisionResult {
  canSkipExternalAudit: boolean;
  reason: string;
}

function getQualityThreshold(plan: PlanType): number {
  if (plan === "premium") return 0.88;
  if (plan === "pro") return 0.84;
  return 0.79;
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
  const selected = judged || fallback;

  const publishable = selected.wordCount >= blueprint.qualityThresholds.minimumPublishableWordMin;
  const cleanEnough = selected.nonWordCountViolations.length === 0;
  const highQuality = selected.qualityScore >= getQualityThreshold(plan);
  const weakDetailPenalty = selected.weakHemnetDetailCount > 1;
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

  // NOTE: hasCorruptedArtifacts check REMOVED - it was causing false positives
  // Quality metrics (score, violations) are sufficient to judge text quality
  // The regex patterns were flagging legitimate Swedish text as "corrupted"

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

  if (improvementKind === "expansion") {
    // For expansion, we prioritize word count over minor violations
    // The goal is to reach minimum publishable word count
    if (proposed.wordCount <= current.wordCount) {
      return { accept: false, reason: "expansion did not increase text length" };
    }
    // Accept expansion if it adds words, even if it adds 1-2 minor violations
    // This is critical for short texts that need to reach publishable minimum
    const wordGain = proposed.wordCount - current.wordCount;
    const violationIncrease = proposedViolationCount - currentViolationCount;

    if (wordGain >= 20 && violationIncrease <= 2) {
      return { accept: true, reason: "expansion added significant length with acceptable violation increase" };
    }
    if (violationIncrease > 2) {
      return { accept: false, reason: "expansion introduced too many violations" };
    }
    return { accept: true, reason: "expansion improved length without worsening quality significantly" };
  }

  if (improvementKind === "surgical") {
    if (improvesViolations) {
      return { accept: true, reason: "surgical rewrite removed violations" };
    }
    return { accept: false, reason: "surgical rewrite did not improve violations enough" };
  }

  if (improvementKind === "fact_check") {
    if (proposedViolationCount > currentViolationCount) {
      return { accept: false, reason: "fact-check rewrite introduced more violations" };
    }
    if (keepsViolationsFlat && !doesNotHurtScore) {
      return { accept: false, reason: "fact-check rewrite lowered quality without improving violations" };
    }
    return { accept: true, reason: "fact-check rewrite preserved or improved quality" };
  }

  if (improvementKind === "rescue") {
    // For rescue, we accept if quality improves significantly, even with minor artifacts
    // The rescue is a last-ditch effort to save a failing text
    if (proposedViolationCount > currentViolationCount + 1) {
      return { accept: false, reason: "rescue rewrite significantly worsened violations" };
    }
    // Accept if violations are same or better, or if score improves meaningfully
    if (proposedViolationCount <= currentViolationCount || proposed.qualityScore > current.qualityScore + 0.05) {
      return { accept: true, reason: "rescue rewrite improved or preserved deliverability" };
    }
    return { accept: false, reason: "rescue rewrite did not improve enough to justify keeping" };
  }

  if (improvesViolations || (keepsViolationsFlat && improvesScoreMeaningfully)) {
    return { accept: true, reason: `${improvementKind} improved the text enough to keep` };
  }

  return { accept: false, reason: `${improvementKind} did not improve quality enough` };
}

export function decideBrokerAuditStrategy(input: BrokerAuditDecisionInput): BrokerAuditDecisionResult {
  const canSkipExternalAudit = input.strongCandidateFastPath
    && input.finalMainWordCount >= input.finalStrongWordFloor
    && input.finalGenericBrokerPhraseCount === 0
    && input.finalNarrativeIntegrityIssueCount === 0;

  return {
    canSkipExternalAudit,
    reason: canSkipExternalAudit
      ? "strong local candidate satisfies top-broker criteria"
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
