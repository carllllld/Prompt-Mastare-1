export interface BrokerRealismScorecardInput {
  text: string;
  propertyType: string;
  platform: string;
  style: "factual" | "balanced" | "selling";
  inferredBuyer: string | null;
  minimumPublishableWordMin: number;
  wordCount: number;
  qualityScore: number;
  concreteEvidenceSignals: number;
  genericPhraseCount: number;
  narrativeIssueCount: number;
  nonWordViolationCount: number;
  hasParagraphs: boolean;
  brokerQualityScore: number | null;
}

export interface BrokerRealismScorecard {
  overall: number;
  grade: "A" | "B" | "C" | "D";
  dimensions: {
    evidens: number;
    struktur: number;
    sprakNaturlighet: number;
    malgruppstraff: number;
    marknadsredo: number;
  };
  strengths: string[];
  improvements: string[];
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function toPercentScore(value: number): number {
  return clamp(Math.round(value * 100));
}

export function buildBrokerRealismScorecard(input: BrokerRealismScorecardInput): BrokerRealismScorecard {
  const evidenceScore = clamp(35 + input.concreteEvidenceSignals * 11 - input.nonWordViolationCount * 5);
  const structurePenalty = (input.wordCount < input.minimumPublishableWordMin ? 22 : 0)
    + (input.hasParagraphs || input.wordCount < 120 ? 0 : 12)
    + input.narrativeIssueCount * 6;
  const structureScore = clamp(92 - structurePenalty);
  const languageScore = clamp(90 - input.genericPhraseCount * 10 - input.narrativeIssueCount * 8);

  const buyerSignal = input.inferredBuyer && input.inferredBuyer.trim().length > 2 ? 10 : 0;
  const audienceScore = clamp(65 + buyerSignal + Math.max(0, input.concreteEvidenceSignals - 3) * 4 - input.genericPhraseCount * 4);

  const brokerScore = input.brokerQualityScore == null ? null : toPercentScore(input.brokerQualityScore);
  const marketReadinessScore = clamp(
    (brokerScore ?? toPercentScore(input.qualityScore)) * 0.6
    + toPercentScore(input.qualityScore) * 0.3
    + (input.nonWordViolationCount === 0 ? 10 : Math.max(0, 10 - input.nonWordViolationCount * 3))
  );

  const weightedOverall = clamp(Math.round(
    evidenceScore * 0.24
    + structureScore * 0.22
    + languageScore * 0.2
    + audienceScore * 0.14
    + marketReadinessScore * 0.2
  ));

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (evidenceScore >= 75) strengths.push("Hög faktadensitet med konkreta signaler");
  else improvements.push("Öka antalet konkreta detaljer tidigt i texten");

  if (structureScore >= 75) strengths.push("Bra styckeslogik och publicerbar struktur");
  else improvements.push("Stärk styckesflöde och avsluta med ett tydligt lägesankare");

  if (languageScore >= 75) strengths.push("Naturlig mäklarprosa utan tung klyschbelastning");
  else improvements.push("Byt ut generiska formuleringar mot mer naturliga sakobservationer");

  if (audienceScore >= 75) strengths.push("Målgruppsanpassningen är tydlig");
  else improvements.push("Skärp textens fokus för sannolik köpare och vardagsanvändning");

  if (marketReadinessScore >= 75) strengths.push("Marknadsredo nivå för publicering");
  else improvements.push("Behöver ytterligare slipning innan maximal marknadseffekt");

  const grade: BrokerRealismScorecard["grade"] = weightedOverall >= 85 ? "A" : weightedOverall >= 72 ? "B" : weightedOverall >= 60 ? "C" : "D";

  return {
    overall: weightedOverall,
    grade,
    dimensions: {
      evidens: evidenceScore,
      struktur: structureScore,
      sprakNaturlighet: languageScore,
      malgruppstraff: audienceScore,
      marknadsredo: marketReadinessScore,
    },
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 5),
  };
}
