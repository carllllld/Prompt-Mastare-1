import type { ListingRunState } from "./listing-run-state";

export type RecoveryAction = "continue" | "rescue" | "stop";

export interface RecoveryDecision {
  action: RecoveryAction;
  reason: string;
}

export function decideRecoveryAction(params: {
  runState: ListingRunState;
  stage: "candidate_generation" | "local_repair" | "final_audit";
  hasUsableText: boolean;
  issueCount: number;
  hasNarrativeIssues?: boolean;
  lastAttemptFailed?: boolean;
}): RecoveryDecision {
  if (!params.hasUsableText) {
    return {
      action: params.stage === "candidate_generation" ? "rescue" : "stop",
      reason: params.stage === "candidate_generation"
        ? "ingen användbar text finns ännu; försök ett rescue-spår"
        : "ingen användbar text återstår på detta steg",
    };
  }

  if (params.stage === "final_audit" && (params.issueCount > 0 || params.hasNarrativeIssues)) {
    return {
      action: "rescue",
      reason: "slutgranskningen visar kvarvarande problem; försök rescue rewrite",
    };
  }

  if (params.stage === "local_repair" && params.lastAttemptFailed && params.issueCount > 0) {
    return {
      action: "continue",
      reason: "lokal repair förbättrade inte nog, men texten är fortfarande användbar för nästa steg",
    };
  }

  return {
    action: "continue",
    reason: "ingen recovery-eskalering behövs just nu",
  };
}
