import { describe, expect, it } from "vitest";
import { buildBrokerRealismScorecard } from "../lib/listing-broker-realism-scorecard";

describe("listing broker realism scorecard", () => {
  it("returns a high grade for strong evidence-rich text", () => {
    const scorecard = buildBrokerRealismScorecard({
      text: "Storgatan 12, 3 tr. Trea om 76 kvm med kök renoverat 2022 och balkong i söderläge.\n\nBadrum uppdaterat 2020 och Resecentrum nås på cirka fem minuter.",
      propertyType: "lägenhet",
      platform: "hemnet",
      style: "balanced",
      inferredBuyer: "par eller liten familj",
      minimumPublishableWordMin: 180,
      wordCount: 210,
      qualityScore: 0.88,
      concreteEvidenceSignals: 7,
      genericPhraseCount: 0,
      narrativeIssueCount: 0,
      nonWordViolationCount: 0,
      hasParagraphs: true,
      brokerQualityScore: 0.86,
    });

    expect(scorecard.overall).toBeGreaterThanOrEqual(80);
    expect(["A", "B"]).toContain(scorecard.grade);
    expect(scorecard.strengths.length).toBeGreaterThan(0);
  });

  it("returns lower score when text is thin and generic", () => {
    const scorecard = buildBrokerRealismScorecard({
      text: "Fin bostad i bra läge med allt du behöver.",
      propertyType: "lägenhet",
      platform: "hemnet",
      style: "selling",
      inferredBuyer: null,
      minimumPublishableWordMin: 180,
      wordCount: 45,
      qualityScore: 0.58,
      concreteEvidenceSignals: 1,
      genericPhraseCount: 4,
      narrativeIssueCount: 2,
      nonWordViolationCount: 3,
      hasParagraphs: false,
      brokerQualityScore: 0.6,
    });

    expect(scorecard.overall).toBeLessThan(70);
    expect(["C", "D"]).toContain(scorecard.grade);
    expect(scorecard.improvements.length).toBeGreaterThan(1);
  });
});
