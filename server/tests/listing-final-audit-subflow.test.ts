import { describe, expect, it } from "vitest";
import { buildFinalAuditRescueDecisionArtifacts, buildFinalAuditRescueOutcome, buildFinalAuditRescueRequestInput, buildFinalAuditRescueResponseArtifacts, buildFinalAuditRescueSettlement, buildFinalBrokerAuditRetryRequestInput, buildFinalBrokerAuditRetryResponseArtifacts, buildRescueAttemptSnapshot, buildRescueRewriteEvaluationInput, buildRescuedResult, finalizeBrokerAuditReadiness, finalizeFinalMainValidation } from "../lib/listing-final-audit-subflow";

describe("listing final audit subflow", () => {
  it("builds the final broker audit retry response artifacts", () => {
    const artifacts = buildFinalBrokerAuditRetryResponseArtifacts({
      outputText: '{"publish_ready":true,"broker_quality_score":0.91}',
      parseJson: JSON.parse,
    });

    expect(artifacts.finalBrokerAudit.publish_ready).toBe(true);
    expect(artifacts.finalBrokerAudit.broker_quality_score).toBe(0.91);
  });

  it("builds the higher-level final-audit rescue settlement", () => {
    const settlement = buildFinalAuditRescueSettlement({
      rescueEvaluationInput: {
        current: {
          qualityScore: 0.8,
          nonWordCountViolations: ["tone"],
          wordCount: 180,
          isStrongPublishableCandidate: false,
        },
        proposed: {
          qualityScore: 0.92,
          nonWordCountViolations: [],
          wordCount: 205,
          isStrongPublishableCandidate: true,
          hasCorruptedArtifacts: false,
        },
        minimumPublishableWordMin: 195,
        improvementKind: "rescue",
      },
      rescueAttemptSnapshot: {
        currentMainViolations: ["tone"],
        rescuedMainViolations: [],
        currentViolations: ["tone"],
        rescuedViolations: [],
        currentScore: 0.8,
        rescuedScore: 0.92,
        currentWordCount: 180,
        rescuedWordCount: 205,
        currentIsStrongCandidate: false,
        rescuedIsStrongCandidate: true,
        rescuedHasCorruptedArtifacts: false,
      },
      minimumPublishableWordMin: 195,
      evaluateCandidate: () => ({ acceptance: { accept: true, reason: "better quality" } }),
      coordinateAcceptance: () => ({ accepted: true, reason: "accepted" }),
    });

    expect(settlement.rescueCoordination.accepted).toBe(true);
    expect(settlement.rescueDecisionArtifacts.shouldApplyRescue).toBe(true);
  });

  it("builds rescue decision artifacts for accepted rescue rewrites", () => {
    const decision = buildFinalAuditRescueDecisionArtifacts({
      accepted: true,
      reason: "accepted",
      rescueAttemptSnapshot: {
        currentScore: 0.8,
        rescuedScore: 0.92,
        currentWordCount: 180,
        rescuedWordCount: 205,
      },
    });

    expect(decision.shouldApplyRescue).toBe(true);
    expect(decision.logMessage).toContain("Accepted rescue rewrite");
  });

  it("builds rescue decision artifacts for rejected rescue rewrites", () => {
    const decision = buildFinalAuditRescueDecisionArtifacts({
      accepted: false,
      reason: "fell below publishable floor",
      rescueAttemptSnapshot: {
        currentScore: 0.8,
        rescuedScore: 0.75,
        currentWordCount: 180,
        rescuedWordCount: 150,
      },
    });

    expect(decision.shouldApplyRescue).toBe(false);
    expect(decision.logMessage).toContain("fell below publishable floor");
  });

  it("builds the final-audit rescue response artifacts", () => {
    const artifacts = buildFinalAuditRescueResponseArtifacts({
      outputText: '{"improvedPrompt":"rå text"}',
      parseJson: JSON.parse,
      extractMarketingText: (value) => value.improvedPrompt,
      finalizeText: (value) => value ? value.toUpperCase() : null,
    });

    expect(artifacts.rescueRaw.improvedPrompt).toBe("rå text");
    expect(artifacts.rescuedText).toBe("RÅ TEXT");
  });

  it("finalizes final main validation and returns warnings without blocking valid text", () => {
    const validation = finalizeFinalMainValidation({
      resultText: "one two three",
      finalNonWordCountViolations: [],
      finalWordCountViolations: ["För få ord"],
      finalExtraFieldViolations: ["[headline] tone"],
      finalNarrativeIssues: [],
      minimumPublishableWordMin: 3,
      targetWordMin: 5,
      targetWordMax: 10,
      isDispositionLikeOutput: () => false,
      isTooThinForDelivery: () => false,
      countWords: (text) => text.split(/\s+/).filter(Boolean).length,
    });

    expect(validation.wordCount).toBe(3);
    expect(validation.warnings).toHaveLength(2);
  });

  it("blocks when strict extra field validation is enabled and auxiliary fields have violations", () => {
    expect(() => finalizeFinalMainValidation({
      resultText: "one two three",
      finalNonWordCountViolations: [],
      finalWordCountViolations: [],
      finalExtraFieldViolations: ["[socialCopy] CTA-slut"],
      finalNarrativeIssues: [],
      strictExtraFieldValidation: true,
      minimumPublishableWordMin: 3,
      targetWordMin: 5,
      targetWordMax: 10,
      isDispositionLikeOutput: () => false,
      isTooThinForDelivery: () => false,
      countWords: (text) => text.split(/\s+/).filter(Boolean).length,
    })).toThrow("Kvarvarande kvalitetsfel i extratexter");
  });

  it("throws when final main validation finds narrative issues", () => {
    expect(() => finalizeFinalMainValidation({
      resultText: "one two three",
      finalNonWordCountViolations: [],
      finalWordCountViolations: [],
      finalExtraFieldViolations: [],
      finalNarrativeIssues: ["trasig övergång"],
      minimumPublishableWordMin: 3,
      targetWordMin: 5,
      targetWordMax: 10,
      isDispositionLikeOutput: () => false,
      isTooThinForDelivery: () => false,
      countWords: (text) => text.split(/\s+/).filter(Boolean).length,
    })).toThrow("trasig berättelseintegritet");
  });

  it("finalizes broker audit readiness with local fallback when publish_ready is invalid", () => {
    const readiness = finalizeBrokerAuditReadiness({
      finalBrokerAudit: { publish_ready: null, broker_quality_score: 0.9 },
      finalLocalTopBrokerReady: true,
      analyzedScore: 0.91,
      brokerQualityThreshold: 0.85,
      buildLocalFallback: ({ publishReady, brokerQualityScore, reason, issues }) => ({
        publish_ready: publishReady,
        broker_quality_score: brokerQualityScore,
        verdict: reason,
        issues: issues ?? [],
      }),
    });

    expect(readiness.finalBrokerAudit.publish_ready).toBe(true);
    expect(readiness.finalBrokerAudit.broker_quality_score).toBe(0.91);
    expect(readiness.warnings).toHaveLength(1);
  });

  it("throws when broker audit score remains below the threshold", () => {
    expect(() => finalizeBrokerAuditReadiness({
      finalBrokerAudit: { publish_ready: true, broker_quality_score: 0.7, issues: ["för svag öppning"] },
      finalLocalTopBrokerReady: true,
      analyzedScore: 0.9,
      brokerQualityThreshold: 0.85,
      buildLocalFallback: ({ publishReady, brokerQualityScore, reason, issues }) => ({
        publish_ready: publishReady,
        broker_quality_score: brokerQualityScore,
        verdict: reason,
        issues: issues ?? [],
      }),
    })).toThrow("Broker quality score låg under tröskeln");
  });

  it("accepts advisory-only broker audit rejection with strong local analyzed score", () => {
    const readiness = finalizeBrokerAuditReadiness({
      finalBrokerAudit: {
        publish_ready: false,
        broker_quality_score: 0.73,
        issues: [
          "Öppningen kunde vara mer direkt och säljande.",
          "”Stambyte” kan väcka frågor; bra att precisera vad som avses för att undvika osäkerhet.",
        ],
      },
      finalLocalTopBrokerReady: false,
      analyzedScore: 0.89,
      brokerQualityThreshold: 0.85,
      buildLocalFallback: ({ publishReady, brokerQualityScore, reason, issues }) => ({
        publish_ready: publishReady,
        broker_quality_score: brokerQualityScore,
        verdict: reason,
        issues: issues ?? [],
      }),
    });

    expect(readiness.finalBrokerAudit.publish_ready).toBe(true);
    expect(readiness.finalBrokerAudit.broker_quality_score).toBeGreaterThanOrEqual(0.89);
    expect(readiness.finalBrokerAudit.issues).toHaveLength(2);
    expect(readiness.warnings.some((warning) => warning.includes("förbättringsråd"))).toBe(true);
  });

  it("still throws for non-advisory broker audit rejection when local gate is not ready", () => {
    expect(() => finalizeBrokerAuditReadiness({
      finalBrokerAudit: {
        publish_ready: false,
        broker_quality_score: 0.79,
        issues: ["Fakta om avgift och boarea motsäger dispositionen."],
      },
      finalLocalTopBrokerReady: false,
      analyzedScore: 0.9,
      brokerQualityThreshold: 0.85,
      buildLocalFallback: ({ publishReady, brokerQualityScore, reason, issues }) => ({
        publish_ready: publishReady,
        broker_quality_score: brokerQualityScore,
        verdict: reason,
        issues: issues ?? [],
      }),
    })).toThrow("AI-audit underkände texten efter slutgranskning");
  });

  it("accepts stylistic non-advisory audit rejection with high local confidence", () => {
    const readiness = finalizeBrokerAuditReadiness({
      finalBrokerAudit: {
        publish_ready: false,
        broker_quality_score: 0.78,
        issues: [
          "Öppningen börjar med råfakta och känns mer som objektrad än en stark krok.",
          "Partiet om service och restauranger blir något uppradande och tappar mäklarprosa-känslan.",
        ],
      },
      finalLocalTopBrokerReady: false,
      analyzedScore: 0.86,
      brokerQualityThreshold: 0.85,
      buildLocalFallback: ({ publishReady, brokerQualityScore, reason, issues }) => ({
        publish_ready: publishReady,
        broker_quality_score: brokerQualityScore,
        verdict: reason,
        issues: issues ?? [],
      }),
    });

    expect(readiness.finalBrokerAudit.publish_ready).toBe(true);
    expect(readiness.finalBrokerAudit.broker_quality_score).toBeGreaterThanOrEqual(0.86);
    expect(readiness.warnings.some((warning) => warning.includes("inga hårda faktabrott"))).toBe(true);
  });

  it("builds the final broker audit retry request payload without changing the prompt content shape", () => {
    const input = buildFinalBrokerAuditRetryRequestInput({
      cleanDisposition: { address: "Testgatan 1" },
      resultText: "Sluttext",
      platform: "hemnet",
      style: "balanced",
      plan: "pro",
    });

    expect(input).toHaveLength(2);
    expect(input[0].role).toBe("developer");
    expect(input[0].content).toContain("Bedöm ENDAST om texten är publiceringsklar");
    expect(input[1].role).toBe("user");
    expect(input[1].content).toContain("SLUTTEXT:");
    expect(input[1].content).toContain("PLATTFORM: hemnet");
    expect(input[1].content).toContain("STIL: balanced");
  });

  it("builds the final-audit rescue request payload without changing the prompt content shape", () => {
    const input = buildFinalAuditRescueRequestInput({
      cleanDisposition: { address: "Testgatan 1" },
      cleanWritingPlan: { focus: ["uteplats"] },
      plan: "pro",
      rescueIssues: ["Öppningen är för administrativ", "Närområdet är för listigt"],
      result: { improvedPrompt: "Original text" },
      rescueRepairAddendum: "EXTRA REGLER",
    });

    expect(input).toHaveLength(2);
    expect(input[0].role).toBe("developer");
    expect(input[0].content).toContain("Skriv om objektbeskrivningen");
    expect(input[0].content).toContain("EXTRA REGLER");
    expect(input[1].role).toBe("user");
    expect(input[1].content).toContain("LEVEL: pro");
    expect(input[1].content).toContain("AUDITENS INVÄNDNINGAR SOM MÅSTE LÖSAS:");
    expect(input[1].content).toContain("1. Öppningen är för administrativ");
  });

  it("builds the higher-level final-audit rescue outcome", () => {
    const outcome = buildFinalAuditRescueOutcome({
      currentResult: { improvedPrompt: "one two", violations: ["word", "tone"] },
      rescueRaw: { socialCopy: "ny" },
      rescuedText: "one two three",
      sanitizeField: (value) => typeof value === "string" ? value.toUpperCase() : null,
      validateResult: (value) => value.violations ?? [],
      getNonWordCountViolations: (violations) => violations.filter((violation) => violation !== "word"),
      analyzeTextQuality: (text) => text.length / 10,
      countWords: (text) => text.split(/\s+/).filter(Boolean).length,
      isStrongCandidate: (text) => text.split(/\s+/).filter(Boolean).length >= 3,
      hasCorruptedArtifacts: (text) => text.includes("@@"),
      minimumPublishableWordMin: 195,
    });

    expect(outcome.rescuedResult.improvedPrompt).toBe("one two three");
    expect(outcome.rescuedResult.socialCopy).toBe("NY");
    expect(outcome.rescueAttemptSnapshot.rescuedWordCount).toBe(3);
    expect(outcome.rescueEvaluationInput.improvementKind).toBe("rescue");
  });

  it("builds a rescued result and sanitizes marketing fields", () => {
    const result = buildRescuedResult({
      currentResult: {
        improvedPrompt: "Old text",
        socialCopy: "old social",
        headline: "old headline",
      },
      rescueRaw: {
        socialCopy: "new social",
        headline: "new headline",
        extraField: "kept",
      },
      rescuedText: "Rescued text",
      sanitizeField: (value) => typeof value === "string" ? value.toUpperCase() : null,
    });

    expect(result.improvedPrompt).toBe("Rescued text");
    expect(result.socialCopy).toBe("NEW SOCIAL");
    expect(result.headline).toBe("NEW HEADLINE");
    expect(result.extraField).toBe("kept");
  });

  it("builds rescue attempt metrics and evaluation inputs", () => {
    const snapshot = buildRescueAttemptSnapshot({
      currentResult: { improvedPrompt: "one two", violations: ["word", "tone"] },
      rescuedResult: { improvedPrompt: "one two three", violations: ["style"] },
      rescuedText: "one two three",
      validateResult: (value) => value.violations,
      getNonWordCountViolations: (violations) => violations.filter((violation) => violation !== "word"),
      analyzeTextQuality: (text) => text.length / 10,
      countWords: (text) => text.split(/\s+/).filter(Boolean).length,
      isStrongCandidate: (text) => text.split(/\s+/).filter(Boolean).length >= 3,
      hasCorruptedArtifacts: (text) => text.includes("@@"),
    });

    expect(snapshot.currentMainViolations).toEqual(["word", "tone"]);
    expect(snapshot.rescuedMainViolations).toEqual(["style"]);
    expect(snapshot.currentViolations).toEqual(["tone"]);
    expect(snapshot.rescuedViolations).toEqual(["style"]);
    expect(snapshot.currentWordCount).toBe(2);
    expect(snapshot.rescuedWordCount).toBe(3);
    expect(snapshot.currentIsStrongCandidate).toBe(false);
    expect(snapshot.rescuedIsStrongCandidate).toBe(true);
    expect(snapshot.rescuedHasCorruptedArtifacts).toBe(false);
  });

  it("builds the rescue rewrite evaluation payload from the attempt snapshot", () => {
    const input = buildRescueRewriteEvaluationInput({
      rescueAttemptSnapshot: {
        currentScore: 0.8,
        currentViolations: ["tone"],
        currentWordCount: 180,
        currentIsStrongCandidate: false,
        rescuedScore: 0.92,
        rescuedViolations: [],
        rescuedWordCount: 205,
        rescuedIsStrongCandidate: true,
        rescuedHasCorruptedArtifacts: false,
      },
      minimumPublishableWordMin: 195,
    });

    expect(input.current.qualityScore).toBe(0.8);
    expect(input.current.wordCount).toBe(180);
    expect(input.proposed.qualityScore).toBe(0.92);
    expect(input.proposed.wordCount).toBe(205);
    expect(input.proposed.hasCorruptedArtifacts).toBe(false);
    expect(input.minimumPublishableWordMin).toBe(195);
    expect(input.improvementKind).toBe("rescue");
  });
});
