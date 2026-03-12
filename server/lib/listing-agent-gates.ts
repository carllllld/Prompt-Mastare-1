import { decideBrokerAuditStrategy, type BrokerAuditDecisionResult } from "./listing-decision-engine";
import { decideRecoveryAction, type RecoveryDecision } from "./listing-recovery-policy";
import type { ListingRunState } from "./listing-run-state";

export interface CandidateRecoveryGateResult {
  recoveryDecision: RecoveryDecision;
}

export interface BrokerAuditGateResult {
  brokerAuditDecision: BrokerAuditDecisionResult;
}

export interface LocalBrokerAuditFallback {
  publish_ready: boolean;
  broker_quality_score: number;
  issues: string[];
  verdict: string;
}

export interface FinalAuditRescueGateInput {
  publishReady: boolean | null | undefined;
  issues: unknown;
  hasUsableText: boolean;
}

export interface FinalAuditRescueGateResult {
  rescueIssues: string[];
  canAttemptRescue: boolean;
}

export interface CandidatePolishGateResult {
  shouldRunPolish: boolean;
}

export interface CandidateSelectionGateResult {
  wordShortfall: number;
  hasUsableText: boolean;
}

export function evaluateCandidateRecoveryGate(params: {
  runState: ListingRunState;
  hasUsableText: boolean;
  lastAttemptFailed?: boolean;
}): CandidateRecoveryGateResult {
  return {
    recoveryDecision: decideRecoveryAction({
      runState: params.runState,
      stage: "candidate_generation",
      hasUsableText: params.hasUsableText,
      issueCount: 0,
      lastAttemptFailed: params.lastAttemptFailed,
    }),
  };
}

export function evaluateBrokerAuditGate(params: {
  strongCandidateFastPath: boolean;
  finalMainWordCount: number;
  finalStrongWordFloor: number;
  finalGenericBrokerPhraseCount: number;
  finalNarrativeIntegrityIssueCount: number;
}): BrokerAuditGateResult {
  return {
    brokerAuditDecision: decideBrokerAuditStrategy({
      strongCandidateFastPath: params.strongCandidateFastPath,
      finalMainWordCount: params.finalMainWordCount,
      finalStrongWordFloor: params.finalStrongWordFloor,
      finalGenericBrokerPhraseCount: params.finalGenericBrokerPhraseCount,
      finalNarrativeIntegrityIssueCount: params.finalNarrativeIntegrityIssueCount,
    }),
  };
}

export function buildLocalBrokerAuditFallback(params: {
  publishReady: boolean;
  brokerQualityScore: number;
  reason: string;
  issues?: string[];
}): LocalBrokerAuditFallback {
  return {
    publish_ready: params.publishReady,
    broker_quality_score: Number(params.brokerQualityScore.toFixed(3)),
    issues: Array.isArray(params.issues) ? params.issues.slice(0, 5) : [],
    verdict: params.reason,
  };
}

export function evaluateFinalAuditRescueGate(params: FinalAuditRescueGateInput): FinalAuditRescueGateResult {
  const rescueIssues = Array.isArray(params.issues)
    ? params.issues.filter((issue): issue is string => typeof issue === "string" && issue.trim().length > 0).slice(0, 5)
    : [];

  return {
    rescueIssues,
    canAttemptRescue: params.publishReady === false && params.hasUsableText && rescueIssues.length > 0,
  };
}

export function evaluateCandidatePolishGate(params: {
  shouldTryPolish: boolean;
  loopNextAction: string | null | undefined;
  strongCandidateFastPath: boolean;
  qualityScore?: number;
  violationCount?: number;
}): CandidatePolishGateResult {
  const highQualityLowRisk = params.qualityScore !== undefined
    && params.qualityScore >= 0.86
    && (params.violationCount ?? 0) <= 1;
  const skipPolish = params.strongCandidateFastPath || highQualityLowRisk;

  return {
    shouldRunPolish: (params.shouldTryPolish || params.loopNextAction === "polish") && !skipPolish,
  };
}

export function evaluateCandidateSelectionGate(params: {
  minimumPublishableWordMin: number;
  candidateWordCount: number;
  hasUsableText: boolean;
}): CandidateSelectionGateResult {
  return {
    wordShortfall: Math.max(0, params.minimumPublishableWordMin - params.candidateWordCount),
    hasUsableText: params.hasUsableText,
  };
}
