import { describe, expect, it } from "vitest";
import {
  chooseBestCandidate,
  decideBrokerAuditStrategy,
  decideRewriteAcceptance,
} from "../lib/listing-decision-engine";
import { buildListingGenerationBlueprint } from "../lib/listing-orchestrator";

describe("listing decision engine", () => {
  it("selects the strongest candidate and skips polish when quality is already strong", () => {
    const blueprint = buildListingGenerationBlueprint({
      plan: "pro",
      platform: "hemnet",
      style: "balanced",
      targetWordMin: 300,
      targetWordMax: 450,
      disposition: {
        property: { type: "lägenhet" },
      },
    });

    const decision = chooseBestCandidate([
      {
        label: "primary",
        qualityScore: 0.8,
        nonWordCountViolations: ["Generisk öppning"],
        wordCount: 205,
        weakHemnetDetailCount: 1,
        totalScore: 0.62,
      },
      {
        label: "broker",
        qualityScore: 0.89,
        nonWordCountViolations: [],
        wordCount: 242,
        weakHemnetDetailCount: 0,
        totalScore: 0.84,
      },
    ], "pro", blueprint, "broker");

    expect(decision.selectedLabel).toBe("broker");
    expect(decision.canSkipPolish).toBe(true);
    expect(decision.strategy).toBe("accept");
  });

  it("rejects rewrite proposals that keep corrupted artifacts", () => {
    const result = decideRewriteAcceptance({
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
        hasCorruptedArtifacts: true,
      },
      minimumPublishableWordMin: 195,
      improvementKind: "fact_check",
    });

    expect(result.accept).toBe(false);
    expect(result.reason).toContain("corrupted artifacts");
  });

  it("allows rescue when violations do not worsen and quality is preserved", () => {
    const result = decideRewriteAcceptance({
      current: {
        qualityScore: 0.82,
        nonWordCountViolations: ["Generisk öppning"],
        wordCount: 198,
        isStrongPublishableCandidate: false,
      },
      proposed: {
        qualityScore: 0.84,
        nonWordCountViolations: ["Generisk öppning"],
        wordCount: 205,
        isStrongPublishableCandidate: false,
        hasCorruptedArtifacts: false,
      },
      minimumPublishableWordMin: 195,
      improvementKind: "rescue",
    });

    expect(result.accept).toBe(true);
  });

  it("skips external broker audit only when all top-broker conditions are met", () => {
    const skip = decideBrokerAuditStrategy({
      strongCandidateFastPath: true,
      finalMainWordCount: 250,
      finalStrongWordFloor: 235,
      finalGenericBrokerPhraseCount: 0,
      finalNarrativeIntegrityIssueCount: 0,
    });
    const requireAudit = decideBrokerAuditStrategy({
      strongCandidateFastPath: true,
      finalMainWordCount: 250,
      finalStrongWordFloor: 235,
      finalGenericBrokerPhraseCount: 1,
      finalNarrativeIntegrityIssueCount: 0,
    });

    expect(skip.canSkipExternalAudit).toBe(true);
    expect(requireAudit.canSkipExternalAudit).toBe(false);
  });
});
