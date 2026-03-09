import { describe, expect, it } from "vitest";
import { buildAgentCheckpointEvent, summarizeAgentRun } from "../lib/listing-agent-observability";
import { createListingRunState } from "../lib/listing-run-state";

describe("listing agent observability", () => {
  it("builds checkpoint events from issue and loop state", () => {
    const event = buildAgentCheckpointEvent({
      stage: "pre-fact-check",
      action: "evaluate whether fact-check should run",
      issueSummary: {
        severity: "medium",
        issues: ["Generisk öppning"],
        recommendedRepairStrategy: "opening_rewrite",
        nextAction: "fact_check",
        reason: "texten behöver fortsatt verifiering",
      },
      loopDecision: {
        nextAction: "fact_check",
        shouldContinue: true,
        reason: "texten behöver fortsatt verifiering",
      },
    });

    expect(event.stage).toBe("pre-fact-check");
    expect(event.issueCount).toBe(1);
    expect(event.nextAction).toBe("fact_check");
  });

  it("summarizes the run state", () => {
    const state = createListingRunState();
    state.selectedCandidateLabel = "broker";
    state.candidates.push({
      label: "broker",
      result: { improvedPrompt: "Text" },
      qualityScore: 0.9,
      nonWordCountViolations: [],
      wordCount: 230,
      weakHemnetDetailCount: 0,
      totalScore: 0.86,
    });
    state.lastRepairKind = "rescue";
    state.openIssues = ["Svagt lägesslut"];
    state.issueSummary = {
      severity: "medium",
      issues: ["Svagt lägesslut"],
      recommendedRepairStrategy: "location_rewrite",
      nextAction: "broker_audit",
      reason: "texten har räddats och bör nu slutgranskas",
    };

    const summary = summarizeAgentRun(state);
    expect(summary.selectedCandidateLabel).toBe("broker");
    expect(summary.candidateCount).toBe(1);
    expect(summary.lastRepairKind).toBe("rescue");
    expect(summary.finalNextAction).toBe("broker_audit");
  });
});
