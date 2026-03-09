import { describe, expect, it } from "vitest";
import { evaluateRewriteCandidate } from "../lib/listing-rewrite-evaluator";

describe("listing rewrite evaluator", () => {
  it("returns the original snapshots and acceptance decision", () => {
    const evaluation = evaluateRewriteCandidate({
      current: {
        qualityScore: 0.8,
        nonWordCountViolations: ["Generisk öppning"],
        wordCount: 210,
        isStrongPublishableCandidate: false,
      },
      proposed: {
        qualityScore: 0.84,
        nonWordCountViolations: [],
        wordCount: 214,
        isStrongPublishableCandidate: false,
        hasCorruptedArtifacts: false,
      },
      minimumPublishableWordMin: 195,
      improvementKind: "surgical",
    });

    expect(evaluation.currentSnapshot.wordCount).toBe(210);
    expect(evaluation.proposedSnapshot.nonWordCountViolations).toEqual([]);
    expect(evaluation.acceptance.accept).toBe(true);
  });

  it("accepts rewrite proposals with corrupted artifacts - detection disabled", () => {
    const evaluation = evaluateRewriteCandidate({
      current: {
        qualityScore: 0.81,
        nonWordCountViolations: ["Förbjuden fras"],
        wordCount: 210,
        isStrongPublishableCandidate: false,
      },
      proposed: {
        qualityScore: 0.86,
        nonWordCountViolations: [],
        wordCount: 214,
        isStrongPublishableCandidate: true,
        hasCorruptedArtifacts: true, // Should not block
      },
      minimumPublishableWordMin: 195,
      improvementKind: "fact_check",
    });

    // Corrupted artifact detection is disabled - quality metrics decide
    expect(evaluation.acceptance.accept).toBe(true);
  });
});
