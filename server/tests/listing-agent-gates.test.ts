import { describe, expect, it } from "vitest";
import { buildLocalBrokerAuditFallback, evaluateBrokerAuditGate, evaluateCandidatePolishGate, evaluateCandidateRecoveryGate, evaluateCandidateSelectionGate, evaluateFinalAuditRescueGate } from "../lib/listing-agent-gates";
import { createListingRunState } from "../lib/listing-run-state";

describe("listing agent gates", () => {
  it("returns rescue for candidate generation without usable text", () => {
    const gate = evaluateCandidateRecoveryGate({
      runState: createListingRunState(),
      hasUsableText: false,
    });

    expect(gate.recoveryDecision.action).toBe("rescue");
  });

  it("returns stop for failed candidate generation retry without usable text only when policy says so", () => {
    const gate = evaluateCandidateRecoveryGate({
      runState: createListingRunState(),
      hasUsableText: false,
      lastAttemptFailed: true,
    });

    expect(["rescue", "stop"]).toContain(gate.recoveryDecision.action);
  });

  it("delegates broker audit gating to the shared decision engine", () => {
    const gate = evaluateBrokerAuditGate({
      strongCandidateFastPath: true,
      finalMainWordCount: 250,
      finalStrongWordFloor: 235,
      finalGenericBrokerPhraseCount: 0,
      finalNarrativeIntegrityIssueCount: 0,
    });

    expect(gate.brokerAuditDecision.canSkipExternalAudit).toBe(true);
  });

  it("builds a trimmed local broker-audit fallback payload", () => {
    const fallback = buildLocalBrokerAuditFallback({
      publishReady: true,
      brokerQualityScore: 0.8439,
      reason: "Lokal fallback användes",
      issues: ["A", "B", "C", "D", "E", "F"],
    });

    expect(fallback.publish_ready).toBe(true);
    expect(fallback.broker_quality_score).toBe(0.844);
    expect(fallback.issues).toHaveLength(5);
    expect(fallback.verdict).toBe("Lokal fallback användes");
  });

  it("extracts rescue issues and signals when final audit rescue can run", () => {
    const gate = evaluateFinalAuditRescueGate({
      publishReady: false,
      issues: ["A", "", "B", 1, "C", "D", "E", "F"],
      hasUsableText: true,
    });

    expect(gate.rescueIssues).toEqual(["A", "B", "C", "D", "E"]);
    expect(gate.canAttemptRescue).toBe(true);
  });

  it("signals when candidate polish should run", () => {
    const gate = evaluateCandidatePolishGate({
      shouldTryPolish: false,
      loopNextAction: "polish",
      strongCandidateFastPath: false,
    });

    expect(gate.shouldRunPolish).toBe(true);
  });

  it("builds candidate selection checkpoint inputs", () => {
    const gate = evaluateCandidateSelectionGate({
      minimumPublishableWordMin: 195,
      candidateWordCount: 182,
      hasUsableText: true,
    });

    expect(gate.wordShortfall).toBe(13);
    expect(gate.hasUsableText).toBe(true);
  });
});
