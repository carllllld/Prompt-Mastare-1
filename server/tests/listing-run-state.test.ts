import { describe, expect, it } from "vitest";
import {
  addCandidateToRunState,
  createListingRunState,
  setFactCheckState,
  setFinalBrokerAudit,
  setLastRepairKind,
  setOpenIssues,
  setRunBaseline,
  setSelectedCandidate,
} from "../lib/listing-run-state";

describe("listing run state", () => {
  it("creates an empty run state", () => {
    const state = createListingRunState();

    expect(state.candidates).toHaveLength(0);
    expect(state.selectedCandidateLabel).toBeNull();
    expect(state.baseline).toBeNull();
    expect(state.lastRepairKind).toBeNull();
  });

  it("tracks candidates and selected candidate metadata", () => {
    const state = createListingRunState();

    addCandidateToRunState(state, {
      label: "broker",
      result: { improvedPrompt: "Text" },
      qualityScore: 0.88,
      nonWordCountViolations: [],
      wordCount: 232,
      weakHemnetDetailCount: 0,
      totalScore: 0.84,
    });
    setSelectedCandidate(state, "broker", { improvedPrompt: "Text" }, true);

    expect(state.candidates).toHaveLength(1);
    expect(state.selectedCandidateLabel).toBe("broker");
    expect(state.strongCandidateFastPath).toBe(true);
  });

  it("stores baseline, issues, repair state and audits", () => {
    const state = createListingRunState();

    setRunBaseline(state, {
      text: "Bastext",
      auxFields: {
        socialCopy: null,
        instagramCaption: null,
        showingInvitation: null,
        shortAd: null,
        headline: "Rubrik",
      },
      nonWordCountViolations: ["Generisk öppning"],
      qualityScore: 0.81,
      wordCount: 198,
      isStrong: false,
    });
    setOpenIssues(state, ["Generisk öppning", "Svagt lägesslut"]);
    setLastRepairKind(state, "surgical");
    setFactCheckState(state, { fact_check_passed: false }, "Faktagranskad text");
    setFinalBrokerAudit(state, { publish_ready: true, broker_quality_score: 0.82 });

    expect(state.baseline?.text).toBe("Bastext");
    expect(state.openIssues).toContain("Svagt lägesslut");
    expect(state.lastRepairKind).toBe("surgical");
    expect(state.factCheckTextBasis).toBe("Faktagranskad text");
    expect(state.finalBrokerAudit?.publish_ready).toBe(true);
  });
});
