import { describe, expect, it } from "vitest";
import { applyStageQualityBudget, estimateTextChangeRatio, evaluateFinalGateAB } from "../lib/listing-quality-guards";

describe("listing quality guards", () => {
  it("estimates low change ratio for near-identical text", () => {
    const ratio = estimateTextChangeRatio(
      "Storgatan 12. Ljus trea med balkong i söderläge.",
      "Storgatan 12. Ljus trea med balkong i söderläge och renoverat kök."
    );

    expect(ratio).toBeLessThan(0.45);
  });

  it("rejects surgical proposals that rewrite too much", () => {
    const decision = applyStageQualityBudget({
      improvementKind: "surgical",
      beforeText: "Storgatan 12. Ljus trea med balkong i söderläge och kök från 2022.",
      afterText: "Ett modernt boende med harmonisk atmosfär och fina ytskikt i hela bostaden.",
      beforeWordCount: 12,
      afterWordCount: 12,
      beforeViolations: [],
      afterViolations: [],
      hasCorruptedArtifactsAfter: false,
      minimumPublishableWordMin: 195,
    });

    expect(decision.accept).toBe(false);
    expect(decision.blockingReasons.some((reason) => reason.includes("surgical-förslag"))).toBe(true);
  });

  it("rejects fact-check proposals that add new violations", () => {
    const decision = applyStageQualityBudget({
      improvementKind: "fact_check",
      beforeText: "Text i två stycken.\n\nAndra stycket med lägesprosa.",
      afterText: "Text i två stycken.\n\nAndra stycket med lägesprosa och generisk avslutning.",
      beforeWordCount: 10,
      afterWordCount: 12,
      beforeViolations: [],
      afterViolations: ["Generisk öppning"],
      hasCorruptedArtifactsAfter: false,
      minimumPublishableWordMin: 195,
    });

    expect(decision.accept).toBe(false);
    expect(decision.blockingReasons.some((reason) => reason.includes("fact-check"))).toBe(true);
  });

  it("rejects polish proposals with quality regression", () => {
    const decision = applyStageQualityBudget({
      improvementKind: "polish",
      beforeText: "Ljus fyra med genomgående parkett och balkong i söderläge.",
      afterText: "Bostaden är trevlig och helt okej med olika material och planering.",
      beforeWordCount: 10,
      afterWordCount: 11,
      beforeViolations: ["Generisk öppning"],
      afterViolations: ["Generisk öppning"],
      beforeQualityScore: 0.89,
      afterQualityScore: 0.77,
      hasCorruptedArtifactsAfter: false,
      minimumPublishableWordMin: 195,
    });

    expect(decision.accept).toBe(false);
    expect(decision.blockingReasons.some((reason) => reason.includes("polish försämrade kvalitetspoängen"))).toBe(true);
  });

  it("rejects polish proposals with large rewrite and weak quality gain", () => {
    const decision = applyStageQualityBudget({
      improvementKind: "polish",
      beforeText: "Ekorrvägen 10 i Mörtnäs med södervänd uteplats, kök med köksö och buss till Slussen.",
      afterText: "På Ekorrvägen 10 möter ett boende med trivsam känsla där helheten är balanserad, vardagsrummet samspelar med övriga ytor och området erbjuder flera vardagsfunktioner i närheten för ett smidigt liv.",
      beforeWordCount: 14,
      afterWordCount: 31,
      beforeViolations: [],
      afterViolations: [],
      beforeQualityScore: 0.88,
      afterQualityScore: 0.892,
      hasCorruptedArtifactsAfter: false,
      minimumPublishableWordMin: 195,
    });

    expect(decision.accept).toBe(false);
    expect(decision.blockingReasons.some((reason) => reason.includes("utan tydlig kvalitetsvinst"))).toBe(true);
  });

  it("reports final gate A/B recommendation for manual review when all gates fail", () => {
    const report = evaluateFinalGateAB({
      wordCount: 105,
      minimumPublishableWordMin: 195,
      nonWordViolationCount: 3,
      narrativeIssueCount: 1,
      hasParagraphs: false,
      brokerQualityScore: 0.61,
      analyzedQualityScore: 0.63,
    });

    expect(report.recommendation).toBe("manual_review");
    expect(report.baselinePass).toBe(false);
    expect(report.tolerantPass).toBe(false);
  });
});
