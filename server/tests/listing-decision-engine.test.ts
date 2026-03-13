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

  it("accepts rewrite proposals with corrupted artifacts - detection disabled", () => {
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
        hasCorruptedArtifacts: true, // Should not block
      },
      minimumPublishableWordMin: 195,
      improvementKind: "fact_check",
    });

    // Corrupted artifact detection is disabled - quality metrics decide
    expect(result.accept).toBe(true);
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

  it("requires external broker audit when coverage or extra fields are weak despite strong main text", () => {
    const weakCoverage = decideBrokerAuditStrategy({
      strongCandidateFastPath: true,
      finalMainWordCount: 260,
      finalStrongWordFloor: 235,
      finalGenericBrokerPhraseCount: 0,
      finalNarrativeIntegrityIssueCount: 0,
      finalExtraFieldViolationCount: 0,
      blueprintCoverageRatio: 0.8,
      inputSignalCoverageRatio: 0.42,
      missingCriticalSignalCount: 0,
    });
    const extraFieldIssues = decideBrokerAuditStrategy({
      strongCandidateFastPath: true,
      finalMainWordCount: 260,
      finalStrongWordFloor: 235,
      finalGenericBrokerPhraseCount: 0,
      finalNarrativeIntegrityIssueCount: 0,
      finalExtraFieldViolationCount: 2,
      blueprintCoverageRatio: 0.8,
      inputSignalCoverageRatio: 0.7,
      missingCriticalSignalCount: 0,
    });

    expect(weakCoverage.canSkipExternalAudit).toBe(false);
    expect(extraFieldIssues.canSkipExternalAudit).toBe(false);
  });
});
