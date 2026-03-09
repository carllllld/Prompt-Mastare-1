import type { ListingIssueSummary, ListingNextAction } from "./listing-issue-evaluator";
import type { ListingRunState } from "./listing-run-state";

export interface AgentLoopDecision {
  nextAction: ListingNextAction;
  shouldContinue: boolean;
  reason: string;
}

export function decideNextAgentAction(params: {
  runState: ListingRunState;
  issueSummary: ListingIssueSummary | null;
}): AgentLoopDecision {
  const issueSummary = params.issueSummary;

  if (!issueSummary) {
    return {
      nextAction: "none",
      shouldContinue: false,
      reason: "ingen issuesummary tillgänglig",
    };
  }

  if (issueSummary.nextAction === "none") {
    return {
      nextAction: "none",
      shouldContinue: false,
      reason: issueSummary.reason,
    };
  }

  if (issueSummary.nextAction === "broker_audit") {
    return {
      nextAction: "broker_audit",
      shouldContinue: true,
      reason: issueSummary.reason,
    };
  }

  if (issueSummary.nextAction === "fact_check") {
    return {
      nextAction: "fact_check",
      shouldContinue: params.runState.lastRepairKind !== "fact_check",
      reason: issueSummary.reason,
    };
  }

  if (issueSummary.nextAction === "expand") {
    return {
      nextAction: "expand",
      shouldContinue: true,
      reason: issueSummary.reason,
    };
  }

  if (issueSummary.nextAction === "surgical_repair") {
    return {
      nextAction: "surgical_repair",
      shouldContinue: params.runState.lastRepairKind !== "surgical",
      reason: issueSummary.reason,
    };
  }

  return {
    nextAction: issueSummary.nextAction,
    shouldContinue: true,
    reason: issueSummary.reason,
  };
}
