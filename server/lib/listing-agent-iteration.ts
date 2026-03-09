import { buildAgentCheckpointEvent, type AgentCheckpointEvent } from "./listing-agent-observability";
import type { ListingNextAction } from "./listing-issue-evaluator";
import { evaluateLoopCheckpoint, type ListingLoopCheckpointResult } from "./listing-loop-coordinator";
import { decideRecoveryAction, type RecoveryDecision } from "./listing-recovery-policy";
import { setIssueSummary, setOpenIssues, type ListingRunState } from "./listing-run-state";

export interface ListingAgentIterationResult {
  checkpoint: ListingLoopCheckpointResult;
  recoveryDecision: RecoveryDecision;
  checkpointEvent: AgentCheckpointEvent;
}

export function runAgentIteration(params: {
  runState: ListingRunState;
  stage: string;
  actionLabel: string;
  currentViolations: string[];
  wordShortfall?: number;
  genericBrokerPhraseCount?: number;
  narrativeIntegrityIssues?: string[];
  requiresBrokerAudit?: boolean;
  factCheckAvailable?: boolean;
  recoveryStage?: "candidate_generation" | "local_repair" | "final_audit";
  hasUsableText?: boolean;
  lastAttemptFailed?: boolean;
  syncRunState?: boolean;
  overrideEventNextAction?: ListingNextAction;
}): ListingAgentIterationResult {
  const checkpoint = evaluateLoopCheckpoint({
    runState: params.runState,
    currentViolations: params.currentViolations,
    wordShortfall: params.wordShortfall,
    genericBrokerPhraseCount: params.genericBrokerPhraseCount,
    narrativeIntegrityIssues: params.narrativeIntegrityIssues,
    requiresBrokerAudit: params.requiresBrokerAudit,
    factCheckAvailable: params.factCheckAvailable,
  });

  const recoveryDecision = decideRecoveryAction({
    runState: params.runState,
    stage: params.recoveryStage || "local_repair",
    hasUsableText: params.hasUsableText ?? true,
    issueCount: checkpoint.issueSummary.issues.length,
    hasNarrativeIssues: (params.narrativeIntegrityIssues || []).length > 0,
    lastAttemptFailed: params.lastAttemptFailed,
  });

  const checkpointEvent = buildAgentCheckpointEvent({
    stage: params.stage,
    action: params.actionLabel,
    issueSummary: checkpoint.issueSummary,
    loopDecision: params.overrideEventNextAction
      ? {
        ...checkpoint.loopDecision,
        nextAction: params.overrideEventNextAction,
      }
      : checkpoint.loopDecision,
  });

  if (params.syncRunState) {
    setOpenIssues(params.runState, params.currentViolations);
    setIssueSummary(params.runState, checkpoint.issueSummary);
  }

  return {
    checkpoint,
    recoveryDecision,
    checkpointEvent,
  };
}
