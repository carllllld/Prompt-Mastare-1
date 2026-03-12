import { describe, expect, it } from "vitest";
import { coordinateExpansionAcceptance, coordinateFactCheckAcceptance, coordinatePolishAcceptance, coordinateRescueAcceptance } from "../lib/listing-refinement-coordinator";

describe("listing refinement coordinator", () => {
  it("accepts polish when the coordinated outcome does not increase violations", () => {
    const result = coordinatePolishAcceptance({
      accepted: true,
      currentViolationCount: 2,
      nextViolationCount: 2,
    });

    expect(result.accepted).toBe(true);
    expect(result.reason).toBe("polish accepted");
  });

  it("rejects polish when the coordinated outcome increases violations", () => {
    const result = coordinatePolishAcceptance({
      accepted: true,
      currentViolationCount: 1,
      nextViolationCount: 3,
      rejectionReason: "polish introduced additional violations",
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("additional violations");
  });

  it("rejects polish when quality drops too much despite flat violations", () => {
    const result = coordinatePolishAcceptance({
      accepted: true,
      currentViolationCount: 2,
      nextViolationCount: 2,
      currentQualityScore: 0.89,
      nextQualityScore: 0.77,
      rejectionReason: "polish quality regressed",
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("quality regression");
  });

  it("accepts expansion when the coordinated outcome is valid", () => {
    const result = coordinateExpansionAcceptance({
      accepted: true,
      currentWordCount: 180,
      nextWordCount: 205,
      minimumPublishableWordMin: 195,
    });

    expect(result.accepted).toBe(true);
    expect(result.nextWordCount).toBe(205);
    expect(result.nextShortfall).toBe(0);
  });

  it("keeps current expansion counters when the coordinated outcome is rejected", () => {
    const result = coordinateExpansionAcceptance({
      accepted: false,
      currentWordCount: 180,
      nextWordCount: 205,
      minimumPublishableWordMin: 195,
      rejectionReason: "expansion rejected",
    });

    expect(result.accepted).toBe(false);
    expect(result.nextWordCount).toBe(180);
    expect(result.nextShortfall).toBe(15);
    expect(result.reason).toContain("expansion rejected");
  });

  it("accepts fact-check correction when floor is preserved and transition applies", () => {
    const result = coordinateFactCheckAcceptance({
      accepted: true,
      currentWordCount: 210,
      nextWordCount: 208,
      minimumPublishableWordMin: 195,
      currentTextBasis: "Före rättning",
      correctedText: "Efter rättning",
    });

    expect(result.accepted).toBe(true);
    expect(result.nextTextBasis).toBe("Efter rättning");
    expect(result.reason).toBe("fact check accepted");
  });

  it("rejects fact-check correction when it would drop below the publishable floor", () => {
    const result = coordinateFactCheckAcceptance({
      accepted: true,
      currentWordCount: 210,
      nextWordCount: 180,
      minimumPublishableWordMin: 195,
      currentTextBasis: "Före rättning",
      correctedText: "Efter rättning",
      rejectionReason: "fact check drops text below publishable floor",
    });

    expect(result.accepted).toBe(false);
    expect(result.nextTextBasis).toBe("Före rättning");
    expect(result.reason).toContain("publishable floor");
  });

  it("accepts rescue when quality is accepted and the text stays above the rescue floor", () => {
    const result = coordinateRescueAcceptance({
      accepted: true,
      currentWordCount: 210,
      nextWordCount: 206,
      minimumPublishableWordMin: 195,
    });

    expect(result.accepted).toBe(true);
    expect(result.reason).toBe("rescue accepted");
  });

  it("rejects rescue when the rewritten text falls too far below the current text", () => {
    const result = coordinateRescueAcceptance({
      accepted: true,
      currentWordCount: 210,
      nextWordCount: 190,
      minimumPublishableWordMin: 195,
      rejectionReason: "rescue dropped too far below the floor",
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("dropped too far below the floor");
  });
});
