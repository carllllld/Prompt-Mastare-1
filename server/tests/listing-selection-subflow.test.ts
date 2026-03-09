import { describe, expect, it } from "vitest";
import { buildCandidatePolishDecisionArtifacts, buildCandidatePolishOutcome, buildCandidatePolishRequestInput, buildCandidatePolishResponseArtifacts, buildCandidatePolishSettlement, buildPolishAttemptSnapshot, buildPolishRewriteEvaluationInput, buildPolishedCandidateResult, buildStep3CandidateSnapshot } from "../lib/listing-selection-subflow";

describe("listing selection subflow", () => {
  it("builds the higher-level candidate polish settlement", () => {
    const settlement = buildCandidatePolishSettlement({
      polishEvaluationInput: {
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
        improvementKind: "polish",
      },
      polishAttemptSnapshot: {
        currentAllViolations: ["tone"],
        polishedAllViolations: [],
        currentViolations: ["tone"],
        polishedViolations: [],
        currentScore: 0.8,
        polishedScore: 0.92,
        currentWordCount: 180,
        polishedWordCount: 205,
        currentIsStrongCandidate: false,
        polishedIsStrongCandidate: true,
        polishedHasCorruptedArtifacts: false,
      },
      evaluateCandidate: () => ({ acceptance: { accept: true, reason: "better quality" } }),
      coordinateAcceptance: () => ({ accepted: true, reason: "accepted" }),
    });

    expect(settlement.polishCoordination.accepted).toBe(true);
    expect(settlement.polishDecisionArtifacts.shouldApplyPolish).toBe(true);
  });

  it("builds candidate polish decision artifacts for accepted polish", () => {
    const decision = buildCandidatePolishDecisionArtifacts({
      accepted: true,
      reason: "accepted",
      polishAttemptSnapshot: {
        currentScore: 0.8,
        polishedScore: 0.92,
        currentViolations: ["tone"],
        polishedViolations: [],
      },
    });

    expect(decision.shouldApplyPolish).toBe(true);
    expect(decision.logMessage).toContain("Accepted polished winner");
  });

  it("builds candidate polish decision artifacts for rejected polish", () => {
    const decision = buildCandidatePolishDecisionArtifacts({
      accepted: false,
      reason: "introduced additional violations",
      polishAttemptSnapshot: {
        currentScore: 0.8,
        polishedScore: 0.75,
        currentViolations: [],
        polishedViolations: ["tone"],
      },
    });

    expect(decision.shouldApplyPolish).toBe(false);
    expect(decision.logMessage).toContain("introduced additional violations");
  });

  it("builds the candidate polish request payload without changing the prompt content shape", () => {
    const input = buildCandidatePolishRequestInput({
      cleanDisposition: { address: "Testgatan 1" },
      cleanWritingPlan: { focus: ["balkong"] },
      result: { improvedPrompt: "Original text" },
    });

    expect(input).toHaveLength(2);
    expect(input[0].role).toBe("developer");
    expect(input[0].content).toContain("Förfina en redan bra objektbeskrivning");
    expect(input[1].role).toBe("user");
    expect(input[1].content).toContain("DISPOSITION:");
    expect(input[1].content).toContain("SKRIVPLAN:");
    expect(input[1].content).toContain("TEXT ATT FÖRFINA:");
  });

  it("builds the candidate polish response artifacts", () => {
    const artifacts = buildCandidatePolishResponseArtifacts({
      outputText: '{"improvedPrompt":"rå text"}',
      parseJson: JSON.parse,
      extractMarketingText: (value) => value.improvedPrompt,
      finalizeText: (value) => value ? value.toUpperCase() : null,
    });

    expect(artifacts.polishedRaw.improvedPrompt).toBe("rå text");
    expect(artifacts.polishedText).toBe("RÅ TEXT");
  });

  it("builds the higher-level candidate polish outcome", () => {
    const outcome = buildCandidatePolishOutcome({
      currentResult: { improvedPrompt: "one two", violations: ["word", "tone"] },
      polishedRaw: { socialCopy: "ny" },
      polishedText: "one two three",
      sanitizeField: (value) => typeof value === "string" ? value.toUpperCase() : null,
      validateResult: (value) => value.violations ?? [],
      getNonWordCountViolations: (violations) => violations.filter((violation) => violation !== "word"),
      analyzeTextQuality: (text) => text.length / 10,
      countWords: (text) => text.split(/\s+/).filter(Boolean).length,
      isStrongCandidate: (text) => text.split(/\s+/).filter(Boolean).length >= 3,
      hasCorruptedArtifacts: (text) => text.includes("@@"),
      minimumPublishableWordMin: 195,
    });

    expect(outcome.polishedResult.improvedPrompt).toBe("one two three");
    expect(outcome.polishedResult.socialCopy).toBe("NY");
    expect(outcome.polishAttemptSnapshot.polishedWordCount).toBe(3);
    expect(outcome.polishEvaluationInput.improvementKind).toBe("polish");
  });

  it("builds a polished candidate result and sanitizes marketing fields", () => {
    const result = buildPolishedCandidateResult({
      currentResult: {
        improvedPrompt: "Old text",
        socialCopy: "old social",
        headline: "old headline",
      },
      polishedRaw: {
        socialCopy: "new social",
        headline: "new headline",
        extraField: "kept",
      },
      polishedText: "New text",
      sanitizeField: (value) => typeof value === "string" ? value.toUpperCase() : null,
    });

    expect(result.improvedPrompt).toBe("New text");
    expect(result.socialCopy).toBe("NEW SOCIAL");
    expect(result.headline).toBe("NEW HEADLINE");
    expect(result.extraField).toBe("kept");
  });

  it("builds polish attempt metrics and evaluation inputs", () => {
    const snapshot = buildPolishAttemptSnapshot({
      currentResult: { improvedPrompt: "one two", violations: ["a", "word"] },
      polishedResult: { improvedPrompt: "one two three", violations: ["b"] },
      polishedText: "one two three",
      validateResult: (value) => value.violations,
      getNonWordCountViolations: (violations) => violations.filter((violation) => violation !== "word"),
      analyzeTextQuality: (text) => text.length / 10,
      countWords: (text) => text.split(/\s+/).filter(Boolean).length,
      isStrongCandidate: (text) => text.split(/\s+/).filter(Boolean).length >= 3,
      hasCorruptedArtifacts: (text) => text.includes("@@"),
    });

    expect(snapshot.currentAllViolations).toEqual(["a", "word"]);
    expect(snapshot.polishedAllViolations).toEqual(["b"]);
    expect(snapshot.currentViolations).toEqual(["a"]);
    expect(snapshot.polishedViolations).toEqual(["b"]);
    expect(snapshot.currentWordCount).toBe(2);
    expect(snapshot.polishedWordCount).toBe(3);
    expect(snapshot.currentIsStrongCandidate).toBe(false);
    expect(snapshot.polishedIsStrongCandidate).toBe(true);
    expect(snapshot.polishedHasCorruptedArtifacts).toBe(false);
  });

  it("builds the step-3 candidate quality snapshot", () => {
    const snapshot = buildStep3CandidateSnapshot({
      result: { improvedPrompt: "one two three", violations: ["word", "tone"] },
      validateResult: (value) => value.violations,
      getNonWordCountViolations: (violations) => violations.filter((violation) => violation !== "word"),
      analyzeTextQuality: (text) => text.length / 10,
      countWords: (text) => text.split(/\s+/).filter(Boolean).length,
    });

    expect(snapshot.wordCount).toBe(3);
    expect(snapshot.violations).toEqual(["tone"]);
    expect(snapshot.score).toBe(1.3);
  });

  it("builds the polish rewrite evaluation payload from the attempt snapshot", () => {
    const input = buildPolishRewriteEvaluationInput({
      polishAttemptSnapshot: {
        currentScore: 0.8,
        currentViolations: ["a"],
        currentWordCount: 180,
        currentIsStrongCandidate: false,
        polishedScore: 0.9,
        polishedViolations: [],
        polishedWordCount: 205,
        polishedIsStrongCandidate: true,
        polishedHasCorruptedArtifacts: false,
      },
      minimumPublishableWordMin: 195,
    });

    expect(input.current.qualityScore).toBe(0.8);
    expect(input.current.wordCount).toBe(180);
    expect(input.proposed.qualityScore).toBe(0.9);
    expect(input.proposed.wordCount).toBe(205);
    expect(input.proposed.hasCorruptedArtifacts).toBe(false);
    expect(input.minimumPublishableWordMin).toBe(195);
    expect(input.improvementKind).toBe("polish");
  });
});
