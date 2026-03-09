import type { ListingRunState } from "./listing-run-state";
import { selectRepairStrategy, type ListingRepairStrategy } from "./listing-repair-strategies";

export type ListingNextAction =
  | "none"
  | "polish"
  | "surgical_repair"
  | "expand"
  | "fact_check"
  | "broker_audit"
  | "rescue_rewrite";

export interface ListingIssueSummary {
  severity: "low" | "medium" | "high";
  issues: string[];
  recommendedRepairStrategy: ListingRepairStrategy;
  nextAction: ListingNextAction;
  reason: string;
}

function uniqueIssues(issues: string[]): string[] {
  return issues.filter((issue, index) => issues.findIndex((candidate) => candidate === issue) === index);
}

export function evaluateListingIssues(params: {
  runState: ListingRunState;
  currentViolations: string[];
  wordShortfall?: number;
  genericBrokerPhraseCount?: number;
  narrativeIntegrityIssues?: string[];
  requiresBrokerAudit?: boolean;
  factCheckAvailable?: boolean;
}): ListingIssueSummary {
  const currentViolations = params.currentViolations || [];
  const narrativeIssues = params.narrativeIntegrityIssues || [];
  const genericIssueCount = params.genericBrokerPhraseCount || 0;
  const wordShortfall = Math.max(0, params.wordShortfall || 0);
  const mergedIssues = uniqueIssues([
    ...currentViolations,
    ...narrativeIssues,
    ...(genericIssueCount > 0 ? [`För många generiska mäklarabstraktioner (${genericIssueCount})`] : []),
  ]);

  const repairSelection = selectRepairStrategy({
    violations: mergedIssues,
    text: params.runState.result?.improvedPrompt || params.runState.baseline?.text || "",
    shortfallWords: wordShortfall,
  });

  if (mergedIssues.length === 0) {
    if (params.requiresBrokerAudit) {
      return {
        severity: "low",
        issues: [],
        recommendedRepairStrategy: repairSelection.primary,
        nextAction: "broker_audit",
        reason: "texten är lokalt ren men behöver extern slutgranskning",
      };
    }

    return {
      severity: "low",
      issues: [],
      recommendedRepairStrategy: repairSelection.primary,
      nextAction: "none",
      reason: "inga öppna kvalitetsproblem identifierades",
    };
  }

  if (narrativeIssues.length > 0) {
    return {
      severity: "high",
      issues: mergedIssues,
      recommendedRepairStrategy: repairSelection.primary,
      nextAction: "surgical_repair",
      reason: "narrativ integritet eller ordartefakter måste repareras före vidare steg",
    };
  }

  if (wordShortfall > 0) {
    return {
      severity: wordShortfall > 30 ? "high" : "medium",
      issues: mergedIssues,
      recommendedRepairStrategy: repairSelection.primary,
      nextAction: "expand",
      reason: "texten är för kort för publicerbar leverans och behöver utökning",
    };
  }

  if (params.factCheckAvailable && params.runState.lastRepairKind !== "fact_check") {
    return {
      severity: "medium",
      issues: mergedIssues,
      recommendedRepairStrategy: repairSelection.primary,
      nextAction: "fact_check",
      reason: "texten behöver fortsatt verifiering och eventuell faktabunden omskrivning",
    };
  }

  return {
    severity: mergedIssues.length >= 3 ? "high" : "medium",
    issues: mergedIssues,
    recommendedRepairStrategy: repairSelection.primary,
    nextAction: params.runState.lastRepairKind === "rescue" ? "broker_audit" : "surgical_repair",
    reason: params.runState.lastRepairKind === "rescue"
      ? "texten har räddats och bör nu slutgranskas"
      : "kvarvarande kvalitetsproblem bör repareras lokalt innan nästa steg",
  };
}
