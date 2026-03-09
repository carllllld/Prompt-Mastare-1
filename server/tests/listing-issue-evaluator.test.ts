import { describe, expect, it } from "vitest";
import { evaluateListingIssues } from "../lib/listing-issue-evaluator";
import { createListingRunState } from "../lib/listing-run-state";

describe("listing issue evaluator", () => {
  it("recommends broker audit when there are no open issues but external review is still needed", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Ren text" };

    const summary = evaluateListingIssues({
      runState,
      currentViolations: [],
      requiresBrokerAudit: true,
    });

    expect(summary.nextAction).toBe("broker_audit");
    expect(summary.severity).toBe("low");
  });

  it("prioritizes surgical repair for narrative integrity issues", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Trasig text" };

    const summary = evaluateListingIssues({
      runState,
      currentViolations: ['Trasigt ord med inbakad "för att"-artefakt'],
      narrativeIntegrityIssues: ['Avhuggen eller felaktigt sammanfogad mening'],
      factCheckAvailable: true,
    });

    expect(summary.nextAction).toBe("surgical_repair");
    expect(summary.recommendedRepairStrategy).toBe("narrative_repair");
    expect(summary.severity).toBe("high");
  });

  it("prioritizes expansion when text is below publishable length", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Kort text" };

    const summary = evaluateListingIssues({
      runState,
      currentViolations: ["För få ord"],
      wordShortfall: 22,
      genericBrokerPhraseCount: 1,
    });

    expect(summary.nextAction).toBe("expand");
    expect(summary.recommendedRepairStrategy).toBe("length_expansion");
  });

  it("recommends fact-check when non-narrative issues remain and fact-check is still available", () => {
    const runState = createListingRunState();
    runState.result = { improvedPrompt: "Text som behöver verifiering" };

    const summary = evaluateListingIssues({
      runState,
      currentViolations: ["Generisk öppning utan tydlig stark detalj"],
      genericBrokerPhraseCount: 1,
      factCheckAvailable: true,
    });

    expect(summary.nextAction).toBe("fact_check");
    expect(summary.recommendedRepairStrategy).toBe("opening_rewrite");
  });
});
