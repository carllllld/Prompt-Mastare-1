import type { AgentLoopDecision } from "./listing-agent-loop";
import type { ListingIssueSummary } from "./listing-issue-evaluator";
import type { ListingRunState } from "./listing-run-state";

export interface AgentCheckpointEvent {
  stage: string;
  action: string;
  reason: string;
  issueCount: number;
  nextAction: string;
}

export interface AgentRunSummary {
  selectedCandidateLabel: string | null;
  candidateCount: number;
  lastRepairKind: string | null;
  openIssueCount: number;
  finalNextAction: string;
}

export function buildAgentCheckpointEvent(params: {
  stage: string;
  action: string;
  issueSummary: ListingIssueSummary | null;
  loopDecision: AgentLoopDecision | null;
}): AgentCheckpointEvent {
  return {
    stage: params.stage,
    action: params.action,
    reason: params.loopDecision?.reason || params.issueSummary?.reason || "ingen explicit motivering",
    issueCount: params.issueSummary?.issues.length || 0,
    nextAction: params.loopDecision?.nextAction || params.issueSummary?.nextAction || "none",
  };
}

export function summarizeAgentRun(state: ListingRunState): AgentRunSummary {
  return {
    selectedCandidateLabel: state.selectedCandidateLabel,
    candidateCount: state.candidates.length,
    lastRepairKind: state.lastRepairKind,
    openIssueCount: state.openIssues.length,
    finalNextAction: state.issueSummary?.nextAction || "none",
  };
}
