import { decideNextAgentAction, type AgentLoopDecision } from "./listing-agent-loop";
import { evaluateListingIssues, type ListingIssueSummary } from "./listing-issue-evaluator";
import type { ListingRunState } from "./listing-run-state";

export interface ListingLoopCheckpointResult {
  issueSummary: ListingIssueSummary;
  loopDecision: AgentLoopDecision;
}

export function evaluateLoopCheckpoint(params: {
  runState: ListingRunState;
  currentViolations: string[];
  wordShortfall?: number;
  genericBrokerPhraseCount?: number;
  narrativeIntegrityIssues?: string[];
  requiresBrokerAudit?: boolean;
  factCheckAvailable?: boolean;
}): ListingLoopCheckpointResult {
  const issueSummary = evaluateListingIssues({
    runState: params.runState,
    currentViolations: params.currentViolations,
    wordShortfall: params.wordShortfall,
    genericBrokerPhraseCount: params.genericBrokerPhraseCount,
    narrativeIntegrityIssues: params.narrativeIntegrityIssues,
    requiresBrokerAudit: params.requiresBrokerAudit,
    factCheckAvailable: params.factCheckAvailable,
  });

  const loopDecision = decideNextAgentAction({
    runState: params.runState,
    issueSummary,
  });

  return {
    issueSummary,
    loopDecision,
  };
}
