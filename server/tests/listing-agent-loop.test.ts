import { describe, expect, it } from "vitest";
import { decideNextAgentAction } from "../lib/listing-agent-loop";
import { createListingRunState } from "../lib/listing-run-state";

describe("listing agent loop", () => {
  it("stops when no issue summary exists", () => {
    const runState = createListingRunState();

    const decision = decideNextAgentAction({
      runState,
      issueSummary: null,
    });

    expect(decision.nextAction).toBe("none");
    expect(decision.shouldContinue).toBe(false);
  });

  it("continues to broker audit when issue summary requires it", () => {
    const runState = createListingRunState();

    const decision = decideNextAgentAction({
      runState,
      issueSummary: {
        severity: "low",
        issues: [],
        recommendedRepairStrategy: "surgical_cleanup",
        nextAction: "broker_audit",
        reason: "extern slutgranskning behövs",
      },
    });

    expect(decision.nextAction).toBe("broker_audit");
    expect(decision.shouldContinue).toBe(true);
  });

  it("prevents repeated fact-check loops after fact-check already ran", () => {
    const runState = createListingRunState();
    runState.lastRepairKind = "fact_check";

    const decision = decideNextAgentAction({
      runState,
      issueSummary: {
        severity: "medium",
        issues: ["Generisk öppning"],
        recommendedRepairStrategy: "opening_rewrite",
        nextAction: "fact_check",
        reason: "behöver verifieras",
      },
    });

    expect(decision.nextAction).toBe("fact_check");
    expect(decision.shouldContinue).toBe(false);
  });

  it("prevents repeated surgical loops after surgical repair already ran", () => {
    const runState = createListingRunState();
    runState.lastRepairKind = "surgical";

    const decision = decideNextAgentAction({
      runState,
      issueSummary: {
        severity: "high",
        issues: ["Trasigt ord"],
        recommendedRepairStrategy: "narrative_repair",
        nextAction: "surgical_repair",
        reason: "måste repareras",
      },
    });

    expect(decision.nextAction).toBe("surgical_repair");
    expect(decision.shouldContinue).toBe(false);
  });
});
