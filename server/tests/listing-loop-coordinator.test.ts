import { describe, expect, it } from "vitest";
import { evaluateLoopCheckpoint } from "../lib/listing-loop-coordinator";
import { createListingRunState } from "../lib/listing-run-state";

describe("listing loop coordinator", () => {
  it("returns broker-audit loop decision for clean text that still needs external review", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Ren text" };

    const checkpoint = evaluateLoopCheckpoint({
      runState,
      currentViolations: [],
      requiresBrokerAudit: true,
    });

    expect(checkpoint.issueSummary.nextAction).toBe("broker_audit");
    expect(checkpoint.loopDecision.nextAction).toBe("broker_audit");
    expect(checkpoint.loopDecision.shouldContinue).toBe(true);
  });

  it("returns expansion decision when text is too short", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Kort text" };

    const checkpoint = evaluateLoopCheckpoint({
      runState,
      currentViolations: ["För få ord"],
      wordShortfall: 35,
      genericBrokerPhraseCount: 1,
    });

    expect(checkpoint.issueSummary.recommendedRepairStrategy).toBe("length_expansion");
    expect(checkpoint.loopDecision.nextAction).toBe("expand");
  });

  it("falls back to local repair when fact-check already ran", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Text" };
    runState.lastRepairKind = "fact_check";

    const checkpoint = evaluateLoopCheckpoint({
      runState,
      currentViolations: ["Generisk öppning"],
      factCheckAvailable: true,
    });

    expect(checkpoint.issueSummary.nextAction).toBe("surgical_repair");
    expect(checkpoint.loopDecision.nextAction).toBe("surgical_repair");
    expect(checkpoint.loopDecision.shouldContinue).toBe(true);
  });
});
