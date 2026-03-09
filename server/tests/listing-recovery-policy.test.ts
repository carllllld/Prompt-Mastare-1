import { describe, expect, it } from "vitest";
import { decideRecoveryAction } from "../lib/listing-recovery-policy";
import { createListingRunState } from "../lib/listing-run-state";

describe("listing recovery policy", () => {
  it("requests rescue when candidate generation has no usable text", () => {
    const decision = decideRecoveryAction({
      runState: createListingRunState(),
      stage: "candidate_generation",
      hasUsableText: false,
      issueCount: 0,
    });

    expect(decision.action).toBe("rescue");
  });

  it("requests rescue when final audit still has issues", () => {
    const decision = decideRecoveryAction({
      runState: createListingRunState(),
      stage: "final_audit",
      hasUsableText: true,
      issueCount: 2,
      hasNarrativeIssues: false,
    });

    expect(decision.action).toBe("rescue");
  });

  it("continues after a weak local repair if text is still usable", () => {
    const decision = decideRecoveryAction({
      runState: createListingRunState(),
      stage: "local_repair",
      hasUsableText: true,
      issueCount: 1,
      lastAttemptFailed: true,
    });

    expect(decision.action).toBe("continue");
  });

  it("stops non-generation stages when no usable text remains", () => {
    const decision = decideRecoveryAction({
      runState: createListingRunState(),
      stage: "final_audit",
      hasUsableText: false,
      issueCount: 3,
    });

    expect(decision.action).toBe("stop");
  });
});
