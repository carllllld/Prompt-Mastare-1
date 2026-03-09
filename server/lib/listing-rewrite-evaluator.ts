import { decideRewriteAcceptance, type RewriteAcceptanceInput, type RewriteAcceptanceResult, type TextSnapshot } from "./listing-decision-engine";

export interface RewriteEvaluationResult {
  currentSnapshot: TextSnapshot;
  proposedSnapshot: TextSnapshot;
  acceptance: RewriteAcceptanceResult;
}

export function evaluateRewriteCandidate(input: RewriteAcceptanceInput): RewriteEvaluationResult {
  const acceptance = decideRewriteAcceptance(input);

  return {
    currentSnapshot: input.current,
    proposedSnapshot: input.proposed,
    acceptance,
  };
}
