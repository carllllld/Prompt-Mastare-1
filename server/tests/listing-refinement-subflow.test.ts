import { describe, expect, it } from "vitest";
import { buildExpansionAttemptOutcome, buildFactCheckAttemptOutcome, buildFactCheckStateTransition, decidePostRefinementGuard } from "../lib/listing-refinement-subflow";

describe("listing refinement subflow", () => {
  it("returns next counters for accepted expansion", () => {
    const outcome = buildExpansionAttemptOutcome({
      accepted: true,
      currentWordCount: 180,
      nextWordCount: 205,
      minimumPublishableWordMin: 195,
    });

    expect(outcome.accepted).toBe(true);
    expect(outcome.nextWordCount).toBe(205);
    expect(outcome.nextShortfall).toBe(0);
  });

  it("keeps current counters and reason for rejected expansion", () => {
    const outcome = buildExpansionAttemptOutcome({
      accepted: false,
      currentWordCount: 180,
      nextWordCount: 205,
      minimumPublishableWordMin: 195,
      rejectionReason: "expansion did not increase text length",
    });

    expect(outcome.accepted).toBe(false);
    expect(outcome.nextWordCount).toBe(180);
    expect(outcome.nextShortfall).toBe(15);
    expect(outcome.reason).toContain("did not increase text length");
  });

  it("accepts fact-check output when publishable floor is preserved", () => {
    const outcome = buildFactCheckAttemptOutcome({
      accepted: true,
      currentWordCount: 210,
      nextWordCount: 208,
      minimumPublishableWordMin: 195,
    });

    expect(outcome.accepted).toBe(true);
    expect(outcome.nextWordCount).toBe(208);
    expect(outcome.reason).toBe("fact check accepted");
  });

  it("rejects fact-check output that drops a publishable text below the floor", () => {
    const outcome = buildFactCheckAttemptOutcome({
      accepted: true,
      currentWordCount: 210,
      nextWordCount: 180,
      minimumPublishableWordMin: 195,
      rejectionReason: "fact check drops text below publishable floor",
    });

    expect(outcome.accepted).toBe(false);
    expect(outcome.nextWordCount).toBe(210);
    expect(outcome.reason).toContain("publishable floor");
  });

  it("requests rollback when refinement introduces more violations", () => {
    const decision = decidePostRefinementGuard({
      baselineWordCount: 210,
      baselineViolationCount: 0,
      baselineScore: 0.84,
      baselineIsStrong: true,
      refinedWordCount: 214,
      refinedViolationCount: 2,
      refinedScore: 0.83,
      refinedIsStrong: true,
      minimumPublishableWordMin: 195,
    });

    expect(decision.shouldRevert).toBe(true);
    expect(decision.reason).toContain("additional violations");
  });

  it("keeps refinement when publishable quality is preserved", () => {
    const decision = decidePostRefinementGuard({
      baselineWordCount: 210,
      baselineViolationCount: 1,
      baselineScore: 0.84,
      baselineIsStrong: true,
      refinedWordCount: 214,
      refinedViolationCount: 1,
      refinedScore: 0.83,
      refinedIsStrong: true,
      minimumPublishableWordMin: 195,
    });

    expect(decision.shouldRevert).toBe(false);
    expect(decision.reason).toContain("preserved publishable quality");
  });

  it("applies corrected fact-check text when accepted", () => {
    const transition = buildFactCheckStateTransition({
      accepted: true,
      currentTextBasis: "Före rättning",
      correctedText: "Efter rättning",
    });

    expect(transition.shouldApplyCorrectedText).toBe(true);
    expect(transition.nextTextBasis).toBe("Efter rättning");
  });

  it("keeps existing fact-check basis when correction is rejected", () => {
    const transition = buildFactCheckStateTransition({
      accepted: false,
      currentTextBasis: "Före rättning",
      correctedText: "Efter rättning",
    });

    expect(transition.shouldApplyCorrectedText).toBe(false);
    expect(transition.nextTextBasis).toBe("Före rättning");
  });
});
